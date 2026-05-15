import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import {
  apiError,
  assertRoundEditable,
  bumpRoundVersion,
  getFallbackQuestionPositionId,
  logEvaluationAudit,
  normalizeEvaluatorTypes,
  resolveActorMemberId,
} from "../../../_utils";

type Params = { params: Promise<{ id: string }> };

// PUT /api/evaluations/rounds/[id]/questions - Replace round questions
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin();
    const supabase = createServiceClient();
    const actorId = await resolveActorMemberId(supabase, session.userId);
    const { id } = await params;
    const body = await request.json();
    const questions = Array.isArray(body.questions) ? body.questions : [];

    await assertRoundEditable(supabase, id);
    const fallbackPositionId = await getFallbackQuestionPositionId(supabase);

    for (const question of questions) {
      if (!question.questionType || !question.prompt) {
        return apiError("questionType and prompt are required for every question");
      }
      if (!["score", "subjective"].includes(question.questionType)) {
        return apiError("questionType must be score or subjective");
      }
      if (question.questionType === "score" && Number(question.weight) <= 0) {
        return apiError("score questions require a positive weight");
      }
    }

    const { data: oldData } = await supabase
      .from("multisource_evaluation_questions")
      .select("*")
      .eq("round_id", id);

    const { error: deleteError } = await supabase
      .from("multisource_evaluation_questions")
      .delete()
      .eq("round_id", id);

    if (deleteError) {
      console.error("Error deleting evaluation questions:", deleteError);
      return apiError("Failed to replace questions", 500);
    }

    const rows = questions.map((question: {
      positionId: string;
      questionType: "score" | "subjective";
      prompt: string;
      evaluatorTypes?: string[];
      weight?: number | string | null;
      sortOrder?: number;
      isRequired?: boolean;
    }, index: number) => ({
      round_id: id,
      position_id: question.positionId || fallbackPositionId,
      question_type: question.questionType,
      prompt: question.prompt,
      weight: question.questionType === "score" ? Number(question.weight) : null,
      evaluator_types: normalizeEvaluatorTypes(question.evaluatorTypes),
      sort_order: question.sortOrder ?? index + 1,
      is_required: question.isRequired ?? true,
    }));

    const { data, error } = rows.length
      ? await supabase
          .from("multisource_evaluation_questions")
          .insert(rows)
          .select()
      : { data: [], error: null };

    if (error) {
      console.error("Error inserting evaluation questions:", error);
      return apiError("Failed to replace questions", 500);
    }

    await bumpRoundVersion(supabase, id, actorId);
    await logEvaluationAudit(supabase, {
      roundId: id,
      actorId,
      actorName: session.fullName,
      action: "REPLACE_QUESTIONS",
      targetTable: "multisource_evaluation_questions",
      oldData,
      newData: data,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Evaluation questions API error:", error);
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
