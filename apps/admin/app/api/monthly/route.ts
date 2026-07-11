import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/monthly - Get all monthly drink data
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const searchParams = request.nextUrl.searchParams;
    const collectionId = searchParams.get("collectionId");
    const year =
      parseInt(searchParams.get("year") || "") || new Date().getFullYear();
    const month =
      parseInt(searchParams.get("month") || "") || new Date().getMonth() + 1;

    // 서로 독립적인 쿼리 3개를 병렬 실행
    const [{ data: members }, sourceResult, appsResult] = await Promise.all([
      supabase.from("members").select("id, full_name").order("full_name"),
      collectionId
        ? supabase
            .from("drink_collections")
            .select("*")
            .eq("id", collectionId)
            .single()
        : supabase
            .from("monthly_drink_settings")
            .select("*")
            .eq("year", year)
            .eq("month", month)
            .single(),
      collectionId
        ? supabase
            .from("monthly_drink_applications")
            .select("*")
            .eq("collection_id", collectionId)
        : supabase
            .from("monthly_drink_applications")
            .select("*")
            .eq("year", year)
            .eq("month", month),
    ]);

    let drinkOptions: string[];
    let pickupPersons: string[];

    if (collectionId) {
      // collection 기반 조회
      drinkOptions = (sourceResult.data?.drink_options as string[]) || [];
      pickupPersons = (sourceResult.data?.pickup_persons as string[]) || [];
    } else {
      // 기존 year/month 기반 조회 (하위호환)
      const defaultDrinkOptions = [
        "HOT 아메리카노",
        "ICE 아메리카노",
        "HOT 디카페인 아메리카노",
        "ICE 디카페인 아메리카노",
        "바닐라크림 콜드브루",
        "ICE 자몽허니블랙티",
        "선택안함",
      ];

      drinkOptions =
        (sourceResult.data?.drink_options as string[]) || defaultDrinkOptions;
      pickupPersons = (sourceResult.data?.pickup_persons as string[]) || [];
    }

    if (appsResult.error) {
      console.error("Error fetching applications:", appsResult.error);
    }
    const applications = appsResult.data;

    // 멤버별 신청 내역 매핑
    const applicationMap = new Map(
      applications?.map((app) => [app.user_id, app]) || []
    );

    // 전체 멤버 목록과 신청 내역 병합
    const allApplications =
      members?.map((member) => {
        const app = applicationMap.get(member.id);
        return {
          id: app?.id || `pending-${member.id}`,
          userId: member.id,
          name: member.full_name,
          drink: app?.drink || "",
          memo: app?.memo || "",
        };
      }) || [];

    return NextResponse.json({
      success: true,
      data: {
        applications: allApplications,
        drinkOptions,
        pickupPersons,
        year,
        month,
        totalMembers: members?.length || 0,
      },
    });
  } catch (error) {
    console.error("Monthly API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/monthly - Update a user's drink selection
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const body = await request.json();
    const { userId, drink, memo, year, month, collectionId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || new Date().getMonth() + 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const upsertData: any = {
      user_id: userId,
      year: targetYear,
      month: targetMonth,
      drink: drink || null,
      memo: memo || null,
      updated_at: new Date().toISOString(),
    };

    if (collectionId) {
      upsertData.collection_id = collectionId;
    }

    const { error } = await supabase
      .from("monthly_drink_applications")
      .upsert(upsertData, { onConflict: "user_id,year,month" });

    if (error) {
      console.error("Error updating drink:", error);
      return NextResponse.json(
        { error: "Failed to update drink" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "음료가 업데이트되었습니다.",
    });
  } catch (error) {
    console.error("Monthly API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/monthly - Delete a user's drink selection
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("monthly_drink_applications")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting drink application:", error);
      return NextResponse.json(
        { error: "Failed to delete" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Monthly API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
