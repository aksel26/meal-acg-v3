import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// PUT /api/members/[id] - Update a member (organization info, role, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.team_id !== undefined) {
      updateData.team_id = body.team_id || null;
    }
    if (body.division_id !== undefined) {
      updateData.division_id = body.division_id || null;
    }
    if (body.member_role !== undefined) {
      updateData.member_role = body.member_role;
    }
    if (body.organization_id !== undefined) {
      updateData.organization_id = body.organization_id || null;
    }
    if (body.note !== undefined) {
      updateData.note = body.note || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("members")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating member:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }
      if (error.code === "23503") {
        return NextResponse.json({ error: "Referenced team or division not found" }, { status: 404 });
      }
      return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Members API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/members/[id] - Delete a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Member ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("members")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting member:", error);
      return NextResponse.json({ error: "Failed to delete member" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Members API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
