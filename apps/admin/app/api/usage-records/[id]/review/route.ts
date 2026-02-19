import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// POST /api/usage-records/[id]/review - Advance review status
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

    const { data, error } = await supabase.rpc("advance_review_status", {
      p_usage_record_id: id,
      p_reviewer_id: reviewer_id,
    });

    if (error) {
      console.error("Error advancing review status:", error);
      return NextResponse.json(
        { error: "Failed to advance review status" },
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

// PUT /api/usage-records/[id]/review - Revert review status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();

    const { reviewer_id, target_status } = body;

    if (!reviewer_id) {
      return NextResponse.json(
        { error: "reviewer_id is required" },
        { status: 400 }
      );
    }

    if (target_status === undefined || target_status === null) {
      return NextResponse.json(
        { error: "target_status is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc("revert_review_status", {
      p_usage_record_id: id,
      p_reviewer_id: reviewer_id,
      p_target_status: target_status,
    });

    if (error) {
      console.error("Error reverting review status:", error);
      return NextResponse.json(
        { error: "Failed to revert review status" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Review revert API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
