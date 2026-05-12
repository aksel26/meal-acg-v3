import { NextResponse } from "next/server";
import { setSession } from "@/lib/auth";
import { createPublicServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { loginId, password } = await request.json();

    if (!loginId || !password) {
      return NextResponse.json(
        { error: "아이디와 비밀번호를 입력해주세요." },
        { status: 400 },
      );
    }

    const supabase = createPublicServiceClient();
    const { data, error } = await supabase.rpc("authenticate_user", {
      p_login_id: loginId,
      p_password: password,
    });

    if (error) {
      console.error("Project management authentication error:", error);
      return NextResponse.json(
        { error: "인증 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "아이디 또는 비밀번호가 일치하지 않습니다." },
        { status: 401 },
      );
    }

    const user = data[0];

    await setSession({
      userId: user.user_id,
      fullName: user.full_name,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.user_id,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Project management login error:", error);
    return NextResponse.json(
      { error: "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
