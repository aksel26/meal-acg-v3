import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import type { LunchFixedScheduleWithMember } from "@/lib/supabase/types";

// GET: 고정 스케줄 조회
export async function GET() {
  try {
    await requireAdminPermission("organization:read");
    const supabase = await createClient();

    const { data: schedules, error } = await supabase
      .from("lunch_fixed_schedules")
      .select(
        `
      *,
      member:members(*)
    `,
      )
      .order("day_of_week")
      .order("created_at");

    if (error) {
      console.error("Error fetching fixed schedules:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(schedules as LunchFixedScheduleWithMember[]);
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: authStatus },
      );
    }
    console.error("Error fetching fixed schedules:", error);
    return NextResponse.json(
      { error: "고정 스케줄 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

// POST: 고정 스케줄 저장 (전체 교체)
export async function POST(request: Request) {
  try {
    await requireAdminPermission("organization:write");
    const body = await request.json();
    const { schedules } = body as {
      schedules: {
        day_of_week: number;
        user_id?: string;
        label?: string;
      }[];
    };

    if (!schedules || !Array.isArray(schedules)) {
      return NextResponse.json(
        { error: "schedules array is required" },
        { status: 400 },
      );
    }

    // 각 스케줄 항목 검증: user_id 또는 label 중 하나만 있어야 함
    for (const schedule of schedules) {
      const hasUserId =
        schedule.user_id !== undefined && schedule.user_id !== null;
      const hasLabel =
        schedule.label !== undefined &&
        schedule.label !== null &&
        schedule.label.trim() !== "";

      if ((!hasUserId && !hasLabel) || (hasUserId && hasLabel)) {
        return NextResponse.json(
          {
            error:
              "Each schedule must have either user_id or label, not both or neither",
          },
          { status: 400 },
        );
      }
    }

    const supabase = await createClient();

    // 트랜잭션: 기존 데이터 삭제 후 새로 생성
    // 1. 기존 스케줄 전체 삭제
    const { error: deleteError } = await supabase
      .from("lunch_fixed_schedules")
      .delete()
      .gte("day_of_week", 1); // 모든 레코드 삭제

    if (deleteError) {
      console.error("Error deleting existing schedules:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // 2. 새 스케줄 삽입 (스케줄이 있는 경우에만)
    if (schedules.length > 0) {
      const inserts = schedules.map((s) => ({
        day_of_week: s.day_of_week,
        user_id: s.user_id || null,
        label: s.label?.trim() || null,
      }));

      const { error: insertError } = await supabase
        .from("lunch_fixed_schedules")
        .insert(inserts);

      if (insertError) {
        console.error("Error inserting schedules:", insertError);
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json(
        { error: "권한이 없습니다." },
        { status: authStatus },
      );
    }
    console.error("Error saving fixed schedules:", error);
    return NextResponse.json(
      { error: "고정 스케줄 저장 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
