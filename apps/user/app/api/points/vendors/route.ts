import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

// 자동완성 후보로 집계할 최근 사용내역 수 (이보다 오래된 사용처는 후보에서 빠진다)
const RECENT_RECORD_LIMIT = 1000;

// GET /api/points/vendors - 같은 조직의 과거 사용처 목록 (자주 쓴 순)
export async function GET(request: NextRequest) {
  try {
    const memberId = new URL(request.url).searchParams.get("member_id");
    if (!memberId) {
      return NextResponse.json(
        { error: "member_id는 필수입니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "DB not configured" }, { status: 500 });
    }

    const { data: currentMember, error: memberError } = await supabase
      .from("members")
      .select("organization_id")
      .eq("id", memberId)
      .single();

    if (memberError || !currentMember) {
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (!currentMember.organization_id) {
      return NextResponse.json(
        { error: "조직 정보가 설정되지 않았습니다." },
        { status: 400 },
      );
    }

    const { data: records, error } = await supabase
      .from("usage_records")
      .select(
        "description, member:members!usage_records_member_id_fkey!inner()",
      )
      .eq("member.organization_id", currentMember.organization_id)
      .order("used_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(RECENT_RECORD_LIMIT)
      .overrideTypes<{ description: string | null }[], { merge: false }>();

    if (error) {
      console.error("사용처 목록 조회 오류:", error);
      return NextResponse.json(
        { error: "사용처 목록 조회에 실패했습니다." },
        { status: 500 },
      );
    }

    // 최근순으로 읽으므로 Map 삽입 순서가 곧 최근 사용 순서다.
    const counts = new Map<string, number>();
    for (const record of records ?? []) {
      const vendor = record.description?.trim();
      if (vendor) counts.set(vendor, (counts.get(vendor) ?? 0) + 1);
    }

    // 사용 횟수 내림차순, 같으면 최근 사용 순 (sort는 안정 정렬)
    const vendors = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([vendor]) => vendor);

    return NextResponse.json(vendors);
  } catch (error) {
    console.error("사용처 목록 API 오류:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
