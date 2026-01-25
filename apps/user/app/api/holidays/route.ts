import { createServiceClient } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = Number(searchParams.get("month"));
    const year = searchParams.get("year");

    if (!month || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Invalid month parameter. Must be between 1-12." },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      throw new Error("Supabase 클라이언트를 초기화할 수 없습니다.");
    }

    // 시작 및 종료 날짜 계산 (월의 마지막 날 정확히 계산)
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const startDate = `${targetYear}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(targetYear, month, 0).getDate(); // 해당 월의 마지막 날
    const endDate = `${targetYear}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    // Supabase에서 공휴일 조회
    const { data, error } = await supabase
      .from("holidays")
      .select("holiday_date, description")
      .gte("holiday_date", startDate)
      .lte("holiday_date", endDate)
      .order("holiday_date", { ascending: true });

    if (error) {
      throw new Error(`공휴일 조회 실패: ${error.message}`);
    }

    // 기존 API 응답 형식에 맞게 변환
    const holidays = (data || []).map((item) => ({
      name: item.description,
      date: item.holiday_date,
    }));

    return NextResponse.json(holidays, { status: 200 });
  } catch (error) {
    console.error("Holidays API Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "알 수 없는 오류",
        details: "Failed to fetch holidays from database",
      },
      { status: 500 }
    );
  }
}
