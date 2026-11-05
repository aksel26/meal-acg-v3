export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getWeekStartDate } from "@/lib/lunch-week";
import { createServiceClient } from "@/lib/supabase/client";
import dayjs from "dayjs";
import { NextRequest, NextResponse } from "next/server";

type MemberRow = {
  member_id: string;
  full_name: string;
  member_role: string | null;
  team_id: string | null;
  team_name: string | null;
  current_status: string | null;
};

type MyGroupRow = {
  group_id: string;
  lunch_groups: { group_number: number } | null;
};

type MateRow = {
  user_id: string;
  members: { full_name: string } | null;
};

type Person = { id: string; name: string };

type CompanionMeal = {
  store: string | null;
  amount: number;
  payer: string | null;
};

const LEADER_ROLE = "팀장";
const INACTIVE_STATUSES = ["퇴사", "휴직", "육아휴직"];

// 같은 요일에 유형이 여럿이면 내 역할에 맞는 것을 고른다 (예: 월요일 팀장식사 + 팀원식사)
const LEADER_MEAL_TYPES = ["팀장식사", "팀식사", "점심조"];
const MEMBER_MEAL_TYPES = ["팀원식사", "팀식사", "점심조"];

const toPerson = (member: MemberRow): Person => ({
  id: member.member_id,
  name: member.full_name,
});

