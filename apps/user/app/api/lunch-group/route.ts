export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/client";
import { NextResponse } from "next/server";
import dayjs from "dayjs";

// 현재 주의 월요일 날짜 계산
function getWeekStartDate(date: dayjs.Dayjs = dayjs()): string {
  const day = date.day();
  // 일요일(0)이면 -6, 그 외에는 1 - day
  const diff = day === 0 ? -6 : 1 - day;
  return date.add(diff, "day").format("YYYY-MM-DD");
}

// 다음 주 월요일 날짜 계산
function getNextWeekStartDate(date: dayjs.Dayjs = dayjs()): string {
  const currentWeekStart = getWeekStartDate(date);
  return dayjs(currentWeekStart).add(7, "day").format("YYYY-MM-DD");
}

export async function GET() {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      throw new Error("Supabase 클라이언트를 초기화할 수 없습니다.");
    }

    const weekStartDate = getWeekStartDate();
    const nextWeekStartDate = getNextWeekStartDate();

    // 1. 점심조 설정 조회
    const { data: settings, error: settingsError } = await supabase
      .from("lunch_group_settings")
      .select("*")
      .single();

    if (settingsError && settingsError.code !== "PGRST116") {
      console.error("Settings error:", settingsError);
    }

    const membersPerGroup = settings?.max_members_per_group || 4;

    // 2. 현재 주차 점심조 조회 (멤버 정보 포함)
    const { data: lunchGroups, error: groupsError } = await supabase
      .from("lunch_groups")
      .select(`
        *,
        lunch_group_members (
          id,
          user_id,
          assigned_at,
          members (
            id,
            full_name
          )
        )
      `)
      .eq("week_start_date", weekStartDate)
      .order("group_number", { ascending: true });

    if (groupsError) {
      throw new Error(`점심조 조회 실패: ${groupsError.message}`);
    }

    // 3. 고정 스케줄 조회 (월요일=1, 금요일=5)
    const { data: fixedSchedules, error: schedulesError } = await supabase
      .from("lunch_fixed_schedules")
      .select(`
        day_of_week,
        members (
          full_name
        )
      `)
      .in("day_of_week", [1, 5]);

    if (schedulesError) {
      console.error("Fixed schedules error:", schedulesError);
    }

    // 월요일/금요일 담당자 추출
    const mondayMembers = fixedSchedules
      ?.filter((s) => s.day_of_week === 1)
      .map((s) => (s.members as { full_name: string })?.full_name)
      .filter(Boolean) || [];

    const fridayMembers = fixedSchedules
      ?.filter((s) => s.day_of_week === 5)
      .map((s) => (s.members as { full_name: string })?.full_name)
      .filter(Boolean) || [];

    // 4. 응답 데이터 구성
    const groups = (lunchGroups || []).map((group) => {
      const members = group.lunch_group_members || [];
      const maxSlots = group.max_slots || membersPerGroup;

      // person 배열: 배정된 멤버 이름 + 빈 슬롯
      const person: string[] = [];
      for (let i = 0; i < maxSlots; i++) {
        const member = members[i];
        if (member && member.members) {
          person.push((member.members as { full_name: string }).full_name);
        } else {
          person.push("");
        }
      }

      return {
        groupNumber: String(group.group_number),
        person,
      };
    });

    // 총 멤버 수 계산
    const totalMembers = groups.reduce((acc, g) => acc + g.person.length, 0);

    return NextResponse.json(
      {
        success: true,
        message: "점심조 조회 성공",
        result: {
          totalMembers: String(totalMembers),
          membersPerGroup: String(membersPerGroup),
          prevDate: weekStartDate,
          nextDate: nextWeekStartDate,
          groups,
          mondayMember: mondayMembers.join(", ") || "",
          fridayMember: fridayMembers.join(", ") || "",
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Lunch group API error:", err);
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof Error ? err.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}
