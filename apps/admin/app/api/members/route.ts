import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/members - List all members
export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("members")
      .select("*")
      .order("full_name");

    if (error) {
      console.error("Error fetching members:", error);
      return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Members API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/members - Create a new member
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const body = await request.json();

    const { loginId, password, fullName, role = "user" } = body;

    if (!loginId || !password || !fullName) {
      return NextResponse.json(
        { error: "loginId, password, and fullName are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("members")
      .insert({ login_id: loginId, password, full_name: fullName, role })
      .select()
      .single();

    if (error) {
      console.error("Error creating member:", error);
      if (error.code === "23505") {
        return NextResponse.json({ error: "Login ID already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to create member" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Members API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
