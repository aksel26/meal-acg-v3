import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export type LunchGroupAuditAction =
  | "create_table"
  | "reset"
  | "move_slot"
  | "exclude"
  | "restore";

// admin 조작 기록. 뽑기·이동·제거는 DB 함수가 직접 남긴다.
export async function logLunchGroupAction(input: {
  weekStartDate: string;
  action: LunchGroupAuditAction;
  changedBy: string;
  memberId?: string | null;
  fromGroupNumber?: number | null;
  toGroupNumber?: number | null;
  detail?: Record<string, unknown> | null;
}) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("lunch_group_audit_logs").insert({
    week_start_date: input.weekStartDate,
    action: input.action,
    changed_by: input.changedBy,
    member_id: input.memberId ?? null,
    from_group_number: input.fromGroupNumber ?? null,
    to_group_number: input.toGroupNumber ?? null,
    detail: input.detail ?? null,
  });
  if (error) {
    // 기록 실패가 본 작업을 막지는 않는다
    console.error("Lunch group audit log error:", error);
  }
}

// requireAdmin()이 던지는 오류를 HTTP 응답으로 바꾼다. 해당 없으면 null.
export function authErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof Error)) return null;
  if (error.message === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error.message.startsWith("Forbidden")) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  return null;
}
