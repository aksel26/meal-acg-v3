import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/monthly/collections - 취합 건 목록 조회
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get("year");

    let query = supabase
      .from("drink_collections")
      .select("*")
      .order("created_at", { ascending: false });

    if (year) {
      query = query.eq("year", parseInt(year));
    }

    // 전체 인원 수는 취합 건과 무관하므로 한 번만 조회
    const [{ data: collections, error }, { count: totalMembers }] =
      await Promise.all([
        query,
        supabase.from("members").select("*", { count: "exact", head: true }),
      ]);

    if (error) {
      console.error("Error fetching collections:", error);
      return NextResponse.json(
        { error: "Failed to fetch collections" },
        { status: 500 }
      );
    }

    // 각 취합 건별 신청 인원 수 조회
    const collectionsWithStats = await Promise.all(
      (collections || []).map(async (collection) => {
        const { count } = await supabase
          .from("monthly_drink_applications")
          .select("*", { count: "exact", head: true })
          .eq("collection_id", collection.id)
          .not("drink", "is", null)
          .neq("drink", "");

        return {
          ...collection,
          applicationCount: count || 0,
          totalMembers: totalMembers || 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: collectionsWithStats,
    });
  } catch (error) {
    console.error("Collections API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/monthly/collections - 새 취합 건 생성
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const body = await request.json();
    const { title, year, month, is_one_time, drink_options, pickup_persons } =
      body;

    if (!title || !year) {
      return NextResponse.json(
        { error: "title과 year는 필수입니다" },
        { status: 400 }
      );
    }

    const defaultOptions = [
      "HOT 아메리카노",
      "ICE 아메리카노",
      "HOT 디카페인 아메리카노",
      "ICE 디카페인 아메리카노",
      "바닐라크림 콜드브루",
      "ICE 자몽허니블랙티",
      "기타",
      "선택안함",
    ];

    const { data, error } = await supabase
      .from("drink_collections")
      .insert({
        title,
        year,
        month: is_one_time ? null : month,
        is_one_time: is_one_time || false,
        drink_options: drink_options || defaultOptions,
        pickup_persons: pickup_persons || [],
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating collection:", error);
      return NextResponse.json(
        { error: "Failed to create collection" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Collections API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
