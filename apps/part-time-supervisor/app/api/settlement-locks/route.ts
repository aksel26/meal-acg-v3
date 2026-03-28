import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

// GET: type/year/month 기준으로 잠금 조회
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = request.nextUrl;
    const type = searchParams.get("type");
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (!type || !year || !month) {
      return NextResponse.json({ error: "type, year, month are required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("settlement_locks")
      .select("*")
      .eq("type", type)
      .eq("year", parseInt(year))
      .eq("month", parseInt(month))
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json(data ?? null);
  } catch (error) {
    console.error("GET /api/settlement-locks error:", error);
    return NextResponse.json({ error: "Failed to fetch settlement lock" }, { status: 500 });
  }
}

// POST: 잠금 생성
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { type, year, month, memo } = await request.json();

    if (!type || !year || !month) {
      return NextResponse.json({ error: "type, year, month are required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("settlement_locks")
      .insert({
        type,
        year,
        month,
        locked_by: session.fullName,
        memo: memo ?? null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "이미 확정된 정산입니다" }, { status: 409 });
      }
      throw error;
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/settlement-locks error:", error);
    return NextResponse.json({ error: "Failed to create settlement lock" }, { status: 500 });
  }
}
