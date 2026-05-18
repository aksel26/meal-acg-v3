import { NextResponse } from "next/server";
import { getAuthErrorStatus, getSession, requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const freshSession = session.role === "admin" ? await requireAdmin() : session;
    let hireDate = freshSession.hireDate || null;

    if (!hireDate) {
      const supabase = createServiceClient();
      const { data: statusData } = await supabase
        .from("member_statuses")
        .select("start_date")
        .eq("member_id", freshSession.userId)
        .order("start_date", { ascending: true })
        .limit(1)
        .single();
      hireDate = statusData?.start_date || null;
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: freshSession.userId,
        fullName: freshSession.fullName,
        role: freshSession.role,
        adminRole: freshSession.adminRole,
        userAuthority: freshSession.userAuthority,
        hireDate,
      },
    });
  } catch (error) {
    console.error("Session check error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ authenticated: false }, { status: authStatus });
    }
    return NextResponse.json(
      { error: "세션 확인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
