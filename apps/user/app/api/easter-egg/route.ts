export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";

const MAX_DELTA = 100;

interface CounterRow {
  total_amount: number | string;
  updated_at: string | null;
}

interface SupabaseError {
  message: string;
}

// easter_egg_counter 테이블 / increment_easter_egg RPC는 자동 생성된 types.ts
// 에 아직 반영되지 않아 untyped 핸들로 호출
type UntypedTable = {
  select: (cols: string) => UntypedTable;
  eq: (col: string, val: number) => UntypedTable;
  maybeSingle: () => Promise<{
    data: CounterRow | null;
    error: SupabaseError | null;
  }>;
};

type UntypedRpc = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: number | string | null; error: SupabaseError | null }>;

// GET /api/easter-egg → 현재 누적 금액
export async function GET() {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Supabase 클라이언트를 초기화할 수 없습니다." },
        { status: 500 },
      );
    }

    const supabaseUntyped = supabase as unknown as {
      from: (table: string) => UntypedTable;
    };
    const { data, error } = await supabaseUntyped
      .from("easter_egg_counter")
      .select("total_amount, updated_at")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("[easter-egg] GET supabase error", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          total: Number(data?.total_amount ?? 0),
          updated_at: data?.updated_at ?? null,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[easter-egg] GET error", err);
    const message =
      err instanceof Error ? err.message : "조회 중 오류가 발생했습니다.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

// POST /api/easter-egg { delta } → 증가 후 새 total 반환
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      delta?: number;
    };
    const delta = Number(body.delta ?? 10);

    if (!Number.isFinite(delta) || delta <= 0 || delta > MAX_DELTA) {
      return NextResponse.json(
        { success: false, error: "delta 값이 유효하지 않습니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Supabase 클라이언트를 초기화할 수 없습니다." },
        { status: 500 },
      );
    }

    // rpc 메서드의 this 컨텍스트 유지를 위해 직접 호출
    const supabaseUntyped = supabase as unknown as { rpc: UntypedRpc };
    const { data, error } = await supabaseUntyped.rpc(
      "increment_easter_egg",
      { delta: Math.floor(delta) },
    );

    if (error) {
      console.error("[easter-egg] RPC error", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: { total: Number(data ?? 0) },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[easter-egg] POST error", err);
    const message =
      err instanceof Error ? err.message : "증가 처리 중 오류가 발생했습니다.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
