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

/**
 * 식대 데이터 저장/수정
 * @param userIdOrName - user_id(UUID) 또는 userName(full_name)
 * @param mealData - 식사 데이터
 */
export async function saveMeal(
  userIdOrName: string,
  mealData: MealData,
): Promise<{ success: boolean; error?: string; data?: MealLogRow }> {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return { success: false, error: "Supabase not configured" };
    }

    const entryDate = dayjs(mealData.date).format("YYYY-MM-DD");

    // UUID 형식인지 확인 (user_id로 전달된 경우)
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        userIdOrName,
      );

    let userId: string;

    if (isUUID) {
      // user_id가 직접 전달된 경우
      userId = userIdOrName;
    } else {
      // userName(full_name)으로 전달된 경우 - member 조회
      const { data: members, error: memberError } = await supabase
        .from("members")
        .select("id")
        .eq("full_name", userIdOrName)
        .limit(1);

      const member = members?.[0];
      if (memberError || !member) {
        console.error("Member not found:", userIdOrName, memberError);
        return {
          success: false,
          error: "사용자를 찾을 수 없습니다. 다시 로그인해주세요.",
        };
      }
      userId = member.id;
    }

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
      return { success: false, error: error.message };
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
  userName: string,
  date: string,
  mealType?: MealType,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return { success: false, error: "Supabase not configured" };
    }

    const entryDate = dayjs(date).format("YYYY-MM-DD");

    // Find user (use limit(1) instead of single() to handle duplicates)
    const { data: members, error: memberError } = await supabase
      .from("members")
      .select("id")
      .eq("full_name", userName)
      .limit(1);

    const member = members?.[0];
    if (memberError || !member) {
      return { success: true }; // Nothing to delete
    }

    if (!mealType) {
      // Delete entire meal log for legacy callers.
      const { error } = await supabase
        .from("meal_logs")
        .delete()
        .eq("user_id", member.id)
        .eq("entry_date", entryDate);

      if (error) {
        console.error("Failed to delete meal:", error);
        return { success: false, error: error.message };
      }

      console.log(`Meal deleted: ${entryDate}`);
      return { success: true };
    }

    const { data: mealLog, error: mealLogError } = await supabase
      .from("meal_logs")
      .select(
        "attendance, breakfast_store, breakfast_amount, breakfast_payer, lunch_store, lunch_amount, lunch_payer, dinner_store, dinner_amount, dinner_payer",
      )
      .eq("user_id", member.id)
      .eq("entry_date", entryDate)
      .maybeSingle();

    if (mealLogError) {
      console.error("Failed to find meal for partial delete:", mealLogError);
      return { success: false, error: mealLogError.message };
    }

    if (!mealLog) {
      return { success: true };
    }

    const nextMealLog = {
      ...mealLog,
      ...(mealType === "breakfast"
        ? {
            breakfast_store: null,
            breakfast_amount: 0,
            breakfast_payer: null,
          }
        : {}),
      ...(mealType === "lunch"
        ? {
            attendance: null,
            lunch_store: null,
            lunch_amount: 0,
            lunch_payer: null,
          }
        : {}),
      ...(mealType === "dinner"
        ? {
            dinner_store: null,
            dinner_amount: 0,
            dinner_payer: null,
          }
        : {}),
    };

    const hasBreakfast =
      Number(nextMealLog.breakfast_amount) > 0 ||
      Boolean(nextMealLog.breakfast_store?.trim()) ||
      Boolean(nextMealLog.breakfast_payer?.trim());
    const hasLunch =
      Boolean(nextMealLog.attendance?.trim()) ||
      Number(nextMealLog.lunch_amount) > 0 ||
      Boolean(nextMealLog.lunch_store?.trim()) ||
      Boolean(nextMealLog.lunch_payer?.trim());
    const hasDinner =
      Number(nextMealLog.dinner_amount) > 0 ||
      Boolean(nextMealLog.dinner_store?.trim()) ||
      Boolean(nextMealLog.dinner_payer?.trim());

    if (!hasBreakfast && !hasLunch && !hasDinner) {
      const { error } = await supabase
        .from("meal_logs")
        .delete()
        .eq("user_id", member.id)
        .eq("entry_date", entryDate);

      if (error) {
        console.error("Failed to delete empty meal:", error);
        return { success: false, error: error.message };
      }

      console.log(`Meal row deleted after clearing ${mealType}: ${entryDate}`);
      return { success: true };
    }

    // Clear only the selected meal columns and keep the remaining meal entries.
    const { error } = await supabase
      .from("meal_logs")
      .update(
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
              },
      )
      .eq("user_id", member.id)
      .eq("entry_date", entryDate);

    if (error) {
      console.error("Failed to delete meal:", error);
      return { success: false, error: error.message };
    }

    console.log(`${mealType} meal deleted: ${entryDate}`);
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
  userName: string,
  year: number,
  month: number,
): Promise<{ success: boolean; error?: string; data?: MealLogRow[] }> {
  try {
    console.log(`getMealsByMonth called: userName=${userName}, year=${year}, month=${month}`);

    const supabase = createServiceClient();
    if (!supabase) {
      console.error("Supabase client not configured - check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
      return { success: false, error: "Supabase not configured" };
    }

    // Find user (use limit(1) instead of single() to handle duplicates)
    const { data: members, error: memberError } = await supabase
      .from("members")
      .select("id")
      .eq("full_name", userName)
      .limit(1);

    if (memberError) {
      console.log(`Member lookup failed for "${userName}":`, memberError.message);
      return { success: true, data: [] };
    }

    const member = members?.[0];
    if (!member) {
      console.log(`No member found for "${userName}"`);
      return { success: true, data: [] };
    }

    console.log(`Found member: ${member.id}`);

    // Calculate date range for the month
    const startDate = dayjs(`${year}-${month}-01`).format("YYYY-MM-DD");
    const endDate = dayjs(`${year}-${month}-01`)
      .endOf("month")
      .format("YYYY-MM-DD");

    console.log(`Querying meal_logs: user_id=${member.id}, ${startDate} ~ ${endDate}`);

    // Get meal logs
    const { data, error } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", member.id)
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
  userName: string,
  date: string,
): Promise<{ success: boolean; error?: string; data?: MealLogRow | null }> {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return { success: false, error: "Supabase not configured" };
    }

    const entryDate = dayjs(date).format("YYYY-MM-DD");

    // Find user (use limit(1) instead of single() to handle duplicates)
    const { data: members, error: memberError } = await supabase
      .from("members")
      .select("id")
      .eq("full_name", userName)
      .limit(1);

    const member = members?.[0];
    if (memberError || !member) {
      return { success: true, data: null };
    }

    // Get meal log (use limit(1) instead of single())
    const { data: mealLogs, error } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", member.id)
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
