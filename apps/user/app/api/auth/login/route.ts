import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { buildSessionCookie } from "@/lib/auth";

interface LoginRequest {
  login_id: string;
  password: string;
}

const ACCOUNT_NOT_FOUND_ERROR = "계정이 없습니다.";
const INVALID_CREDENTIALS_ERROR = "아이디 또는 비밀번호가 일치하지 않습니다.";

export async function POST(request: NextRequest) {
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
      console.error("Authentication error:", error);
      return NextResponse.json(
        { success: false, error: "인증 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    if (!data || data.length === 0) {
      // 계정 존재 여부에 따라 에러 메시지를 구분한다
      const { data: existingMember } = await supabase
        .from("members")
        .select("id")
        .eq("login_id", login_id)
        .maybeSingle();

      return NextResponse.json(
        {
          success: false,
          error: existingMember
            ? INVALID_CREDENTIALS_ERROR
            : ACCOUNT_NOT_FOUND_ERROR,
        },
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
      console.error("Member status query error:", statusError);
      return NextResponse.json(
        { success: false, error: "로그인 처리 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    if (memberStatus?.current_status === "퇴사") {
      return NextResponse.json(
        { success: false, error: ACCOUNT_NOT_FOUND_ERROR },
        { status: 401 }
      );
    }

    // 로그인 성공
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
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
