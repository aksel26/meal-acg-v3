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

// PUT /api/evaluations/rounds/[id]/assignments - Replace evaluator assignments
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminPermission("evaluation:write");
    const supabase = createServiceClient();
    const actorId = await resolveActorMemberId(supabase, session.userId);
    const { id } = await params;
    const body = await request.json();
    const assignments = Array.isArray(body.assignments) ? body.assignments : [];

    await assertRoundEditable(supabase, id);

    for (const assignment of assignments) {
      if (!assignment.subjectMemberId || !assignment.evaluatorMemberId) {
        return apiError("subjectMemberId and evaluatorMemberId are required");
      }
      if (assignment.subjectMemberId === assignment.evaluatorMemberId) {
        return apiError("A member cannot evaluate themself");
      }
    }

    const { data: oldData } = await supabase
      .from("multisource_evaluation_assignments")
      .select("*")
      .eq("round_id", id);

    const { error: deleteError } = await supabase
      .from("multisource_evaluation_assignments")
      .delete()
      .eq("round_id", id);

    if (deleteError) {
      console.error("Error deleting evaluation assignments:", deleteError);
      return apiError("Failed to replace assignments", 500);
    }

    const rows = assignments.map((assignment: {
      subjectMemberId: string;
      evaluatorMemberId: string;
      source?: "auto_same_team" | "auto_leader" | "manual";
      isExcluded?: boolean;
      excludedReason?: string | null;
    }) => ({
      round_id: id,
      subject_member_id: assignment.subjectMemberId,
      evaluator_member_id: assignment.evaluatorMemberId,
      source: assignment.source || "manual",
      is_excluded: assignment.isExcluded ?? false,
      excluded_reason: assignment.excludedReason || null,
    }));

    const { data, error } = rows.length
      ? await supabase
          .from("multisource_evaluation_assignments")
          .insert(rows)
          .select()
      : { data: [], error: null };

    if (error) {
      console.error("Error inserting evaluation assignments:", error);
      return apiError("Failed to replace assignments", 500);
    }

    await bumpRoundVersion(supabase, id, actorId);
    await logEvaluationAudit(supabase, {
      roundId: id,
      actorId,
      actorName: session.fullName,
      action: "REPLACE_ASSIGNMENTS",
      targetTable: "multisource_evaluation_assignments",
      oldData,
      newData: data,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Evaluation assignments API error:", error);
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
