import { NextRequest, NextResponse } from "next/server";
import { getMealsByMonth, getMealByDate } from "@/lib/supabase/meals";
import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";
import {
  type ExternalAttendanceRecord,
  mergeExternalAttendance,
  normalizeAttendanceRecordType,
  normalizeDayoffAttendance,
} from "@/lib/meal-attendance";

type MealCalendarRow = {
  date: string;
  attendance: string | null;
  attendance_source?: string;
  breakfast: {
    store: string | null;
    amount: number | null;
    payer: string | null;
  };
  lunch: {
    store: string | null;
    amount: number | null;
    payer: string | null;
  };
  dinner: {
    store: string | null;
    amount: number | null;
    payer: string | null;
  };
  total: number | null;
};

function withEmptyMealFields(row: Partial<MealCalendarRow>): MealCalendarRow {
  return {
    date: row.date || "",
    attendance: row.attendance ?? null,
    breakfast: row.breakfast ?? { store: null, amount: null, payer: null },
    lunch: row.lunch ?? { store: null, amount: null, payer: null },
    dinner: row.dinner ?? { store: null, amount: null, payer: null },
    total: row.total ?? null,
    ...((row as { attendance_source?: string }).attendance_source
      ? {
          attendance_source: (row as { attendance_source?: string })
            .attendance_source,
        }
      : {}),
  } as MealCalendarRow;
}

async function getExternalAttendance(
  memberId: string | null,
  startDate: string,
  endDate: string,
): Promise<ExternalAttendanceRecord[]> {
  if (!memberId) return [];

  const supabase = createServiceClient();
  if (!supabase) return [];

  const [
    { data: dayoffs, error: dayoffsError },
    { data: attendanceRecords, error: attendanceError },
  ] = await Promise.all([
    supabase
      .from("dayoffs")
      .select(
        "leave_date, approval_status, leave_type:leave_types!dayoffs_leave_type_id_fkey(name, category, duration_type)",
      )
      .eq("is_deleted", false)
      .eq("target_id", memberId)
      .gte("leave_date", startDate)
      .lte("leave_date", endDate)
      .eq("approval_status", "approved"),
    supabase
      .from("attendance_records")
      .select("date, attendance_type")
      .eq("member_id", memberId)
      .gte("date", startDate)
      .lte("date", endDate),
  ]);

  if (dayoffsError)
    console.error("Calendar meals dayoffs query error:", dayoffsError);
  if (attendanceError)
    console.error("Calendar meals attendance query error:", attendanceError);

  const records: ExternalAttendanceRecord[] = [];

  for (const dayoff of dayoffs ?? []) {
    const attendance = normalizeDayoffAttendance(
      (
        dayoff as {
          leave_type?: Parameters<typeof normalizeDayoffAttendance>[0];
        }
      ).leave_type,
    );
    if (!attendance) continue;
    records.push({
      date: dayoff.leave_date,
      attendance,
      source: "dayoff",
    });
  }

  for (const record of attendanceRecords ?? []) {
    const attendance = normalizeAttendanceRecordType(record.attendance_type);
    if (!attendance) continue;
    records.push({
      date: record.date,
      attendance,
      source: "attendance",
    });
  }

  return records.sort((a, b) => {
    const dateOrder = a.date.localeCompare(b.date);
    if (dateOrder !== 0) return dateOrder;
    return a.source === "dayoff" ? -1 : 1;
  });
}

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }
    const memberId = sessionUser.id;

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // YYYY-MM-DD format
    const month = searchParams.get("month"); // MM format for month view
    const year = searchParams.get("year"); // YYYY format for year

    console.log(`=== Calendar Meals API ===`);
    console.log(
      `Member: ${memberId}, Date: ${date}, Month: ${month}, Year: ${year}`,
    );

    if (!date && !month) {
      console.error("Missing date or month parameter");
      return NextResponse.json(
        { error: "Either date or month parameter is required" },
        { status: 400 },
      );
    }

    // 특정 날짜 조회
    if (date) {
      const result = await getMealByDate(memberId, date);

      if (!result.success) {
        return NextResponse.json(
          { error: "Failed to fetch meal data", details: result.error },
          { status: 500 },
        );
      }

      // 단일 날짜 조회 시에도 배열로 반환 (기존 API 호환)
      const data: MealCalendarRow[] = result.data
        ? [
            {
              date: result.data.entry_date,
              attendance: result.data.attendance,
              breakfast: {
                store: result.data.breakfast_store,
                amount: result.data.breakfast_amount,
                payer: result.data.breakfast_payer,
              },
              lunch: {
                store: result.data.lunch_store,
                amount: result.data.lunch_amount,
                payer: result.data.lunch_payer,
              },
              dinner: {
                store: result.data.dinner_store,
                amount: result.data.dinner_amount,
                payer: result.data.dinner_payer,
              },
              total: result.data.total_amount,
            },
          ]
        : [];
      const externalAttendance = await getExternalAttendance(
        memberId,
        date,
        date,
      );
      const mergedData = mergeExternalAttendance(data, externalAttendance).map(
        withEmptyMealFields,
      );

      return NextResponse.json({
        success: true,
        data: mergedData,
      });
    }

    // 월별 조회
    if (month) {
      const targetYear = year ? parseInt(year) : new Date().getFullYear();
      const targetMonth = parseInt(month);

      const result = await getMealsByMonth(
        memberId,
        targetYear,
        targetMonth,
      );

      if (!result.success) {
        return NextResponse.json(
          { error: "Failed to fetch meal data", details: result.error },
          { status: 500 },
        );
      }

      const startDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
      const endDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(
        new Date(targetYear, targetMonth, 0).getDate(),
      ).padStart(2, "0")}`;

      // 기존 API 형식으로 변환
      const data: MealCalendarRow[] = (result.data || []).map((row) => ({
        date: row.entry_date,
        attendance: row.attendance,
        breakfast: {
          store: row.breakfast_store,
          amount: row.breakfast_amount,
          payer: row.breakfast_payer,
        },
        lunch: {
          store: row.lunch_store,
          amount: row.lunch_amount,
          payer: row.lunch_payer,
        },
        dinner: {
          store: row.dinner_store,
          amount: row.dinner_amount,
          payer: row.dinner_payer,
        },
        total: row.total_amount,
      }));
      const externalAttendance = await getExternalAttendance(
        memberId,
        startDate,
        endDate,
      );
      const mergedData = mergeExternalAttendance(data, externalAttendance).map(
        withEmptyMealFields,
      );

      console.log(
        `Found ${data.length} meal entries, ${externalAttendance.length} attendance entries`,
      );

      return NextResponse.json({
        success: true,
        data: mergedData,
      });
    }

    return NextResponse.json(
      { error: "Invalid date parameters" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Calendar meals API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch meal data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
