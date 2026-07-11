import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import dayjs from "dayjs";

// 현재 주의 월요일 날짜 계산
function getWeekStartDate(date: dayjs.Dayjs = dayjs()): string {
  const day = date.day();
  const diff = day === 0 ? -6 : 1 - day;
  return date.add(diff, "day").format("YYYY-MM-DD");
}

interface LunchGroupWithMembers {
  id: string;
  group_number: number;
  max_slots: number;
  lunch_group_members: {
    id: string;
    user_id: string;
  }[];
}

export async function POST() {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      throw new Error("Supabase 클라이언트를 초기화할 수 없습니다.");
    }

    // 1. 세션 확인 — 배정 대상은 세션 사용자로 고정
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const member = { id: sessionUser.id, full_name: sessionUser.fullName };

    const weekStartDate = getWeekStartDate();

    // 3. 현재 주차 점심조 조회 (멤버 정보 포함)
    const { data: lunchGroups, error: groupsError } = await supabase
      .from("lunch_groups")
      .select(`
        id,
        group_number,
        max_slots,
        lunch_group_members (
          id,
          user_id
        )
      `)
      .eq("week_start_date", weekStartDate)
      .order("group_number", { ascending: true });

    if (groupsError) {
      throw new Error(`점심조 조회 실패: ${groupsError.message}`);
    }

    if (!lunchGroups || lunchGroups.length === 0) {
      throw new Error("이번 주 점심조가 아직 생성되지 않았습니다. 관리자에게 문의하세요.");
    }

    // 4. 이미 배정되어 있는지 확인
    const allMembers = (lunchGroups as LunchGroupWithMembers[]).flatMap(
      (g) => g.lunch_group_members || []
    );
    const isAlreadyAssigned = allMembers.some((m) => m.user_id === member.id);

    if (isAlreadyAssigned) {
      throw new Error("이미 점심조에 배정되어 있습니다.");
    }

    // 5. 빈 자리가 있는 조 찾기
    const availableGroups = (lunchGroups as LunchGroupWithMembers[]).filter((group) => {
      const memberCount = group.lunch_group_members?.length || 0;
      const maxSlots = group.max_slots || 4;
      return memberCount < maxSlots;
    });

    if (availableGroups.length === 0) {
      throw new Error("빈 자리가 없습니다.");
    }

    // 6. 랜덤으로 조 선택
    const randomIndex = Math.floor(Math.random() * availableGroups.length);
    const selectedGroup = availableGroups[randomIndex];

    if (!selectedGroup) {
      throw new Error("조 선택에 실패했습니다.");
    }

    // 7. 멤버 배정
    const { error: insertError } = await supabase
      .from("lunch_group_members")
      .insert({
        group_id: selectedGroup.id,
        user_id: member.id,
        assigned_at: new Date().toISOString(),
      });

    if (insertError) {
      throw new Error(`배정 실패: ${insertError.message}`);
    }

    return NextResponse.json(
      {
        success: true,
        message: "점심조가 배정되었습니다.",
        data: {
          groupNumber: selectedGroup.group_number,
          userName: member.full_name,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Lunch group assignment error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "점심조 배정 중 오류가 발생했습니다.";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
