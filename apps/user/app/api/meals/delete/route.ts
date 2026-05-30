import { NextRequest, NextResponse } from "next/server";
import { deleteMeal, type MealType } from "@/lib/supabase/meals";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

interface DeleteMealRequest {
  userName: string;
  date: string;
  mealType?: MealType;
}

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "조식",
  lunch: "중식",
  dinner: "석식",
};

function isMealType(value: unknown): value is MealType {
  return value === "breakfast" || value === "lunch" || value === "dinner";
}

export async function DELETE(request: NextRequest) {
  try {
    const body: DeleteMealRequest = await request.json();
    const { userName, date, mealType } = body;

    if (!userName || !date) {
      return NextResponse.json(
        {
          success: false,
          error: "필수 파라미터가 누락되었습니다.",
          details: "userName과 date가 필요합니다.",
        },
        { status: 400 },
      );
    }

    if (mealType && !isMealType(mealType)) {
      return NextResponse.json(
        {
          success: false,
          error: "올바르지 않은 식사 타입입니다.",
          details: "mealType은 breakfast, lunch, dinner 중 하나여야 합니다.",
        },
        { status: 400 },
      );
    }

    // 날짜 파싱 (한국 시간대로 처리)
    const targetDateKST = dayjs(date).tz("Asia/Seoul");
    if (!targetDateKST.isValid()) {
      return NextResponse.json(
        {
          success: false,
          error: "올바르지 않은 날짜 형식입니다.",
        },
        { status: 400 },
      );
    }

    console.log(
      `Processing meal deletion for ${userName} on ${targetDateKST.format("YYYY-MM-DD")} (${mealType || "all"}) (KST)`,
    );

    // Supabase에서 삭제
    const result = await deleteMeal(userName, date, mealType);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete meal data",
          details: result.error,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: mealType
        ? `${MEAL_TYPE_LABELS[mealType]} 기록이 성공적으로 삭제되었습니다.`
        : "식사 기록이 성공적으로 삭제되었습니다.",
      data: {
        userName,
        date: targetDateKST.format("YYYY-MM-DD"),
        mealType: mealType || null,
      },
    });
  } catch (error) {
    console.error("Error in meal delete API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "서버 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 },
    );
  }
}
