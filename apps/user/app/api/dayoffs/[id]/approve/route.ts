import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

// PATCH /api/dayoffs/[id]/approve - 근태 승인
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client initialization failed" },
        { status: 500 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { approverId } = body;

    if (!approverId) {
      return NextResponse.json(
        { error: "approverId is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("dayoffs")
      .update({
        approver_id: approverId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("is_deleted", false)
      .is("approver_id", null)
      .select(
        `
        *,
        approver:members!dayoffs_approver_id_fkey(id, full_name)
      `
      )
      .single();

    if (error) {
      console.error("Error approving dayoff:", error);
      return NextResponse.json(
        { error: "Failed to approve dayoff (already approved or not found)" },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Dayoffs approve API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
