import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

export async function GET() {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "데이터베이스 연결 오류" },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from("global_settings")
      .select("daily_allowance, monthly_allowances")
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Settings query error:", error);
      return NextResponse.json(
        { success: false, error: "설정 조회 오류" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        dailyAllowance: data?.daily_allowance ?? 10000,
        monthlyAllowances: data?.monthly_allowances ?? {},
      },
    });
  } catch (error) {
    console.error("Settings API error:", error);
    return NextResponse.json(
      { success: false, error: "설정 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
