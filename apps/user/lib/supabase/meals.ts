import { createServiceClient } from "./client";
import dayjs from "dayjs";

export interface MealEntry {
  store: string;
  amount: number;
  payer: string;
}

export interface MealData {
  date: Date | string;
  breakfast: MealEntry;
  lunch: MealEntry & { attendance?: string };
  dinner: MealEntry;
}

export interface MealLogRow {
  id: string;
  entry_date: string;
  attendance: string | null;
  breakfast_store: string | null;
  breakfast_amount: number | null;
  breakfast_payer: string | null;
  lunch_store: string | null;
  lunch_amount: number | null;
  lunch_payer: string | null;
  dinner_store: string | null;
  dinner_amount: number | null;
  dinner_payer: string | null;
  total_amount: number | null;
}

export type MealType = "breakfast" | "lunch" | "dinner";
export const APPROVED_LEAVE_MEAL_FORBIDDEN = "APPROVED_LEAVE_MEAL_FORBIDDEN";

function hasMealSlot(row: MealLogRow, mealType: MealType) {
  if (mealType === "breakfast") {
    return Boolean(
      row.breakfast_store ||
        row.breakfast_payer ||
        (row.breakfast_amount ?? 0) > 0,
    );
  }
  if (mealType === "lunch") {
    return Boolean(
      row.lunch_store ||
        row.lunch_payer ||
        (row.lunch_amount ?? 0) > 0 ||
        row.attendance,
    );
  }
  return Boolean(
    row.dinner_store || row.dinner_payer || (row.dinner_amount ?? 0) > 0,
  );
}

function hasAnyMealData(row: MealLogRow) {
  return (
    hasMealSlot(row, "breakfast") ||
    hasMealSlot(row, "lunch") ||
    hasMealSlot(row, "dinner")
  );
}

/**
 * 식대 데이터 저장/수정
 * @param userId - 세션에서 확인한 member UUID
 * @param mealData - 식사 데이터
 */
export async function saveMeal(
  userId: string,
  mealData: MealData,
): Promise<{ success: boolean; error?: string; data?: MealLogRow }> {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return { success: false, error: "Supabase not configured" };
    }

    const entryDate = dayjs(mealData.date).format("YYYY-MM-DD");

    // Upsert meal log (total_amount는 DB에서 자동 계산됨)
    const { data, error } = await supabase
      .from("meal_logs")
      .upsert(
        {
          user_id: userId,
          entry_date: entryDate,
          attendance: mealData.lunch.attendance || null,
          breakfast_store: mealData.breakfast.store || null,
          breakfast_amount: mealData.breakfast.amount || 0,
          breakfast_payer: mealData.breakfast.payer || null,
          lunch_store: mealData.lunch.store || null,
          lunch_amount: mealData.lunch.amount || 0,
          lunch_payer: mealData.lunch.payer || null,
          dinner_store: mealData.dinner.store || null,
          dinner_amount: mealData.dinner.amount || 0,
          dinner_payer: mealData.dinner.payer || null,
        },
        { onConflict: "user_id,entry_date" },
      )
      .select()
      .single();

    if (error) {
      console.error("Failed to save meal:", error);
      return {
        success: false,
        error: error.message.includes(APPROVED_LEAVE_MEAL_FORBIDDEN)
          ? APPROVED_LEAVE_MEAL_FORBIDDEN
          : error.message,
      };
    }

    console.log(`Meal saved: - ${entryDate}`);
    return { success: true, data };
  } catch (error) {
    console.error("Save meal error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 식대 데이터 삭제
 */
export async function deleteMeal(
  userId: string,
  date: string,
  mealType?: MealType,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return { success: false, error: "Supabase not configured" };
    }

    const entryDate = dayjs(date).format("YYYY-MM-DD");

    const baseQuery = supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("entry_date", entryDate)
      .limit(1);

    const { data: mealLogs, error: fetchError } = await baseQuery;

    if (fetchError) {
      console.error("Failed to fetch meal for delete:", fetchError);
      return { success: false, error: fetchError.message };
    }

    const mealLog = mealLogs?.[0] as MealLogRow | undefined;
    if (!mealLog) {
      return { success: true };
    }

    if (!mealType) {
      const { error } = await supabase
        .from("meal_logs")
        .delete()
        .eq("user_id", userId)
        .eq("entry_date", entryDate);

      if (error) {
        console.error("Failed to delete meal:", error);
        return { success: false, error: error.message };
      }

      console.log(`Meal deleted: ${entryDate}`);
      return { success: true };
    }

    const updateData =
      mealType === "breakfast"
        ? {
            breakfast_store: null,
            breakfast_amount: 0,
            breakfast_payer: null,
          }
        : mealType === "lunch"
          ? {
              attendance: null,
              lunch_store: null,
              lunch_amount: 0,
              lunch_payer: null,
            }
          : {
              dinner_store: null,
              dinner_amount: 0,
              dinner_payer: null,
            };

    const nextMealLog = { ...mealLog, ...updateData };

    if (!hasAnyMealData(nextMealLog)) {
      const { error } = await supabase
        .from("meal_logs")
        .delete()
        .eq("user_id", userId)
        .eq("entry_date", entryDate);

      if (error) {
        console.error("Failed to delete empty meal:", error);
        return { success: false, error: error.message };
      }

      console.log(`Meal row deleted after clearing ${mealType}: ${entryDate}`);
      return { success: true };
    }

    const { error } = await supabase
      .from("meal_logs")
      .update(updateData)
      .eq("user_id", userId)
      .eq("entry_date", entryDate);

    if (error) {
      console.error("Failed to delete meal slot:", error);
      return { success: false, error: error.message };
    }

    console.log(`Meal slot deleted: ${mealType} - ${entryDate}`);
    return { success: true };
  } catch (error) {
    console.error("Delete meal error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 월별 식대 데이터 조회
 */
export async function getMealsByMonth(
  userId: string,
  year: number,
  month: number,
): Promise<{ success: boolean; error?: string; data?: MealLogRow[] }> {
  try {
    console.log(
      `getMealsByMonth called: userId=${userId}, year=${year}, month=${month}`,
    );

    const supabase = createServiceClient();
    if (!supabase) {
      console.error(
        "Supabase client not configured - check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
      );
      return { success: false, error: "Supabase not configured" };
    }

    // Calculate date range for the month
    const startDate = dayjs(`${year}-${month}-01`).format("YYYY-MM-DD");
    const endDate = dayjs(`${year}-${month}-01`)
      .endOf("month")
      .format("YYYY-MM-DD");

    console.log(
      `Querying meal_logs: user_id=${userId}, ${startDate} ~ ${endDate}`,
    );

    // Get meal logs
    const { data, error } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", userId)
      .gte("entry_date", startDate)
      .lte("entry_date", endDate)
      .order("entry_date", { ascending: true });

    if (error) {
      console.error("Failed to get meals:", error);
      return { success: false, error: error.message };
    }

    console.log(`Found ${data?.length || 0} meal entries`);
    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Get meals error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 특정 날짜의 식대 데이터 조회
 */
export async function getMealByDate(
  userId: string,
  date: string,
): Promise<{ success: boolean; error?: string; data?: MealLogRow | null }> {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return { success: false, error: "Supabase not configured" };
    }

    const entryDate = dayjs(date).format("YYYY-MM-DD");

    // Get meal log (use limit(1) instead of single())
    const { data: mealLogs, error } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("entry_date", entryDate)
      .limit(1);

    if (error) {
      console.error("Failed to get meal:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: mealLogs?.[0] || null };
  } catch (error) {
    console.error("Get meal error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
