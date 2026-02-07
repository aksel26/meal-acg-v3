import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/member-statuses/history/[memberId] - Get member's status history
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { memberId } = await params;

    const { data, error } = await supabase
      .from("member_statuses")
      .select("*")
      .eq("member_id", memberId)
      .order("start_date", { ascending: false });

    if (error) {
      console.error("Error fetching member status history:", error);
      return NextResponse.json(
        { error: "Failed to fetch member status history" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Member status history API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
