import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

// GET: 감사 로그 조회 (table_name, start_date, end_date, limit, offset)
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = request.nextUrl;
    const tableName = searchParams.get("table_name");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const supabase = createServiceClient();

    let query = supabase
      .from("settlement_audit_logs")
      .select("*", { count: "exact" })
      .order("changed_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (tableName) query = query.eq("table_name", tableName);
    if (startDate) query = query.gte("changed_at", startDate);
    if (endDate) query = query.lte("changed_at", endDate);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ data, total: count ?? 0, limit, offset });
  } catch (error) {
    console.error("GET /api/audit-logs error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
