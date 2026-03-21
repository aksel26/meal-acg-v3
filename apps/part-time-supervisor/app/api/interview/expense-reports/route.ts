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

    if (!jobPostingId) {
      return NextResponse.json({ error: "job_posting_id is required" }, { status: 400 });
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
    const { job_posting_id, title, items } = body;

    if (!job_posting_id || !title) {
      return NextResponse.json({ error: "job_posting_id and title are required" }, { status: 400 });
    }

    const totalLaborCost = await calculateLaborCost(supabase, job_posting_id);
    const parsedItems = items ?? [];
    const totalExtraCost = parsedItems.reduce(
      (sum: number, item: { amount: number }) => sum + (item.amount ?? 0),
      0
    );
    const grandTotal = totalLaborCost + totalExtraCost;

    const { data, error } = await supabase
      .from("interview_expense_reports")
      .upsert(
        {
          job_posting_id,
          title,
          items: parsedItems,
          total_labor_cost: totalLaborCost,
          total_extra_cost: totalExtraCost,
          grand_total: grandTotal,
          status: body.status ?? "draft",
        },
        { onConflict: "job_posting_id" }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/interview/expense-reports error:", error);
    return NextResponse.json({ error: "Failed to create expense report" }, { status: 500 });
  }
}
