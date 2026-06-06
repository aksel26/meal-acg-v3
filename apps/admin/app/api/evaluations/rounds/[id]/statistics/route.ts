import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { apiError, evaluatorTypeForMember } from "../../../_utils";

type Params = { params: Promise<{ id: string }> };
type EvaluatorType = "상사" | "동료";
type QuestionCategory = "공통" | "상사" | "동료";

type NamedRelation = { id?: string | null; name?: string | null };

type MemberRelation = {
  id: string;
  full_name: string;
  team_id: string | null;
  position_id: string | null;
  title_id?: string | null;
  teams?: NamedRelation | NamedRelation[] | null;
  positions?: NamedRelation | NamedRelation[] | null;
  titles?: NamedRelation | NamedRelation[] | null;
};

type AssignmentRow = {
  id: string;
  subject_member_id: string;
  evaluator_member_id: string;
  source: string;
  subject: MemberRelation | MemberRelation[] | null;
  evaluator: MemberRelation | MemberRelation[] | null;
};

type AnswerRow = {
  response_id: string;
  question_id: string | null;
  question_prompt: string;
  question_type: "score" | "subjective";
  score_value: number | string | null;
  scale_weight: number | string | null;
};

type ResponseRow = {
  id: string;
  assignment_id: string;
  submitted_at: string;
};

type RoundRow = {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: string;
  is_deployed: boolean;
  question_set_id: string | null;
  question_set_applied_at: string | null;
  created_at: string;
  updated_at: string;
  question_set?: {
    id: string;
    name: string;
  } | null;
};

type QuestionRow = {
  id: string;
  prompt: string;
  question_type: "score" | "subjective";
  sort_order: number;
  evaluator_types: string[] | null;
};

type ScoreBucket = {
  key: string;
  label: string;
  scoreSum: number;
  weightedScoreSum: number;
  count: number;
};

type QuestionScoreBucket = ScoreBucket & {
  questionId: string | null;
  sortOrder: number;
  evaluatorTypes: EvaluatorType[];
  questionCategory: QuestionCategory;
};

type PersonalBucket = {
  subjectId: string;
  subjectName: string;
  teamName: string;
  positionName: string;
  scoreSum: number;
  weightedScoreSum: number;
  scoreCount: number;
  submittedCount: number;
  evaluatorCounts: Record<EvaluatorType, number>;
  questions: Map<string, QuestionScoreBucket>;
};

const EVALUATOR_TYPES: EvaluatorType[] = ["상사", "동료"];

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireAdminPermission("evaluation:read");
    const supabase = createServiceClient();
    const { id } = await params;

    const [
      roundResult,
      questionsResult,
      assignmentsResult,
      responsesResult,
    ] = await Promise.all([
      supabase
        .from("multisource_evaluation_rounds")
        .select(
          "*, question_set:multisource_evaluation_question_sets(id, name)",
        )
        .eq("id", id)
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
            "subject_member_id",
            "evaluator_member_id",
            "source",
            "subject:members!multisource_evaluation_assignments_subject_member_id_fkey(id, full_name, team_id, position_id, title_id, teams(name), positions(name), titles(name))",
            "evaluator:members!multisource_evaluation_assignments_evaluator_member_id_fkey(id, full_name, team_id, position_id, title_id, teams(name), positions(name), titles(name))",
          ].join(", "),
        )
        .eq("round_id", id)
        .eq("is_excluded", false),
      supabase
        .from("multisource_evaluation_responses")
        .select("id, assignment_id, submitted_at")
        .eq("round_id", id),
    ]);

    if (roundResult.error || !roundResult.data) {
      return apiError("Round not found", 404);
    }

    if (
      questionsResult.error ||
      assignmentsResult.error ||
      responsesResult.error
    ) {
      console.error("Error fetching evaluation statistics base data:", {
        questions: questionsResult.error,
        assignments: assignmentsResult.error,
        responses: responsesResult.error,
      });
      return apiError("Failed to fetch evaluation statistics", 500);
    }

    const round = roundResult.data as RoundRow;
    const questions = (questionsResult.data || []) as QuestionRow[];
    const assignments = (assignmentsResult.data || []) as unknown as AssignmentRow[];
    const responses = (responsesResult.data || []) as ResponseRow[];
    const responseIds = responses.map((response) => response.id);

    const { data: answerData, error: answerError } = responseIds.length
      ? await supabase
          .from("multisource_evaluation_response_answers")
          .select(
            "response_id, question_id, question_prompt, question_type, score_value, scale_weight",
          )
          .in("response_id", responseIds)
      : { data: [], error: null };

    if (answerError) {
      console.error("Error fetching evaluation answer statistics:", answerError);
      return apiError("Failed to fetch evaluation statistics", 500);
    }

    return NextResponse.json(
      buildStatistics({
        round,
        questions,
        assignments,
        responses,
        answers: (answerData || []) as AnswerRow[],
      }),
    );
  } catch (error) {
    console.error("Evaluation statistics API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return apiError("Forbidden", 403);
    }
    return apiError("Internal server error", 500);
  }
}

