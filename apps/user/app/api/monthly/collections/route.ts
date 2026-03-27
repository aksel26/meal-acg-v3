import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

// GET /api/monthly/collections - 활성 취합 건 목록 조회
export async function GET() {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const { data: collections, error } = await supabase
      .from("drink_collections")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching collections:", error);
      return NextResponse.json({
        success: true,
        data: [],
        warning: "Failed to fetch collections",
      });
    }

    return NextResponse.json({
      success: true,
      data: collections || [],
    });
  } catch (error) {
    console.error("Collections API error:", error);
    return NextResponse.json({
      success: true,
      data: [],
      warning: "Using fallback data due to API error",
    });
  }
}
