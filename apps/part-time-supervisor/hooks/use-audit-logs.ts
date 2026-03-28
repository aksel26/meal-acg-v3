import { useQuery } from "@tanstack/react-query";
import type { SettlementAuditLog } from "@/lib/supabase/types";

type AuditLogsResponse = {
  data: SettlementAuditLog[];
  total: number;
  limit: number;
  offset: number;
};

type Filters = {
  table_name?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
};

async function fetchAuditLogs(filters: Filters): Promise<AuditLogsResponse> {
  const params = new URLSearchParams();
  if (filters.table_name) params.set("table_name", filters.table_name);
  if (filters.start_date) params.set("start_date", filters.start_date);
  if (filters.end_date) params.set("end_date", filters.end_date);
  if (filters.limit != null) params.set("limit", String(filters.limit));
  if (filters.offset != null) params.set("offset", String(filters.offset));

  const res = await fetch(`/api/audit-logs?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  return res.json();
}

export function useAuditLogs(filters: Filters = {}) {
  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: () => fetchAuditLogs(filters),
  });
}
