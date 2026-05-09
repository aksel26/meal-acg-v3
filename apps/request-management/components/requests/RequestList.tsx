import { Users } from "lucide-react";
import Link from "next/link";
import type { RequestRecord } from "@/lib/requests";
import { PriorityBadge, StatusBadge } from "@/components/requests/RequestBadge";

export function RequestList({
  requests,
  emptyText,
}: {
  requests: RequestRecord[];
  emptyText: string;
}) {
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-[#f3f3f3] bg-white px-6 py-10 text-center">
        <p className="text-sm text-slate-500">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#f3f3f3] bg-white">
      <div className="overflow-x-auto">
        <div className="min-w-[680px]">
          <div className="grid grid-cols-[1fr_110px_88px_80px_150px] gap-3 border-b border-[#f3f3f3] bg-[#fafafa] px-4 py-2.5 text-[11px] font-medium uppercase tracking-widest text-slate-400">
            <span>요청</span>
            <span>마감일</span>
            <span>상태</span>
            <span>우선순위</span>
            <span>담당</span>
          </div>
          <ul className="divide-y divide-[#f3f3f3]">
            {requests.map((request) => {
              const muted = request.status === "완료" || request.status === "거절";
              return (
                <li key={request.id}>
                  <Link
                    href={`/requests/${request.id}`}
                    className="grid grid-cols-[1fr_110px_88px_80px_150px] gap-3 px-4 py-3 text-sm transition-colors hover:bg-[#fafafa]"
                  >
                    <div className="min-w-0">
                      <p
                        className={`truncate font-medium ${
                          muted ? "text-slate-400" : "text-[#111111]"
                        }`}
                      >
                        {request.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {request.requester_name}
                        {request.request_type_name ? ` · ${request.request_type_name}` : ""}
                        {request.customer_names && request.customer_names.length > 0
                          ? ` · ${request.customer_names.join(", ")}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center text-xs text-slate-600 tabular-nums">
                      {request.due_date ?? <span className="text-slate-300">-</span>}
                    </div>
                    <div className="flex items-center">
                      <StatusBadge status={request.status} />
                    </div>
                    <div className="flex items-center">
                      <PriorityBadge priority={request.priority} />
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                      <Users size={13} className="shrink-0 text-slate-300" />
                      <span className="truncate">{displayAssigneeNames(request)}</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function displayAssigneeNames(request: RequestRecord) {
  const names =
    request.assignee_names && request.assignee_names.length > 0
      ? request.assignee_names
      : request.assignee_name
        ? [request.assignee_name]
        : [];

  return names.length > 0 ? names.join(", ") : "미배정";
}
