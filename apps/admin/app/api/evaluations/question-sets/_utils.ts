import { createServiceClient } from "@/lib/supabase/server";

type ServiceClient = ReturnType<typeof createServiceClient>;

export type QuestionSetItemInput = {
  positionId?: string;
  questionType?: "score" | "subjective";
  prompt?: string;
  category?: string | null;
  subcategory?: string | null;
  detail?: string | null;
  scaleGuide?: string | null;
  scaleMin?: number | string | null;
  scaleMax?: number | string | null;
  scaleWeights?: Record<string, number | string | null>;
  evaluatorTypes?: string[];
  evaluatorTitleIds?: string[];
  weight?: number | string | null;
  sortOrder?: number;
  isRequired?: boolean;
};

export type QuestionSetInput = {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  isDefault?: boolean;
  items?: QuestionSetItemInput[];
};

export function validateQuestionSetInput(input: QuestionSetInput) {
  if (!input.name?.trim()) {
    return "SET명을 입력하세요.";
  }
  if (input.isDefault && input.isActive === false) {
    return "비활성 SET은 기본 SET으로 지정할 수 없습니다.";
  }

  const items = Array.isArray(input.items) ? input.items : [];
  for (const item of items) {
    const prompt = item.prompt || buildQuestionPrompt(item);
    if (!item.questionType || !prompt.trim()) {
      return "모든 문항에 유형과 문항 내용을 입력하세요.";
    }
    if (!["score", "subjective"].includes(item.questionType)) {
      return "문항 유형은 점수형 또는 주관식이어야 합니다.";
    }
    if (item.questionType === "score" && Number(item.weight) <= 0) {
      return "점수형 문항은 0보다 큰 가중치가 필요합니다.";
    }
  }

  return null;
}

export function buildQuestionPrompt(item: QuestionSetItemInput) {
  const header = [item.category, item.subcategory]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" > ");
  const parts = [
    header,
    item.detail?.trim(),
    item.scaleGuide?.trim(),
  ].filter(Boolean);

  return parts.join("\n");
}

async function getFallbackQuestionPositionId(supabase: ServiceClient) {
  const { data, error } = await supabase
    .from("positions")
    .select("id")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    throw error || new Error("문항 저장에 사용할 기본 직급을 찾을 수 없습니다.");
  }

  return data.id as string;
}

async function toQuestionSetItemRowsWithFallback(
  supabase: ServiceClient,
  questionSetId: string,
  items?: QuestionSetItemInput[],
) {
  const fallbackPositionId = await getFallbackQuestionPositionId(supabase);
  const uniqueItems = Array.from(
    new Map(
      (items || []).map((item) => [
        [
          item.questionType,
          item.category || item.subcategory || item.detail || item.scaleGuide
            ? buildQuestionPrompt(item)
            : item.prompt,
          JSON.stringify(item.scaleWeights || {}),
          [...(item.evaluatorTypes || [])].sort().join(","),
        ].join("|"),
        item,
      ]),
    ).values(),
  );

  return uniqueItems.map((item, index) => ({
    question_set_id: questionSetId,
    position_id: item.positionId || fallbackPositionId,
    question_type: item.questionType,
    prompt:
      item.category || item.subcategory || item.detail || item.scaleGuide
        ? buildQuestionPrompt(item)
        : item.prompt,
    category: item.category?.trim() || null,
    subcategory: item.subcategory?.trim() || null,
    detail: item.detail?.trim() || null,
    scale_guide: item.scaleGuide?.trim() || null,
    scale_min: Number(item.scaleMin || 1),
    scale_max: Number(item.scaleMax || 5),
    scale_weights: item.scaleWeights || {},
    evaluator_types: item.evaluatorTypes || [],
    evaluator_title_ids: item.evaluatorTitleIds || [],
    weight: item.questionType === "score" ? Number(item.weight) : null,
    sort_order: item.sortOrder ?? index + 1,
    is_required: item.isRequired ?? true,
  }));
}

export async function replaceQuestionSetItems(
  supabase: ServiceClient,
  questionSetId: string,
  items?: QuestionSetItemInput[],
) {
  const { error: deleteError } = await supabase
    .from("multisource_evaluation_question_set_items")
    .delete()
    .eq("question_set_id", questionSetId);

  if (deleteError) throw deleteError;

  const rows = await toQuestionSetItemRowsWithFallback(supabase, questionSetId, items);
  if (rows.length === 0) return [];

  const { data, error } = await supabase
    .from("multisource_evaluation_question_set_items")
    .insert(rows)
    .select("*, position:positions(id, name)")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data || [];
}
