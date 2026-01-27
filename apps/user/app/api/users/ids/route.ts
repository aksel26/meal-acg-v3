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

    // members 테이블에서 사용자 이름 조회
    const { data: members, error } = await supabase
      .from("members")
      .select("full_name")
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Failed to fetch users from Supabase:", error);
      return NextResponse.json(
        { error: "사용자 목록 조회 실패", details: error.message },
        { status: 500 }
      );
    }

    // full_name 배열로 변환
    const userNames = members
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
