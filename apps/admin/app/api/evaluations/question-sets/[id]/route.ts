import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminPermission } from "@/lib/auth";
import {
  apiError,
  logEvaluationAudit,
  resolveActorMemberId,
} from "../../_utils";
import {
  replaceQuestionSetItems,
  validateQuestionSetInput,
  type QuestionSetInput,
} from "../_utils";

type Params = { params: Promise<{ id: string }> };

// GET /api/evaluations/question-sets/[id] - Get a reusable question set detail
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireAdminPermission("evaluation:read");
    const supabase = createServiceClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from("multisource_evaluation_question_sets")
      .select("*, items:multisource_evaluation_question_set_items(*, position:positions(id, name))")
      .eq("id", id)
      .order("sort_order", {
        ascending: true,
        foreignTable: "multisource_evaluation_question_set_items",
      })
      .single();

    if (error || !data) {
      return apiError("Question set not found", 404);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Evaluation question set detail API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return apiError("Forbidden", 403);
    }
    return apiError("Internal server error", 500);
  }
}

// PUT /api/evaluations/question-sets/[id] - Update a reusable question set
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminPermission("evaluation:write");
    const supabase = createServiceClient();
    const actorId = await resolveActorMemberId(supabase, session.userId);
    const { id } = await params;
    const body = (await request.json()) as QuestionSetInput;
    const validationError = validateQuestionSetInput(body);

    if (validationError) return apiError(validationError);

    const { data: oldData } = await supabase
      .from("multisource_evaluation_question_sets")
      .select("*, items:multisource_evaluation_question_set_items(*)")
      .eq("id", id)
      .single();

    if (!oldData) return apiError("Question set not found", 404);

    if (body.isDefault) {
      const { error } = await supabase
        .from("multisource_evaluation_question_sets")
        .update({ is_default: false, updated_by: actorId })
        .neq("id", id)
        .eq("is_default", true);
      if (error) throw error;
    }

    const { data: questionSet, error } = await supabase
      .from("multisource_evaluation_question_sets")
      .update({
        name: body.name?.trim(),
        description: body.description?.trim() || null,
        is_active: body.isActive ?? true,
        is_default: body.isDefault ?? false,
        updated_by: actorId,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating evaluation question set:", error);
      return apiError("Failed to update question set", 500);
    }

    const items = await replaceQuestionSetItems(supabase, id, body.items);
    const result = { ...questionSet, items };

    await logEvaluationAudit(supabase, {
      actorId,
      actorName: session.fullName,
      action: "UPDATE_QUESTION_SET",
      targetTable: "multisource_evaluation_question_sets",
      targetId: id,
      oldData,
      newData: result,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Evaluation question set update API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return apiError("Forbidden", 403);
    }
    if (error instanceof Error) {
      return apiError(error.message, 400);
    }
    return apiError("Internal server error", 500);
  }
}

// DELETE /api/evaluations/question-sets/[id] - Delete a reusable question set
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminPermission("evaluation:write");
    const supabase = createServiceClient();
    const actorId = await resolveActorMemberId(supabase, session.userId);
    const { id } = await params;

    const { data: oldData } = await supabase
      .from("multisource_evaluation_question_sets")
      .select("*, items:multisource_evaluation_question_set_items(*)")
      .eq("id", id)
      .single();

    if (!oldData) return apiError("Question set not found", 404);

    const { error } = await supabase
      .from("multisource_evaluation_question_sets")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting evaluation question set:", error);
      return apiError("Failed to delete question set", 500);
    }

    await logEvaluationAudit(supabase, {
      actorId,
      actorName: session.fullName,
      action: "DELETE_QUESTION_SET",
      targetTable: "multisource_evaluation_question_sets",
      targetId: id,
      oldData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Evaluation question set delete API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return apiError("Forbidden", 403);
    }
    if (error instanceof Error) {
      return apiError(error.message, 400);
    }
    return apiError("Internal server error", 500);
  }
}
