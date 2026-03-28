import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

async function checkInterviewSettlementLock(
  supabase: ReturnType<typeof createServiceClient>,
  recordId: string
): Promise<boolean> {
  // 해당 근무 기록의 work_date를 조회해 year/month 확인
  const { data: rec } = await supabase
    .from("interview_work_records")
    .select("work_date")
    .eq("id", recordId)
    .maybeSingle();

  if (!rec) return false;

  const d = new Date(rec.work_date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;

  const { data: lock } = await supabase
    .from("settlement_locks")
    .select("id")
    .eq("type", "interview")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  return lock != null;
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    const isLocked = await checkInterviewSettlementLock(supabase, id);
    if (isLocked) {
      return NextResponse.json({ error: "정산이 확정되어 수정할 수 없습니다" }, { status: 423 });
    }

    const body = await request.json();

    const { data, error } = await supabase
      .from("interview_work_records")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/interview/work-records/[id] error:", error);
    return NextResponse.json({ error: "Failed to update work record" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    const isLocked = await checkInterviewSettlementLock(supabase, id);
    if (isLocked) {
      return NextResponse.json({ error: "정산이 확정되어 삭제할 수 없습니다" }, { status: 423 });
    }

    const { error } = await supabase
      .from("interview_work_records")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/interview/work-records/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete work record" }, { status: 500 });
  }
}
