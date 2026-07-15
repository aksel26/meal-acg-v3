"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "@repo/ui/src/button";
import { cn } from "@repo/ui/lib/utils";

type AuditLog = {
  id: string;
  actor_name: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  target_label: string | null;
  risk_level: "low" | "medium" | "high";
  reason: string | null;
  metadata: Record<string, unknown> | null;
  request_path: string | null;
  ip_address: string | null;
  created_at: string;
};

const ACTION_LABELS: Record<string, string> = {
  "member.sensitive_view": "직원 민감정보 조회",
  "member.permission_update": "직원 권한 변경",
  "export.member": "직원 식대 내역 다운로드",
  "export.members_bulk": "직원 식대 내역 일괄 다운로드",
  "export.excel": "식대 엑셀 다운로드",
  "export.usage_records": "사용 내역 다운로드",
};

const RISK_LABELS = {
  low: "낮음",
  medium: "보통",
  high: "높음",
} as const;

const RISK_STYLES = {
  low: "border-slate-200 bg-slate-50 text-slate-600",
  medium: "border-slate-200 bg-slate-50 text-slate-700",
  high: "border-slate-200 bg-slate-50 text-slate-700",
} as const;

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function metadataSummary(metadata: Record<string, unknown> | null) {
  if (!metadata) return "-";
  const entries = Object.entries(metadata).filter(([, value]) => value !== null && value !== undefined);
  if (entries.length === 0) return "-";
  return entries
    .map(([key, value]) => {
      if (Array.isArray(value)) return `${key}: ${value.join(", ")}`;
      return `${key}: ${String(value)}`;
    })
    .join(" / ");
}

export default function AdminAuditLogsPage() {
  const [action, setAction] = useState("all");
  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: "200" });
    if (action !== "all") params.set("action", action);
    return params.toString();
  }, [action]);

  const { data = [], isLoading, refetch, isFetching } = useQuery<AuditLog[]>({
    queryKey: ["adminAuditLogs", action],
    queryFn: async () => {
      const response = await fetch(`/api/admin-audit-logs?${queryString}`);
      if (!response.ok) throw new Error("감사 로그 조회 실패");
      return response.json();
    },
  });

  return (
    <main className="space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <ShieldCheck className="h-4 w-4" />
          최근 200건 기준
        </div>
        <div className="flex items-center gap-2">
          <select
            value={action}
            onChange={(event) => setAction(event.target.value)}
            className="h-9 rounded-md bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="all">전체 액션</option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("mr-1.5 h-4 w-4", isFetching && "animate-spin")} />
            새로고침
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">시간</th>
                <th className="px-4 py-3">행위자</th>
                <th className="px-4 py-3">액션</th>
                <th className="px-4 py-3">대상</th>
                <th className="px-4 py-3">위험도</th>
                <th className="px-4 py-3">사유</th>
                <th className="px-4 py-3">메타데이터</th>
                <th className="px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={8}>
                    불러오는 중...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={8}>
                    감사 로그가 없습니다.
                  </td>
                </tr>
              ) : (
                data.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
                      {log.actor_name || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {ACTION_LABELS[log.action] || log.action}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="font-medium text-slate-800">{log.target_label || "-"}</div>
                      <div className="text-xs text-slate-400">
                        {log.target_type}
                        {log.target_id ? ` / ${log.target_id}` : ""}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                          RISK_STYLES[log.risk_level],
                        )}
                      >
                        {RISK_LABELS[log.risk_level]}
                      </span>
                    </td>
                    <td className="max-w-[12rem] px-4 py-3 text-slate-600">
                      {log.reason || "-"}
                    </td>
                    <td className="max-w-[22rem] px-4 py-3 text-xs text-slate-500">
                      {metadataSummary(log.metadata)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {log.ip_address || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
