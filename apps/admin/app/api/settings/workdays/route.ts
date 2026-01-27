import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

interface WorkdaysResponse {
  year: number;
  month: number;
  totalDays: number;
  weekendDays: number;
  holidayCount: number;
  actualWorkdays: number;
  holidays: Array<{ date: string; description: string }>;
}

// GET /api/settings/workdays - Calculate actual workdays for a month
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

    if (month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }

    // 해당 월의 총 일수
    const totalDays = new Date(year, month, 0).getDate();

    // 주말 계산 (토요일, 일요일)
    let weekendDays = 0;
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendDays++;
      }
    }

    // 공휴일 조회 (주말이 아닌 날만)
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${totalDays}`;

    const { data: holidaysData, error } = await supabase
      .from("holidays")
      .select("holiday_date, description")
      .gte("holiday_date", startDate)
      .lte("holiday_date", endDate)
      .order("holiday_date", { ascending: true });

    if (error) {
      console.error("Error fetching holidays:", error);
      return NextResponse.json({ error: "Failed to fetch holidays" }, { status: 500 });
    }

    // 주말이 아닌 공휴일만 카운트
    const weekdayHolidays = (holidaysData || []).filter((h) => {
      const holidayDate = new Date(h.holiday_date);
      const dayOfWeek = holidayDate.getDay();
      return dayOfWeek !== 0 && dayOfWeek !== 6;
    });

    const holidayCount = weekdayHolidays.length;
    const actualWorkdays = totalDays - weekendDays - holidayCount;

    const response: WorkdaysResponse = {
      year,
      month,
      totalDays,
      weekendDays,
      holidayCount,
      actualWorkdays,
      holidays: (holidaysData || []).map((h) => ({
        date: h.holiday_date,
        description: h.description,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Workdays API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
