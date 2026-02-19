import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// PUT /api/teams/[id] - Update a team
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();

    const { name, division_id } = body;

    if (!id) {
      return NextResponse.json({ error: "Team ID is required" }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const updateData: { name: string; division_id?: string | null } = { name };
    if (division_id !== undefined) {
      updateData.division_id = division_id || null;
    }

    const { data, error } = await supabase
      .from("teams")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating team:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Team not found" }, { status: 404 });
      }
      if (error.code === "23505") {
        return NextResponse.json({ error: "Team name already exists" }, { status: 409 });
      }
      if (error.code === "23503") {
        return NextResponse.json({ error: "Division not found" }, { status: 404 });
      }
      return NextResponse.json({ error: "Failed to update team" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Teams API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/teams/[id] - Delete a team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Team ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("teams")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting team:", error);
      return NextResponse.json({ error: "Failed to delete team" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Teams API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
