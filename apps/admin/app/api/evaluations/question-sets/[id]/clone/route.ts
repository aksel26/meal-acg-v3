import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import {
  apiError,
  logEvaluationAudit,
  resolveActorMemberId,
} from "../../../_utils";
import { replaceQuestionSetItems } from "../../_utils";

type Params = { params: Promise<{ id: string }> };

// POST /api/evaluations/question-sets/[id]/clone - Clone a reusable question set
export async function POST(_request: Request, { params }: Params) {
  try {
    const session = await requireAdmin();
    const supabase = createServiceClient();
    const actorId = await resolveActorMemberId(supabase, session.userId);
    const { id } = await params;

    const { data: source, error: sourceError } = await supabase
      .from("multisource_evaluation_question_sets")
      .select("*, items:multisource_evaluation_question_set_items(*)")
      .eq("id", id)
      .single();

    if (sourceError || !source) return apiError("Question set not found", 404);

    const { data: questionSet, error } = await supabase
      .from("multisource_evaluation_question_sets")
      .insert({
        name: `${source.name} 복사본`,
        description: source.description,
        is_active: source.is_active,
        is_default: false,
        created_by: actorId,
        updated_by: actorId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error cloning evaluation question set:", error);
      return apiError("Failed to clone question set", 500);
    }

    const items = await replaceQuestionSetItems(
      supabase,
      questionSet.id,
      (source.items || []).map((item: {
        position_id: string;
        question_type: "score" | "subjective";
        prompt: string;
        category?: string | null;
        subcategory?: string | null;
        detail?: string | null;
        scale_guide?: string | null;
        scale_min?: number | null;
        scale_max?: number | null;
        scale_weights?: Record<string, number | string | null> | null;
        evaluator_types?: string[] | null;
        evaluator_title_ids?: string[] | null;
        weight: number | string | null;
        sort_order: number;
        is_required: boolean;
      }) => ({
        positionId: item.position_id,
        questionType: item.question_type,
        prompt: item.prompt,
        category: item.category,
        subcategory: item.subcategory,
        detail: item.detail,
        scaleGuide: item.scale_guide,
        scaleMin: item.scale_min,
        scaleMax: item.scale_max,
        scaleWeights: item.scale_weights || {},
        evaluatorTypes: item.evaluator_types || [],
        evaluatorTitleIds: item.evaluator_title_ids || [],
        weight: item.weight,
        sortOrder: item.sort_order,
        isRequired: item.is_required,
      })),
    );
    const result = { ...questionSet, items };

    await logEvaluationAudit(supabase, {
      actorId,
      actorName: session.fullName,
      action: "CLONE_QUESTION_SET",
      targetTable: "multisource_evaluation_question_sets",
      targetId: questionSet.id,
      oldData: source,
      newData: result,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Evaluation question set clone API error:", error);
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
