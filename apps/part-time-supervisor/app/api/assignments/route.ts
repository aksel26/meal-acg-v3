import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const jobPostingId = searchParams.get("job_posting_id");
    const workerId = searchParams.get("worker_id");

    let query = supabase
      .from("assignments")
      .select("*, contract_status, signature_image_path, signed_at, confirmed_at, attendance_status, checked_in_at, attendance_confirmed_at, attendance_confirmed_by, worker:workers(id, name, phone, email, gender, experience, address, warning, note, status, created_at), job_posting:job_postings(id, title, status)")
      .order("assigned_at", { ascending: false });

    if (jobPostingId) {
      query = query.eq("job_posting_id", jobPostingId);
    }
    if (workerId) {
      query = query.eq("worker_id", workerId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/assignments error:", error);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const body = await request.json();

    // job_posting의 rooms가 있으면 기본 room_slots 자동 배정
    if (body.job_posting_id && !body.room_slots) {
      const { data: jobPosting } = await supabase
        .from("job_postings")
        .select("rooms, start_date, work_start, work_end")
        .eq("id", body.job_posting_id)
        .single();

      if (jobPosting?.rooms && jobPosting.rooms.length > 0) {
        const startTime = jobPosting.work_start || "09:00";
        const startHour = parseInt(startTime.split(":")[0], 10);
        const endTime = `${String(startHour + 1).padStart(2, "0")}:00`;
        body.room_slots = jobPosting.rooms.map((room: string) => ({
          date: jobPosting.start_date,
          start_time: startTime,
          end_time: endTime,
          room,
        }));
      }
    }

    const { data, error } = await supabase
      .from("assignments")
      .insert(body)
      .select("*, worker:workers(id, name), job_posting:job_postings(id, title)")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "이미 해당 공고에 배정된 지원자입니다." },
          { status: 409 }
        );
      }
      throw error;
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/assignments error:", error);
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}
