import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { calculateAmount } from "@/lib/cost-utils";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const { searchParams } = request.nextUrl;
    const jobPostingId = searchParams.get("job_posting_id");
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    // year/month 기반 목록 조회
    if (year && month) {
      const query = supabase
        .from("interview_expense_reports")
        .select("*")
        .eq("year", Number(year))
        .eq("month", Number(month))
        .order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json(data ?? []);
    }

    if (!jobPostingId) {
      // 전체 목록 반환
      const { data, error } = await supabase
        .from("interview_expense_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return NextResponse.json(data ?? []);
    }

    const { data, error } = await supabase
      .from("interview_expense_reports")
      .select("*")
      .eq("job_posting_id", jobPostingId)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/interview/expense-reports error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// Helper: calculate total labor cost from job posting assignments
async function calculateLaborCost(
  supabase: ReturnType<typeof createServiceClient>,
  jobPostingId: string
): Promise<number> {
  const { data: assignments, error } = await supabase
    .from("interview_job_assignments")
    .select("pay_type, pay_rate, work_hours")
    .eq("job_posting_id", jobPostingId)
    .neq("status", "cancelled");

  if (error) throw error;

  let total = 0;
  for (const a of assignments ?? []) {
    const payType = (a.pay_type ?? "daily") as "hourly" | "daily";
    const payRate = a.pay_rate ?? 0;
    const workHours = a.work_hours ?? 0;
    total += calculateAmount(payType, payRate, workHours);
  }

  return total;
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const body = await request.json();
    const { job_posting_id, title, items, year, month } = body;

    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const parsedItems = items ?? [];
    const totalExtraCost = parsedItems.reduce(
      (sum: number, item: { amount: number }) => sum + (item.amount ?? 0),
      0
    );

    let totalLaborCost = body.total_labor_cost ?? 0;
    if (job_posting_id) {
      totalLaborCost = await calculateLaborCost(supabase, job_posting_id);
    }
    const grandTotal = totalLaborCost + totalExtraCost;

    const insertData: Record<string, unknown> = {
      title,
      items: parsedItems,
      total_labor_cost: totalLaborCost,
      total_extra_cost: totalExtraCost,
      grand_total: grandTotal,
      status: body.status ?? "draft",
    };
    if (job_posting_id) {
      insertData.job_posting_id = job_posting_id;
      // 공고 시작일에서 year/month 자동 추출 (명시적으로 전달되지 않은 경우)
      if (year === undefined || month === undefined) {
        const { data: posting } = await supabase
          .from("interview_job_postings")
          .select("start_date")
          .eq("id", job_posting_id)
          .single();
        if (posting?.start_date) {
          const [pYear, pMonth] = posting.start_date.split("-").map(Number);
          insertData.year = year ?? pYear;
          insertData.month = month ?? pMonth;
        }
      } else {
        insertData.year = year;
        insertData.month = month;
      }
    } else {
      if (year !== undefined) insertData.year = year;
      if (month !== undefined) insertData.month = month;
    }

    const { data, error } = await supabase
      .from("interview_expense_reports")
      .upsert(insertData, { onConflict: "job_posting_id" })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/interview/expense-reports error:", error);
    return NextResponse.json({ error: "Failed to create expense report" }, { status: 500 });
  }
}
