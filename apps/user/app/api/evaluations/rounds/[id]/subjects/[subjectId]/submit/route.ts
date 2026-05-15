import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/client";

type Params = { params: Promise<{ id: string; subjectId: string }> };

type DbClient = {
  from: (table: string) => QueryBuilder;
};

type QueryResponse<T = unknown> = {
  data: T;
  error: Error | null;
};

type QueryBuilder = PromiseLike<QueryResponse> & {
  select: (...args: unknown[]) => QueryBuilder;
  insert: (...args: unknown[]) => QueryBuilder;
  delete: () => QueryBuilder;
  eq: (...args: unknown[]) => QueryBuilder;
  single: () => Promise<QueryResponse>;
  maybeSingle: () => Promise<QueryResponse>;
};

type QuestionRow = {
  id: string;
  question_type: "score" | "subjective";
  prompt: string;
  weight: number | string | null;
  scale_weights: Record<string, number | string | null> | null;
  evaluator_types: string[] | null;
  is_required: boolean;
};

type AnswerInput = {
  questionId?: string;
  scoreValue?: number;
  textAnswer?: string;
};

export async function POST(request: Request, { params }: Params) {
  const supabase = createServiceClient() as unknown as DbClient | null;
  let responseId: string | null = null;

  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { id: roundId, subjectId } = await params;
    const body = await request.json();
    const answers = Array.isArray(body.answers) ? (body.answers as AnswerInput[]) : [];

    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase 환경 변수가 설정되지 않았습니다." },
        { status: 500 },
      );
    }

    const { data: round, error: roundError } = await supabase
      .from("multisource_evaluation_rounds")
      .select("id")
      .eq("id", roundId)
      .eq("is_deployed", true)
      .single();

    if (roundError || !round) {
      return NextResponse.json(
        { error: "활성화된 다면평가 회차를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from("multisource_evaluation_assignments")
      .select("id, subject_member_id")
      .eq("round_id", roundId)
      .eq("subject_member_id", subjectId)
      .eq("evaluator_member_id", session.id)
      .eq("is_excluded", false)
      .single();

    const assignmentRow = assignment as { id: string; subject_member_id: string } | null;
    if (assignmentError || !assignmentRow) {
      return NextResponse.json(
        { error: "평가자로 배정된 대상만 제출할 수 있습니다." },
        { status: 403 },
      );
    }

    const { data: existingResponse, error: existingError } = await supabase
      .from("multisource_evaluation_responses")
      .select("id")
      .eq("assignment_id", assignmentRow.id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existingResponse) {
      return NextResponse.json(
        { error: "이미 제출된 평가는 수정할 수 없습니다." },
        { status: 409 },
      );
    }

    const { data: evaluator, error: evaluatorError } = await supabase
      .from("members")
      .select("id, titles(name)")
      .eq("id", session.id)
      .single();

    if (evaluatorError) throw evaluatorError;

    const evaluatorRow = evaluator as { titles?: unknown } | null;
    const evaluatorType = getEvaluatorType(evaluatorRow?.titles);
    const { data: questions, error: questionsError } = await supabase
      .from("multisource_evaluation_questions")
      .select("id, question_type, prompt, weight, scale_weights, evaluator_types, is_required")
      .eq("round_id", roundId);

    if (questionsError) throw questionsError;

    const questionRows = uniqueQuestions(
      ((questions || []) as QuestionRow[]).filter((question) =>
        questionAppliesToEvaluator(question, evaluatorType),
      ),
    );
    const validation = validateAnswers(questionRows, answers);

    if (!validation.ok) {
      return NextResponse.json({ error: validation.message }, { status: 400 });
    }

    const { data: response, error: responseError } = await supabase
      .from("multisource_evaluation_responses")
      .insert({
        round_id: roundId,
        assignment_id: assignmentRow.id,
        subject_member_id: subjectId,
        evaluator_member_id: session.id,
      })
      .select("id")
      .single();

    if (responseError) throw responseError;
    const responseRow = response as { id: string };
    responseId = responseRow.id;

    const answerRows = questionRows
      .filter((question) => hasAnswer(question, answers))
      .map((question) => {
      const answer = answers.find((item) => item.questionId === question.id);
      const scoreValue =
        question.question_type === "score" ? Number(answer?.scoreValue) : null;
      const scaleWeight =
        question.question_type === "score"
          ? Number(question.scale_weights?.[String(scoreValue)] ?? question.weight ?? 1)
          : null;

      return {
        response_id: responseId,
        question_id: question.id,
        question_prompt: question.prompt,
        question_type: question.question_type,
        score_value: scoreValue,
        scale_weight: scaleWeight,
        text_answer:
          question.question_type === "subjective"
            ? String(answer?.textAnswer || "").trim()
            : null,
      };
    });

    const { error: answersError } = await supabase
      .from("multisource_evaluation_response_answers")
      .insert(answerRows);

    if (answersError) throw answersError;

    return NextResponse.json({ success: true, responseId });
  } catch (error) {
    console.error("POST /api/evaluations/rounds/[id]/subjects/[subjectId]/submit error:", error);

    if (supabase && responseId) {
      try {
        await supabase
          .from("multisource_evaluation_responses")
          .delete()
          .eq("id", responseId);
      } catch {
        // Best-effort cleanup for a partially inserted response.
      }
    }

    return NextResponse.json(
      { error: "다면평가를 제출하지 못했습니다." },
      { status: 500 },
    );
  }
}

function validateAnswers(questions: QuestionRow[], answers: AnswerInput[]) {
  if (questions.length === 0) {
    return { ok: false, message: "제출할 문항이 없습니다." };
  }

  for (const question of questions) {
    const answer = answers.find((item) => item.questionId === question.id);
    if (!question.is_required && !answer) continue;

    if (question.question_type === "score") {
      const score = Number(answer?.scoreValue);
      const values = getScaleValues(question.scale_weights);
      if (!values.includes(score)) {
        return { ok: false, message: "모든 척도 문항을 선택해주세요." };
      }
    } else if (!String(answer?.textAnswer || "").trim()) {
      return { ok: false, message: "모든 주관식 문항을 입력해주세요." };
    }
  }

  return { ok: true };
}

function hasAnswer(question: QuestionRow, answers: AnswerInput[]) {
  const answer = answers.find((item) => item.questionId === question.id);
  if (question.question_type === "score") {
    return answer?.scoreValue !== undefined;
  }
  return Boolean(answer?.textAnswer?.trim());
}

function getEvaluatorType(titles: unknown) {
  const title = Array.isArray(titles) ? titles[0] : titles;
  const name =
    title && typeof title === "object" && "name" in title
      ? String((title as { name?: unknown }).name || "")
      : "";
  return ["대표", "본부장", "팀장", "파트장"].some((keyword) =>
    name.includes(keyword),
  )
    ? "상사"
    : "동료";
}

function questionAppliesToEvaluator(question: QuestionRow, evaluatorType: string) {
  const types = Array.isArray(question.evaluator_types)
    ? question.evaluator_types
    : [];
  return types.length === 0 || types.includes(evaluatorType);
}

function uniqueQuestions(questions: QuestionRow[]) {
  const seen = new Set<string>();
  const result: QuestionRow[] = [];

  for (const question of questions) {
    const key = [
      question.question_type,
      question.prompt,
      JSON.stringify(question.scale_weights || {}),
      normalizeQuestionEvaluatorTypes(question.evaluator_types).join(","),
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(question);
  }

  return result;
}

function normalizeQuestionEvaluatorTypes(value: string[] | null) {
  return Array.isArray(value) && value.length > 0 ? [...value].sort() : ["상사", "동료"];
}

function getScaleValues(scaleWeights: Record<string, number | string | null> | null) {
  const values = Object.keys(scaleWeights || {})
    .map((key) => Number(key))
    .filter((value) => Number.isInteger(value))
    .sort((a, b) => a - b);

  return values.length > 0 ? values : [1, 2, 3, 4, 5];
}
