import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "현재 비밀번호와 새 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: member, error: fetchError } = await supabase
      .from("members")
      .select("login_id, password")
      .eq("id", session.userId)
      .single();

    if (fetchError || !member) {
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // Verify current password. 해시로 저장된 값은 DB 함수로만 비교하고, 아직 평문인 값은 기존 방식 그대로 비교한다.
    let passwordMatches: boolean;

    if (/^\$2[aby]\$/.test(member.password)) {
      const { data: authRows, error: authError } = await supabase.rpc(
        "authenticate_user",
        { p_login_id: member.login_id, p_password: currentPassword }
      );

      if (authError) {
        console.error("Password verify error:", authError);
        return NextResponse.json(
          { error: "비밀번호 변경에 실패했습니다." },
          { status: 500 }
        );
      }

      passwordMatches = (authRows?.length ?? 0) > 0;
    } else {
      passwordMatches = member.password === currentPassword;
    }

    if (!passwordMatches) {
      return NextResponse.json(
        { error: "현재 비밀번호가 일치하지 않습니다." },
        { status: 401 }
      );
    }

    // Update password (해시는 DB 트리거가 한다)
    const { error: updateError } = await supabase
      .from("members")
      .update({ password: newPassword })
      .eq("id", session.userId);

    if (updateError) {
      console.error("Password update error:", updateError);
      return NextResponse.json(
        { error: "비밀번호 변경에 실패했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Change password error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "비밀번호 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
