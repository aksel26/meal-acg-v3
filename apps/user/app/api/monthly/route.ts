import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/auth";

interface DrinkApplication {
  id: string;
  user_id: string;
  year: number;
  month: number;
  drink: string | null;
  memo: string | null;
  collection_id: string | null;
  members: { id: string; full_name: string } | null;
}

// GET /api/monthly - 월간 음료 데이터 조회
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const collectionId = searchParams.get("collectionId");

    // 전체 멤버 조회
    const { data: members } = await supabase
      .from("members")
      .select("id, full_name")
      .order("full_name");

    let drinkOptions: { name: string; available: boolean }[] = [];
    let pickupPersons: { name: string }[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let applications: any[] | null = null;

    if (collectionId) {
      // collection 기반 조회
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: collection } = await (supabase as any)
        .from("drink_collections")
        .select("*")
        .eq("id", collectionId)
        .single();

      if (collection) {
        const options = (collection.drink_options as string[]) || [];
        drinkOptions = options.map((name: string) => ({
          name,
          available: true,
        }));
        const persons = (collection.pickup_persons as string[]) || [];
        pickupPersons = persons.map((name: string) => ({ name }));
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: apps, error: appError } = await (supabase as any)
        .from("monthly_drink_applications")
        .select("*")
        .eq("collection_id", collectionId) as {
        data: DrinkApplication[] | null;
        error: unknown;
      };

      if (appError) console.error("Error fetching applications:", appError);
      applications = apps;
    } else {
      // 기존 year/month 기반 조회 (하위호환)
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: settings } = await (supabase as any)
        .from("monthly_drink_settings")
        .select("*")
        .eq("year", year)
        .eq("month", month)
        .single() as { data: { drink_options: string[]; pickup_persons: string[] } | null };

      const defaultDrinkOptions = [
        { name: "HOT 아메리카노", available: true },
        { name: "ICE 아메리카노", available: true },
        { name: "HOT 디카페인 아메리카노", available: true },
        { name: "ICE 디카페인 아메리카노", available: true },
        { name: "바닐라크림 콜드브루", available: true },
        { name: "ICE 자몽허니블랙티", available: true },
        { name: "선택안함", available: true },
      ];

      drinkOptions = settings?.drink_options
        ? settings.drink_options.map((name: string) => ({
            name,
            available: true,
          }))
        : defaultDrinkOptions;

      pickupPersons = settings?.pickup_persons
        ? settings.pickup_persons.map((name: string) => ({ name }))
        : [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: apps, error: appError } = await (supabase as any)
        .from("monthly_drink_applications")
        .select("*")
        .eq("year", year)
        .eq("month", month) as { data: DrinkApplication[] | null; error: unknown };

      if (appError) console.error("Error fetching applications:", appError);
      applications = apps;
    }

    // 멤버별 신청 내역 매핑
    const applicationMap = new Map(
      applications?.map((app) => [app.user_id, app]) || []
    );

    const allApplications =
      members?.map((member) => {
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

// POST /api/monthly - 음료 신청
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { drink, collectionId } = body;

    if (!drink) {
      return NextResponse.json(
        { success: false, error: "Drink is required" },
        { status: 400 }
      );
    }

    // 신청자는 세션 사용자로 고정
    const name = sessionUser.fullName;
    const member = { id: sessionUser.id };

    let year: number;
    let month: number;

    if (collectionId) {
      // collection에서 year/month 가져오기
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: collection } = await (supabase as any)
        .from("drink_collections")
        .select("year, month")
        .eq("id", collectionId)
        .single() as { data: { year: number; month: number | null } | null };

      year = collection?.year || new Date().getFullYear();
      month = collection?.month || new Date().getMonth() + 1;
    } else {
      year = new Date().getFullYear();
      month = new Date().getMonth() + 1;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const upsertData: any = {
      user_id: member.id,
      year,
      month,
      drink,
      updated_at: new Date().toISOString(),
    };

    if (collectionId) {
      upsertData.collection_id = collectionId;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("monthly_drink_applications")
      .upsert(upsertData, { onConflict: "user_id,year,month" });

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
