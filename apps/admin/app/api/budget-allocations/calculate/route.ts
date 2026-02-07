import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// POST /api/budget-allocations/calculate - Calculate activity budget using RPC
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const body = await request.json();

    const {
      member_id,
      base_amount,
      per_member_amount,
      additional_count,
      additional_per_amount,
    } = body;

    if (!member_id) {
      return NextResponse.json(
        { error: "member_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc("calculate_activity_budget", {
      p_member_id: member_id,
      p_base_amount: base_amount,
      p_per_member_amount: per_member_amount,
      p_additional_count: additional_count,
      p_additional_per_amount: additional_per_amount,
    });

    if (error) {
      console.error("Error calculating activity budget:", error);
      return NextResponse.json(
        { error: "Failed to calculate activity budget" },
        { status: 500 }
      );
    }

    return NextResponse.json({ amount: data });
  } catch (error) {
    console.error("Budget calculation API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
