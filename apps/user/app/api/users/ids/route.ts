import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

export async function GET() {
  try {
    const supabase = createServiceClient();

    if (!supabase) {
      return NextResponse.json(
        { error: "데이터베이스 연결 오류" },
        { status: 500 }
      );
    }

    // member_current_status VIEW에서 정상 인원만 조회 (휴직/퇴사 등 제외)
    const { data: members, error } = await supabase
      .from("member_current_status" as any)
      .select("full_name")
      .is("current_status", null)
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Failed to fetch users from Supabase:", error);
      return NextResponse.json(
        { error: "사용자 목록 조회 실패", details: error.message },
        { status: 500 }
      );
    }

    // full_name 배열로 변환
    const userNames = (members as unknown as { full_name: string }[] | null)
      ?.map((member) => member.full_name)
      .filter((name): name is string => !!name) || [];

    return NextResponse.json({
      success: true,
      data: userNames,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
