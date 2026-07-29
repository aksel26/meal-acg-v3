import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/settlement - Get settlement status for a month
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

    const { data, error } = await supabase
      .from("settlement_status")
      .select("*")
      .eq("year", year)
      .eq("month", month);

    if (error) {
      console.error("Error fetching settlement status:", error);
      return NextResponse.json({ error: "Failed to fetch settlement status" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Settlement API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/settlement - Toggle settlement status
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const supabase = createServiceClient();
    const body = await request.json();

    const { userId, year, month, isSettled, notes } = body;

    if (!userId || !year || !month) {
      return NextResponse.json(
        { error: "userId, year, and month are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("settlement_status")
      .upsert(
        {
          user_id: userId,
          year,
          month,
          is_settled: isSettled,
          settled_at: isSettled ? new Date().toISOString() : null,
          settled_by: isSettled ? session.userId : null,
          notes: notes || null,
        },
        { onConflict: "user_id,year,month" }
      )
      .select()
      .single();

    if (error) {
      console.error("Error updating settlement status:", error);
      return NextResponse.json({ error: "Failed to update settlement status" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Settlement API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
