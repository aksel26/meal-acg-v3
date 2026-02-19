import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// PUT /api/divisions/[id] - Update a division
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();

    const { name } = body;

    if (!id) {
      return NextResponse.json({ error: "Division ID is required" }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("divisions")
      .update({ name })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating division:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Division not found" }, { status: 404 });
      }
      if (error.code === "23505") {
        return NextResponse.json({ error: "Division name already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to update division" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Divisions API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/divisions/[id] - Delete a division
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Division ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("divisions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting division:", error);
      return NextResponse.json({ error: "Failed to delete division" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Divisions API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
