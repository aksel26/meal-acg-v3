import { NextRequest, NextResponse } from "next/server";
import { saveMeal, MealData } from "@/lib/supabase/meals";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userName, userId, date, breakfast, lunch, dinner } = body;

    // 필수 파라미터 검증 (userId 또는 userName 필요)
    if ((!userName && !userId) || !date) {
      return NextResponse.json(
        {
          error: "필수 파라미터가 누락되었습니다.",
          required: ["userName or userId", "date"],
          received: { userName, userId, date },
        },
        { status: 400 }
      );
    }

    // userId 우선 사용, 없으면 userName 사용
    const userIdentifier = userId || userName;

    // 날짜 파싱 (한국 시간대로 처리)
    const targetDateKST = dayjs(date).tz("Asia/Seoul");
    if (!targetDateKST.isValid()) {
      return NextResponse.json(
        { error: "올바르지 않은 날짜 형식입니다." },
        { status: 400 }
      );
    }

    console.log(`=== Meal Submit API ===`);
    console.log(`User: ${userIdentifier}, Date: ${date}`);

    // 식사 데이터 준비
    const mealData: MealData = {
      date: targetDateKST.toDate(),
      breakfast: {
        store: breakfast?.store || "",
        amount: parseInt(breakfast?.amount) || 0,
        payer: breakfast?.payer || "",
      },
      lunch: {
        store: lunch?.store || "",
        amount: parseInt(lunch?.amount) || 0,
        payer: lunch?.payer || "",
        attendance: lunch?.attendance || "",
      },
      dinner: {
        store: dinner?.store || "",
        amount: parseInt(dinner?.amount) || 0,
        payer: dinner?.payer || "",
      },
    };

    // Supabase에 저장
    const result = await saveMeal(userIdentifier, mealData);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Failed to save meal data",
          details: result.error,
        },
        { status: 500 }
      );
    }

    console.log(`Successfully saved meal data for ${userIdentifier} on ${date}`);

    return NextResponse.json({
      success: true,
      message: "식사 기록이 성공적으로 저장되었습니다.",
      data: {
        date: date,
        updatedData: mealData,
      },
    });
  } catch (error) {
    console.error("Meal submit API error:", error);

    return NextResponse.json(
      {
        error: "Failed to submit meal data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
