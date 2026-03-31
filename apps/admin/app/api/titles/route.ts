import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/titles - List all titles
export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("titles")
      .select("*")
      .order("sort_order");

    if (error) {
      console.error("Error fetching titles:", error);
      return NextResponse.json({ error: "Failed to fetch titles" }, { status: 500 });
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

// POST /api/titles - Create a new title
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const body = await request.json();

    const { name, sort_order } = body;

    if (!name) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("titles")
      .insert({ name, sort_order })
      .select()
      .single();

    if (error) {
      console.error("Error creating title:", error);
      if (error.code === "23505") {
        return NextResponse.json({ error: "이미 존재하는 직책입니다." }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to create title" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Titles API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
