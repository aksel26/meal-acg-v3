import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { apiError } from "../_utils";

// GET /api/evaluations/audit-logs?roundId=...
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const roundId = searchParams.get("roundId");

    let query = supabase
      .from("multisource_evaluation_audit_logs")
      .select("*, actor:members!multisource_evaluation_audit_logs_actor_member_id_fkey(id, full_name)")
      .order("created_at", { ascending: false });

    if (roundId) {
      query = query.eq("round_id", roundId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching evaluation audit logs:", error);
      return apiError("Failed to fetch evaluation audit logs", 500);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Evaluation audit logs API error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    if (error instanceof Error && error.message.startsWith("Forbidden")) {
      return apiError("Forbidden", 403);
    }
    return apiError("Internal server error", 500);
  }
}
