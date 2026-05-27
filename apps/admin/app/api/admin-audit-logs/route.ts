import { NextRequest, NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export async function GET(request: NextRequest) {
  try {
    await requireAdminPermission("audit:read");
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;
    const requestedLimit = Number(searchParams.get("limit") || DEFAULT_LIMIT);
    const limit = Math.min(
      Number.isFinite(requestedLimit) ? requestedLimit : DEFAULT_LIMIT,
      MAX_LIMIT,
    );
    const action = searchParams.get("action");
    const targetType = searchParams.get("target_type");

    let query = (supabase.from("admin_audit_logs") as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (action) query = query.eq("action", action);
    if (targetType) query = query.eq("target_type", targetType);

    const { data, error } = await query;

    if (error) {
      console.error("Admin audit logs API error:", error);
      return NextResponse.json({ error: "감사 로그 조회 실패" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Admin audit logs API error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: authStatus });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
