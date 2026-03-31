import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// PUT /api/titles/[id] - Update a title
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
      return NextResponse.json({ error: "Title ID is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("titles")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating title:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Title not found" }, { status: 404 });
      }
      if (error.code === "23505") {
        return NextResponse.json({ error: "이미 존재하는 직책입니다." }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to update title" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Titles API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/titles/[id] - Delete a title
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Title ID is required" }, { status: 400 });
    }

    const { count, error: countError } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("title_id", id);

    if (countError) {
      console.error("Error checking members for title:", countError);
      return NextResponse.json({ error: "Failed to check title usage" }, { status: 500 });
    }

    if (count && count > 0) {
      return NextResponse.json(
        { error: `${count}명이 이 직책을 사용 중입니다.` },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from("titles")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting title:", error);
      return NextResponse.json({ error: "Failed to delete title" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Titles API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
