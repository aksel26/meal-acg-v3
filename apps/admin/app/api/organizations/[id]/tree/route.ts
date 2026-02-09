import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/organizations/[id]/tree - Get full organization tree with divisions > teams > members
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
      .select(`
        *,
        divisions (
          *,
          teams (
            *,
            members!members_team_id_fkey (id, full_name, member_role, email, team_id, division_id)
          )
        ),
        teams!teams_organization_id_fkey (
          *,
          members!members_team_id_fkey (id, full_name, member_role, email, team_id, division_id)
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching organization tree:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      }
      return NextResponse.json({ error: "Failed to fetch organization tree" }, { status: 500 });
    }

    // Fetch members not assigned to any team (including those with no organization_id)
    const { data: unassigned } = await supabase
      .from("members")
      .select("id, full_name, member_role, email, team_id, division_id")
      .or(`organization_id.eq.${id},organization_id.is.null`)
      .is("team_id", null)
      .order("full_name");

    return NextResponse.json({ ...data, unassignedMembers: unassigned || [] });
  } catch (error) {
    console.error("Organization tree API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
