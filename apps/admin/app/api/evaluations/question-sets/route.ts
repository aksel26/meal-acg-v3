import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import {
  apiError,
  logEvaluationAudit,
  resolveActorMemberId,
} from "../_utils";
import {
  replaceQuestionSetItems,
  validateQuestionSetInput,
  type QuestionSetInput,
} from "./_utils";

// GET /api/evaluations/question-sets - List reusable question sets
export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("multisource_evaluation_question_sets")
      .select("*, items:multisource_evaluation_question_set_items(*, position:positions(id, name))")
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false })
      .order("sort_order", {
        ascending: true,
        foreignTable: "multisource_evaluation_question_set_items",
      });

    if (error) {
      console.error("Error fetching evaluation question sets:", error);
      return apiError("Failed to fetch question sets", 500);
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Evaluation question sets API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return apiError("Forbidden", 403);
    }
    return apiError("Internal server error", 500);
  }
}

// POST /api/evaluations/question-sets - Create a reusable question set
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const supabase = createServiceClient();
    const actorId = await resolveActorMemberId(supabase, session.userId);
    const body = (await request.json()) as QuestionSetInput;
    const validationError = validateQuestionSetInput(body);

    if (validationError) return apiError(validationError);

    if (body.isDefault) {
      const { error } = await supabase
        .from("multisource_evaluation_question_sets")
        .update({ is_default: false, updated_by: actorId })
        .eq("is_default", true);
      if (error) throw error;
    }

    const { data: questionSet, error } = await supabase
      .from("multisource_evaluation_question_sets")
      .insert({
        name: body.name?.trim(),
        description: body.description?.trim() || null,
        is_active: body.isActive ?? true,
        is_default: body.isDefault ?? false,
        created_by: actorId,
        updated_by: actorId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating evaluation question set:", error);
      return apiError("Failed to create question set", 500);
    }

    const items = await replaceQuestionSetItems(supabase, questionSet.id, body.items);
    const result = { ...questionSet, items };

    await logEvaluationAudit(supabase, {
      actorId,
      actorName: session.fullName,
      action: "CREATE_QUESTION_SET",
      targetTable: "multisource_evaluation_question_sets",
      targetId: questionSet.id,
      newData: result,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Evaluation question set create API error:", error);
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
