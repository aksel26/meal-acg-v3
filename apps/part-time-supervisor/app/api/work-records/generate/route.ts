import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { calculateDefaultWorkHours } from "@/lib/cost-utils";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const { assignmentId } = await request.json();
    if (!assignmentId) {
      return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // assignment + job_posting 정보 조회
    const { data: assignment, error: aError } = await supabase
      .from("assignments")
      .select("id, job_posting:job_postings(start_date, end_date, work_start, work_end, lunch_start, lunch_end)")
      .eq("id", assignmentId)
      .single();

    if (aError || !assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const jp = assignment.job_posting as unknown as {
      start_date: string; end_date: string;
      work_start: string | null; work_end: string | null;
      lunch_start: string | null; lunch_end: string | null;
    };

    // 기존 기록 조회
    const { data: existing } = await supabase
      .from("work_records")
      .select("work_date")
      .eq("assignment_id", assignmentId);

    const existingDates = new Set((existing ?? []).map((r) => r.work_date));

    // 공고 기간의 모든 날짜 생성
    const defaultHours = calculateDefaultWorkHours(
      jp.work_start, jp.work_end, jp.lunch_start, jp.lunch_end
    );

    const newRecords: { assignment_id: string; work_date: string; work_hours: number }[] = [];
    // KST 안전한 날짜 순회 — toISOString은 UTC 기준이므로 로컬 메서드 사용
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

    // 전체 목록 반환
    const { data: allRecords, error: fetchError } = await supabase
      .from("work_records")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("work_date", { ascending: true });

    if (fetchError) throw fetchError;
    return NextResponse.json(allRecords);
  } catch (error) {
    console.error("POST /api/work-records/generate error:", error);
    return NextResponse.json({ error: "Failed to generate work records" }, { status: 500 });
  }
}
