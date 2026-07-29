import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

type PositionRow = {
  name: string | null;
  annual_leave_days: number | null;
  leave_accrual_rule: string | null;
};

type TeamRow = {
  name: string | null;
};

type MemberRow = {
  id: string;
  full_name: string;
  hire_date: string | null;
  intern_months: number | null;
  member_role: string | null;
  position: PositionRow | PositionRow[] | null;
  teams: TeamRow | TeamRow[] | null;
};

type BalanceRow = {
  member_id: string;
  year: number;
  type: string;
  granted: number | null;
  used: number | null;
  adjusted: number | null;
};

type StatusRow = {
  member_id: string | null;
  current_status: string | null;
};

type CalculationItem = {
  type: "monthly" | "annual" | "summer" | "carryover";
  label: string;
  calculated: number | null;
  applied: number;
  used: number;
  remaining: number;
  basis: string;
  status: "calculated" | "unavailable" | "not_applicable";
};

const BASE_ANNUAL_LEAVE_DAYS = 15;

function first<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthsAfter(dateValue: string, months: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  return formatDate(date);
}

function calculateProratedAnnualLeave(hireDate: Date, year: number) {
  const hireDateUtc = Date.UTC(
    hireDate.getFullYear(),
    hireDate.getMonth(),
    hireDate.getDate(),
  );
  const yearStartUtc = Date.UTC(year, 0, 1);
  const employedDays = (yearStartUtc - hireDateUtc) / (24 * 60 * 60 * 1000);
  return Math.round(((BASE_ANNUAL_LEAVE_DAYS * employedDays) / 365) * 10) / 10;
}

function completedYearsAt(hireDate: Date, targetDate: Date) {
  let years = targetDate.getFullYear() - hireDate.getFullYear();
  const anniversary = new Date(hireDate);
  anniversary.setFullYear(targetDate.getFullYear());
  if (targetDate < anniversary) years -= 1;
  return Math.max(0, years);
}

function completedMonthsAt(hireDate: Date, targetDate: Date) {
  let months =
    (targetDate.getFullYear() - hireDate.getFullYear()) * 12 +
    targetDate.getMonth() -
    hireDate.getMonth();
  if (targetDate.getDate() < hireDate.getDate()) months -= 1;
  return Math.max(0, months);
}

function getBalanceTotals(
  balancesByMember: Map<string, Map<string, number>>,
  memberId: string,
  type: string,
) {
  const applied = balancesByMember.get(memberId)?.get(`${type}:applied`) ?? 0;
  const used = balancesByMember.get(memberId)?.get(`${type}:used`) ?? 0;
  return {
    applied,
    used,
    remaining: Math.max(0, applied - used),
  };
}

function buildItem(
  balancesByMember: Map<string, Map<string, number>>,
  memberId: string,
  item: Omit<CalculationItem, "applied" | "used" | "remaining">,
): CalculationItem {
  const totals = getBalanceTotals(balancesByMember, memberId, item.type);
  return {
    ...item,
    applied: totals.applied,
    used: totals.used,
    remaining: totals.remaining,
  };
}

