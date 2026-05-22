import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { applyRoleOverride } from "@/lib/constants";

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
            members!members_team_id_fkey (id, full_name, member_role, email, birth_date, team_id, division_id, intern_months, position:positions(id, name), title:titles(id, name))
          )
        ),
        teams!teams_organization_id_fkey (
          *,
          members!members_team_id_fkey (id, full_name, member_role, email, birth_date, team_id, division_id, intern_months, position:positions(id, name), title:titles(id, name))
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
      .select("id, full_name, member_role, email, birth_date, team_id, division_id, intern_months, position:positions(id, name), title:titles(id, name)")
      .or(`organization_id.eq.${id},organization_id.is.null`)
      .is("team_id", null)
      .order("full_name");

    // Apply role overrides to all nested members
    const applyToMembers = (members: any[]) => members.map(applyRoleOverride);
    const result = {
      ...data,
      divisions: (data.divisions || []).map((div: any) => ({
        ...div,
        teams: (div.teams || []).map((team: any) => ({
          ...team,
          members: applyToMembers(team.members || []),
        })),
      })),
      teams: (data.teams || []).map((team: any) => ({
        ...team,
        members: applyToMembers(team.members || []),
      })),
      unassignedMembers: applyToMembers(unassigned || []),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Organization tree API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
