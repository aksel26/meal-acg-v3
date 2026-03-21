import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> },
) {
  try {
    await requireAuth();
    const { id: jobPostingId, assignmentId } = await params;
    const supabase = createServiceClient();
    const body = await request.json();

    // 기존 배정 정보 조회
    const { data: oldAssignment } = await supabase
      .from("interview_job_assignments")
      .select("*")
      .eq("id", assignmentId)
      .single();

    if (!oldAssignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 },
      );
    }

    // 배정 업데이트
    const updateData: Record<string, unknown> = {};
    if (body.pay_type !== undefined) updateData.pay_type = body.pay_type;
    if (body.pay_rate !== undefined) updateData.pay_rate = body.pay_rate;
    if (body.work_hours !== undefined) updateData.work_hours = body.work_hours;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.note !== undefined) updateData.note = body.note;

    const { data, error } = await supabase
      .from("interview_job_assignments")
      .update(updateData)
      .eq("id", assignmentId)
      .select()
      .single();

    if (error) throw error;

    // 급여 정보 변경 시 work_records도 업데이트
    const payChanged =
      body.pay_type !== undefined ||
      body.pay_rate !== undefined ||
      body.work_hours !== undefined;

    if (payChanged) {
      const { data: jobPosting } = await supabase
        .from("interview_job_postings")
        .select("start_date, end_date")
        .eq("id", jobPostingId)
        .single();

      if (jobPosting) {
        const updateRecordData: Record<string, unknown> = {};
        if (body.pay_rate !== undefined)
          updateRecordData.pay_rate_override = body.pay_rate;
        if (body.pay_type !== undefined)
          updateRecordData.pay_type_override = body.pay_type;
        if (body.work_hours !== undefined)
          updateRecordData.work_hours = body.work_hours;

        if (Object.keys(updateRecordData).length > 0) {
          await supabase
            .from("interview_work_records")
            .update(updateRecordData)
            .eq("personnel_id", oldAssignment.personnel_id)
            .gte("work_date", jobPosting.start_date)
            .lte("work_date", jobPosting.end_date)
            .eq("note", "공고 자동 생성");
        }
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH assignment error:", error);
    return NextResponse.json(
      { error: "Failed to update assignment" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> },
) {
  try {
    await requireAuth();
    const { id: jobPostingId, assignmentId } = await params;
    const supabase = createServiceClient();

    // 배정 정보 조회 (personnel_id 필요)
    const { data: assignment } = await supabase
      .from("interview_job_assignments")
      .select("personnel_id")
      .eq("id", assignmentId)
      .single();

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 },
      );
    }

    // 공고 기간 조회
    const { data: jobPosting } = await supabase
      .from("interview_job_postings")
      .select("start_date, end_date")
      .eq("id", jobPostingId)
      .single();

    // 관련 work_records 삭제
    if (jobPosting) {
      await supabase
        .from("interview_work_records")
        .delete()
        .eq("personnel_id", assignment.personnel_id)
        .gte("work_date", jobPosting.start_date)
        .lte("work_date", jobPosting.end_date)
        .eq("note", "공고 자동 생성");
    }

    // 배정 삭제
    const { error } = await supabase
      .from("interview_job_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE assignment error:", error);
    return NextResponse.json(
      { error: "Failed to delete assignment" },
      { status: 500 },
    );
  }
}
