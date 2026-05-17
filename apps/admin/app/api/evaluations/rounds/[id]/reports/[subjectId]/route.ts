import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, evaluatorTypeForMember } from "../../../../_utils";

type Params = { params: Promise<{ id: string; subjectId: string }> };
type EvaluatorType = "상사" | "동료";
type QuestionCategory = "공통" | "상사" | "동료";

type NamedRelation = { name?: string | null };

type MemberRelation = {
  id: string;
  full_name?: string;
  teams?: NamedRelation | NamedRelation[] | null;
  positions?: NamedRelation | NamedRelation[] | null;
  titles?: NamedRelation | NamedRelation[] | null;
};

type AssignmentRow = {
  id: string;
  source: string;
  evaluator: MemberRelation | MemberRelation[] | null;
};

type ResponseRow = {
  id: string;
  assignment_id: string;
  submitted_at: string;
};

type AnswerRow = {
  response_id: string;
  question_id: string | null;
  question_prompt: string;
  question_type: "score" | "subjective";
  score_value: number | string | null;
  scale_weight: number | string | null;
  text_answer: string | null;
};

type QuestionRow = {
  id: string;
  prompt: string;
  question_type: "score" | "subjective";
  sort_order: number;
  evaluator_types: string[] | null;
};

type RoundRow = {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_deployed: boolean;
  question_set_applied_at: string | null;
  updated_at: string;
  question_set?: {
    id: string;
    name: string;
  } | null;
};

type ScoreBucket = {
  scoreSum: number;
  weightedScoreSum: number;
  count: number;
};

type QuestionScoreBucket = ScoreBucket & {
  key: string;
  questionId: string | null;
  label: string;
  sortOrder: number;
  questionCategory: QuestionCategory;
  lowerKeyword: string | null;
  upperKeyword: string | null;
  byEvaluatorType: Record<EvaluatorType, ScoreBucket>;
};

type SubjectiveBucket = {
  key: string;
  questionId: string | null;
  label: string;
  sortOrder: number;
  questionCategory: QuestionCategory;
  answers: Array<{
    evaluatorType: EvaluatorType;
    textAnswer: string;
    submittedAt: string | null;
  }>;
};

const EVALUATOR_TYPES: EvaluatorType[] = ["상사", "동료"];

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id, subjectId } = await params;

    const [
      roundResult,
      subjectResult,
      questionsResult,
      assignmentsResult,
      responsesResult,
    ] = await Promise.all([
      supabase
        .from("multisource_evaluation_rounds")
        .select("*, question_set:multisource_evaluation_question_sets(id, name)")
        .eq("id", id)
        .single(),
      supabase
        .from("members")
        .select("id, full_name, teams(name), positions(name), titles(name)")
        .eq("id", subjectId)
        .single(),
      supabase
        .from("multisource_evaluation_questions")
        .select("id, prompt, question_type, sort_order, evaluator_types")
        .eq("round_id", id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("multisource_evaluation_assignments")
        .select(
          [
            "id",
            "source",
            "evaluator:members!multisource_evaluation_assignments_evaluator_member_id_fkey(id, teams(name), positions(name), titles(name))",
          ].join(", "),
        )
        .eq("round_id", id)
        .eq("subject_member_id", subjectId)
        .eq("is_excluded", false),
      supabase
        .from("multisource_evaluation_responses")
        .select("id, assignment_id, submitted_at")
        .eq("round_id", id)
        .eq("subject_member_id", subjectId),
    ]);

    if (roundResult.error || !roundResult.data) {
      return apiError("Round not found", 404);
    }
    if (subjectResult.error || !subjectResult.data) {
      return apiError("Subject not found", 404);
    }
    if (
      questionsResult.error ||
      assignmentsResult.error ||
      responsesResult.error
    ) {
      console.error("Error fetching personal evaluation report base data:", {
        questions: questionsResult.error,
        assignments: assignmentsResult.error,
        responses: responsesResult.error,
      });
      return apiError("Failed to fetch personal report", 500);
    }

    const responseIds = ((responsesResult.data || []) as ResponseRow[]).map(
      (response) => response.id,
    );
    const { data: answerData, error: answerError } = responseIds.length
      ? await supabase
          .from("multisource_evaluation_response_answers")
          .select(
            "response_id, question_id, question_prompt, question_type, score_value, scale_weight, text_answer",
          )
          .in("response_id", responseIds)
      : { data: [], error: null };

    if (answerError) {
      console.error("Error fetching personal evaluation report answers:", answerError);
      return apiError("Failed to fetch personal report", 500);
    }

    return NextResponse.json(
      buildPersonalReport({
        round: roundResult.data as RoundRow,
        subject: subjectResult.data as unknown as MemberRelation,
        questions: (questionsResult.data || []) as QuestionRow[],
        assignments: (assignmentsResult.data || []) as unknown as AssignmentRow[],
        responses: (responsesResult.data || []) as ResponseRow[],
        answers: (answerData || []) as AnswerRow[],
      }),
    );
  } catch (error) {
    console.error("Personal evaluation report API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return apiError("Forbidden", 403);
    }
    return apiError("Internal server error", 500);
  }
}

