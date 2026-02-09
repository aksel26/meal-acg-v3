import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/members - List all members
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const excludeStatus = searchParams.get("exclude_status");

    let query = supabase.from("members").select("*, teams(name)");

    if (excludeStatus === "true") {
      const { data: statusMembers } = await supabase
        .from("member_current_status")
        .select("member_id")
        .not("current_status", "is", null);

      const excludeIds = (statusMembers || [])
        .map((m) => m.member_id)
        .filter(Boolean) as string[];

      if (excludeIds.length > 0) {
        query = query.not("id", "in", `(${excludeIds.join(",")})`);
      }
    }

    const { data, error } = await query.order("full_name");

    if (error) {
      console.error("Error fetching members:", error);
      return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
    }

    // Flatten teams join → team_name
    const result = (data || []).map(({ teams, ...rest }) => ({
      ...rest,
      team_name: (teams as { name: string } | null)?.name ?? null,
    }));

    return NextResponse.json(result);
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

    const { loginId, password, fullName, role = "user", email, memberRole, internMonths } = body;

    if (!loginId || !password || !fullName) {
      return NextResponse.json(
        { error: "loginId, password, and fullName are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("members")
      .insert({
        login_id: loginId,
        password,
        full_name: fullName,
        role,
        email: email || null,
        member_role: memberRole || "팀원",
        intern_months: memberRole === "인턴" && internMonths ? parseInt(internMonths, 10) : null,
      })
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
