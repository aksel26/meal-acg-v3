import { type SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceClient = SupabaseClient<any, "public", "supervisor">;
import { calculateDefaultWorkHours } from "@/lib/cost-utils";

/**
 * Assignment에 대한 work_records를 자동 생성한다.
 * 공고 기간(start_date ~ end_date)의 미생성 날짜에 대해 기본 근무시간으로 insert.
 */
export async function generateWorkRecordsForAssignment(
  supabase: ServiceClient,
  assignmentId: string
): Promise<void> {
  // assignment + job_posting 정보 조회
  const { data: assignment, error: aError } = await supabase
    .from("assignments")
    .select(
      "id, job_posting:job_postings(start_date, end_date, work_start, work_end, lunch_start, lunch_end)"
    )
    .eq("id", assignmentId)
    .single();

  if (aError || !assignment) return;

  const jp = assignment.job_posting as unknown as {
    start_date: string;
    end_date: string;
    work_start: string | null;
    work_end: string | null;
    lunch_start: string | null;
    lunch_end: string | null;
  };

  // 기존 기록 조회
  const { data: existing } = await supabase
    .from("work_records")
    .select("work_date")
    .eq("assignment_id", assignmentId);

  const existingDates = new Set((existing ?? []).map((r) => r.work_date));

  // 기본 근무 시간 계산
  const defaultHours = calculateDefaultWorkHours(
    jp.work_start,
    jp.work_end,
    jp.lunch_start,
    jp.lunch_end
  );

  // 공고 기간의 모든 날짜 생성 (KST 안전한 로컬 메서드 사용)
  const newRecords: {
    assignment_id: string;
    work_date: string;
    work_hours: number;
  }[] = [];
  const start = new Date(jp.start_date + "T00:00:00");
  const end = new Date(jp.end_date + "T00:00:00");

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!existingDates.has(dateStr)) {
      newRecords.push({
        assignment_id: assignmentId,
        work_date: dateStr,
        work_hours: defaultHours,
      });
    }
  }

  if (newRecords.length > 0) {
    const { error: insertError } = await supabase
      .from("work_records")
      .insert(newRecords);
    if (insertError) throw insertError;
  }
}