function buildStatistics({
  round,
  questions,
  assignments,
  responses,
  answers,
}: {
  round: RoundRow;
  questions: QuestionRow[];
  assignments: AssignmentRow[];
  responses: ResponseRow[];
  answers: AnswerRow[];
}) {
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const assignmentsById = new Map(
    assignments.map((assignment) => [assignment.id, assignment]),
  );
  const responsesByAssignmentId = new Map(
    responses.map((response) => [response.assignment_id, response]),
  );
  const answersByResponseId = groupBy(answers, (answer) => answer.response_id);

  const submittedAssignments = assignments.filter((assignment) =>
    responsesByAssignmentId.has(assignment.id),
  );
  const unsubmittedAssignments = assignments.filter(
    (assignment) => !responsesByAssignmentId.has(assignment.id),
  );
  const totalAssignments = assignments.length;
  const submittedCount = submittedAssignments.length;
  const unsubmittedCount = totalAssignments - submittedCount;

  const byEvaluatorType = new Map<EvaluatorType, ScoreBucket>();
  const byTeam = new Map<string, ScoreBucket>();
  const byPosition = new Map<string, ScoreBucket>();
  const byQuestion = new Map<string, QuestionScoreBucket>();
  const bySubject = new Map<string, PersonalBucket>();

  for (const response of responses) {
    const assignment = assignmentsById.get(response.assignment_id);
    if (!assignment) continue;

    const subject = firstRelation(assignment.subject);
    const evaluator = firstRelation(assignment.evaluator);
    const evaluatorType = getEvaluatorType(evaluator, assignment.source);
    const teamName = relationName(subject?.teams) || "팀 미지정";
    const positionName = relationName(subject?.positions) || "직급 미지정";
    const subjectId = assignment.subject_member_id;
    const subjectName = subject?.full_name || "이름 없음";
    const scoreAnswers = (answersByResponseId.get(response.id) || []).filter(
      (answer) => answer.question_type === "score" && answer.score_value !== null,
    );

    if (!bySubject.has(subjectId)) {
      bySubject.set(subjectId, {
        subjectId,
        subjectName,
        teamName,
        positionName,
        scoreSum: 0,
        weightedScoreSum: 0,
        scoreCount: 0,
        submittedCount: 0,
        evaluatorCounts: { 상사: 0, 동료: 0 },
        questions: new Map(),
      });
    }

    const subjectBucket = bySubject.get(subjectId);
    if (subjectBucket) {
      subjectBucket.submittedCount += 1;
      subjectBucket.evaluatorCounts[evaluatorType] += 1;
    }

    for (const answer of scoreAnswers) {
      const score = Number(answer.score_value);
      const weightedScore = Number(answer.scale_weight ?? answer.score_value);
      if (!Number.isFinite(score)) continue;

      addScore(byEvaluatorType, evaluatorType, evaluatorType, score, weightedScore);
      addScore(byTeam, teamName, teamName, score, weightedScore);
      addScore(byPosition, positionName, positionName, score, weightedScore);

      const question = answer.question_id
        ? questionsById.get(answer.question_id)
        : undefined;
      const questionKey = answer.question_id || answer.question_prompt;
      addQuestionScore(
        byQuestion,
        questionKey,
        answer.question_id,
        question?.prompt || answer.question_prompt,
        question?.sort_order ?? Number.MAX_SAFE_INTEGER,
        normalizeEvaluatorTypes(question?.evaluator_types),
        getQuestionCategory(question?.evaluator_types),
        score,
        weightedScore,
      );

      if (subjectBucket) {
        subjectBucket.scoreSum += score;
        subjectBucket.weightedScoreSum += weightedScore;
        subjectBucket.scoreCount += 1;
        addQuestionScore(
          subjectBucket.questions,
          questionKey,
          answer.question_id,
          question?.prompt || answer.question_prompt,
          question?.sort_order ?? Number.MAX_SAFE_INTEGER,
          normalizeEvaluatorTypes(question?.evaluator_types),
          getQuestionCategory(question?.evaluator_types),
          score,
          weightedScore,
        );
      }
    }
  }

  return {
    round: {
      id: round.id,
      name: round.name,
      description: round.description,
      startDate: round.start_date,
      endDate: round.end_date,
      status: round.status,
      isDeployed: round.is_deployed,
      questionSetName: round.question_set?.name || null,
      questionSetAppliedAt: round.question_set_applied_at,
      updatedAt: round.updated_at,
    },
    summary: {
      totalAssignments,
      submittedCount,
      unsubmittedCount,
      submissionRate:
        totalAssignments > 0 ? Math.round((submittedCount / totalAssignments) * 1000) / 10 : 0,
      totalQuestions: questions.length,
      scoreQuestions: questions.filter((question) => question.question_type === "score").length,
      subjectiveQuestions: questions.filter(
        (question) => question.question_type === "subjective",
      ).length,
      evaluatedSubjectCount: bySubject.size,
    },
    evaluatorTypeAverages: EVALUATOR_TYPES.map((type) =>
      formatScoreBucket(byEvaluatorType.get(type) || emptyBucket(type, type)),
    ),
    teamAverages: sortScoreBuckets(byTeam),
    positionAverages: sortScoreBuckets(byPosition),
    questionAverages: Array.from(byQuestion.values())
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "ko"))
      .map(formatQuestionBucket),
    personalResults: Array.from(bySubject.values())
      .sort((a, b) => {
        const teamDiff = a.teamName.localeCompare(b.teamName, "ko");
        if (teamDiff !== 0) return teamDiff;
        const positionDiff = a.positionName.localeCompare(b.positionName, "ko");
        if (positionDiff !== 0) return positionDiff;
        return a.subjectName.localeCompare(b.subjectName, "ko");
      })
      .map((bucket) => ({
        subjectId: bucket.subjectId,
        subjectName: bucket.subjectName,
        teamName: bucket.teamName,
        positionName: bucket.positionName,
        submittedCount: bucket.submittedCount,
        evaluatorCounts: bucket.evaluatorCounts,
        scoreCount: bucket.scoreCount,
        averageScore: average(bucket.scoreSum, bucket.scoreCount),
        averageWeightedScore: average(bucket.weightedScoreSum, bucket.scoreCount),
        questionScores: Array.from(bucket.questions.values())
          .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "ko"))
          .map(formatQuestionBucket),
      })),
    unsubmittedAssignments: unsubmittedAssignments
      .map((assignment) => {
        const subject = firstRelation(assignment.subject);
        const evaluator = firstRelation(assignment.evaluator);
        return {
          assignmentId: assignment.id,
          subjectId: assignment.subject_member_id,
          subjectName: subject?.full_name || "이름 없음",
          subjectTeamName: relationName(subject?.teams) || "팀 미지정",
          subjectPositionName: relationName(subject?.positions) || "직급 미지정",
          evaluatorId: assignment.evaluator_member_id,
          evaluatorName: evaluator?.full_name || "이름 없음",
          evaluatorTeamName: relationName(evaluator?.teams) || "팀 미지정",
          evaluatorType: getEvaluatorType(evaluator, assignment.source),
        };
      })
      .sort((a, b) => {
        const evaluatorDiff = a.evaluatorName.localeCompare(b.evaluatorName, "ko");
        if (evaluatorDiff !== 0) return evaluatorDiff;
        return a.subjectName.localeCompare(b.subjectName, "ko");
      }),
  };
}

