import type { DashboardJobPosting } from "@/hooks/use-dashboard";
import { ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  jobPosting: DashboardJobPosting;
  isExpanded: boolean;
  onClick: () => void;
};

function getRateColor(completed: number, total: number): string {
  if (total === 0) return "text-muted-foreground";
  const rate = completed / total;
  if (rate >= 0.8) return "text-green-400";
  if (rate >= 0.5) return "text-yellow-400";
  return "text-red-400";
}

function getStatusConfig(status: string): { label: string; className: string } {
  switch (status) {
    case "open":
      return {
        label: "모집중",
        className: "bg-blue-500/10 text-blue-400",
      };
    case "in_progress":
      return {
        label: "진행중",
        className: "bg-green-500/10 text-green-400",
      };
    default:
      return {
        label: status,
        className: "bg-slate-500/10 text-slate-400",
      };
  }
}

function formatCostShort(cost: number): string {
  const man = Math.floor(cost / 10000);
  if (man > 0) return `${new Intl.NumberFormat("ko-KR").format(man)}만원`;
  return `${new Intl.NumberFormat("ko-KR").format(cost)}원`;
}

export function JobPostingCard({ jobPosting: jp, isExpanded, onClick }: Props) {
  const { stats } = jp;
  const notAttended =
    stats.assigned - stats.attendanceCheckedIn - stats.attendanceConfirmed;
  const notContracted =
    stats.assigned - stats.contractSigned - stats.contractConfirmed;

  const statusConfig = getStatusConfig(jp.status);

  const payLabel = jp.payType === "hourly"
    ? `시급 ${new Intl.NumberFormat("ko-KR").format(jp.payRate)}원`
    : `일급 ${new Intl.NumberFormat("ko-KR").format(jp.payRate)}원`;

  const miniStats = [
    {
      label: "배정",
      value: `${stats.assigned}/${jp.headcount}`,
      color: "",
    },
    {
      label: "출석",
      value: `${stats.attendanceConfirmed}/${stats.assigned}`,
      color: getRateColor(stats.attendanceConfirmed, stats.assigned),
    },
    {
      label: "계약",
      value: `${stats.contractConfirmed}/${stats.assigned}`,
      color: getRateColor(stats.contractConfirmed, stats.assigned),
    },
    {
      label: "비용",
      value: formatCostShort(jp.estimatedCost),
      color: "text-emerald-400",
    },
  ];

  return (
    <div
      className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:shadow-md hover:border-border/80 ${
        jp.hasIssues ? "border-red-500/60" : ""
      } ${isExpanded ? "ring-2 ring-primary shadow-sm" : ""}`}
      onClick={onClick}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="min-w-0 flex-1 pr-2">
          <h4 className="font-semibold leading-snug">{jp.title}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {jp.startDate} ~ {jp.endDate} · {jp.location} · {jp.workStart}-{jp.workEnd}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground/70">{payLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.className}`}>
            {statusConfig.label}
          </span>
          {isExpanded ? (
            <ChevronUp size={16} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={16} className="text-muted-foreground" />
          )}
        </div>
      </div>

      {stats.assigned > 0 ? (
        <div className="grid grid-cols-4 gap-2">
          {miniStats.map((s) => (
            <div
              key={s.label}
              className="rounded-lg bg-muted/50 p-2 text-center"
            >
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
              <div className={`tabular-nums text-sm font-semibold leading-tight mt-0.5 ${s.color}`}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          배정 인원 없음
        </p>
      )}

      {jp.hasIssues && stats.assigned > 0 && (
        <p className="mt-2 text-xs text-red-400">
          ⚠ {notAttended > 0 ? `미출석 ${notAttended}명` : ""}
          {notAttended > 0 && notContracted > 0 ? " · " : ""}
          {notContracted > 0 ? `미계약 ${notContracted}명` : ""}
        </p>
      )}
    </div>
  );
}
