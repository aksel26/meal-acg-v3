import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/monthly - Get all monthly drink data
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const searchParams = request.nextUrl.searchParams;
    const year =
      parseInt(searchParams.get("year") || "") || new Date().getFullYear();
    const month =
      parseInt(searchParams.get("month") || "") || new Date().getMonth() + 1;

    // 전체 멤버 조회
    const { data: members } = await supabase
      .from("members")
      .select("id, full_name")
      .order("full_name");

    // 설정 조회
    const { data: settings } = await supabase
      .from("monthly_drink_settings")
      .select("*")
      .eq("year", year)
      .eq("month", month)
      .single();

    // 신청 내역 조회
    const { data: applications, error: appError } = await supabase
      .from("monthly_drink_applications")
      .select("*")
      .eq("year", year)
      .eq("month", month);

    if (appError) {
      console.error("Error fetching applications:", appError);
    }

    // 멤버별 신청 내역 매핑
    const applicationMap = new Map(
      applications?.map((app) => [app.user_id, app]) || []
    );

    // 기본 음료 옵션
    const defaultDrinkOptions = [
      "HOT 아메리카노",
      "ICE 아메리카노",
      "HOT 디카페인 아메리카노",
      "ICE 디카페인 아메리카노",
      "바닐라크림 콜드브루",
      "ICE 자몽허니블랙티",
      "선택안함",
    ];

    // 전체 멤버 목록과 신청 내역 병합
    const allApplications = members?.map((member) => {
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
        drinkOptions: (settings?.drink_options as string[]) || defaultDrinkOptions,
        pickupPersons: (settings?.pickup_persons as string[]) || [],
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
    const { userId, drink, memo, year, month } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || new Date().getMonth() + 1;

    const { error } = await supabase.from("monthly_drink_applications").upsert(
      {
        user_id: userId,
        year: targetYear,
        month: targetMonth,
        drink: drink || null,
        memo: memo || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,year,month" }
    );

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
