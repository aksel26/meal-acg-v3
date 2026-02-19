import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

interface DrinkApplication {
  id: string;
  user_id: string;
  year: number;
  month: number;
  drink: string | null;
  memo: string | null;
  members: { id: string; full_name: string } | null;
}

interface DrinkSettings {
  id: string;
  year: number;
  month: number;
  drink_options: string[];
  pickup_persons: string[];
}

// GET /api/monthly - Get monthly drink data
export async function GET() {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({
        success: true,
        data: {
          applications: [],
          drinkOptions: [],
          pickupPersons: [],
          totalMembers: 0,
        },
      });
    }

    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    // 전체 멤버 조회
    const { data: members } = await supabase
      .from("members")
      .select("id, full_name")
      .order("full_name");

    // 설정 조회 (타입 단언 사용 - 새로 생성된 테이블)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: settings } = await (supabase as any)
      .from("monthly_drink_settings")
      .select("*")
      .eq("year", year)
      .eq("month", month)
      .single() as { data: DrinkSettings | null };

    // 신청 내역 조회
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: applications, error: appError } = await (supabase as any)
      .from("monthly_drink_applications")
      .select("*")
      .eq("year", year)
      .eq("month", month) as { data: DrinkApplication[] | null; error: unknown };

    if (appError) {
      console.error("Error fetching applications:", appError);
    }

    // 멤버별 신청 내역 매핑
    const applicationMap = new Map(
      applications?.map((app) => [app.user_id, app]) || []
    );

    // 기본 음료 옵션
    const defaultDrinkOptions = [
      { name: "HOT 아메리카노", available: true },
      { name: "ICE 아메리카노", available: true },
      { name: "HOT 디카페인 아메리카노", available: true },
      { name: "ICE 디카페인 아메리카노", available: true },
      { name: "바닐라크림 콜드브루", available: true },
      { name: "ICE 자몽허니블랙티", available: true },
      { name: "선택안함", available: true },
    ];

    const drinkOptions = settings?.drink_options
      ? settings.drink_options.map((name: string) => ({
          name,
          available: true,
        }))
      : defaultDrinkOptions;

    const pickupPersons = settings?.pickup_persons
      ? settings.pickup_persons.map((name: string) => ({ name }))
      : [];

    // 전체 멤버 목록과 신청 내역 병합
    const allApplications = members?.map((member) => {
      const app = applicationMap.get(member.id);
      return {
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
        totalMembers: members?.length || 0,
      },
    });
  } catch (error) {
    console.error("Monthly API error:", error);
    return NextResponse.json({
      success: true,
      data: {
        applications: [],
        drinkOptions: [],
        pickupPersons: [],
        totalMembers: 0,
      },
      warning: "Using fallback data due to API error",
    });
  }
}

// POST /api/monthly - Assign drink
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { name, drink } = body;

    if (!name || !drink) {
      return NextResponse.json(
        { success: false, error: "Name and drink are required" },
        { status: 400 }
      );
    }

    // 이름으로 사용자 찾기
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id")
      .eq("full_name", name)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("monthly_drink_applications").upsert(
      {
        user_id: member.id,
        year,
        month,
        drink,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,year,month" }
    );

    if (error) {
      console.error("Error assigning drink:", error);
      return NextResponse.json(
        { success: false, error: "Failed to assign drink" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${name}님의 음료를 "${drink}"로 설정했습니다.`,
    });
  } catch (error) {
    console.error("Monthly API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
