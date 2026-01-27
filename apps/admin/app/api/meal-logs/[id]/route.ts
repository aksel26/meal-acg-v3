import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// PUT /api/meal-logs/[id] - Update a meal log
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();

    const {
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

    const { data, error } = await supabase
      .from("meal_logs")
      .update({
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
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating meal log:", error);
      return NextResponse.json({ error: "Failed to update meal log" }, { status: 500 });
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

// DELETE /api/meal-logs/[id] - Delete a meal log
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;

    const { error } = await supabase.from("meal_logs").delete().eq("id", id);

    if (error) {
      console.error("Error deleting meal log:", error);
      return NextResponse.json({ error: "Failed to delete meal log" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Meal logs API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