function buildPersonalReport({
  round,
  subject,
  questions,
  assignments,
  responses,
  answers,
}: {
  round: RoundRow;
  subject: MemberRelation;
  questions: QuestionRow[];
  assignments: AssignmentRow[];
  responses: ResponseRow[];
  answers: AnswerRow[];
}) {
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const assignmentsById = new Map(
    assignments.map((assignment) => [assignment.id, assignment]),
  );
  const responseMeta = new Map(
    responses.map((response) => {
      const assignment = assignmentsById.get(response.assignment_id);
      const evaluator = firstRelation(assignment?.evaluator);
      return [
        response.id,
        {
          submittedAt: response.submitted_at,
          evaluatorType: getEvaluatorType(evaluator || null, assignment?.source || ""),
        },
      ];
    }),
  );

  const overall = emptyScoreBucket();
  const byEvaluatorType: Record<EvaluatorType, ScoreBucket> = {
    상사: emptyScoreBucket(),
    동료: emptyScoreBucket(),
  };
  const byQuestion = new Map<string, QuestionScoreBucket>();
  const subjectiveByQuestion = new Map<string, SubjectiveBucket>();

  for (const answer of answers) {
    const meta = responseMeta.get(answer.response_id);
    if (!meta) continue;

    const question = answer.question_id
      ? questionsById.get(answer.question_id)
      : undefined;
    const questionKey = answer.question_id || answer.question_prompt;
    const display = getQuestionDisplay(question?.prompt || answer.question_prompt);
    const label = display.questionLabel;
    const sortOrder = question?.sort_order ?? Number.MAX_SAFE_INTEGER;
    const questionCategory = getQuestionCategory(question?.evaluator_types);
    const keywords = {
      lowerKeyword: display.lowerKeyword,
      upperKeyword: display.upperKeyword,
    };

    if (answer.question_type === "score" && answer.score_value !== null) {
      const score = Number(answer.score_value);
      const weightedScore = Number(answer.scale_weight ?? answer.score_value);
      if (!Number.isFinite(score)) continue;

      addScore(overall, score, weightedScore);
      addScore(byEvaluatorType[meta.evaluatorType], score, weightedScore);
      addQuestionScore(
        byQuestion,
        questionKey,
        answer.question_id,
        label,
        sortOrder,
        questionCategory,
        keywords,
        meta.evaluatorType,
        score,
        weightedScore,
      );
      continue;
    }

    if (answer.question_type === "subjective" && answer.text_answer?.trim()) {
      const bucket =
        subjectiveByQuestion.get(questionKey) ||
        ({
          key: questionKey,
          questionId: answer.question_id,
          label,
          sortOrder,
          questionCategory,
          answers: [],
        } satisfies SubjectiveBucket);
      bucket.answers.push({
        evaluatorType: meta.evaluatorType,
        textAnswer: answer.text_answer.trim(),
        submittedAt: meta.submittedAt,
      });
      subjectiveByQuestion.set(questionKey, bucket);
    }
  }

  return {
    round: {
      id: round.id,
      name: round.name,
      description: round.description,
      startDate: round.start_date,
      endDate: round.end_date,
      isDeployed: round.is_deployed,
      questionSetName: round.question_set?.name || null,
      questionSetAppliedAt: round.question_set_applied_at,
      updatedAt: round.updated_at,
    },
    subject: {
      id: subject.id,
      name: subject.full_name || "이름 미지정",
      teamName: relationName(subject.teams) || "팀 미지정",
      positionName: relationName(subject.positions) || "직급 미지정",
      titleName: relationName(subject.titles) || "직책 미지정",
    },
    summary: {
      assignedEvaluatorCount: assignments.length,
      submittedCount: responses.length,
      scoreCount: overall.count,
      overall: formatScoreBucket("overall", "전체", overall),
      evaluatorTypeAverages: EVALUATOR_TYPES.map((type) =>
        formatScoreBucket(type, type, byEvaluatorType[type]),
      ),
    },
    questionScores: Array.from(byQuestion.values())
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "ko"))
      .map((bucket) => ({
        key: bucket.key,
        questionId: bucket.questionId,
        label: bucket.label,
        sortOrder: bucket.sortOrder,
        questionCategory: bucket.questionCategory,
        lowerKeyword: bucket.lowerKeyword,
        upperKeyword: bucket.upperKeyword,
        count: bucket.count,
        averageScore: average(bucket.scoreSum, bucket.count),
        averageWeightedScore: average(bucket.weightedScoreSum, bucket.count),
        evaluatorTypeAverages: EVALUATOR_TYPES.map((type) =>
          formatScoreBucket(type, type, bucket.byEvaluatorType[type]),
        ),
      })),
    subjectiveAnswers: Array.from(subjectiveByQuestion.values())
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "ko"))
      .map((bucket) => ({
        ...bucket,
        answers: bucket.answers.sort((a, b) => {
          const typeDiff = a.evaluatorType.localeCompare(b.evaluatorType, "ko");
          if (typeDiff !== 0) return typeDiff;
          return (a.submittedAt || "").localeCompare(b.submittedAt || "");
        }),
      })),
  };
}

