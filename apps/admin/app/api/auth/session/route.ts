import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let hireDate = session.hireDate || null;

    if (!hireDate) {
      const supabase = createServiceClient();
      const { data: statusData } = await supabase
        .from("member_statuses")
        .select("start_date")
        .eq("member_id", session.userId)
        .order("start_date", { ascending: true })
        .limit(1)
        .single();
      hireDate = statusData?.start_date || null;
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        fullName: session.fullName,
        role: session.role,
        hireDate,
      },
    });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json(
      { error: "세션 확인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
