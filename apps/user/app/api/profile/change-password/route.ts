import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

export async function POST(request: NextRequest) {
  try {
    const { memberId, currentPassword, newPassword } = await request.json();

    if (!memberId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "모든 필드를 입력해주세요." },
        { status: 400 },
      );
    }

    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: "새 비밀번호는 4자 이상이어야 합니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "DB not configured" }, { status: 500 });
    }

    const { data: changed, error: updateError } = await (supabase as any).rpc(
      "change_member_password",
      {
        p_member_id: memberId,
        p_current_password: currentPassword,
        p_new_password: newPassword,
      },
    );

    if (updateError) {
      return NextResponse.json(
        { error: "비밀번호 변경에 실패했습니다." },
        { status: 500 },
      );
    }

    if (!changed) {
      return NextResponse.json(
        { error: "현재 비밀번호가 일치하지 않습니다." },
        { status: 401 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "비밀번호 변경 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