function addQuestionScore(
  buckets: Map<string, QuestionScoreBucket>,
  key: string,
  questionId: string | null,
  label: string,
  sortOrder: number,
  questionCategory: QuestionCategory,
  keywords: { lowerKeyword: string | null; upperKeyword: string | null },
  evaluatorType: EvaluatorType,
  score: number,
  weightedScore: number,
) {
  const bucket =
    buckets.get(key) ||
    ({
      key,
      questionId,
      label,
      sortOrder,
      questionCategory,
      lowerKeyword: keywords.lowerKeyword,
      upperKeyword: keywords.upperKeyword,
      ...emptyScoreBucket(),
      byEvaluatorType: {
        상사: emptyScoreBucket(),
        동료: emptyScoreBucket(),
      },
    } satisfies QuestionScoreBucket);
  addScore(bucket, score, weightedScore);
  addScore(bucket.byEvaluatorType[evaluatorType], score, weightedScore);
  buckets.set(key, bucket);
}

function addScore(bucket: ScoreBucket, score: number, weightedScore: number) {
  bucket.scoreSum += score;
  bucket.weightedScoreSum += Number.isFinite(weightedScore) ? weightedScore : score;
  bucket.count += 1;
}

function emptyScoreBucket(): ScoreBucket {
  return {
    scoreSum: 0,
    weightedScoreSum: 0,
    count: 0,
  };
}

function formatScoreBucket(key: string, label: string, bucket: ScoreBucket) {
  return {
    key,
    label,
    count: bucket.count,
    averageScore: average(bucket.scoreSum, bucket.count),
    averageWeightedScore: average(bucket.weightedScoreSum, bucket.count),
  };
}

function average(sum: number, count: number) {
  return count > 0 ? Math.round((sum / count) * 100) / 100 : null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function relationName(value: NamedRelation | NamedRelation[] | null | undefined) {
  return firstRelation(value)?.name || null;
}

function getEvaluatorType(
  evaluator: MemberRelation | null,
  source: string,
): EvaluatorType {
  if (source === "auto_leader") return "상사";
  return evaluatorTypeForMember({
    titleName: relationName(evaluator?.titles),
  });
}

function getQuestionCategory(value?: string[] | null): QuestionCategory {
  const types = Array.isArray(value)
    ? value.filter((item): item is EvaluatorType =>
        EVALUATOR_TYPES.includes(item as EvaluatorType),
      )
    : [];
  const normalized = types.length > 0 ? Array.from(new Set(types)) : EVALUATOR_TYPES;
  const hasLeader = normalized.includes("상사");
  const hasPeer = normalized.includes("동료");

  if (hasLeader && hasPeer) return "공통";
  if (hasLeader) return "상사";
  return "동료";
}

function getQuestionDisplay(prompt: string) {
  const lines = prompt
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const [header, ...body] = lines;

  if (header?.includes(">") && body.length > 0) {
    const [upperKeyword, ...lowerParts] = header
      .split(">")
      .map((part) => part.trim())
      .filter(Boolean);
    return {
      questionLabel: body[0] || prompt.trim(),
      upperKeyword: upperKeyword || null,
      lowerKeyword: lowerParts.join(" > ") || null,
    };
  }

  return {
    questionLabel: prompt.trim(),
    upperKeyword: null,
    lowerKeyword: null,
  };
}
