import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/organizations/[id] - Get a single organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching organization:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      }
      return NextResponse.json({ error: "Failed to fetch organization" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Organizations API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/organizations/[id] - Update an organization
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
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("organizations")
      .update({ name })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating organization:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      }
      if (error.code === "23505") {
        return NextResponse.json({ error: "Organization name already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Organizations API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/organizations/[id] - Delete an organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("organizations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting organization:", error);
      return NextResponse.json({ error: "Failed to delete organization" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Organizations API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
