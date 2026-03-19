import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

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
    const { assignmentId, records } = await request.json();

    if (!assignmentId || !Array.isArray(records)) {
      return NextResponse.json({ error: "assignmentId and records are required" }, { status: 400 });
    }

    const supabase = createServiceClient();
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
