import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";
import dayjs from "dayjs";
import {
  type ExternalAttendanceRecord,
  INDIVIDUAL_MEAL_ATTENDANCE,
  isHalfDayOff,
  isNoMealAttendance,
  isWeekday,
  mergeExternalAttendance,
  normalizeAttendanceRecordType,
  normalizeDayoffAttendance,
} from "@/lib/meal-attendance";

interface MonthlyAllowanceData {
  allowance: number;
  workdays: number;
}

interface MonthlyAllowancesJson {
  [year: string]: {
    [month: string]: MonthlyAllowanceData;
  };
}

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const userId = sessionUser.id;

    if (!month || !year) {
      return NextResponse.json(
        {
          success: false,
          error: "month, year 파라미터가 필요합니다.",
        },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "데이터베이스 연결 오류" },
        { status: 500 },
      );
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    // global_settings에서 월별 지원금 및 일일 지원금 조회
    const { data: settingsData } = await supabase
      .from("global_settings")
      .select("monthly_allowances, daily_allowance")
      .eq("id", 1)
      .single();

    const monthlyAllowances =
      (settingsData?.monthly_allowances as unknown as MonthlyAllowancesJson) ||
      {};
    const yearData = monthlyAllowances[String(yearNum)] || {};
    const monthData = yearData[String(monthNum)];
    const allowanceAmount = monthData?.allowance ?? 0;
    // 저장된 월별 데이터에서 일일 단가 계산 (allowance / workdays)
    const savedDailyAllowance =
      monthData && monthData.workdays > 0
        ? monthData.allowance / monthData.workdays
        : null;
    const dailyAllowance =
      savedDailyAllowance ?? settingsData?.daily_allowance ?? 10000;

    // 해당 월 식대 총 사용액 계산
    const startDate = dayjs(`${yearNum}-${monthNum}-01`).format("YYYY-MM-DD");
    const endDate = dayjs(`${yearNum}-${monthNum}-01`)
      .endOf("month")
      .format("YYYY-MM-DD");

    const [
      { data: mealLogs, error: mealError },
      { data: dayoffs, error: dayoffsError },
      { data: attendanceRecords, error: attendanceError },
    ] = await Promise.all([
      supabase
        .from("meal_logs")
        .select("lunch_amount, attendance, entry_date")
        .eq("user_id", userId)
        .gte("entry_date", startDate)
        .lte("entry_date", endDate),
      supabase
        .from("dayoffs")
        .select(
          "leave_date, approval_status, leave_type:leave_types!dayoffs_leave_type_id_fkey(name, category, duration_type)",
        )
        .eq("is_deleted", false)
        .eq("target_id", userId)
        .gte("leave_date", startDate)
        .lte("leave_date", endDate)
        .or("approval_status.is.null,approval_status.neq.rejected"),
      supabase
        .from("attendance_records")
        .select("date, attendance_type")
        .eq("member_id", userId)
        .gte("date", startDate)
        .lte("date", endDate),
    ]);

    if (mealError) {
      console.error("Meal logs query error:", mealError);
      return NextResponse.json(
        { success: false, error: "식대 데이터 조회 오류" },
        { status: 500 },
      );
    }
    if (dayoffsError) {
      console.error("Meal stats dayoffs query error:", dayoffsError);
      return NextResponse.json(
        { success: false, error: "휴가 데이터 조회 오류" },
        { status: 500 },
      );
    }
    if (attendanceError) {
      console.error("Meal stats attendance query error:", attendanceError);
      return NextResponse.json(
        { success: false, error: "근태 데이터 조회 오류" },
        { status: 500 },
      );
    }

    const externalAttendance: ExternalAttendanceRecord[] = [];
    for (const dayoff of dayoffs ?? []) {
      const attendance = normalizeDayoffAttendance(
        (
          dayoff as {
            leave_type?: Parameters<typeof normalizeDayoffAttendance>[0];
          }
        ).leave_type,
      );
      if (!attendance) continue;
      externalAttendance.push({
        date: dayoff.leave_date,
        attendance,
        source: "dayoff",
      });
    }
    for (const record of attendanceRecords ?? []) {
      const attendance = normalizeAttendanceRecordType(record.attendance_type);
      if (!attendance) continue;
      externalAttendance.push({
        date: record.date,
        attendance,
        source: "attendance",
      });
    }

    const mergedMealLogs = mergeExternalAttendance(
      (mealLogs ?? []).map((log) => ({
        date: log.entry_date,
        attendance: log.attendance,
        lunch_amount: log.lunch_amount,
      })),
      externalAttendance.sort((a, b) => {
        const dateOrder = a.date.localeCompare(b.date);
        if (dateOrder !== 0) return dateOrder;
        return a.source === "dayoff" ? -1 : 1;
      }),
    );

    // 총 사용액 계산 (개별식사는 사용액에서 제외 - 사용가능액에서만 차감됨)
    const totalUsed = mergedMealLogs.reduce((sum, log) => {
      if (log.attendance === INDIVIDUAL_MEAL_ATTENDANCE) return sum;
      return sum + (log.lunch_amount || 0);
    }, 0);

    const mealCount = mealLogs?.length ?? 0;

    // 개별식사 수 계산 (평일만 — 주말은 base에 미포함이므로 차감 불필요)
    const individualMealCount = mergedMealLogs.filter(
      (log) =>
        log.attendance === INDIVIDUAL_MEAL_ATTENDANCE && isWeekday(log.date),
    ).length;

    // 연차/재택/휴무 수 계산 (반차 제외, 평일만)
    const noMealFullDayCount = mergedMealLogs.filter(
      (log) =>
        isNoMealAttendance(log.attendance) &&
        !isHalfDayOff(log.attendance) &&
        isWeekday(log.date),
    ).length;

    // 반차 수 계산 (평일만)
    const halfDayOffCount = mergedMealLogs.filter(
      (log) => isHalfDayOff(log.attendance) && isWeekday(log.date),
    ).length;

    // 주말 실제 근무일 수 계산 (attendance가 명시적으로 '근무'인 경우만)
    const weekendWorkCount = mergedMealLogs.filter((log) => {
      const day = dayjs(log.date).day(); // 0=일, 6=토
      const isWeekend = day === 0 || day === 6;
      return isWeekend && log.attendance === "근무";
    }).length;

    // 개별식사 차감액 계산 (개별식사 수 × 일일 지원금)
    const individualMealDeduction = individualMealCount * dailyAllowance;

    // 연차/재택/휴무 차감액 (연차/재택/휴무 수 × 일일 지원금)
    const noMealDeduction = noMealFullDayCount * dailyAllowance;

    // 반차 차감액 (반차 수 × 일일 지원금)
    const halfDayDeduction = halfDayOffCount * dailyAllowance;

    // 총 차감액 (공휴일은 Admin에서 월별 지원금 저장 시 이미 제외됨)
    const totalDeduction =
      individualMealDeduction + noMealDeduction + halfDayDeduction;

    // 주말 근무 가산액
    const weekendWorkAddition = weekendWorkCount * dailyAllowance;

    // 실제 사용가능 금액 = 월별 지원금 - 총 차감액 + 주말 근무 가산액
    const effectiveAllowance =
      allowanceAmount - totalDeduction + weekendWorkAddition;

    // 잔액 = 실제 사용가능 금액 - 총 사용액
    const balance = effectiveAllowance - totalUsed;

    return NextResponse.json({
      success: true,
      data: {
        allowanceAmount: effectiveAllowance, // 실제 사용가능 금액 반환
        originalAllowance: allowanceAmount, // 원래 월별 지원금
        totalUsed,
        balance,
        mealCount,
        individualMealCount,
        individualMealDeduction,
        noMealFullDayCount, // 연차/재택/휴무 일수
        noMealDeduction, // 연차/재택/휴무 차감액
        halfDayOffCount, // 반차 일수
        halfDayDeduction, // 반차 차감액
        totalDeduction, // 총 차감액
        dailyAllowance,
        weekendWorkCount, // 주말 근무 일수
        weekendWorkAddition, // 주말 근무 가산액
      },
    });
  } catch (error) {
    console.error("Meal stats error:", error);
    return NextResponse.json(
      { success: false, error: "통계 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
