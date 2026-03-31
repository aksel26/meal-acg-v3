import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/positions - List all positions
export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("positions")
      .select("*")
      .order("sort_order");

    if (error) {
      console.error("Error fetching positions:", error);
      return NextResponse.json({ error: "Failed to fetch positions" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Positions API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/positions - Create a new position
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const body = await request.json();

    const { name, sort_order, annual_leave_days, leave_accrual_rule } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("positions")
      .insert({ name, sort_order, annual_leave_days, leave_accrual_rule })
      .select()
      .single();

    if (error) {
      console.error("Error creating position:", error);
      if (error.code === "23505") {
        return NextResponse.json({ error: "이미 존재하는 직급입니다." }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to create position" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Positions API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
