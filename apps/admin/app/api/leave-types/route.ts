import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/leave-types - 근태 유형 목록 조회
export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

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
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
