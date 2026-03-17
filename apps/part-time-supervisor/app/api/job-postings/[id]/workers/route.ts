import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id: jobPostingId } = await params;
    const supabase = createServiceClient();
    const body = await request.json();

    // 1. worker 생성
    const { data: worker, error: workerError } = await supabase
      .from("workers")
      .insert({
        name: body.name,
        phone: body.phone || null,
        email: body.email || null,
        gender: body.gender || null,
        birth_date: body.birth_date || null,
        address: body.address || null,
        bank_name: body.bank_name || null,
        account_number: body.account_number || null,
        experience: body.experience || null,
        warning: body.warning || null,
        note: body.note || null,
        status: "registered",
      })
      .select()
      .single();

    if (workerError) throw workerError;

    // 2. job_posting의 rooms 조회하여 room_slots 자동 배정
    const { data: jobPosting } = await supabase
      .from("job_postings")
      .select("rooms, start_date, work_start")
      .eq("id", jobPostingId)
      .single();

    let room_slots:
      | { date: string; start_time: string; end_time: string; room: string }[]
      | undefined;
    if (jobPosting?.rooms && jobPosting.rooms.length > 0) {
      const startTime = jobPosting.work_start || "09:00";
      const startHour = parseInt(startTime.split(":")[0], 10);
      const endTime = `${String(startHour + 1).padStart(2, "0")}:00`;
      room_slots = jobPosting.rooms.map((room: string) => ({
        date: jobPosting.start_date,
        start_time: startTime,
        end_time: endTime,
        room,
      }));
    }

    // 3. assignment 생성
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .insert({
        worker_id: worker.id,
        job_posting_id: jobPostingId,
        status: "assigned",
        ...(room_slots && { room_slots }),
      })
      .select()
      .single();

    if (assignmentError) {
      // assignment 실패 시 worker 롤백
      await supabase.from("workers").delete().eq("id", worker.id);
      throw assignmentError;
    }

    return NextResponse.json({ worker, assignment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/job-postings/[id]/workers error:", error);
    return NextResponse.json(
      { error: "지원자 등록에 실패했습니다." },
      { status: 500 }
    );
  }
}
