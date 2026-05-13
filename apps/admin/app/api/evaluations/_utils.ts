import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

type ServiceClient = ReturnType<typeof createServiceClient>;

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  missingPositionIds: string[];
};

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function getRound(supabase: ServiceClient, roundId: string) {
  const { data, error } = await supabase
    .from("multisource_evaluation_rounds")
    .select("*")
    .eq("id", roundId)
    .single();

  if (error) {
    return null;
  }

  return data as { id: string; is_deployed: boolean; config_version: number };
}

export async function assertRoundEditable(supabase: ServiceClient, roundId: string) {
  const round = await getRound(supabase, roundId);

  if (!round) {
    throw new Error("Round not found");
  }

  if (round.is_deployed) {
    throw new Error("배포 중인 회차는 수정할 수 없습니다. 배포 OFF 후 수정해주세요.");
  }

  return round;
}

export async function logEvaluationAudit(
  supabase: ServiceClient,
  params: {
    roundId?: string | null;
    actorId?: string | null;
    actorName?: string | null;
    action: string;
    targetTable: string;
    targetId?: string | null;
    oldData?: unknown;
    newData?: unknown;
  }
) {
  const { error } = await supabase.from("multisource_evaluation_audit_logs").insert({
    round_id: params.roundId ?? null,
    actor_member_id: params.actorId ?? null,
    actor_name: params.actorName ?? null,
    action: params.action,
    target_table: params.targetTable,
    target_id: params.targetId ?? null,
    old_data: params.oldData ?? null,
    new_data: params.newData ?? null,
  });

  if (error) {
    console.error("Failed to write multisource evaluation audit log:", error);
  }
}

export async function resolveActorMemberId(
  supabase: ServiceClient,
  userId?: string | null
) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("members")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to resolve evaluation actor member:", error);
    return null;
  }

  return data?.id ?? null;
}

export async function bumpRoundVersion(
  supabase: ServiceClient,
  roundId: string,
  actorId?: string | null
) {
  const round = await getRound(supabase, roundId);
  if (!round) {
    throw new Error("Round not found");
  }

  const { error } = await supabase
    .from("multisource_evaluation_rounds")
    .update({
      config_version: round.config_version + 1,
      updated_by: actorId ?? null,
    })
    .eq("id", roundId);

  if (error) {
    throw error;
  }
}

export async function validateRound(
  supabase: ServiceClient,
  roundId: string
): Promise<ValidationResult> {
  const errors: string[] = [];
  const round = await getRound(supabase, roundId);

  if (!round) {
    return {
      valid: false,
      errors: ["회차를 찾을 수 없습니다."],
      missingPositionIds: [],
    };
  }

  const { data: roundDetail } = await supabase
    .from("multisource_evaluation_rounds")
    .select("name, start_date, end_date")
    .eq("id", roundId)
    .single();

  if (!roundDetail?.name || !roundDetail.start_date || !roundDetail.end_date) {
    errors.push("회차명과 기간은 필수입니다.");
  }

  const { data: subjects, error: subjectsError } = await supabase
    .from("multisource_evaluation_subjects")
    .select("member_id")
    .eq("round_id", roundId)
    .eq("is_excluded", false);

  if (subjectsError) {
    throw subjectsError;
  }

  const subjectIds = (subjects || []).map((subject) => subject.member_id as string);

  if (subjectIds.length === 0) {
    errors.push("평가 대상자를 1명 이상 선택해야 합니다.");
  }

  const { data: subjectMembers, error: membersError } = subjectIds.length
    ? await supabase
        .from("members")
        .select("id, position_id")
        .in("id", subjectIds)
    : { data: [], error: null };

  if (membersError) {
    throw membersError;
  }

  const representedPositionIds = Array.from(
    new Set(
      (subjectMembers || [])
        .map((member) => member.position_id as string | null)
        .filter(Boolean) as string[]
    )
  );

  const { data: questions, error: questionsError } = await supabase
    .from("multisource_evaluation_questions")
    .select("position_id")
    .eq("round_id", roundId);

  if (questionsError) {
    throw questionsError;
  }

  const questionPositionIds = new Set(
    (questions || []).map((question) => question.position_id as string)
  );
  const missingPositionIds = representedPositionIds.filter(
    (positionId) => !questionPositionIds.has(positionId)
  );

  if (missingPositionIds.length > 0) {
    errors.push("이번 회차 평가 대상자에 포함된 모든 직급에 문항이 필요합니다.");
  }

  const { data: assignments, error: assignmentsError } = subjectIds.length
    ? await supabase
        .from("multisource_evaluation_assignments")
        .select("subject_member_id")
        .eq("round_id", roundId)
        .eq("is_excluded", false)
        .in("subject_member_id", subjectIds)
    : { data: [], error: null };

  if (assignmentsError) {
    throw assignmentsError;
  }

  const assignedSubjectIds = new Set(
    (assignments || []).map((assignment) => assignment.subject_member_id as string)
  );
  const subjectsWithoutEvaluator = subjectIds.filter(
    (subjectId) => !assignedSubjectIds.has(subjectId)
  );

  if (subjectsWithoutEvaluator.length > 0) {
    errors.push("모든 평가 대상자에게 평가자가 1명 이상 배정되어야 합니다.");
  }

  return {
    valid: errors.length === 0,
    errors,
    missingPositionIds,
  };
}
