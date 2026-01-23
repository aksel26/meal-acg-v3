import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/meal-logs - List meal logs
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const userId = searchParams.get("userId");
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const date = searchParams.get("date");

    let query = supabase
      .from("meal_logs")
      .select("*, members(full_name)")
      .order("entry_date", { ascending: true });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (year && month) {
      const startDate = `${year}-${month.padStart(2, "0")}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0)
        .toISOString()
        .split("T")[0];
      query = query.gte("entry_date", startDate).lte("entry_date", endDate);
    }

    if (date) {
      query = query.eq("entry_date", date);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching meal logs:", error);
      return NextResponse.json({ error: "Failed to fetch meal logs" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Meal logs API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/meal-logs - Create a new meal log
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const body = await request.json();

    const {
      userId,
      entryDate,
      attendance,
      breakfastStore,
      breakfastAmount,
      breakfastPayer,
      lunchStore,
      lunchAmount,
      lunchPayer,
      dinnerStore,
      dinnerAmount,
      dinnerPayer,
    } = body;

    if (!userId || !entryDate) {
      return NextResponse.json(
        { error: "userId and entryDate are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("meal_logs")
      .upsert(
        {
          user_id: userId,
          entry_date: entryDate,
          attendance,
          breakfast_store: breakfastStore,
          breakfast_amount: breakfastAmount || 0,
          breakfast_payer: breakfastPayer,
          lunch_store: lunchStore,
          lunch_amount: lunchAmount || 0,
          lunch_payer: lunchPayer,
          dinner_store: dinnerStore,
          dinner_amount: dinnerAmount || 0,
          dinner_payer: dinnerPayer,
        },
        { onConflict: "user_id,entry_date" }
      )
      .select()
      .single();

    if (error) {
      console.error("Error creating meal log:", error);
      return NextResponse.json({ error: "Failed to create meal log" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Meal logs API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
