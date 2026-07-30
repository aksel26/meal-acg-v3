import "server-only";
import type { createServiceClient } from "@/lib/supabase/client";

type ServiceClient = NonNullable<ReturnType<typeof createServiceClient>>;

export interface LeaveBalanceRecord {
  id: string;
  member_id: string;
  year: number;
  type: string;
  granted: number;
  used: number;
  adjusted: number;
  note: string | null;
}

// /api/leave-balances와 /api/chat이 공유하는 조회. 조회 대상은 항상 호출부가
// 세션에서 강제한 memberId여야 한다 (요청 입력값 사용 금지).
export async function fetchLeaveBalances(
  supabase: ServiceClient,
  memberId: string,
  year: number,
): Promise<{
  data: LeaveBalanceRecord[] | null;
  error: { message: string } | null;
}> {
  return supabase
    .from("leave_balances")
    .select("id, member_id, year, type, granted, used, adjusted, note")
    .eq("member_id", memberId)
    .eq("year", year)
    .order("type", { ascending: true });
}