// 어드민 고정 스케줄의 요일별 유형에 따라, 입력 중인 주의 요일별 동료와 그들의 중식 내역을 돌려준다.
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const memberId = searchParams.get("member_id");
    const date = searchParams.get("date");

    if (!memberId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, message: "member_id와 date(YYYY-MM-DD)가 필요합니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      throw new Error("Supabase 클라이언트를 초기화할 수 없습니다.");
    }

    const weekStartDate = getWeekStartDate(dayjs(date));

    // 1. 어드민 고정 스케줄, 구성원의 역할·소속, 그 주에 내가 속한 점심조
    const [
      { data: schedules, error: schedulesError },
      { data: memberRows, error: membersError },
      { data: myGroups, error: myGroupError },
    ] = await Promise.all([
      supabase
        .from("lunch_fixed_schedules")
        .select("day_of_week, label")
        .order("day_of_week"),
      supabase
        .from("member_current_status" as "members")
        .select(
          "member_id, full_name, member_role, team_id, team_name, current_status",
        ) as unknown as PromiseLike<{
        data: MemberRow[] | null;
        error: { message: string } | null;
      }>,
      supabase
        .from("lunch_group_members")
        .select("group_id, lunch_groups!inner(group_number)")
        .eq("user_id", memberId)
        .eq("lunch_groups.week_start_date", weekStartDate)
        .limit(1),
    ]);

    if (schedulesError) {
      throw new Error(`고정 스케줄 조회 실패: ${schedulesError.message}`);
    }

    if (membersError) {
      throw new Error(`구성원 조회 실패: ${membersError.message}`);
    }

    const me = memberRows?.find((member) => member.member_id === memberId);
    if (!me) {
      return NextResponse.json(
        { success: false, message: "등록되지 않은 사용자입니다." },
        { status: 404 },
      );
    }

    const colleagues = (memberRows ?? []).filter(
      (member) =>
        member.member_id !== memberId &&
        !INACTIVE_STATUSES.includes(member.current_status ?? ""),
    );
    const teammates = me.team_id
      ? colleagues.filter((member) => member.team_id === me.team_id)
      : [];
    const noTeammateMessage = me.team_id
      ? "같은 팀 인원이 없습니다."
      : "소속 팀이 없습니다.";

    if (myGroupError) {
      throw new Error(`내 점심조 조회 실패: ${myGroupError.message}`);
    }

    // 2. 내 점심조의 조원
    const myGroup = (myGroups as unknown as MyGroupRow[] | null)?.[0];
    let groupMates: Person[] = [];

    if (myGroup) {
      const { data: mateRows, error: matesError } = await supabase
        .from("lunch_group_members")
        .select("user_id, members(full_name)")
        .eq("group_id", myGroup.group_id)
        .neq("user_id", memberId);

      if (matesError) {
        throw new Error(`조원 조회 실패: ${matesError.message}`);
      }

      groupMates = ((mateRows ?? []) as unknown as MateRow[]).map((mate) => ({
        id: mate.user_id,
        name: mate.members?.full_name ?? "알 수 없음",
      }));
    }

    const companionsByType: Record<
      string,
      { subtitle: string | null; people: Person[]; emptyMessage: string }
    > = {
      팀장식사: {
        subtitle: null,
        people: colleagues
          .filter((member) => member.member_role === LEADER_ROLE)
          .map(toPerson),
        emptyMessage: "다른 팀장이 없습니다.",
      },
      팀원식사: {
        subtitle: me.team_name,
        people: teammates
          .filter((member) => member.member_role !== LEADER_ROLE)
          .map(toPerson),
        emptyMessage: noTeammateMessage,
      },
      팀식사: {
        subtitle: me.team_name,
        people: teammates.map(toPerson),
        emptyMessage: noTeammateMessage,
      },
      점심조: {
        subtitle: myGroup ? `${myGroup.lunch_groups?.group_number}조` : null,
        people: groupMates,
        emptyMessage: myGroup
          ? "같은 조 조원이 없습니다."
          : "이 주에 배정된 점심조가 없습니다.",
      },
    };

    // 3. 요일별 유형을 내 역할에 맞춰 고른다 (멤버만 지정한 행은 유형이 아니므로 뺀다)
    const labelsByDay = new Map<number, string[]>();
    for (const schedule of schedules ?? []) {
      if (!schedule.label) continue;
      const labels = labelsByDay.get(schedule.day_of_week) ?? [];
      labels.push(schedule.label);
      labelsByDay.set(schedule.day_of_week, labels);
    }

    const mealTypes =
      me.member_role === LEADER_ROLE ? LEADER_MEAL_TYPES : MEMBER_MEAL_TYPES;

    const days = [...labelsByDay].map(([dayOfWeek, labels]) => {
      const dayDate = dayjs(weekStartDate)
        .add(dayOfWeek - 1, "day")
        .format("YYYY-MM-DD");
      // 어드민 라벨은 직접 입력이라 "팀 식사"처럼 띄어 써도 같은 유형으로 본다
      const mealType = mealTypes.find((type) =>
        labels.some((label) => label.replace(/\s/g, "") === type),
      );
      const companions = mealType ? companionsByType[mealType] : null;

      return {
        date: dayDate,
        label: mealType ?? labels.join(", "),
        subtitle: companions?.subtitle ?? null,
        people: companions?.people ?? [],
        emptyMessage: companions?.emptyMessage ?? "해당하는 인원이 없습니다.",
      };
    });

    // 4. 표시할 동료의 그 주 중식 내역
    const { data: logs, error: logsError } = await supabase
      .from("meal_logs")
      .select("user_id, entry_date, lunch_store, lunch_amount, lunch_payer")
      .in("user_id", [
        ...new Set(days.flatMap((day) => day.people.map((person) => person.id))),
      ])
      .in(
        "entry_date",
        days.map((day) => day.date),
      );

    if (logsError) {
      throw new Error(`식대 내역 조회 실패: ${logsError.message}`);
    }

    const meals = new Map<string, CompanionMeal>();
    for (const log of logs ?? []) {
      const store = log.lunch_store?.trim() || null;
      const amount = log.lunch_amount ?? 0;
      if (!store && amount <= 0) continue;

      meals.set(`${log.user_id}|${log.entry_date}`, {
        store,
        amount,
        payer: log.lunch_payer?.trim() || null,
      });
    }

    return NextResponse.json({
      success: true,
      message: "동료 식대 내역 조회 성공",
      result: {
        days: days.map(({ people, ...day }) => ({
          ...day,
          people: people
            .map((person) => ({
              name: person.name,
              meal: meals.get(`${person.id}|${day.date}`) ?? null,
            }))
            .sort((a, b) => a.name.localeCompare(b.name, "ko")),
        })),
      },
    });
  } catch (err) {
    console.error("Meal companions API error:", err);
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof Error ? err.message : "An unknown error occurred",
      },
      { status: 500 },
    );
  }
}
