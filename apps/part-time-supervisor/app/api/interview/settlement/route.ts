import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { calculateAmount } from "@/lib/cost-utils";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = request.nextUrl;
    const year = parseInt(searchParams.get("year") ?? "");
    const month = parseInt(searchParams.get("month") ?? "");
    const roleFilter = searchParams.get("role");
    const search = searchParams.get("search");

    if (!year || !month) {
      return NextResponse.json({ error: "year and month are required" }, { status: 400 });
    }

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0]!;

    const supabase = createServiceClient();

    // Fetch all active personnel (filtered by role/search if provided)
    let personnelQuery = supabase
      .from("interview_personnel")
      .select("*")
      .eq("status", "active");

    if (roleFilter) personnelQuery = personnelQuery.eq("role", roleFilter);
    if (search) personnelQuery = personnelQuery.ilike("name", `%${search}%`);

    const { data: allPersonnel, error: pError } = await personnelQuery;
    if (pError) throw pError;

    // Fetch work records for the month
    const { data: workRecords, error: wrError } = await supabase
      .from("interview_work_records")
      .select("*")
      .gte("work_date", startDate)
      .lte("work_date", endDate);
    if (wrError) throw wrError;

    // Group work records by personnel_id
    const recordsByPersonnel = new Map<string, typeof workRecords>();
    for (const rec of workRecords ?? []) {
      const list = recordsByPersonnel.get(rec.personnel_id) ?? [];
      list.push(rec);
      recordsByPersonnel.set(rec.personnel_id, list);
    }

    let totalAmount = 0;
    let totalWorkHours = 0;
    let totalWorkDays = 0;

    const personnel = (allPersonnel ?? []).map((p) => {
      if (p.role === "rp") {
        // RP: calculate from work records
        const records = recordsByPersonnel.get(p.id) ?? [];
        let amount = 0;
        let workDays = 0;
        let workHours = 0;

        const details = records
          .filter((r) => r.work_hours > 0)
          .map((r) => {
            const effectiveRate = r.pay_rate_override ?? p.default_pay_rate ?? 0;
            const effectiveType = (r.pay_type_override ?? p.pay_type) as "hourly" | "daily";
            const recordAmount = calculateAmount(effectiveType, effectiveRate, r.work_hours);
            amount += recordAmount;
            workDays += 1;
            workHours += r.work_hours;
            return {
              id: r.id,
              work_date: r.work_date,
              work_hours: r.work_hours,
              pay_rate: effectiveRate,
              pay_type: effectiveType,
              amount: recordAmount,
              is_overridden: r.pay_rate_override != null || r.pay_type_override != null,
              note: r.note,
            };
          });

        totalAmount += amount;
        totalWorkHours += workHours;
        totalWorkDays += workDays;

        return {
          id: p.id,
          name: p.name,
          role: p.role,
          pay_type: p.pay_type,
          amount,
          work_days: workDays,
          work_hours: Math.round(workHours * 10) / 10,
          details,
        };
      } else {
        // FT/instructor: use contract_amount
        const amount = p.contract_amount ?? 0;
        totalAmount += amount;

        return {
          id: p.id,
          name: p.name,
          role: p.role,
          pay_type: "contract" as const,
          amount,
          work_days: null,
          work_hours: null,
          details: [],
        };
      }
    });

    // Sort by amount descending
    personnel.sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      summary: {
        totalAmount,
        totalWorkers: personnel.length,
        totalWorkHours: Math.round(totalWorkHours * 10) / 10,
        totalWorkDays,
      },
      personnel,
    });
  } catch (error) {
    console.error("GET /api/interview/settlement error:", error);
    return NextResponse.json({ error: "Failed to fetch settlement" }, { status: 500 });
  }
}
