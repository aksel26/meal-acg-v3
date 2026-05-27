import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthErrorStatus, requireAdmin } from "@/lib/auth";

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

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: "새 비밀번호는 4자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: changed, error: updateError } = await (supabase as any).rpc(
      "change_member_password",
      {
        p_member_id: session.userId,
        p_current_password: currentPassword,
        p_new_password: newPassword,
      },
    );

    if (updateError) {
      console.error("Password update error:", updateError);
      return NextResponse.json(
        { error: "비밀번호 변경에 실패했습니다." },
        { status: 500 }
      );
    }

    if (!changed) {
      return NextResponse.json(
        { error: "현재 비밀번호가 일치하지 않습니다." },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Change password error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    }
    return NextResponse.json(
      { error: "비밀번호 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
