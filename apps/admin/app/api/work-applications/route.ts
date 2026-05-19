import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";

function isKnownStatus(value: string | null) {
  return value === "pending" || value === "approved" || value === "rejected";
}

function isKnownType(value: string | null) {
  return value === "overtime" || value === "weekend";
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminPermission("attendance:read");
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const teamId = searchParams.get("teamId");
    const memberId = searchParams.get("memberId");
    const keyword = searchParams.get("keyword")?.trim();

    let query = supabase
      .from("work_applications")
      .select(`
        *,
        requester:members!work_applications_requester_id_fkey(id, full_name, member_role, team_id, division_id, team:teams!members_team_id_fkey(name, division_id)),
        approver:members!work_applications_approver_id_fkey(id, full_name)
      `)
      .order("work_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (isKnownStatus(status)) query = query.eq("status", status);
    if (isKnownType(type)) query = query.eq("application_type", type);
    if (memberId) query = query.eq("requester_id", memberId);

    const { data, error } = await query;

    if (error) {
      console.error("Admin work applications fetch error:", error);
      return NextResponse.json({ error: "근무 신청 조회 실패" }, { status: 500 });
    }

    const filtered = (data || []).filter((item) => {
      const requester = item.requester as {
        full_name?: string | null;
        team_id?: string | null;
        team?: { name?: string | null } | null;
      } | null;
      if (teamId && requester?.team_id !== teamId) return false;
      if (!keyword) return true;
      return [
        requester?.full_name,
        requester?.team?.name,
        item.project_name,
        item.reason,
      ].some((value) => value?.includes(keyword));
    });

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Admin work applications API error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
