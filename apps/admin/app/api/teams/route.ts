import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/teams - List teams (optional filters: organization_id, division_id)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organization_id");
    const divisionId = searchParams.get("division_id");

    let query = supabase
      .from("teams")
      .select("*")
      .order("name");

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    if (divisionId) {
      query = query.eq("division_id", divisionId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching teams:", error);
      return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
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

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const body = await request.json();

    const { name, organization_id, division_id } = body;

    if (!name || !organization_id) {
      return NextResponse.json(
        { error: "name and organization_id are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("teams")
      .insert({
        name,
        organization_id,
        division_id: division_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating team:", error);
      if (error.code === "23505") {
        return NextResponse.json({ error: "Team name already exists" }, { status: 409 });
      }
      if (error.code === "23503") {
        return NextResponse.json({ error: "Organization or division not found" }, { status: 404 });
      }
      return NextResponse.json({ error: "Failed to create team" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Teams API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
