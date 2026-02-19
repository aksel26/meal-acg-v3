import { NextRequest, NextResponse } from "next/server";
import { getMealsByMonth, getMealByDate } from "@/lib/supabase/meals";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // YYYY-MM-DD format
    const month = searchParams.get("month"); // MM format for month view
    const year = searchParams.get("year"); // YYYY format for year
    const name = searchParams.get("name");

    console.log(`=== Calendar Meals API ===`);
    console.log(`Name: ${name}, Date: ${date}, Month: ${month}, Year: ${year}`);

    if (!name) {
      console.error("Missing name parameter");
      return NextResponse.json(
        { error: "Name parameter is required" },
        { status: 400 }
      );
    }

    if (!date && !month) {
      console.error("Missing date or month parameter");
      return NextResponse.json(
        { error: "Either date or month parameter is required" },
        { status: 400 }
      );
    }

    // 특정 날짜 조회
    if (date) {
      const result = await getMealByDate(name, date);

      if (!result.success) {
        return NextResponse.json(
          { error: "Failed to fetch meal data", details: result.error },
          { status: 500 }
        );
      }

      // 단일 날짜 조회 시에도 배열로 반환 (기존 API 호환)
      const data = result.data
        ? [
            {
              date: result.data.entry_date,
              attendance: result.data.attendance,
              breakfast: {
                store: result.data.breakfast_store,
                amount: result.data.breakfast_amount,
                payer: result.data.breakfast_payer,
              },
              lunch: {
                store: result.data.lunch_store,
                amount: result.data.lunch_amount,
                payer: result.data.lunch_payer,
              },
              dinner: {
                store: result.data.dinner_store,
                amount: result.data.dinner_amount,
                payer: result.data.dinner_payer,
              },
              total: result.data.total_amount,
            },
          ]
        : [];

      return NextResponse.json({
        success: true,
        data,
      });
    }

    // 월별 조회
    if (month) {
      const targetYear = year ? parseInt(year) : new Date().getFullYear();
      const targetMonth = parseInt(month);

      const result = await getMealsByMonth(name, targetYear, targetMonth);

      if (!result.success) {
        return NextResponse.json(
          { error: "Failed to fetch meal data", details: result.error },
          { status: 500 }
        );
      }

      // 기존 API 형식으로 변환
      const data = (result.data || []).map((row) => ({
        date: row.entry_date,
        attendance: row.attendance,
        breakfast: {
          store: row.breakfast_store,
          amount: row.breakfast_amount,
          payer: row.breakfast_payer,
        },
        lunch: {
          store: row.lunch_store,
          amount: row.lunch_amount,
          payer: row.lunch_payer,
        },
        dinner: {
          store: row.dinner_store,
          amount: row.dinner_amount,
          payer: row.dinner_payer,
        },
        total: row.total_amount,
      }));

      console.log(`Found ${data.length} meal entries`);

      return NextResponse.json({
        success: true,
        data,
      });
    }

    return NextResponse.json(
      { error: "Invalid date parameters" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Calendar meals API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch meal data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
