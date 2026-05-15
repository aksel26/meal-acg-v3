import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/client";

type Params = { params: Promise<{ id: string }> };

type DbClient = {
  from: (table: string) => QueryBuilder;
};

type QueryResponse<T = unknown> = {
  data: T;
  error: Error | null;
};

type QueryBuilder = PromiseLike<QueryResponse> & {
  select: (...args: unknown[]) => QueryBuilder;
  eq: (...args: unknown[]) => QueryBuilder;
  in: (...args: unknown[]) => QueryBuilder;
  order: (...args: unknown[]) => QueryBuilder;
  single: () => Promise<QueryResponse>;
};

type RoundRow = {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
};

type AssignmentRow = {
  id: string;
  subject_member_id: string;
  subject: {
    id: string;
    full_name: string;
    team_id: string | null;
    position_id: string | null;
    title_id: string | null;
  } | null;
};

type QuestionRow = {
  id: string;
  question_type: "score" | "subjective";
  prompt: string;
  weight: number | string | null;
  scale_weights: Record<string, number | string | null> | null;
  evaluator_types: string[] | null;
  sort_order: number;
  is_required: boolean;
};

type ResponseRow = {
  id: string;
  assignment_id: string;
  submitted_at: string;
};

type ResponseAnswerRow = {
  response_id: string;
  question_id: string | null;
  question_prompt: string;
  question_type: "score" | "subjective";
  score_value: number | null;
  text_answer: string | null;
};

