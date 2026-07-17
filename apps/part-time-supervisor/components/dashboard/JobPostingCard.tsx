import type { DashboardSupervisorJobPosting } from "@/hooks/use-dashboard";
import { ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  jobPosting: DashboardSupervisorJobPosting;
  isExpanded: boolean;
  onClick: () => void;
};

function getRateColor(total: number): string {
  if (total === 0) return "text-muted-foreground";
  return "text-slate-600";
}

function getBarColor(total: number): string {
  if (total === 0) return "bg-muted";
  return "bg-slate-400";
}

function getStatusConfig(status: string): { label: string; className: string } {
  switch (status) {
    case "open":
      return { label: "모집중", className: "bg-slate-100 text-slate-600" };
    case "in_progress":
      return { label: "진행중", className: "bg-slate-200 text-slate-800" };
    default:
      return { label: status, className: "bg-slate-500/10 text-slate-400" };
  }
}

function formatCostShort(cost: number): string {
  const man = Math.floor(cost / 10000);
  if (man > 0) return `${new Intl.NumberFormat("ko-KR").format(man)}만`;
  return `${new Intl.NumberFormat("ko-KR").format(cost)}원`;
}

export function JobPostingCard({ jobPosting: jp, isExpanded, onClick }: Props) {
  const { stats } = jp;
  const notAttended = stats.assigned - stats.attendanceCheckedIn - stats.attendanceConfirmed;
  const notContracted = stats.assigned - stats.contractSigned - stats.contractConfirmed;
  const statusConfig = getStatusConfig(jp.status);

  const overallRate = stats.assigned > 0
    ? (stats.attendanceConfirmed + stats.contractConfirmed) / (stats.assigned * 2)
    : 0;

  const payLabel = jp.payType === "hourly"
    ? `시급 ${new Intl.NumberFormat("ko-KR").format(jp.payRate)}원`
    : `일급 ${new Intl.NumberFormat("ko-KR").format(jp.payRate)}원`;

  const miniStats = [
    { label: "배정", value: `${stats.assigned}/${jp.headcount}`, color: "" },
    { label: "출석", value: `${stats.attendanceConfirmed}/${stats.assigned}`, color: getRateColor(stats.assigned) },
    { label: "계약", value: `${stats.contractConfirmed}/${stats.assigned}`, color: getRateColor(stats.assigned) },
    { label: "비용", value: formatCostShort(jp.estimatedCost), color: "text-slate-600" },
  ];

  return (
    <div
      className={`group relative cursor-pointer overflow-hidden rounded-xl border transition-all duration-200 hover:shadow-md ${
        jp.hasIssues ? "border-slate-300 hover:border-slate-400" : "hover:border-border/80"
      } ${isExpanded ? "border-primary shadow-sm" : ""}`}
      onClick={onClick}
    >
      {/* 상단 진행률 바 */}
      {stats.assigned > 0 && (
        <div className="h-1 w-full bg-muted/50">
          <div
            className={`h-full transition-all duration-500 ${getBarColor(
              stats.assigned * 2
            )}`}
            style={{ width: `${Math.round(overallRate * 100)}%` }}
          />
        </div>
      )}

      <div className="p-4">
        <div className="mb-3 flex items-start justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <h4 className="font-semibold leading-snug">{jp.title}</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {jp.startDate} ~ {jp.endDate} · {jp.location} · {jp.workStart}-{jp.workEnd}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground/60">{payLabel}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusConfig.className}`}>
              {statusConfig.label}
            </span>
            <div className="text-muted-foreground transition-transform duration-200 group-hover:text-foreground/70">
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
        </div>

        {stats.assigned > 0 ? (
          <div className="grid grid-cols-4 gap-1.5">
            {miniStats.map((s) => (
              <div key={s.label} className="rounded-lg bg-muted/40 px-2 py-1.5 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                <div className={`tabular-nums text-sm font-semibold leading-tight mt-0.5 ${s.color}`}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-muted/30 py-3 text-center text-sm text-muted-foreground">
            배정 인원 없음
          </div>
        )}

        {jp.hasIssues && stats.assigned > 0 && (
          <div className="mt-2 flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1">
            <span className="text-xs text-slate-500">
              ⚠ {notAttended > 0 ? `미출석 ${notAttended}명` : ""}
              {notAttended > 0 && notContracted > 0 ? " · " : ""}
              {notContracted > 0 ? `미계약 ${notContracted}명` : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
