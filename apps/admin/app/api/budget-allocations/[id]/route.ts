import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// PUT /api/budget-allocations/[id] - Update an allocation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();

    const { total_amount, description } = body;

    if (
      total_amount !== undefined &&
      (!Number.isInteger(total_amount) || total_amount < 0)
    ) {
      return NextResponse.json(
        { error: "total_amount must be a non-negative integer" },
        { status: 400 },
      );
    }

    const { data: allocation, error: allocationError } = await supabase
      .from("budget_allocations")
      .select("member_id")
      .eq("id", id)
      .single();

    if (allocationError) {
      return NextResponse.json(
        { error: "Budget allocation not found" },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (total_amount !== undefined) {
      const { data: currentStatus, error: statusError } = await supabase
        .from("member_current_status")
        .select("member_id")
        .eq("member_id", allocation.member_id)
        .maybeSingle();

      if (statusError) {
        return NextResponse.json(
          { error: "Failed to check member status" },
          { status: 500 },
        );
      }

      updateData.base_amount = total_amount;
      updateData.total_amount = currentStatus ? 0 : total_amount;
    }
    if (description !== undefined) {
      updateData.description = description;
    }

    const { data, error } = await supabase
      .from("budget_allocations")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating budget allocation:", error);
      return NextResponse.json(
        { error: "Failed to update budget allocation" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Budget allocations API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/budget-allocations/[id] - Delete an allocation
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;

    const { error } = await supabase
      .from("budget_allocations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting budget allocation:", error);
      return NextResponse.json(
        { error: "Failed to delete budget allocation" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Budget allocations API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
