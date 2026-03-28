import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

async function checkSettlementLock(
  supabase: ReturnType<typeof createServiceClient>,
  year: number,
  month: number
): Promise<boolean> {
  const { data } = await supabase
    .from("settlement_locks")
    .select("id")
    .eq("type", "supervisor")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();
  return data != null;
}

// GET: 특정 assignment의 근무 기록 조회
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const assignmentId = request.nextUrl.searchParams.get("assignment_id");
    if (!assignmentId) {
      return NextResponse.json({ error: "assignment_id is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("work_records")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("work_date", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/work-records error:", error);
    return NextResponse.json({ error: "Failed to fetch work records" }, { status: 500 });
  }
}

// POST: 근무 기록 배치 upsert
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const { assignmentId, records, year, month } = await request.json();

    if (!assignmentId || !Array.isArray(records)) {
      return NextResponse.json({ error: "assignmentId and records are required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 잠금 체크
    if (year && month) {
      const isLocked = await checkSettlementLock(supabase, year, month);
      if (isLocked) {
        return NextResponse.json({ error: "정산이 확정되어 수정할 수 없습니다" }, { status: 423 });
      }
    }
    const upsertData = records.map((r: { workDate: string; workHours: number; note?: string }) => ({
      assignment_id: assignmentId,
      work_date: r.workDate,
      work_hours: r.workHours,
      note: r.note ?? null,
    }));

    const { data, error } = await supabase
      .from("work_records")
      .upsert(upsertData, { onConflict: "assignment_id,work_date" })
      .select();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("POST /api/work-records error:", error);
    return NextResponse.json({ error: "Failed to save work records" }, { status: 500 });
  }
}
