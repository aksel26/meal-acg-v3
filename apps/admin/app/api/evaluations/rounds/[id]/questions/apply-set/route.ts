import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdminPermission } from "@/lib/auth";
import {
  apiError,
  assertRoundEditable,
  bumpRoundVersion,
  getFallbackQuestionPositionId,
  logEvaluationAudit,
  normalizeEvaluatorTypes,
  resolveActorMemberId,
} from "../../../../_utils";
import { buildQuestionPrompt } from "../../../../question-sets/_utils";

type Params = { params: Promise<{ id: string }> };

type QuestionSetItemRow = {
  position_id?: string | null;
  question_type: "score" | "subjective";
  prompt: string;
  category?: string | null;
  subcategory?: string | null;
  detail?: string | null;
  scale_guide?: string | null;
  scale_weights?: Record<string, number | string | null>;
  evaluator_types?: string[] | null;
  weight: number | string | null;
  sort_order: number;
  is_required: boolean;
};

// POST /api/evaluations/rounds/[id]/questions/apply-set - Replace round questions from a reusable set
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminPermission("evaluation:write");
    const supabase = createServiceClient();
    const actorId = await resolveActorMemberId(supabase, session.userId);
    const { id: roundId } = await params;
    const body = await request.json();
    const questionSetId = body.questionSetId as string | undefined;

    if (!questionSetId) return apiError("questionSetId is required");

    await assertRoundEditable(supabase, roundId);

    const { data: questionSet, error: setError } = await supabase
      .from("multisource_evaluation_question_sets")
      .select("*, items:multisource_evaluation_question_set_items(*)")
      .eq("id", questionSetId)
      .eq("is_active", true)
      .single();

    if (setError || !questionSet) {
      return apiError("활성화된 문항 SET을 찾을 수 없습니다.", 404);
    }

    const items = (questionSet.items || []) as QuestionSetItemRow[];
    if (items.length === 0) {
      return apiError("문항이 없는 SET은 적용할 수 없습니다.");
    }
    const fallbackPositionId = await getFallbackQuestionPositionId(supabase);

    const { data: oldData } = await supabase
      .from("multisource_evaluation_questions")
      .select("*")
      .eq("round_id", roundId);

    const { error: deleteError } = await supabase
      .from("multisource_evaluation_questions")
      .delete()
      .eq("round_id", roundId);

    if (deleteError) {
      console.error("Error deleting round questions before applying set:", deleteError);
      return apiError("Failed to replace round questions", 500);
    }

    const uniqueItems = Array.from(
      new Map(
        items.map((item) => [
          [
            item.question_type,
            buildQuestionPrompt({
              prompt: item.prompt,
              category: item.category,
              subcategory: item.subcategory,
              detail: item.detail,
              scaleGuide: item.scale_guide,
            }),
            normalizeEvaluatorTypes(item.evaluator_types).join(","),
          ].join("|"),
          item,
        ])
      ).values()
    );

    const rows = uniqueItems.map((item) => ({
      round_id: roundId,
      position_id: item.position_id || fallbackPositionId,
      question_type: item.question_type,
      prompt: buildQuestionPrompt({
        prompt: item.prompt,
        category: item.category,
        subcategory: item.subcategory,
        detail: item.detail,
        scaleGuide: item.scale_guide,
      }),
      weight: item.question_type === "score" ? Number(item.weight) : null,
      scale_weights: item.question_type === "score" ? item.scale_weights || {} : {},
      evaluator_types: normalizeEvaluatorTypes(item.evaluator_types),
      sort_order: item.sort_order,
      is_required: item.is_required,
    }));

    const { data, error } = await supabase
      .from("multisource_evaluation_questions")
      .insert(rows)
      .select("*, position:positions(id, name)")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error applying question set to round:", error);
      return apiError("Failed to apply question set", 500);
    }

    const { error: updateRoundError } = await supabase
      .from("multisource_evaluation_rounds")
      .update({
        question_set_id: questionSetId,
        question_set_applied_at: new Date().toISOString(),
        updated_by: actorId,
      })
      .eq("id", roundId);

    if (updateRoundError) throw updateRoundError;

    await bumpRoundVersion(supabase, roundId, actorId);
    await logEvaluationAudit(supabase, {
      roundId,
      actorId,
      actorName: session.fullName,
      action: "APPLY_QUESTION_SET",
      targetTable: "multisource_evaluation_questions",
      targetId: questionSetId,
      oldData,
      newData: { questionSet, questions: data },
    });

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Evaluation apply question set API error:", error);
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
