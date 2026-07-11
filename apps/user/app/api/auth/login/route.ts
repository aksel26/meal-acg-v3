import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { buildSessionCookie } from "@/lib/auth";
import { withContext } from "@repo/logger";

interface LoginRequest {
  login_id: string;
  password: string;
}

const INVALID_CREDENTIALS_ERROR = "아이디 또는 비밀번호가 일치하지 않습니다.";

export async function POST(request: NextRequest) {
  const log = withContext({ route: "auth/login" });
  try {
    const body: LoginRequest = await request.json();
    const { login_id, password } = body;

    if (!login_id || !password) {
      return NextResponse.json(
        { success: false, error: "아이디와 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "데이터베이스 연결 오류" },
        { status: 500 }
      );
    }

    const { data, error } = await supabase.rpc("authenticate_user", {
      p_login_id: login_id,
      p_password: password,
    });

    if (error) {
      log.error({ err: error }, "authenticate_user RPC 오류");
      return NextResponse.json(
        { success: false, error: "인증 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    if (!data || data.length === 0) {
      // 유저 열거 방지: 계정 존재 여부와 무관하게 동일 메시지
      log.warn({ login_id }, "로그인 실패: 인증 불일치");
      return NextResponse.json(
        { success: false, error: INVALID_CREDENTIALS_ERROR },
        { status: 401 }
      );
    }

    const member = data[0]!;

    // 퇴사자 로그인 차단
    const { data: memberStatus, error: statusError } = await supabase
      .from("member_current_status")
      .select("current_status")
      .eq("member_id", member.user_id)
      .maybeSingle();

    if (statusError) {
      log.error(
        { err: statusError, memberId: member.user_id },
        "근무 상태 조회 오류",
      );
      return NextResponse.json(
        { success: false, error: "로그인 처리 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    if (memberStatus?.current_status === "퇴사") {
      // 유저 열거 방지: 퇴사자 여부를 드러내지 않도록 동일 메시지
      log.warn(
        { login_id, memberId: member.user_id },
        "로그인 차단: 퇴사자",
      );
      return NextResponse.json(
        { success: false, error: INVALID_CREDENTIALS_ERROR },
        { status: 401 }
      );
    }

    // 로그인 성공
    log.info({ login_id, memberId: member.user_id }, "로그인 성공");
    const response = NextResponse.json({
      success: true,
      data: {
        user_id: member.user_id,
        full_name: member.full_name,
        role: member.role,
      },
    });

    response.cookies.set(buildSessionCookie(member.user_id, member.role ?? null));

    return response;
  } catch (error) {
    log.error({ err: error }, "로그인 처리 오류");
    return NextResponse.json(
      { success: false, error: "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
