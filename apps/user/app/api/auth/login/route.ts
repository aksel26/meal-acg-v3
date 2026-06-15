import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

interface LoginRequest {
  login_id: string;
  password: string;
}

interface MemberStatusLookup {
  current_status: string | null;
}

interface MemberCurrentStatusClient {
  from(table: "member_current_status"): {
    select(columns: "current_status"): {
      eq(column: "member_id", value: string): {
        maybeSingle(): Promise<{
          data: MemberStatusLookup | null;
          error: unknown;
        }>;
      };
    };
  };
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

    // members 테이블에서 사용자 조회
    const { data: member, error } = await supabase
      .from("members")
      .select("id, login_id, password, full_name, role")
      .eq("login_id", login_id)
      .single();

    if (error || !member) {
      return NextResponse.json(
        { success: false, error: ACCOUNT_NOT_FOUND_ERROR },
        { status: 401 }
      );
    }

    const statusClient = supabase as unknown as MemberCurrentStatusClient;
    const { data: memberStatus, error: statusError } = await statusClient
      .from("member_current_status")
      .select("current_status")
      .eq("member_id", member.id)
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

    // 비밀번호 확인 (평문 비교)
    if (member.password !== password) {
      return NextResponse.json(
        { success: false, error: INVALID_CREDENTIALS_ERROR },
        { status: 401 }
      );
    }

    // 로그인 성공
    return NextResponse.json({
      success: true,
      data: {
        user_id: member.id,
        full_name: member.full_name,
        role: member.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
