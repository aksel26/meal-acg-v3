import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/client";

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
};

type RoundRow = {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_deployed: boolean;
  deployed_at: string | null;
};

type AssignmentRow = {
  id: string;
  round_id: string;
};

type ResponseRow = {
  assignment_id: string;
  round_id: string;
};

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const supabase = createServiceClient() as unknown as DbClient | null;

    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase 환경 변수가 설정되지 않았습니다." },
        { status: 500 },
      );
    }

    const { data: rounds, error: roundsError } = await supabase
      .from("multisource_evaluation_rounds")
      .select("id, name, description, start_date, end_date, is_deployed, deployed_at")
      .eq("is_deployed", true)
      .order("start_date", { ascending: false });

    if (roundsError) throw roundsError;

    const roundRows = (rounds || []) as RoundRow[];
    const roundIds = roundRows.map((round) => round.id);

    const { data: assignments, error: assignmentsError } = roundIds.length
      ? await supabase
          .from("multisource_evaluation_assignments")
          .select("id, round_id")
          .eq("evaluator_member_id", session.id)
          .eq("is_excluded", false)
          .in("round_id", roundIds)
      : { data: [], error: null };

    if (assignmentsError) throw assignmentsError;

    const assignmentRows = (assignments || []) as AssignmentRow[];
    const assignmentIds = assignmentRows.map((assignment) => assignment.id);

    const { data: responses, error: responsesError } = assignmentIds.length
      ? await supabase
          .from("multisource_evaluation_responses")
          .select("assignment_id, round_id")
          .eq("evaluator_member_id", session.id)
          .in("assignment_id", assignmentIds)
      : { data: [], error: null };

    if (responsesError) throw responsesError;

    const assignmentsByRound = countBy(
      assignmentRows.map((assignment) => assignment.round_id),
    );
    const responsesByRound = countBy(
      ((responses || []) as ResponseRow[]).map((response) => response.round_id),
    );

    return NextResponse.json(
      roundRows.map((round) => {
        const assignedSubjectCount = assignmentsByRound.get(round.id) || 0;
        const submittedSubjectCount = responsesByRound.get(round.id) || 0;

        return {
          id: round.id,
          name: round.name,
          description: round.description,
          startDate: round.start_date,
          endDate: round.end_date,
          deployedAt: round.deployed_at,
          canEnter: assignedSubjectCount > 0,
          assignedSubjectCount,
          submittedSubjectCount,
        };
      }),
    );
  } catch (error) {
    console.error("GET /api/evaluations/rounds error:", error);
    return NextResponse.json(
      { error: "다면평가 회차를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

function countBy(values: string[]) {
  const map = new Map<string, number>();
  values.forEach((value) => {
    map.set(value, (map.get(value) || 0) + 1);
  });
  return map;
}
