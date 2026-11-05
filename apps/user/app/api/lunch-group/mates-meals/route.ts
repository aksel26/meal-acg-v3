export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getWeekStartDate } from "@/lib/lunch-week";
import { createServiceClient } from "@/lib/supabase/client";
import dayjs from "dayjs";
import { NextRequest, NextResponse } from "next/server";

type MyGroupRow = {
  group_id: string;
  lunch_groups: { group_number: number } | null;
};

type MateRow = {
  user_id: string;
  members: { full_name: string } | null;
};

type MateMeal = {
  store: string | null;
  amount: number;
  payer: string | null;
};

// 입력 중인 날짜가 속한 주의 내 점심조와, 그 조원들이 그 주에 적은 중식 내역을 돌려준다.
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
    const weekEndDate = dayjs(weekStartDate).add(6, "day").format("YYYY-MM-DD");

    // 1. 그 주에 내가 속한 조
    const { data: myGroups, error: myGroupError } = await supabase
      .from("lunch_group_members")
      .select("group_id, lunch_groups!inner(group_number)")
      .eq("user_id", memberId)
      .eq("lunch_groups.week_start_date", weekStartDate)
      .limit(1);

    if (myGroupError) {
      throw new Error(`내 점심조 조회 실패: ${myGroupError.message}`);
    }

    const myGroup = (myGroups as unknown as MyGroupRow[] | null)?.[0];
    if (!myGroup) {
      return NextResponse.json({
        success: true,
        message: "배정된 점심조 없음",
        result: { weekStartDate, groupNumber: null, mates: [] },
      });
    }

    // 2. 같은 조 조원 (나 제외)
    const { data: mateRows, error: matesError } = await supabase
      .from("lunch_group_members")
      .select("user_id, members(full_name)")
      .eq("group_id", myGroup.group_id)
      .neq("user_id", memberId);

    if (matesError) {
      throw new Error(`조원 조회 실패: ${matesError.message}`);
    }

    const mates = (mateRows ?? []) as unknown as MateRow[];

    // 3. 조원들의 그 주 중식 내역
    const { data: logs, error: logsError } = await supabase
      .from("meal_logs")
      .select("user_id, entry_date, lunch_store, lunch_amount, lunch_payer")
      .in(
        "user_id",
        mates.map((mate) => mate.user_id),
      )
      .gte("entry_date", weekStartDate)
      .lte("entry_date", weekEndDate);

    if (logsError) {
      throw new Error(`조원 식대 내역 조회 실패: ${logsError.message}`);
    }

    const mealsByMember = new Map<string, Record<string, MateMeal>>();
    for (const log of logs ?? []) {
      const store = log.lunch_store?.trim() || null;
      const amount = log.lunch_amount ?? 0;
      if (!store && amount <= 0) continue;

      const meals = mealsByMember.get(log.user_id) ?? {};
      meals[log.entry_date] = {
        store,
        amount,
        payer: log.lunch_payer?.trim() || null,
      };
      mealsByMember.set(log.user_id, meals);
    }

    return NextResponse.json({
      success: true,
      message: "조원 식대 내역 조회 성공",
      result: {
        weekStartDate,
        groupNumber: myGroup.lunch_groups?.group_number ?? null,
        mates: mates
          .map((mate) => ({
            name: mate.members?.full_name ?? "알 수 없음",
            meals: mealsByMember.get(mate.user_id) ?? {},
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "ko")),
      },
    });
  } catch (err) {
    console.error("Lunch group mates meals API error:", err);
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
