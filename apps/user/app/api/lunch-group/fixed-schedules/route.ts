import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/client";
import type { LunchFixedScheduleWithMember } from "@/lib/supabase/types";

// GET: 고정 스케줄 조회
export async function GET() {
  const supabase = createServiceClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase client not configured" },
      { status: 500 }
    );
  }

  const { data: schedules, error } = await supabase
    .from("lunch_fixed_schedules")
    .select(`
      *,
      members(*)
    `)
    .order("day_of_week")
    .order("created_at");

  if (error) {
    console.error("Error fetching fixed schedules:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(schedules as LunchFixedScheduleWithMember[]);
}
