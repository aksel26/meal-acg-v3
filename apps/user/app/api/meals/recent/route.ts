import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

type MealLogWithMember = {
  id: string;
  user_id: string;
  entry_date: string;
  attendance: string | null;
  breakfast_store: string | null;
  breakfast_amount: number | null;
  lunch_store: string | null;
  lunch_amount: number | null;
  dinner_store: string | null;
  dinner_amount: number | null;
  updated_at: string | null;
  members: { full_name: string } | null;
};

function getMealTypes(row: MealLogWithMember): string[] {
  const mealTypes: string[] = [];

  if ((row.breakfast_amount ?? 0) > 0 || row.breakfast_store?.trim()) {
    mealTypes.push("조식");
  }
  if (
    (row.lunch_amount ?? 0) > 0 ||
    row.lunch_store?.trim() ||
    row.attendance?.includes("개별식사")
  ) {
    mealTypes.push(row.attendance?.includes("개별식사") ? "개별식사" : "중식");
  }
  if ((row.dinner_amount ?? 0) > 0 || row.dinner_store?.trim()) {
    mealTypes.push("석식");
  }

  return mealTypes;
}

function getPrimaryStore(row: MealLogWithMember): string | null {
  return row.lunch_store || row.dinner_store || row.breakfast_store || null;
}

function getMealDetails(row: MealLogWithMember) {
  const details: { type: string; store: string | null }[] = [];

  if ((row.breakfast_amount ?? 0) > 0 || row.breakfast_store?.trim()) {
    details.push({ type: "조식", store: row.breakfast_store?.trim() || null });
  }
  if (
    (row.lunch_amount ?? 0) > 0 ||
    row.lunch_store?.trim() ||
    row.attendance?.includes("개별식사")
  ) {
    details.push({
      type: row.attendance?.includes("개별식사") ? "개별식사" : "중식",
      store: row.lunch_store?.trim() || null,
    });
  }
  if ((row.dinner_amount ?? 0) > 0 || row.dinner_store?.trim()) {
    details.push({ type: "석식", store: row.dinner_store?.trim() || null });
  }

  return details;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const excludeUserId = searchParams.get("exclude_user_id");
    const limit = Math.min(Number(searchParams.get("limit") ?? 12), 30);

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "데이터베이스 연결 오류" },
        { status: 500 },
      );
    }

    let query = supabase
      .from("meal_logs")
      .select(
        "id, user_id, entry_date, attendance, breakfast_store, breakfast_amount, lunch_store, lunch_amount, dinner_store, dinner_amount, updated_at, members!meal_logs_user_id_fkey(full_name)",
      )
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (excludeUserId) {
      query = query.neq("user_id", excludeUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Recent meal activity query error:", error);
      return NextResponse.json(
        { success: false, error: "최근 식대 입력 내역 조회 오류" },
        { status: 500 },
      );
    }

    const activities = ((data ?? []) as unknown as MealLogWithMember[])
      .map((row) => ({
        id: row.id,
        userName: row.members?.full_name ?? "알 수 없음",
        date: row.entry_date,
        mealTypes: getMealTypes(row),
        mealDetails: getMealDetails(row),
        store: getPrimaryStore(row),
        amount:
          (row.breakfast_amount ?? 0) +
          (row.lunch_amount ?? 0) +
          (row.dinner_amount ?? 0),
        attendance: row.attendance,
        updatedAt: row.updated_at,
      }))
      .filter((activity) => activity.mealTypes.length > 0);

    return NextResponse.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error("Recent meal activity API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "최근 식대 입력 내역 조회 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
