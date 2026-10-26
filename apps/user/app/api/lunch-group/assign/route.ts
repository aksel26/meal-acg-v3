import { createServiceClient } from "@/lib/supabase/client";
import { getWeekStartDate } from "@/lib/lunch-week";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      throw new Error("Supabase 클라이언트를 초기화할 수 없습니다.");
    }

    // 1. 요청 파싱
    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      throw new Error("잘못된 JSON 형식입니다.");
    }

    const { userName } = requestBody;
    if (!userName || typeof userName !== "string" || userName.trim().length === 0) {
      throw new Error("유효하지 않은 사용자 이름입니다.");
    }

    // 2. 사용자 조회 (full_name으로)
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, full_name")
      .eq("full_name", userName.trim())
      .single();

    if (memberError || !member) {
      throw new Error("등록되지 않은 사용자입니다.");
    }

    // 3. 배정은 DB 함수가 한 트랜잭션에서 처리한다.
    //    주차 조 행을 잠근 뒤 제외 인원·중복 배정·빈 자리를 검사하고 랜덤으로 조를 고른다.
    //    동시에 여러 명이 뽑아도 정원을 넘기거나 한 사람이 두 조에 들어가지 않는다.
    const { data, error } = await supabase.rpc("assign_lunch_group", {
      p_member_id: member.id,
      p_week_start_date: getWeekStartDate(),
    });

    if (error) {
      throw new Error(error.message);
    }

    const assigned = data?.[0];
    if (!assigned) {
      throw new Error("조 선택에 실패했습니다.");
    }

    return NextResponse.json(
      {
        success: true,
        message: "점심조가 배정되었습니다.",
        data: {
          groupNumber: assigned.group_number,
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
