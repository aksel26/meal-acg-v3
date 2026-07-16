import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasSupervisorAccess, setSession } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { loginId, password } = await request.json();

    if (!loginId || !password) {
      return NextResponse.json(
        { error: "아이디와 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const rateLimitClient = createServiceClient();
    const [addressAllowed, accountAllowed] = await Promise.all([
      consumeRateLimit(rateLimitClient, request, "supervisor-login-address", {
        limit: 20,
        windowSeconds: 15 * 60,
      }),
      consumeRateLimit(rateLimitClient, request, "supervisor-login-account", {
        limit: 5,
        windowSeconds: 15 * 60,
        subject: loginId,
      }),
    ]);
    if (!addressAllowed || !accountAllowed) {
      return NextResponse.json(
        { error: "잠시 후 다시 시도해주세요." },
        { status: 429 },
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

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
    const [{ data: member, error: memberError }, { data: currentStatus }] =
      await Promise.all([
        supabase
          .from("members")
          .select("role, team_id, teams(name)")
          .eq("id", user.user_id)
          .single(),
        supabase
          .from("member_current_status")
          .select("current_status")
          .eq("member_id", user.user_id)
          .maybeSingle(),
      ]);

    if (memberError || !member) {
      return NextResponse.json(
        { error: "사용자 권한을 확인할 수 없습니다." },
        { status: 500 },
      );
    }

    if (currentStatus?.current_status === "퇴사") {
      return NextResponse.json(
        { error: "아이디 또는 비밀번호가 일치하지 않습니다." },
        { status: 401 },
      );
    }

    // 감독관 앱 접근은 관리자/운영팀/P&C팀으로 제한한다.
    const canEdit = hasSupervisorAccess(member);
    if (!canEdit) {
      return NextResponse.json(
        { error: "감독관 앱 접근 권한이 없습니다." },
        { status: 403 },
      );
    }

    await setSession({
      userId: user.user_id,
      fullName: user.full_name,
      role: member.role ?? "user",
      canEdit,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.user_id,
        fullName: user.full_name,
        role: member.role ?? "user",
        canEdit,
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
