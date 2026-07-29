import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/budget-allocations - List budget allocations
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const period = searchParams.get("period");
    const type = searchParams.get("type");
    const memberId = searchParams.get("member_id");

    if (searchParams.get("settings") === "true") {
      if (!period) {
        return NextResponse.json(
          { error: "period is required" },
          { status: 400 },
        );
      }

      const { data, error } = await supabase
        .from("budget_period_settings")
        .select("*")
        .eq("period", period)
        .maybeSingle();

      if (error) {
        console.error("Error fetching budget settings:", error);
        return NextResponse.json(
          { error: "Failed to fetch budget settings" },
          { status: 500 },
        );
      }

      return NextResponse.json(data);
    }

    let query = supabase
      .from("budget_allocations")
      .select(
        "*, members!budget_allocations_member_id_fkey(id, full_name, member_role, team_id)",
      );

    if (period) {
      query = query.eq("period", period);
    }
    if (type) {
      query = query.eq("type", type);
    }
    if (memberId) {
      query = query.eq("member_id", memberId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching budget allocations:", error);
      return NextResponse.json(
        { error: "Failed to fetch budget allocations" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Budget allocations API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/budget-allocations - Create a single allocation
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const body = await request.json();

    const { member_id, type, period, total_amount, description } = body;

    if (!member_id || !type || !period || total_amount === undefined) {
      return NextResponse.json(
        {
          error: "member_id, type, period, and total_amount are required",
        },
        { status: 400 },
      );
    }
    if (!Number.isInteger(total_amount) || total_amount < 0) {
      return NextResponse.json(
        { error: "total_amount must be a non-negative integer" },
        { status: 400 },
      );
    }

    const { data: currentStatus, error: statusError } = await supabase
      .from("member_current_status")
      .select("current_status")
      .eq("member_id", member_id)
      .maybeSingle();

    if (statusError) {
      console.error("Error checking member status:", statusError);
      return NextResponse.json(
        { error: "Failed to check member status" },
        { status: 500 },
      );
    }

    const { data, error } = await supabase
      .from("budget_allocations")
      .insert({
        member_id,
        type,
        period,
        base_amount: total_amount,
        total_amount: currentStatus ? 0 : total_amount,
        description: description || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating budget allocation:", error);
      return NextResponse.json(
        { error: "Failed to create budget allocation" },
        { status: 500 },
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Budget allocations API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/budget-allocations - Save period settings and recalculate atomically
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const {
      period,
      welfare_amount,
      leader_rate,
      manager_rate,
      pnc_extra_rate,
      welfare_description,
    } = await request.json();

    const amounts = [
      welfare_amount,
      leader_rate,
      manager_rate,
      pnc_extra_rate,
    ].filter((value) => value !== undefined);

    if (
      typeof period !== "string" ||
      !/^\d{4}-H[12]$/.test(period) ||
      amounts.length === 0 ||
      amounts.some(
        (value) =>
          !Number.isInteger(value) || typeof value !== "number" || value < 0,
      )
    ) {
      return NextResponse.json(
        { error: "올바른 반기와 0 이상의 정수 금액을 입력해주세요." },
        { status: 400 },
      );
    }

    const { data, error } = await (supabase as any).rpc(
      "save_budget_period_settings",
      {
        p_period: period,
        p_welfare_amount: welfare_amount ?? null,
        p_leader_rate: leader_rate ?? null,
        p_manager_rate: manager_rate ?? null,
        p_pnc_extra_rate: pnc_extra_rate ?? null,
        p_welfare_description: welfare_description || null,
      },
    );

    if (error) {
      console.error("Error saving budget settings:", error);
      return NextResponse.json(
        { error: "Failed to save budget settings" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Budget allocations API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
