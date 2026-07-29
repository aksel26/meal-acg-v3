import { NextRequest, NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest) {
  try {
    await requireAdminPermission("members:write");
    const { memberIds, team_id } = await request.json();

    if (
      !Array.isArray(memberIds) ||
      memberIds.length === 0 ||
      memberIds.some((id) => typeof id !== "string" || !id) ||
      typeof team_id !== "string" ||
      !team_id
    ) {
      return NextResponse.json(
        { error: "memberIds and team_id are required" },
        { status: 400 },
      );
    }

    const uniqueMemberIds = [...new Set<string>(memberIds)];
    const supabase = createServiceClient();
    const { data: existingMembers, error: memberError } = await supabase
      .from("members")
      .select("id")
      .in("id", uniqueMemberIds);

    if (memberError) {
      return NextResponse.json(
        { error: "Failed to validate members" },
        { status: 500 },
      );
    }

    if (existingMembers.length !== uniqueMemberIds.length) {
      return NextResponse.json(
        { error: "Some members were not found" },
        { status: 404 },
      );
    }

    const { data, error } = await (supabase.from("members") as any)
      .update({ team_id })
      .in("id", uniqueMemberIds)
      .select("id");

    if (error) {
      console.error("Batch team assignment error:", error);
      return NextResponse.json(
        { error: "Failed to assign members" },
        { status: 500 },
      );
    }

    return NextResponse.json({ updated: data.length });
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: authStatus },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
