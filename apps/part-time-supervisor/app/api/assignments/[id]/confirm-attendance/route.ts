import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { syncWorkerStatus } from "@/lib/worker-status";
import { generateWorkRecordsForAssignment } from "@/lib/work-records";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    // 현재 상태 확인
    const { data: assignment, error: fetchError } = await supabase
      .from("assignments")
      .select("id, attendance_status, worker_id")
      .eq("id", id)
      .single();

    if (fetchError || !assignment) {
      return NextResponse.json(
        { error: "배정 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (assignment.attendance_status !== "checked_in") {
      return NextResponse.json(
        { error: "출석 체크인 상태가 아닙니다." },
        { status: 400 }
      );
    }

    // 계약 상태도 함께 조회
    const { data: fullAssignment, error: fullFetchError } = await supabase
      .from("assignments")
      .select("contract_status")
      .eq("id", id)
      .single();

    if (fullFetchError) throw fullFetchError;

    const bothConfirmed = fullAssignment.contract_status === "confirmed";

    const { data, error } = await supabase
      .from("assignments")
      .update({
        attendance_status: "confirmed",
        attendance_confirmed_at: new Date().toISOString(),
        attendance_confirmed_by: session.fullName,
        ...(bothConfirmed && { status: "completed" }),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    await syncWorkerStatus(supabase, assignment.worker_id);

    if (bothConfirmed) {
      await generateWorkRecordsForAssignment(supabase, id);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("POST /api/assignments/[id]/confirm-attendance error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
