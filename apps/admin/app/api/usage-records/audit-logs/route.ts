import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// GET /api/usage-records/audit-logs - List audit logs
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const usageRecordId = searchParams.get("usage_record_id");

    let query = supabase
      .from("usage_record_audit_logs")
      .select(
        "*, members!usage_record_audit_logs_changed_by_fkey(id, full_name)"
      );

    if (usageRecordId) {
      query = query.eq("usage_record_id", usageRecordId);
    }

    const { data, error } = await query.order("changed_at", {
      ascending: false,
    });

    if (error) {
      console.error("Error fetching audit logs:", error);
      return NextResponse.json(
        { error: "Failed to fetch audit logs" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Audit logs API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
