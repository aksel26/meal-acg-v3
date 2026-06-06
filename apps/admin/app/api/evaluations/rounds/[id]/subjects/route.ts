import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminPermission } from "@/lib/auth";
import {
  apiError,
  assertRoundEditable,
  bumpRoundVersion,
  logEvaluationAudit,
  resolveActorMemberId,
} from "../../../_utils";

type Params = { params: Promise<{ id: string }> };

// PUT /api/evaluations/rounds/[id]/subjects - Replace subjects/exclusions
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminPermission("evaluation:write");
    const supabase = createServiceClient();
    const actorId = await resolveActorMemberId(supabase, session.userId);
    const { id } = await params;
    const body = await request.json();
    const subjectIds = Array.isArray(body.subjectIds) ? body.subjectIds : [];
    const excludedIds = new Set<string>(
      Array.isArray(body.excludedIds) ? body.excludedIds : []
    );

    await assertRoundEditable(supabase, id);

    if (subjectIds.length === 0) {
      return apiError("subjectIds must include at least one member");
    }

    const uniqueSubjectIds = Array.from(new Set(subjectIds)) as string[];

    const { data: oldData } = await supabase
      .from("multisource_evaluation_subjects")
      .select("*")
      .eq("round_id", id);

    const { error: assignmentDeleteError } = await supabase
      .from("multisource_evaluation_assignments")
      .delete()
      .eq("round_id", id);

    if (assignmentDeleteError) {
      console.error("Error deleting evaluation assignments:", assignmentDeleteError);
      return apiError("Failed to replace subjects", 500);
    }

    const { error: subjectDeleteError } = await supabase
      .from("multisource_evaluation_subjects")
      .delete()
      .eq("round_id", id);

    if (subjectDeleteError) {
      console.error("Error deleting evaluation subjects:", subjectDeleteError);
      return apiError("Failed to replace subjects", 500);
    }

    const rows = uniqueSubjectIds.map((memberId) => ({
      round_id: id,
      member_id: memberId,
      is_excluded: excludedIds.has(memberId),
    }));

    const { data, error } = await supabase
      .from("multisource_evaluation_subjects")
      .insert(rows)
      .select();

    if (error) {
      console.error("Error inserting evaluation subjects:", error);
      return apiError("Failed to replace subjects", 500);
    }

    await bumpRoundVersion(supabase, id, actorId);
    await logEvaluationAudit(supabase, {
      roundId: id,
      actorId,
      actorName: session.fullName,
      action: "REPLACE_SUBJECTS",
      targetTable: "multisource_evaluation_subjects",
      oldData,
      newData: data,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Evaluation subjects API error:", error);
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
