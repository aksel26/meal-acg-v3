import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";

// GET: 프로필 정보 조회
export async function GET() {
  try {
    // 본인 프로필만 조회 (요청 파라미터의 memberId는 신뢰하지 않음)
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    const memberId = sessionUser.id;

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "DB not configured" }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("member_current_status")
      .select("*")
      .eq("member_id", memberId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "프로필 정보를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // members 테이블에서 추가 필드 조회
    const { data: memberData } = await supabase
      .from("members")
      .select("phone, login_id, passport_number, birth_date")
      .eq("id", memberId)
      .single();

    return NextResponse.json({
      ...data,
      phone: memberData?.phone || null,
      login_id: memberData?.login_id || null,
      passport_number: memberData?.passport_number || null,
      birth_date: memberData?.birth_date || null,
    });
  } catch (error) {
    console.error("프로필 조회 오류:", error);
    return NextResponse.json(
      { error: "프로필 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

// PATCH: 프로필 정보 수정
export async function PATCH(request: NextRequest) {
  try {
    // 본인 프로필만 수정 (요청 body의 memberId는 신뢰하지 않음)
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { email, phone, passport_number } = await request.json();
    const memberId = sessionUser.id;

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "DB not configured" }, { status: 500 });
    }

    const updateData: Record<string, string | null> = {};
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (passport_number !== undefined) updateData.passport_number = passport_number;

    const { error } = await supabase
      .from("members")
      .update(updateData)
      .eq("id", memberId);

    if (error) {
      console.error("프로필 수정 오류:", error);
      return NextResponse.json(
        { error: "프로필 수정에 실패했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("프로필 수정 오류:", error);
    return NextResponse.json(
      { error: "프로필 수정 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
