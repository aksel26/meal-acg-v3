import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { applyRoleOverride } from "@/lib/constants";

// GET /api/member-statuses - List members with current status
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = supabase.from("member_current_status").select("*");

    if (status === "정상") {
      query = query.is("current_status", null);
    } else if (status) {
      query = query.eq("current_status", status);
    }

    if (search) {
      query = query.ilike("full_name", `%${search}%`);
    }

    const { data, error } = await query.order("full_name");

    if (error) {
      console.error("Error fetching member statuses:", error);
      return NextResponse.json(
        { error: "Failed to fetch member statuses" },
        { status: 500 },
      );
    }

    return NextResponse.json((data || []).map(applyRoleOverride));
  } catch (error) {
    console.error("Member statuses API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/member-statuses?member_id=xxx - Clear all active statuses for a member
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("member_id");

    if (!memberId) {
      return NextResponse.json(
        { error: "member_id는 필수입니다." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("member_statuses")
      .delete()
      .eq("member_id", memberId)
      .select();

    if (error) {
      console.error("Error clearing member statuses:", error);
      return NextResponse.json(
        { error: "특이사항 삭제에 실패했습니다." },
        { status: 500 },
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "삭제할 특이사항이 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, deleted: data.length });
  } catch (error) {
    console.error("Member statuses API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/member-statuses - Create a new member status
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const body = await request.json();

    const { member_id, status, start_date, end_date, note } = body;

    if (!member_id || !status || !start_date) {
      return NextResponse.json(
        { error: "member_id, status, start_date는 필수입니다." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("member_statuses")
      .insert({
        member_id,
        status,
        start_date,
        end_date: end_date || null,
        note: note || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating member status:", error);
      if (error.code === "23P01") {
        return NextResponse.json(
          { error: "해당 기간에 이미 등록된 상태가 있습니다." },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Failed to create member status" },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Member statuses API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