function addScore(
  buckets: Map<string, ScoreBucket>,
  key: string,
  label: string,
  score: number,
  weightedScore: number,
) {
  const bucket = buckets.get(key) || emptyBucket(key, label);
  bucket.scoreSum += score;
  bucket.weightedScoreSum += Number.isFinite(weightedScore) ? weightedScore : score;
  bucket.count += 1;
  buckets.set(key, bucket);
}

function addQuestionScore(
  buckets: Map<string, QuestionScoreBucket>,
  key: string,
  questionId: string | null,
  label: string,
  sortOrder: number,
  evaluatorTypes: EvaluatorType[],
  questionCategory: QuestionCategory,
  score: number,
  weightedScore: number,
) {
  const bucket =
    buckets.get(key) ||
    ({
      ...emptyBucket(key, label),
      questionId,
      sortOrder,
      evaluatorTypes,
      questionCategory,
    } satisfies QuestionScoreBucket);
  bucket.scoreSum += score;
  bucket.weightedScoreSum += Number.isFinite(weightedScore) ? weightedScore : score;
  bucket.count += 1;
  buckets.set(key, bucket);
}

function emptyBucket(key: string, label: string): ScoreBucket {
  return {
    key,
    label,
    scoreSum: 0,
    weightedScoreSum: 0,
    count: 0,
  };
}

function sortScoreBuckets(buckets: Map<string, ScoreBucket>) {
  return Array.from(buckets.values())
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"))
    .map(formatScoreBucket);
}

function formatScoreBucket(bucket: ScoreBucket) {
  return {
    key: bucket.key,
    label: bucket.label,
    count: bucket.count,
    averageScore: average(bucket.scoreSum, bucket.count),
    averageWeightedScore: average(bucket.weightedScoreSum, bucket.count),
  };
}

function formatQuestionBucket(bucket: QuestionScoreBucket) {
  return {
    ...formatScoreBucket(bucket),
    questionId: bucket.questionId,
    sortOrder: bucket.sortOrder,
    evaluatorTypes: bucket.evaluatorTypes,
    questionCategory: bucket.questionCategory,
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

function normalizeEvaluatorTypes(value?: string[] | null): EvaluatorType[] {
  const types = Array.isArray(value)
    ? value.filter((item): item is EvaluatorType =>
        EVALUATOR_TYPES.includes(item as EvaluatorType),
      )
    : [];
  return types.length > 0 ? Array.from(new Set(types)) : [...EVALUATOR_TYPES];
}

function getQuestionCategory(value?: string[] | null): QuestionCategory {
  const types = normalizeEvaluatorTypes(value);
  const hasLeader = types.includes("상사");
  const hasPeer = types.includes("동료");

  if (hasLeader && hasPeer) return "공통";
  if (hasLeader) return "상사";
  return "동료";
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    const group = map.get(key) || [];
    group.push(item);
    map.set(key, group);
  }
  return map;
}
