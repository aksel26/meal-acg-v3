import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { HIDDEN_MEMBER_NAMES } from "@/lib/constants";
import type { BudgetSummary } from "@/lib/supabase/types";

// GET /api/budget-summary - Query budget_summary view
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const period = searchParams.get("period");
    const type = searchParams.get("type");
    const memberId = searchParams.get("member_id");

    let query = supabase.from("budget_summary").select("*");

    if (period) {
      query = query.eq("period", period);
    }
    if (type) {
      query = query.eq("type", type);
    }
    if (memberId) {
      query = query.eq("member_id", memberId);
    }

    const { data, error } = await query.order("member_name");

    if (error) {
      console.error("Error fetching budget summary:", error);
      return NextResponse.json(
        { error: "Failed to fetch budget summary" },
        { status: 500 }
      );
    }

    const { data: resignedMembers, error: resignedError } = await supabase
      .from("member_current_status")
      .select("member_id")
      .eq("current_status", "퇴사");

    if (resignedError) {
      console.error("Error fetching resigned members:", resignedError);
      return NextResponse.json(
        { error: "Failed to fetch resigned members" },
        { status: 500 }
      );
    }

    const resignedMemberIds = new Set(
      (resignedMembers || [])
        .map((member) => member.member_id)
        .filter((id): id is string => Boolean(id))
    );

    const filtered = (data || []).filter(
      (row: BudgetSummary) =>
        !HIDDEN_MEMBER_NAMES.has(row.member_name || "") &&
        !resignedMemberIds.has(row.member_id || "")
    );
    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Budget summary API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
