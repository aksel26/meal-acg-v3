import type { DashboardWorker } from "@/hooks/use-dashboard";

type Props = {
  workers: DashboardWorker[];
};

function getAttendanceBadge(status: DashboardWorker["attendanceStatus"]) {
  switch (status) {
    case "confirmed":
      return <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">출석확인</span>;
    case "checked_in":
      return <span className="inline-flex rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">확인대기</span>;
    default:
      return <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">미출석</span>;
  }
}

function getContractBadge(status: DashboardWorker["contractStatus"]) {
  switch (status) {
    case "confirmed":
      return <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">확인완료</span>;
    case "signed":
      return <span className="inline-flex rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">서명완료</span>;
    default:
      return <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">미서명</span>;
  }
}

function formatRoomSlots(worker: DashboardWorker): string {
  if (!worker.roomSlots || worker.roomSlots.length === 0) return "미배정";
  return worker.roomSlots
    .map((s) => `${s.room} (${s.start_time}-${s.end_time})`)
    .join(", ");
}

export function JobPostingDetailAttendance({ workers }: Props) {
  const sorted = [...workers].sort((a, b) => {
    const order: Record<string, number> = { null: 0, checked_in: 1, confirmed: 2 };
    const aOrder = order[a.attendanceStatus ?? "null"] ?? 0;
    const bOrder = order[b.attendanceStatus ?? "null"] ?? 0;
    return aOrder - bOrder;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-medium text-slate-400">
            <th className="px-3 py-2 font-medium">이름</th>
            <th className="px-3 py-2 font-medium">연락처</th>
            <th className="px-3 py-2 font-medium text-center">출석 상태</th>
            <th className="px-3 py-2 font-medium text-center">계약 상태</th>
            <th className="px-3 py-2 font-medium">회의실</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((w, idx) => (
            <tr
              key={w.id}
              className={`border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50 ${
                idx % 2 === 0 ? "" : "bg-slate-50/50"
              }`}
            >
              <td className="px-3 py-3 font-medium text-slate-800">{w.name}</td>
              <td className="px-3 py-3 text-slate-600">{w.phone}</td>
              <td className="px-3 py-3 text-center">{getAttendanceBadge(w.attendanceStatus)}</td>
              <td className="px-3 py-3 text-center">{getContractBadge(w.contractStatus)}</td>
              <td className="px-3 py-3 text-slate-600">{formatRoomSlots(w)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
