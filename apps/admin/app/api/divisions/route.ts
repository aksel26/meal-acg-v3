import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/divisions - List divisions (optional filter: organization_id)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organization_id");

    let query = supabase
      .from("divisions")
      .select("*")
      .order("name");

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching divisions:", error);
      return NextResponse.json({ error: "Failed to fetch divisions" }, { status: 500 });
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

// POST /api/divisions - Create a new division
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const body = await request.json();

    const { name, organization_id } = body;

    if (!name || !organization_id) {
      return NextResponse.json(
        { error: "name and organization_id are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("divisions")
      .insert({ name, organization_id })
      .select()
      .single();

    if (error) {
      console.error("Error creating division:", error);
      if (error.code === "23505") {
        return NextResponse.json({ error: "Division name already exists" }, { status: 409 });
      }
      if (error.code === "23503") {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      }
      return NextResponse.json({ error: "Failed to create division" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Divisions API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
