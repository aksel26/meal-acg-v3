import type { DashboardWorker } from "@/hooks/use-dashboard";

type Props = {
  workers: DashboardWorker[];
};

function getAttendanceBadge(status: DashboardWorker["attendanceStatus"]) {
  switch (status) {
    case "confirmed":
      return <span className="rounded-sm bg-green-500/10 px-2 py-0.5 text-xs text-green-400">출석확인</span>;
    case "checked_in":
      return <span className="rounded-sm bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400">확인대기</span>;
    default:
      return <span className="rounded-sm bg-red-500/10 px-2 py-0.5 text-xs text-red-400">미출석</span>;
  }
}

function getContractBadge(status: DashboardWorker["contractStatus"]) {
  switch (status) {
    case "confirmed":
      return <span className="rounded-sm bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">확인완료</span>;
    case "signed":
      return <span className="rounded-sm bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400">서명완료</span>;
    default:
      return <span className="rounded-sm bg-red-500/10 px-2 py-0.5 text-xs text-red-400">미서명</span>;
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
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-3 py-2">이름</th>
            <th className="px-3 py-2">연락처</th>
            <th className="px-3 py-2 text-center">출석 상태</th>
            <th className="px-3 py-2 text-center">계약 상태</th>
            <th className="px-3 py-2">회의실</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((w, idx) => (
            <tr
              key={w.id}
              className={`border-b last:border-0 transition-colors hover:bg-muted/40 ${
                idx % 2 === 0 ? "" : "bg-muted/20"
              }`}
            >
              <td className="px-3 py-2 font-medium">{w.name}</td>
              <td className="px-3 py-2 text-muted-foreground">{w.phone}</td>
              <td className="px-3 py-2 text-center">{getAttendanceBadge(w.attendanceStatus)}</td>
              <td className="px-3 py-2 text-center">{getContractBadge(w.contractStatus)}</td>
              <td className="px-3 py-2 text-muted-foreground">{formatRoomSlots(w)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
