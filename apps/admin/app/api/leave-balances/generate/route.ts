import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// POST /api/leave-balances/generate - 연도별 일괄 부여
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const body = await request.json();
    const { year } = body;

    if (!year) {
      return NextResponse.json({ error: "year은 필수입니다." }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("generate_annual_leave", {
      p_year: year,
    });

    if (error) {
      console.error("Error generating annual leave:", error);
      return NextResponse.json(
        { error: "Failed to generate annual leave" },
        { status: 500 }
      );
    }

    return NextResponse.json({ generated: data });
  } catch (error) {
    console.error("Leave balances generate POST error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
