import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// PUT /api/monthly/settings - Update drink options and pickup persons
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const body = await request.json();
    const { drinkOptions, pickupPersons, year, month } = body;

    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || new Date().getMonth() + 1;

    const { error } = await supabase.from("monthly_drink_settings").upsert(
      {
        year: targetYear,
        month: targetMonth,
        drink_options: drinkOptions || [],
        pickup_persons: pickupPersons || [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "year,month" }
    );

    if (error) {
      console.error("Error updating settings:", error);
      return NextResponse.json(
        { error: "Failed to update settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "설정이 업데이트되었습니다.",
    });
  } catch (error) {
    console.error("Monthly settings API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
