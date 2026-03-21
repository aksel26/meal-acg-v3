import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import dayjs from "dayjs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    const { data: assignments, error } = await supabase
      .from("interview_job_assignments")
      .select("*")
      .eq("job_posting_id", id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: true });

    if (error) throw error;

    // personnel 정보 join
    const personnelIds = [
      ...new Set((assignments ?? []).map((a) => a.personnel_id)),
    ];
    let personnelMap: Record<string, unknown> = {};

    if (personnelIds.length > 0) {
      const { data: personnel } = await supabase
        .from("interview_personnel")
        .select("*")
        .in("id", personnelIds);

      personnelMap = (personnel ?? []).reduce(
        (acc, p) => {
          acc[p.id] = p;
          return acc;
        },
        {} as Record<string, unknown>,
      );
    }

    const result = (assignments ?? []).map((a) => ({
      ...a,
      personnel: personnelMap[a.personnel_id] || null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/interview/job-postings/[id]/assignments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth();
    const { id: jobPostingId } = await params;
    const supabase = createServiceClient();
    const body = await request.json();

    // 신규 인력 등록 + 배정 모드
    let personnelId = body.personnel_id;

    if (body.new_personnel) {
      const { data: newPerson, error: personError } = await supabase
        .from("interview_personnel")
        .insert(body.new_personnel)
        .select()
        .single();

      if (personError) throw personError;
      personnelId = newPerson.id;
    }

    // 공고 정보 조회 (정산 연동을 위해)
    const { data: jobPosting, error: jobError } = await supabase
      .from("interview_job_postings")
      .select("*")
      .eq("id", jobPostingId)
      .single();

    if (jobError) throw jobError;

    // 배정 생성
    const assignmentData = {
      job_posting_id: jobPostingId,
      personnel_id: personnelId,
      pay_type: body.pay_type || jobPosting.pay_type || "daily",
      pay_rate: body.pay_rate ?? jobPosting.pay_rate ?? 0,
      work_hours: body.work_hours || null,
      note: body.note || null,
    };

    const { data: assignment, error: assignError } = await supabase
      .from("interview_job_assignments")
      .insert(assignmentData)
      .select()
      .single();

    if (assignError) {
      // 신규 인력 생성 후 배정 실패 시 롤백
      if (body.new_personnel && personnelId) {
        await supabase
          .from("interview_personnel")
          .delete()
          .eq("id", personnelId);
      }
      throw assignError;
    }

    // 정산 연동: interview_work_records에 공고 기간별 레코드 생성
    await createWorkRecords(
      supabase,
      personnelId,
      jobPosting,
      assignmentData,
    );

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error("POST /api/interview/job-postings/[id]/assignments error:", error);
    const message =
      error instanceof Error && error.message.includes("duplicate")
        ? "이미 배정된 인력입니다."
        : "Failed to create assignment";
    return NextResponse.json(
      { error: message },
      { status: error instanceof Error && error.message.includes("duplicate") ? 400 : 500 },
    );
  }
}

async function createWorkRecords(
  supabase: ReturnType<typeof createServiceClient>,
  personnelId: string,
  jobPosting: {
    start_date: string;
    end_date: string;
    work_start: string | null;
    work_end: string | null;
  },
  assignment: {
    pay_type: string;
    pay_rate: number;
    work_hours: number | null;
  },
) {
  const startDate = dayjs(jobPosting.start_date);
  const endDate = dayjs(jobPosting.end_date);
  const records = [];

  // 일급일 때 근무시간 계산
  let workHours = assignment.work_hours;
  if (assignment.pay_type === "daily" && jobPosting.work_start && jobPosting.work_end) {
    const parts = jobPosting.work_start.split(":").map(Number);
    const endParts = jobPosting.work_end.split(":").map(Number);
    const sh = parts[0] ?? 0, sm = parts[1] ?? 0;
    const eh = endParts[0] ?? 0, em = endParts[1] ?? 0;
    workHours = eh + em / 60 - (sh + sm / 60);
    if (workHours < 0) workHours = 0;
  }

  let current = startDate;
  while (current.isBefore(endDate) || current.isSame(endDate, "day")) {
    records.push({
      personnel_id: personnelId,
      work_date: current.format("YYYY-MM-DD"),
      work_hours: workHours || 8,
      pay_rate_override: assignment.pay_rate,
      pay_type_override: assignment.pay_type,
      note: `공고 자동 생성`,
    });
    current = current.add(1, "day");
  }

  if (records.length > 0) {
    const { error } = await supabase
      .from("interview_work_records")
      .insert(records);

    if (error) {
      console.error("Failed to create work records:", error);
    }
  }
}
