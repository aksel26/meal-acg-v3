import type { RequestPriority, RequestStatus } from "@/lib/requests";

const statusClass: Record<RequestStatus, string> = {
  접수: "bg-slate-100 text-slate-700",
  진행: "bg-blue-50 text-blue-700",
  대기: "bg-amber-50 text-amber-700",
  완료: "bg-emerald-50 text-emerald-700",
  거절: "bg-rose-50 text-rose-700",
};

const priorityClass: Record<RequestPriority, string> = {
  P1: "bg-rose-50 text-rose-700",
  P2: "bg-amber-50 text-amber-700",
  P3: "bg-slate-100 text-slate-700",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass[status]}`}>
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: RequestPriority }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${priorityClass[priority]}`}>
      {priority}
    </span>
  );
}
