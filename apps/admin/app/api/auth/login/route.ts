import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { setSession } from "@/lib/auth";
import { isUserAuthority, normalizeAdminRole } from "@/lib/rbac";

export async function POST(request: NextRequest) {
  try {
    const { loginId, password } = await request.json();

    if (!loginId || !password) {
      return NextResponse.json(
        { error: "아이디와 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Call the authenticate_user function
    const { data, error } = await supabase.rpc("authenticate_user", {
      p_login_id: loginId,
      p_password: password,
    });

    if (error) {
      console.error("Authentication error:", error);
      return NextResponse.json(
        { error: "인증 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "아이디 또는 비밀번호가 일치하지 않습니다." },
        { status: 401 }
      );
    }

    const user = data[0];

    // Check if user is admin
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "관리자 권한이 없습니다." },
        { status: 403 }
      );
    }

    const [memberResult, statusResult] = await Promise.all([
      supabase
        .from("members")
        .select("admin_role, user_authority")
        .eq("id", user.user_id)
        .single(),
      supabase
        .from("member_statuses")
        .select("start_date")
        .eq("member_id", user.user_id)
        .order("start_date", { ascending: true })
        .limit(1)
        .single(),
    ]);

    const adminRole = normalizeAdminRole(memberResult.data?.admin_role);
    const userAuthority = isUserAuthority(memberResult.data?.user_authority)
      ? memberResult.data.user_authority
      : null;
    const hireDate = statusResult.data?.start_date || null;

    // Set session cookie
    await setSession({
      userId: user.user_id,
      fullName: user.full_name,
      role: user.role as "admin",
      adminRole,
      userAuthority,
      hireDate,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.user_id,
        fullName: user.full_name,
        role: user.role,
        adminRole,
        userAuthority,
        hireDate,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
