import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { MonthlyAllowancesJson } from "@/lib/supabase/types";

// GET /api/settings/monthly-allowances - Get monthly allowances from global_settings
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const year = searchParams.get("year") || String(new Date().getFullYear());

    const { data, error } = await supabase
      .from("global_settings")
      .select("monthly_allowances")
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Error fetching monthly allowances:", error);
      return NextResponse.json({ error: "Failed to fetch monthly allowances" }, { status: 500 });
    }

    const monthlyAllowances = (data?.monthly_allowances as MonthlyAllowancesJson) || {};
    const yearData = monthlyAllowances[year] || {};

    return NextResponse.json({
      year,
      data: yearData,
    });
  } catch (error) {
    console.error("Monthly allowances API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/settings/monthly-allowances - Save monthly allowance to global_settings
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const body = await request.json();

    const { year, month, dailyAllowance, actualWorkdays } = body;

    if (!year || !month || dailyAllowance === undefined || !actualWorkdays) {
      return NextResponse.json(
        { error: "year, month, dailyAllowance, and actualWorkdays are required" },
        { status: 400 }
      );
    }

    const allowanceAmount = dailyAllowance * actualWorkdays;

    // 기존 데이터 조회
    const { data: currentData, error: fetchError } = await supabase
      .from("global_settings")
      .select("monthly_allowances")
      .eq("id", 1)
      .single();

    if (fetchError) {
      console.error("Error fetching current settings:", fetchError);
      return NextResponse.json({ error: "Failed to fetch current settings" }, { status: 500 });
    }

    // 기존 데이터에 새 값 병합
    const currentAllowances = (currentData?.monthly_allowances as MonthlyAllowancesJson) || {};
    const yearStr = String(year);
    const monthStr = String(month);

    if (!currentAllowances[yearStr]) {
      currentAllowances[yearStr] = {};
    }

    currentAllowances[yearStr][monthStr] = {
      allowance: allowanceAmount,
      workdays: actualWorkdays,
    };

    // 업데이트
    const { error: updateError } = await supabase
      .from("global_settings")
      .update({ monthly_allowances: currentAllowances })
      .eq("id", 1);

    if (updateError) {
      console.error("Error saving monthly allowances:", updateError);
      return NextResponse.json({ error: "Failed to save monthly allowances" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${year}년 ${month}월 지원금이 저장되었습니다.`,
      data: {
        year,
        month,
        allowance: allowanceAmount,
        workdays: actualWorkdays,
      },
    });
  } catch (error) {
    console.error("Monthly allowances API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
