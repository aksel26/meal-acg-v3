"use client";

import { useState } from "react";
import { useAuditLogs } from "@/hooks/use-audit-logs";
import type { SettlementAuditLog } from "@/lib/supabase/types";

const TABLE_OPTIONS = [
  { value: "", label: "전체" },
  { value: "work_records", label: "근무기록 (supervisor)" },
  { value: "interview_work_records", label: "근무기록 (면접)" },
  { value: "settlement_locks", label: "정산 확정" },
];

const ACTION_BADGE: Record<string, string> = {
  INSERT: "bg-green-50 text-green-700",
  UPDATE: "bg-blue-50 text-blue-700",
  DELETE: "bg-red-50 text-red-700",
};

const ACTION_LABEL: Record<string, string> = {
  INSERT: "생성",
  UPDATE: "수정",
  DELETE: "삭제",
};

const PAGE_SIZE = 20;

function DataDiff({ log }: { log: SettlementAuditLog }) {
  const [open, setOpen] = useState(false);
  if (!log.old_data && !log.new_data) return <span className="text-slate-400">-</span>;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-blue-600 hover:underline"
      >
        {open ? "접기" : "보기"}
      </button>
      {open && (
        <div className="mt-1 space-y-1">
          {log.old_data && (
            <div>
              <span className="text-xs font-medium text-red-600">이전:</span>
              <pre className="mt-0.5 max-w-xs overflow-auto rounded bg-red-50 p-1 text-xs text-red-800">
                {JSON.stringify(log.old_data, null, 2)}
              </pre>
            </div>
          )}
          {log.new_data && (
            <div>
              <span className="text-xs font-medium text-green-600">변경:</span>
              <pre className="mt-0.5 max-w-xs overflow-auto rounded bg-green-50 p-1 text-xs text-green-800">
                {JSON.stringify(log.new_data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type Props = {
  defaultTableName?: string;
};

export function AuditLogViewer({ defaultTableName = "" }: Props) {
  const [tableName, setTableName] = useState(defaultTableName);
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useAuditLogs({
    table_name: tableName || undefined,
    limit: PAGE_SIZE,
    offset,
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const handleTableChange = (value: string) => {
    setTableName(value);
    setOffset(0);
  };

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 rounded-lg border bg-white p-1">
          {TABLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleTableChange(opt.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tableName === opt.value
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-hidden bg-white">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-slate-400">
            불러오는 중...
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-slate-400">
            감사 로그가 없습니다.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-200 text-left text-slate-600 [&>th:first-child]:rounded-tl-md [&>th:last-child]:rounded-tr-md">
                <th className="px-4 py-3 font-medium">시각</th>
                <th className="px-4 py-3 font-medium">테이블</th>
                <th className="px-4 py-3 font-medium">작업</th>
                <th className="px-4 py-3 font-medium">변경자</th>
                <th className="px-4 py-3 font-medium">데이터</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((log) => (
                <tr key={log.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {new Date(log.changed_at).toLocaleString("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                    {log.table_name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        ACTION_BADGE[log.action] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {ACTION_LABEL[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {log.changed_by ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <DataDiff log={log} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            전체 {data?.total ?? 0}건 / {currentPage}/{totalPages} 페이지
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={offset === 0}
              className="rounded border px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
            >
              이전
            </button>
            <button
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={currentPage >= totalPages}
              className="rounded border px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
