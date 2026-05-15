import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import {
  apiError,
  assertRoundEditable,
  buildRequiredEvaluatorTypes,
  bumpRoundVersion,
  evaluatorTypeForMember,
  logEvaluationAudit,
  normalizeEvaluatorTypes,
  resolveActorMemberId,
} from "../../../../_utils";

type Params = { params: Promise<{ id: string }> };

type MemberRow = {
  id: string;
  full_name: string;
  team_id: string | null;
  position_id: string | null;
  title_id: string | null;
  titleName: string | null;
};

// POST /api/evaluations/rounds/[id]/assignments/generate
// Generate default assignments: same team members + team lead/superior.
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin();
    const supabase = createServiceClient();
    const actorId = await resolveActorMemberId(supabase, session.userId);
    const { id } = await params;

    await assertRoundEditable(supabase, id);

    const { data: subjects, error: subjectsError } = await supabase
      .from("multisource_evaluation_subjects")
      .select("member_id")
      .eq("round_id", id)
      .eq("is_excluded", false);

    if (subjectsError) {
      console.error("Error fetching evaluation subjects:", subjectsError);
      return apiError("Failed to generate assignments", 500);
    }

    const subjectIds = (subjects || []).map((subject) => subject.member_id as string);
    if (subjectIds.length === 0) {
      return apiError("평가 대상자를 먼저 선택해주세요.");
    }

    const { data: questions, error: questionsError } = await supabase
      .from("multisource_evaluation_questions")
      .select("evaluator_types")
      .eq("round_id", id);

    if (questionsError) {
      console.error("Error fetching evaluation questions for assignments:", questionsError);
      return apiError("Failed to generate assignments", 500);
    }

    const requiredEvaluatorTypes = buildRequiredEvaluatorTypes(
      (questions || []) as Array<{ evaluator_types?: unknown }>
    );

    const { data: members, error: membersError } = await supabase
      .from("members")
      .select("id, full_name, team_id, position_id, title_id, titles(name)")
      .not("team_id", "is", null);

    if (membersError) {
      console.error("Error fetching members for assignment generation:", membersError);
      return apiError("Failed to generate assignments", 500);
    }

    const memberRows: MemberRow[] = (members || []).map((member) => {
      const title = Array.isArray(member.titles) ? member.titles[0] : member.titles;
      return {
        id: member.id as string,
        full_name: member.full_name as string,
        team_id: member.team_id as string | null,
        position_id: member.position_id as string | null,
        title_id: member.title_id as string | null,
        titleName: (title?.name as string | undefined) ?? null,
      };
    });
    const membersById = new Map(memberRows.map((member) => [member.id, member]));
    const rows = [];

    for (const subjectId of subjectIds) {
      const subject = membersById.get(subjectId);
      if (!subject?.team_id) {
        continue;
      }
      const requiredTypes =
        requiredEvaluatorTypes.size > 0
          ? requiredEvaluatorTypes
          : new Set(normalizeEvaluatorTypes(null));

      for (const candidate of memberRows) {
        if (candidate.id === subject.id || candidate.team_id !== subject.team_id) {
          continue;
        }
        const evaluatorType = evaluatorTypeForMember(candidate);
        if (!requiredTypes.has(evaluatorType)) {
          continue;
        }

        rows.push({
          round_id: id,
          subject_member_id: subject.id,
          evaluator_member_id: candidate.id,
          source: evaluatorType === "상사" ? "auto_leader" : "auto_same_team",
          is_excluded: false,
        });
      }
    }

    const { data: oldAutoAssignments } = await supabase
      .from("multisource_evaluation_assignments")
      .select("*")
      .eq("round_id", id)
      .in("source", ["auto_same_team", "auto_leader"]);

    const { error: deleteError } = await supabase
      .from("multisource_evaluation_assignments")
      .delete()
      .eq("round_id", id)
      .in("source", ["auto_same_team", "auto_leader"]);

    if (deleteError) {
      console.error("Error deleting existing automatic assignments:", deleteError);
      return apiError("Failed to generate assignments", 500);
    }

    const { data, error } = rows.length
      ? await supabase
          .from("multisource_evaluation_assignments")
          .upsert(rows, {
            onConflict: "round_id,subject_member_id,evaluator_member_id",
            ignoreDuplicates: true,
          })
          .select()
      : { data: [], error: null };

    if (error) {
      console.error("Error inserting generated assignments:", error);
      return apiError("Failed to generate assignments", 500);
    }

    await bumpRoundVersion(supabase, id, actorId);
    await logEvaluationAudit(supabase, {
      roundId: id,
      actorId,
      actorName: session.fullName,
      action: "GENERATE_ASSIGNMENTS",
      targetTable: "multisource_evaluation_assignments",
      oldData: oldAutoAssignments,
      newData: data,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Evaluation assignment generation API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return apiError("Forbidden", 403);
    }
    if (error instanceof Error && error.message === "Round not found") {
      return apiError("Round not found", 404);
    }
    if (error instanceof Error) {
      return apiError(error.message, 400);
    }
    return apiError("Internal server error", 500);
  }
}
