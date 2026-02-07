"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export function useAuditLogs(usageRecordId?: string) {
  return useQuery({
    queryKey: queryKeys.usageRecords.auditLogs(usageRecordId),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (usageRecordId) params.set("usage_record_id", usageRecordId);
      const res = await fetch(`/api/usage-records/audit-logs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!usageRecordId,
    staleTime: 30 * 1000,
  });
}
