import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";

// GET /api/leave-types - 근태 유형 목록 조회
export async function GET() {
  try {
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase client initialization failed" },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from("leave_types")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching leave types:", error);
      return NextResponse.json(
        { error: "Failed to fetch leave types" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Leave types API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
