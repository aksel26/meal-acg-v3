import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/usage-records/[id] - Get single usage record
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from("usage_records")
      .select(
        "*, members!usage_records_member_id_fkey(id, full_name)"
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching usage record:", error);
      return NextResponse.json(
        { error: "Failed to fetch usage record" },
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

// PUT /api/usage-records/[id] - Update usage record
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;
    const body = await request.json();

    const { modified_by, ...updateFields } = body;

    const updateData = {
      ...updateFields,
      last_modified_by: modified_by || null,
      last_modified_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("usage_records")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating usage record:", error);
      return NextResponse.json(
        { error: "Failed to update usage record" },
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

// DELETE /api/usage-records/[id] - Delete usage record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const modifiedBy = searchParams.get("modified_by");

    // If modified_by is provided, we could log it for audit trail
    // before deleting the record
    if (modifiedBy) {
      // Update last_modified_by before deletion for audit trail
      await supabase
        .from("usage_records")
        .update({
          last_modified_by: modifiedBy,
          last_modified_at: new Date().toISOString(),
        })
        .eq("id", id);
    }

    const { error } = await supabase
      .from("usage_records")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting usage record:", error);
      return NextResponse.json(
        { error: "Failed to delete usage record" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
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
