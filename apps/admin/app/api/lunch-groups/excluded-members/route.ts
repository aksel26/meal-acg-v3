import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { authErrorResponse, logLunchGroupAction } from "@/lib/lunch-group-audit";

// GET: 해당 주차 제외 인원 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const weekStartDate = searchParams.get("weekStartDate");

  if (!weekStartDate) {
    return NextResponse.json(
      { error: "weekStartDate 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lunch_group_excluded_members")
    .select("id, member_id, week_start_date, excluded_at, members(id, full_name)")
    .eq("week_start_date", weekStartDate);

  if (error) {
    console.error("Error fetching excluded members:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST: 인원 제외 저장 (upsert)
export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const { memberIds, weekStartDate } = body as {
    memberIds: string[];
    weekStartDate: string;
  };

  if (!memberIds?.length || !weekStartDate) {
    return NextResponse.json(
      { error: "memberIds와 weekStartDate가 필요합니다." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const rows = memberIds.map((member_id) => ({ member_id, week_start_date: weekStartDate }));

  const { data, error } = await supabase
    .from("lunch_group_excluded_members")
    .upsert(rows, { onConflict: "member_id,week_start_date" })
    .select("id, member_id, week_start_date, excluded_at, members(id, full_name)");

  if (error) {
    console.error("Error excluding members:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  for (const memberId of memberIds) {
    await logLunchGroupAction({
      weekStartDate,
      action: "exclude",
      changedBy: session.userId,
      memberId,
    });
  }

  return NextResponse.json(data);
}

// DELETE: 제외 해제
export async function DELETE(request: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");
  const weekStartDate = searchParams.get("weekStartDate");

  if (!memberId || !weekStartDate) {
    return NextResponse.json(
      { error: "memberId와 weekStartDate 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("lunch_group_excluded_members")
    .delete()
    .eq("member_id", memberId)
    .eq("week_start_date", weekStartDate);

  if (error) {
    console.error("Error restoring member:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logLunchGroupAction({
    weekStartDate,
    action: "restore",
    changedBy: session.userId,
    memberId,
  });

  return NextResponse.json({ success: true });
}
