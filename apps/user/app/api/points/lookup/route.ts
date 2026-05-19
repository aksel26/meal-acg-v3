import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

// GET: 이름으로 멤버 ID 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json(
        { error: "name은 필수입니다." },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "DB not configured" },
        { status: 500 }
      );
    }

    const { data: member, error } = await supabase
      .from("members")
      .select("id, full_name, role, admin_role, user_authority, member_role")
      .eq("full_name", name)
      .single();

    if (error || !member) {
      console.error("멤버 조회 오류:", error);
      return NextResponse.json(
        { error: "해당 이름의 멤버를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 입사일 조회 (member_statuses에서 가장 이른 start_date)
    const { data: statusData } = await supabase
      .from("member_statuses")
      .select("start_date")
      .eq("member_id", member.id)
      .order("start_date", { ascending: true })
      .limit(1)
      .single();

    const displayRole =
      member.role === "admin"
        ? member.admin_role || "관리자"
        : member.user_authority || member.member_role;

    return NextResponse.json({
      id: member.id,
      full_name: member.full_name,
      member_role: displayRole,
      raw_member_role: member.member_role,
      role: member.role,
      admin_role: member.admin_role,
      user_authority: member.user_authority,
      hire_date: statusData?.start_date || null,
    });
  } catch (error) {
    console.error("멤버 조회 오류:", error);
    return NextResponse.json(
      { error: "멤버 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
