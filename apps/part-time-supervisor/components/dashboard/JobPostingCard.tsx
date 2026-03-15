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

function getStatusLabel(status: string) {
  switch (status) {
    case "open":
      return "모집중";
    case "in_progress":
      return "진행중";
    default:
      return status;
  }
}

export function JobPostingCard({ jobPosting: jp, isExpanded, onClick }: Props) {
  const { stats } = jp;
  const notAttended =
    stats.assigned - stats.attendanceCheckedIn - stats.attendanceConfirmed;
  const notContracted =
    stats.assigned - stats.contractSigned - stats.contractConfirmed;

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
  ];

  return (
    <div
      className={`cursor-pointer rounded-xl border p-4 transition-colors hover:bg-accent/50 ${
        jp.hasIssues ? "border-red-500" : ""
      } ${isExpanded ? "ring-2 ring-primary" : ""}`}
      onClick={onClick}
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h4 className="font-semibold">{jp.title}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {jp.startDate} ~ {jp.endDate} · {jp.location} · {jp.workStart}-
            {jp.workEnd}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
            {getStatusLabel(jp.status)}
          </span>
          {isExpanded ? (
            <ChevronUp size={16} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={16} className="text-muted-foreground" />
          )}
        </div>
      </div>

      {stats.assigned > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {miniStats.map((s) => (
            <div
              key={s.label}
              className="rounded-lg bg-muted/50 p-2 text-center"
            >
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
              <div className={`text-lg font-semibold ${s.color}`}>
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
