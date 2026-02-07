import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// POST /api/usage-records/[id]/review - Toggle review status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();

    const { reviewer_id } = body;

    if (!reviewer_id) {
      return NextResponse.json(
        { error: "reviewer_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc("toggle_review_status", {
      p_usage_record_id: id,
      p_reviewer_id: reviewer_id,
    });

    if (error) {
      console.error("Error toggling review status:", error);
      return NextResponse.json(
        { error: "Failed to toggle review status" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Review API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
