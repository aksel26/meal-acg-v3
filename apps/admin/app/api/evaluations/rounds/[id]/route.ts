import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import {
  apiError,
  assertRoundEditable,
  bumpRoundVersion,
  logEvaluationAudit,
  resolveActorMemberId,
} from "../../_utils";

type Params = { params: Promise<{ id: string }> };

// GET /api/evaluations/rounds/[id] - Get round setup detail
export async function GET(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;

    const [
      roundResult,
      questionsResult,
      subjectsResult,
      assignmentsResult,
    ] = await Promise.all([
      supabase
        .from("multisource_evaluation_rounds")
        .select("*")
        .eq("id", id)
        .single(),
      supabase
        .from("multisource_evaluation_questions")
        .select("*, position:positions(id, name)")
        .eq("round_id", id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("multisource_evaluation_subjects")
        .select("*, member:members(id, full_name, team_id, position_id, title_id)")
        .eq("round_id", id),
      supabase
        .from("multisource_evaluation_assignments")
        .select("*, subject:members!multisource_evaluation_assignments_subject_member_id_fkey(id, full_name), evaluator:members!multisource_evaluation_assignments_evaluator_member_id_fkey(id, full_name)")
        .eq("round_id", id),
    ]);

    if (roundResult.error) {
      return apiError("Round not found", 404);
    }

    if (questionsResult.error || subjectsResult.error || assignmentsResult.error) {
      console.error("Error fetching evaluation round detail:", {
        questions: questionsResult.error,
        subjects: subjectsResult.error,
        assignments: assignmentsResult.error,
      });
      return apiError("Failed to fetch evaluation round detail", 500);
    }

    return NextResponse.json({
      ...roundResult.data,
      questions: questionsResult.data || [],
      subjects: subjectsResult.data || [],
      assignments: assignmentsResult.data || [],
    });
  } catch (error) {
    console.error("Evaluation round detail API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return apiError("Forbidden", 403);
    }
    return apiError("Internal server error", 500);
  }
}

// PUT /api/evaluations/rounds/[id] - Update round metadata while not deployed
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin();
    const supabase = createServiceClient();
    const actorId = await resolveActorMemberId(supabase, session.userId);
    const { id } = await params;
    const body = await request.json();
    const { name, description, startDate, endDate } = body;

    await assertRoundEditable(supabase, id);

    if (!name || !startDate || !endDate) {
      return apiError("name, startDate, and endDate are required");
    }

    const { data: oldData } = await supabase
      .from("multisource_evaluation_rounds")
      .select("*")
      .eq("id", id)
      .single();

    const { data, error } = await supabase
      .from("multisource_evaluation_rounds")
      .update({
        name,
        description: description || null,
        start_date: startDate,
        end_date: endDate,
        updated_by: actorId,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating evaluation round:", error);
      return apiError("Failed to update evaluation round", 500);
    }

    await bumpRoundVersion(supabase, id, actorId);
    await logEvaluationAudit(supabase, {
      roundId: id,
      actorId,
      actorName: session.fullName,
      action: "UPDATE_ROUND",
      targetTable: "multisource_evaluation_rounds",
      targetId: id,
      oldData,
      newData: data,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Evaluation round update API error:", error);
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

// DELETE /api/evaluations/rounds/[id] - Delete a non-deployed round
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin();
    const supabase = createServiceClient();
    const actorId = await resolveActorMemberId(supabase, session.userId);
    const { id } = await params;

    await assertRoundEditable(supabase, id);

    const { data: oldData } = await supabase
      .from("multisource_evaluation_rounds")
      .select("*")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("multisource_evaluation_rounds")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting evaluation round:", error);
      return apiError("Failed to delete evaluation round", 500);
    }

    await logEvaluationAudit(supabase, {
      roundId: null,
      actorId,
      actorName: session.fullName,
      action: "DELETE_ROUND",
      targetTable: "multisource_evaluation_rounds",
      targetId: id,
      oldData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Evaluation round delete API error:", error);
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
