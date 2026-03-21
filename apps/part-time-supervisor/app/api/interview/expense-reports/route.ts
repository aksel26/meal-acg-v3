import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { calculateAmount } from "@/lib/cost-utils";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const { searchParams } = request.nextUrl;
    const year = parseInt(searchParams.get("year") ?? "");
    const month = parseInt(searchParams.get("month") ?? "");

    if (!year || !month) {
      return NextResponse.json({ error: "year and month are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("interview_expense_reports")
      .select("*")
      .eq("year", year)
      .eq("month", month)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/interview/expense-reports error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

// Helper: calculate total labor cost for the month (server-side)
async function calculateLaborCost(
  supabase: ReturnType<typeof createServiceClient>,
  year: number,
  month: number
): Promise<number> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0).toISOString().split("T")[0]!;

  const [personnelRes, recordsRes] = await Promise.all([
    supabase.from("interview_personnel").select("*").eq("status", "active"),
    supabase
      .from("interview_work_records")
      .select("*")
      .gte("work_date", startDate)
      .lte("work_date", endDate),
  ]);

  let total = 0;

  for (const p of personnelRes.data ?? []) {
    if (p.role === "rp") {
      const records = (recordsRes.data ?? []).filter((r) => r.personnel_id === p.id);
      for (const r of records) {
        if (r.work_hours > 0) {
          const rate = r.pay_rate_override ?? p.default_pay_rate ?? 0;
          const type = (r.pay_type_override ?? p.pay_type) as "hourly" | "daily";
          total += calculateAmount(type, rate, r.work_hours);
        }
      }
    } else {
      total += p.contract_amount ?? 0;
    }
  }

  return total;
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const body = await request.json();
    const { year, month, title, items } = body;

    if (!year || !month || !title) {
      return NextResponse.json({ error: "year, month, and title are required" }, { status: 400 });
    }

    const totalLaborCost = await calculateLaborCost(supabase, year, month);
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
          year,
          month,
          title,
          items: parsedItems,
          total_labor_cost: totalLaborCost,
          total_extra_cost: totalExtraCost,
          grand_total: grandTotal,
          status: body.status ?? "draft",
        },
        { onConflict: "year,month" }
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