type NamedRow = {
  id: string;
  name: string;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const supabase = createServiceClient() as unknown as DbClient | null;
    const { id: roundId } = await params;

    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase 환경 변수가 설정되지 않았습니다." },
        { status: 500 },
      );
    }

    const { data: round, error: roundError } = await supabase
      .from("multisource_evaluation_rounds")
      .select("id, name, description, start_date, end_date")
      .eq("id", roundId)
      .eq("is_deployed", true)
      .single();

    if (roundError || !round) {
      return NextResponse.json(
        { error: "활성화된 다면평가 회차를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const { data: assignments, error: assignmentsError } = await supabase
      .from("multisource_evaluation_assignments")
      .select("id, subject_member_id, subject:members!multisource_evaluation_assignments_subject_member_id_fkey(id, full_name, team_id, position_id, title_id)")
      .eq("round_id", roundId)
      .eq("evaluator_member_id", session.id)
      .eq("is_excluded", false);

    if (assignmentsError) throw assignmentsError;

    const assignmentRows = (assignments || []) as AssignmentRow[];
    if (assignmentRows.length === 0) {
      return NextResponse.json(
        { error: "평가자로 배정된 회차만 작성할 수 있습니다." },
        { status: 403 },
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
    const positionIds = unique(
      assignmentRows
        .map((assignment) => assignment.subject?.position_id)
        .filter((value): value is string => Boolean(value)),
    );
    const teamIds = unique(
      assignmentRows
        .map((assignment) => assignment.subject?.team_id)
        .filter((value): value is string => Boolean(value)),
    );
    const assignmentIds = assignmentRows.map((assignment) => assignment.id);

    const [
      questionsResult,
      positionsResult,
      teamsResult,
      responsesResult,
    ] = await Promise.all([
      supabase
        .from("multisource_evaluation_questions")
        .select("id, question_type, prompt, weight, scale_weights, evaluator_types, sort_order, is_required")
        .eq("round_id", roundId)
        .order("sort_order", { ascending: true }),
      positionIds.length
        ? supabase
            .from("positions")
            .select("id, name")
            .in("id", positionIds)
        : { data: [], error: null },
      teamIds.length
        ? supabase
            .from("teams")
            .select("id, name")
            .in("id", teamIds)
        : { data: [], error: null },
      assignmentIds.length
        ? supabase
            .from("multisource_evaluation_responses")
            .select("id, assignment_id, submitted_at")
            .eq("round_id", roundId)
            .eq("evaluator_member_id", session.id)
            .in("assignment_id", assignmentIds)
        : { data: [], error: null },
    ]);

    if (questionsResult.error) throw questionsResult.error;
    if (positionsResult.error) throw positionsResult.error;
    if (teamsResult.error) throw teamsResult.error;
    if (responsesResult.error) throw responsesResult.error;

    const questionRows = (questionsResult.data || []) as QuestionRow[];
    const positionsById = new Map(
      ((positionsResult.data || []) as NamedRow[]).map((position) => [
        position.id,
        position.name,
      ]),
    );
    const teamsById = new Map(
      ((teamsResult.data || []) as NamedRow[]).map((team) => [
        team.id,
        team.name,
      ]),
    );
    const responsesByAssignment = new Map(
      ((responsesResult.data || []) as ResponseRow[]).map((response) => [
        response.assignment_id,
        response,
      ]),
    );
    const responseIds = ((responsesResult.data || []) as ResponseRow[]).map(
      (response) => response.id,
    );
    const { data: responseAnswers, error: responseAnswersError } = responseIds.length
      ? await supabase
          .from("multisource_evaluation_response_answers")
          .select("response_id, question_id, question_prompt, question_type, score_value, text_answer")
          .in("response_id", responseIds)
      : { data: [], error: null };

    if (responseAnswersError) throw responseAnswersError;

    const answersByResponse = new Map<string, ResponseAnswerRow[]>();
    for (const answer of (responseAnswers || []) as ResponseAnswerRow[]) {
      const current = answersByResponse.get(answer.response_id) || [];
      current.push(answer);
      answersByResponse.set(answer.response_id, current);
    }

    const applicableQuestions = uniqueQuestions(
      questionRows.filter((question) => questionAppliesToEvaluator(question, evaluatorType)),
    );

    const subjects = assignmentRows.map((assignment) => {
      const subject = assignment.subject;
      const positionId = subject?.position_id || null;
      const response = responsesByAssignment.get(assignment.id);

      return {
        assignmentId: assignment.id,
        subjectMemberId: assignment.subject_member_id,
        subjectName: subject?.full_name || "이름 없음",
        positionName: positionId ? positionsById.get(positionId) || null : null,
        teamName: subject?.team_id ? teamsById.get(subject.team_id) || null : null,
        submittedAt: response?.submitted_at || null,
        responseId: response?.id || null,
        answers: response?.id
          ? formatAnswers(applicableQuestions, answersByResponse.get(response.id) || [])
          : {},
        questions: applicableQuestions.map(formatQuestion),
      };
    });

    const roundRow = round as RoundRow;
    return NextResponse.json({
      id: roundRow.id,
      name: roundRow.name,
      description: roundRow.description,
      startDate: roundRow.start_date,
      endDate: roundRow.end_date,
      evaluatorType,
      subjects,
    });
  } catch (error) {
    console.error("GET /api/evaluations/rounds/[id] error:", error);
    return NextResponse.json(
      { error: "다면평가 상세를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
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

function formatQuestion(question: QuestionRow) {
  const scale = getScaleValues(question.scale_weights);

  return {
    id: question.id,
    questionType: question.question_type,
    prompt: question.prompt,
    evaluatorTypes: normalizeQuestionEvaluatorTypes(question.evaluator_types),
    isRequired: question.is_required,
    sortOrder: question.sort_order,
    scale:
      question.question_type === "score"
        ? scale.map((score) => ({
            value: score,
            label: getScaleLabel(question.scale_weights, score),
            weight: Number(question.scale_weights?.[String(score)] ?? question.weight ?? 1),
          }))
        : [],
  };
}

function formatAnswers(questions: QuestionRow[], answers: ResponseAnswerRow[]) {
  const answersByQuestionId = new Map(
    answers
      .filter((answer) => answer.question_id)
      .map((answer) => [answer.question_id as string, answer]),
  );
  const answersByQuestionSnapshot = new Map(
    answers.map((answer) => [
      questionSnapshotKey({
        question_type: answer.question_type,
        prompt: answer.question_prompt,
      }),
      answer,
    ]),
  );

  const result: Record<string, { scoreValue?: number; textAnswer?: string }> = {};

  for (const question of questions) {
    const answer =
      answersByQuestionId.get(question.id) ||
      answersByQuestionSnapshot.get(questionSnapshotKey(question));
    if (!answer) continue;

    result[question.id] = {
      scoreValue: answer.score_value ?? undefined,
      textAnswer: answer.text_answer ?? undefined,
    };
  }

  return result;
}

function questionSnapshotKey(question: Pick<QuestionRow, "question_type" | "prompt">) {
  return [question.question_type, question.prompt].join("|");
}

function getScaleValues(scaleWeights: Record<string, number | string | null> | null) {
  const values = Object.keys(scaleWeights || {})
    .map((key) => Number(key))
    .filter((value) => Number.isInteger(value))
    .sort((a, b) => a - b);

  return values.length > 0 ? values : [1, 2, 3, 4, 5];
}

function getScaleLabel(
  scaleWeights: Record<string, number | string | null> | null,
  score: number,
) {
  const label = scaleWeights?.[`label:${score}`];
  return typeof label === "string" && label.trim() ? label : `${score}점`;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
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
