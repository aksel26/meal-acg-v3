export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";

export interface RestaurantData {
  id: string;
  name: string;
  business_number: string | null;
}

// GET: 모든 식당 목록 조회
export async function GET() {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      throw new Error("Supabase 클라이언트를 초기화할 수 없습니다.");
    }

    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name, business_number")
      .order("name", { ascending: true });

    if (error) {
      throw new Error(`식당 목록 조회 실패: ${error.message}`);
    }

    return NextResponse.json(
      {
        success: true,
        data: data || [],
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Restaurants API GET error:", err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

// POST: 새 식당 등록
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      throw new Error("Supabase 클라이언트를 초기화할 수 없습니다.");
    }

    const body = await request.json();
    const { name, business_number } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          message: "식당명은 필수입니다.",
        },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const trimmedBusinessNumber = business_number?.trim() || null;

    // insert로 새 식당 등록 (중복 시 에러 처리)
    const { data, error } = await supabase
      .from("restaurants")
      .insert({
        name: trimmedName,
        business_number: trimmedBusinessNumber,
      })
      .select()
      .single();

    if (error) {
      // 중복으로 인한 에러는 성공으로 처리 (unique constraint violation)
      if (error.code === "23505") {
        return NextResponse.json(
          {
            success: true,
            message: "식당이 이미 등록되어 있습니다.",
            data: null,
          },
          { status: 200 }
        );
      }
      console.error("Restaurant insert error:", error);
      throw new Error(`식당 등록 실패: ${error.message}`);
    }

    return NextResponse.json(
      {
        success: true,
        message: "식당이 등록되었습니다.",
        data,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Restaurants API POST error:", err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
