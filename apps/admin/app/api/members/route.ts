import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthErrorStatus, requireAdmin, requireAdminPermission } from "@/lib/auth";
import { applyRoleOverride } from "@/lib/constants";
import {
  MEMBER_DETAIL_SELECT,
  MEMBER_LIST_SELECT,
  assertNoSensitiveMemberFields,
} from "@/lib/privacy";

// GET /api/members - List all members
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const excludeStatus = searchParams.get("exclude_status");

    let query = (supabase.from("members") as any).select(MEMBER_LIST_SELECT);

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

    // Flatten teams join → team_name, apply role overrides
    const result = ((data || []) as any[]).map(({ teams, ...rest }) =>
      applyRoleOverride({
        ...rest,
        team_name: (teams as { name: string } | null)?.name ?? null,
      })
    );
    result.forEach(assertNoSensitiveMemberFields);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Members API error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/members - Create a new member
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminPermission("members:write");
    const supabase = createServiceClient();
    const body = await request.json();

    const {
      loginId,
      password,
      fullName,
      role = "user",
      adminRole,
      userAuthority,
      email,
      memberRole,
      internMonths,
      position_id,
      title_id,
      birthDate,
      phone,
      passportNumber,
    } = body;

    if (!loginId || !password || !fullName) {
      return NextResponse.json(
        { error: "loginId, password, and fullName are required" },
        { status: 400 }
      );
    }

    // 관리자의 organization_id 조회하여 신규 멤버에 자동 할당
    const { data: adminMember } = await supabase
      .from("members")
      .select("organization_id")
      .eq("id", session.userId)
      .single();

    const { data, error } = await (supabase.from("members") as any)
      .insert({
        login_id: loginId,
        password,
        full_name: fullName,
        role,
        admin_role: role === "admin" ? adminRole || "P&C 일반" : null,
        user_authority: userAuthority || null,
        email: email || null,
        member_role: memberRole || "팀원",
        intern_months: memberRole === "인턴" && internMonths ? parseInt(internMonths, 10) : null,
        organization_id: adminMember?.organization_id || null,
        ...(position_id ? { position_id } : {}),
        title_id: title_id || null,
        birth_date: birthDate || null,
        phone: phone || null,
        passport_number: passportNumber || null,
      })
      .select(MEMBER_DETAIL_SELECT)
      .single();

    if (error) {
      console.error("Error creating member:", error);
      if (error.code === "23505") {
        return NextResponse.json({ error: "Login ID already exists" }, { status: 409 });
      }
      return NextResponse.json({ error: "Failed to create member" }, { status: 500 });
    }

    // 현재 반기에 대해 복지포인트 + 활동비 budget_allocations 자동 생성
    const now = new Date();
    const currentHalf = now.getMonth() < 6 ? "H1" : "H2";
    const period = `${now.getFullYear()}-${currentHalf}`;

    for (const type of ["복지포인트", "활동비"] as const) {
      const { error: allocError } = await supabase
        .from("budget_allocations")
        .insert({ member_id: data.id, type, period, total_amount: 0 });
      if (allocError) {
        console.error(`Error creating ${type} allocation:`, allocError);
      }
    }

    assertNoSensitiveMemberFields(data as Record<string, unknown>);

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Members API error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