function calculateMember(
  member: MemberRow,
  year: number,
  balancesByMember: Map<string, Map<string, number>>,
  previousMonthlyRemainingByMember: Map<string, number>,
) {
  const position = first(member.position);
  const team = first(member.teams);
  const notes: string[] = [];
  const items: CalculationItem[] = [];
  const annualLeaveDays = position?.annual_leave_days ?? 0;
  const accrualRule = position?.leave_accrual_rule ?? "none";
  const isIntern = member.member_role === "인턴" || annualLeaveDays <= 0;

  const pushItem = (item: CalculationItem) => items.push(item);

  if (!member.hire_date) {
    pushItem(buildItem(balancesByMember, member.id, {
      type: "annual",
      label: "연차",
      calculated: null,
      basis: "입사일이 없어 연차 산식을 확정할 수 없습니다.",
      status: "unavailable",
    }));
    pushItem(buildItem(balancesByMember, member.id, {
      type: "monthly",
      label: "월차",
      calculated: null,
      basis: "입사일이 없어 월차 산식을 확정할 수 없습니다.",
      status: "unavailable",
    }));
    pushItem(buildItem(balancesByMember, member.id, {
      type: "summer",
      label: "하계휴가",
      calculated: 0,
      basis: "해당없음",
      status: "not_applicable",
    }));
    pushItem(buildItem(balancesByMember, member.id, {
      type: "carryover",
      label: "이월",
      calculated: null,
      basis: "이월 기준 데이터가 없어 자동 계산하지 않습니다.",
      status: "unavailable",
    }));

    return {
      memberId: member.id,
      fullName: member.full_name,
      teamName: team?.name ?? null,
      positionName: position?.name ?? null,
      memberRole: member.member_role,
      hireDate: member.hire_date,
      internMonths: member.intern_months,
      yearsEmployed: null,
      monthsEmployed: null,
      conversionDate: null,
      status: "needs_data" as const,
      statusLabel: "입사일 필요",
      totalCalculated: 0,
      totalApplied: items.reduce((sum, item) => sum + item.applied, 0),
      items,
      notes: ["입사일 등록 후 연차/월차 계산 가능"],
    };
  }

  const hireDate = new Date(`${member.hire_date}T00:00:00`);
  const today = new Date();
  const hireYear = hireDate.getFullYear();
  const yearsEmployed = completedYearsAt(hireDate, today);
  const monthsEmployed = completedMonthsAt(hireDate, today);
  const previousMonthlyRemaining =
    previousMonthlyRemainingByMember.get(member.id) ?? 0;
  const conversionDate =
    member.intern_months && member.intern_months > 0
      ? monthsAfter(member.hire_date, member.intern_months)
      : null;

  if (isIntern) {
    notes.push("인턴 또는 기본 연차 0일 직급은 자동 부여 대상에서 제외됩니다.");
    pushItem(buildItem(balancesByMember, member.id, {
      type: "monthly",
      label: "월차",
      calculated: 0,
      basis: "인턴 또는 기본 연차 0일 직급은 월차 자동 부여 제외",
      status: "not_applicable",
    }));
    pushItem(buildItem(balancesByMember, member.id, {
      type: "annual",
      label: "연차",
      calculated: 0,
      basis: "인턴 또는 기본 연차 0일 직급은 연차 자동 부여 제외",
      status: "not_applicable",
    }));
    pushItem(buildItem(balancesByMember, member.id, {
      type: "summer",
      label: "하계휴가",
      calculated: 0,
      basis: "해당없음",
      status: "not_applicable",
    }));
  } else if (hireYear > year) {
    notes.push("선택한 연도 이후 입사자입니다.");
    pushItem(buildItem(balancesByMember, member.id, {
      type: "monthly",
      label: "월차",
      calculated: 0,
      basis: "입사 전 연도",
      status: "not_applicable",
    }));
    pushItem(buildItem(balancesByMember, member.id, {
      type: "annual",
      label: "연차",
      calculated: 0,
      basis: "입사 전 연도",
      status: "not_applicable",
    }));
    pushItem(buildItem(balancesByMember, member.id, {
      type: "summer",
      label: "하계휴가",
      calculated: 0,
      basis: "해당없음",
      status: "not_applicable",
    }));
  } else if (hireYear === year) {
    const monthly = Math.max(0, Math.min(11, 12 - (hireDate.getMonth() + 1)));
    pushItem(buildItem(balancesByMember, member.id, {
      type: "monthly",
      label: "월차",
      calculated: monthly,
      basis: "입사연도 월차 = 12 - 입사월",
      status: "calculated",
    }));
    pushItem(buildItem(balancesByMember, member.id, {
      type: "annual",
      label: "연차",
      calculated: 0,
      basis: "입사연도는 월차 기준 적용",
      status: "not_applicable",
    }));
    pushItem(buildItem(balancesByMember, member.id, {
      type: "summer",
      label: "하계휴가",
      calculated: 0,
      basis: "해당없음",
      status: "not_applicable",
    }));
  } else if (hireYear === year - 1) {
    const proratedAnnual = calculateProratedAnnualLeave(hireDate, year);
    pushItem(buildItem(balancesByMember, member.id, {
      type: "annual",
      label: "연차",
      calculated: proratedAnnual + previousMonthlyRemaining,
      basis: `비례연차 ${proratedAnnual}일 + 전년도 잔여 월차 ${previousMonthlyRemaining}일`,
      status: "calculated",
    }));
    pushItem(buildItem(balancesByMember, member.id, {
      type: "monthly",
      label: "월차",
      calculated: 0,
      basis: "전년도 잔여 월차는 비례연차에 합산",
      status: "not_applicable",
    }));
    pushItem(buildItem(balancesByMember, member.id, {
      type: "summer",
      label: "하계휴가",
      calculated: 0,
      basis: "해당없음",
      status: "not_applicable",
    }));
  } else {
    const calendarYears = year - hireYear;
    const accrual =
      accrualRule === "+1_per_3yr" ? Math.floor(calendarYears / 3) : 0;
    pushItem(buildItem(balancesByMember, member.id, {
      type: "annual",
      label: "연차",
      calculated: annualLeaveDays + accrual,
      basis:
        accrualRule === "+1_per_3yr"
          ? `기본 ${annualLeaveDays}일 + ${calendarYears}년 / 3년 가산 ${accrual}일`
          : `기본 연차 ${annualLeaveDays}일`,
      status: "calculated",
    }));
    pushItem(buildItem(balancesByMember, member.id, {
      type: "monthly",
      label: "월차",
      calculated: 0,
      basis: "입사 2년차 이후는 연차 기준 적용",
      status: "not_applicable",
    }));
    pushItem(buildItem(balancesByMember, member.id, {
      type: "summer",
      label: "하계휴가",
      calculated: 0,
      basis: "해당없음",
      status: "not_applicable",
    }));
  }

  if (conversionDate) {
    notes.push(`정규직 전환 기준일은 입사일 + 인턴 ${member.intern_months}개월로 추정됩니다.`);
  }

  const totalCalculated = items.reduce(
    (sum, item) => sum + (item.calculated ?? 0),
    0,
  );
  const totalApplied = items.reduce((sum, item) => sum + item.applied, 0);
  const hasBlockingUnavailable = items.some(
    (item) => item.status === "unavailable" && item.type !== "carryover",
  );
  const isAutoExcluded = items
    .filter((item) => item.type !== "carryover")
    .every((item) => item.status === "not_applicable");

  return {
    memberId: member.id,
    fullName: member.full_name,
    teamName: team?.name ?? null,
    positionName: position?.name ?? null,
    memberRole: member.member_role,
    hireDate: member.hire_date,
    internMonths: member.intern_months,
    yearsEmployed,
    monthsEmployed,
    conversionDate,
    status: hasBlockingUnavailable
      ? ("needs_data" as const)
      : isAutoExcluded
        ? ("not_applicable" as const)
        : ("ok" as const),
    statusLabel: hasBlockingUnavailable
      ? "입사일 필요"
      : isAutoExcluded
        ? "자동 제외"
        : "계산 가능",
    totalCalculated,
    totalApplied,
    items,
    notes,
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const yearParam = request.nextUrl.searchParams.get("year");
    const year = yearParam ? Number.parseInt(yearParam, 10) : new Date().getFullYear();

    if (!Number.isFinite(year)) {
      return NextResponse.json({ error: "year 파라미터가 올바르지 않습니다." }, { status: 400 });
    }

    const [membersResult, balancesResult, statusesResult] = await Promise.all([
      supabase
        .from("members")
        .select(
          "id, full_name, hire_date, intern_months, member_role, position:positions!members_position_id_fkey(name, annual_leave_days, leave_accrual_rule), teams(name)",
        )
        .order("full_name"),
      supabase
        .from("leave_balances")
        .select("member_id, year, type, granted, used, adjusted")
        .in("year", [year - 1, year]),
      supabase
        .from("member_current_status")
        .select("member_id, current_status"),
    ]);

    if (membersResult.error) {
      console.error("Error fetching members for leave calculator:", membersResult.error);
      return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
    }

    if (balancesResult.error) {
      console.error("Error fetching leave balances for calculator:", balancesResult.error);
      return NextResponse.json({ error: "Failed to fetch leave balances" }, { status: 500 });
    }

    const retiredIds = new Set(
      ((statusesResult.data ?? []) as StatusRow[])
        .filter((status) => status.current_status === "퇴사" && status.member_id)
        .map((status) => status.member_id as string),
    );

    const balancesByMember = new Map<string, Map<string, number>>();
    const previousMonthlyRemainingByMember = new Map<string, number>();
    for (const balance of (balancesResult.data ?? []) as BalanceRow[]) {
      if (balance.year === year - 1 && balance.type === "monthly") {
        previousMonthlyRemainingByMember.set(
          balance.member_id,
          Math.max(
            0,
            (balance.granted ?? 0) +
              (balance.adjusted ?? 0) -
              (balance.used ?? 0),
          ),
        );
      }
      if (balance.year !== year) continue;

      if (!balancesByMember.has(balance.member_id)) {
        balancesByMember.set(balance.member_id, new Map());
      }
      const byType = balancesByMember.get(balance.member_id)!;
      byType.set(
        `${balance.type}:applied`,
        (byType.get(`${balance.type}:applied`) ?? 0) +
          (balance.granted ?? 0) +
          (balance.adjusted ?? 0),
      );
      byType.set(
        `${balance.type}:used`,
        (byType.get(`${balance.type}:used`) ?? 0) + (balance.used ?? 0),
      );
    }

    const members = ((membersResult.data ?? []) as MemberRow[])
      .filter((member) => !retiredIds.has(member.id))
      .map((member) =>
        calculateMember(
          member,
          year,
          balancesByMember,
          previousMonthlyRemainingByMember,
        ),
      );

    const summary = members.reduce(
      (acc, member) => {
        acc.totalMembers += 1;
        acc.totalCalculated += member.totalCalculated;
        acc.totalApplied += member.totalApplied;
        if (member.status === "ok") acc.calculableMembers += 1;
        if (member.status === "needs_data") acc.needsDataMembers += 1;
        if (member.status === "not_applicable") acc.notApplicableMembers += 1;
        return acc;
      },
      {
        totalMembers: 0,
        calculableMembers: 0,
        needsDataMembers: 0,
        notApplicableMembers: 0,
        totalCalculated: 0,
        totalApplied: 0,
      },
    );

    return NextResponse.json({
      year,
      generatedAt: new Date().toISOString(),
      rules: {
        monthly: "입사연도: 12 - 입사월",
        annual:
          "입사 다음 해: 비례연차 + 전년도 잔여 월차, 이후: 직급 기본 연차 + 3년 단위 가산",
        summer: "해당없음 0일",
        deduction: "연차 1일, 반차 0.5일, 반반차 0.25일 차감",
        balance: "잔여 = 부여 + 조정 - 사용, 사용 차감은 연차 우선 후 월차",
        conversion: "정규직 전환일은 별도 저장값 없이 입사일 + 인턴 개월 수로만 참고 표시",
        carryover:
          "입사연도 월차 잔여(부여 + 조정 - 사용)를 다음 해 비례연차에 합산",
      },
      summary,
      members,
    });
  } catch (error) {
    console.error("Leave calculator GET error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
