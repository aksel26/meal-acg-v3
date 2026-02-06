import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/usage-records - List usage records with filters
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const period = searchParams.get("period");
    const type = searchParams.get("type");
    const memberId = searchParams.get("member_id");
    const isReviewed = searchParams.get("is_reviewed");
    const allocationId = searchParams.get("allocation_id");

    let query = supabase
      .from("usage_records")
      .select(
        "*, members!usage_records_member_id_fkey(id, full_name)"
      );

    if (period) {
      query = query.like("used_at", `${period}%`);
    }
    if (type) {
      query = query.eq("type", type);
    }
    if (memberId) {
      query = query.eq("member_id", memberId);
    }
    if (isReviewed !== null && isReviewed !== undefined) {
      query = query.eq("is_reviewed", isReviewed === "true");
    }
    if (allocationId) {
      query = query.eq("allocation_id", allocationId);
    }

    const { data, error } = await query.order("used_at", { ascending: false });

    if (error) {
      console.error("Error fetching usage records:", error);
      return NextResponse.json(
        { error: "Failed to fetch usage records" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Usage records API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
