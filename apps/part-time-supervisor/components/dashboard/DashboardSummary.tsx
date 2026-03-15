import { Briefcase, Users, UserCheck, FileCheck, Banknote } from "lucide-react";

type Props = {
  summary: {
    activeJobCount: number;
    totalAssigned: number;
    attendanceCompleted: number;
    contractCompleted: number;
    totalEstimatedCost: number;
  };
};

function getRate(completed: number, total: number): number {
  if (total === 0) return 0;
  return completed / total;
}

function getRateColor(completed: number, total: number): string {
  if (total === 0) return "";
  const rate = completed / total;
  if (rate >= 0.8) return "text-green-400";
  if (rate >= 0.5) return "text-yellow-400";
  return "text-red-400";
}

function getBarColor(completed: number, total: number): string {
  if (total === 0) return "bg-slate-200";
  const rate = completed / total;
  if (rate >= 0.8) return "bg-green-400";
  if (rate >= 0.5) return "bg-yellow-400";
  return "bg-red-400";
}

function formatCost(cost: number): string {
  return new Intl.NumberFormat("ko-KR").format(cost);
}

export function DashboardSummary({ summary }: Props) {
  const cards = [
    {
      label: "진행 중 공고",
      value: summary.activeJobCount,
      display: String(summary.activeJobCount),
      icon: Briefcase,
      color: "bg-blue-500/10 text-blue-400",
      valueColor: "",
      suffix: "",
      progress: null as { completed: number; total: number } | null,
    },
    {
      label: "총 배정 인원",
      value: summary.totalAssigned,
      display: String(summary.totalAssigned),
      icon: Users,
      color: "bg-slate-500/10 text-slate-400",
      valueColor: "",
      suffix: "",
      progress: null as { completed: number; total: number } | null,
    },
    {
      label: "출석 완료",
      value: summary.attendanceCompleted,
      display: String(summary.attendanceCompleted),
      icon: UserCheck,
      color: "bg-green-500/10 text-green-400",
      valueColor: getRateColor(summary.attendanceCompleted, summary.totalAssigned),
      suffix: ` / ${summary.totalAssigned}`,
      progress: { completed: summary.attendanceCompleted, total: summary.totalAssigned },
    },
    {
      label: "계약 완료",
      value: summary.contractCompleted,
      display: String(summary.contractCompleted),
      icon: FileCheck,
      color: "bg-blue-500/10 text-blue-400",
      valueColor: getRateColor(summary.contractCompleted, summary.totalAssigned),
      suffix: ` / ${summary.totalAssigned}`,
      progress: { completed: summary.contractCompleted, total: summary.totalAssigned },
    },
    {
      label: "총 예상 비용",
      value: summary.totalEstimatedCost,
      display: `₩${formatCost(summary.totalEstimatedCost)}`,
      icon: Banknote,
      color: "bg-emerald-500/10 text-emerald-400",
      valueColor: "text-emerald-400",
      suffix: "",
      progress: null,
      isCost: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="group rounded-xl border p-4 transition-all duration-200 hover:border-border/80 hover:shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <div className={`rounded-lg p-2 ${card.color}`}>
              <card.icon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <div className="flex items-baseline gap-1">
                {"isCost" in card && card.isCost ? (
                  <span className={`tabular-nums text-lg font-bold leading-tight ${card.valueColor}`}>
                    {card.display}
                  </span>
                ) : (
                  <>
                    <span className={`tabular-nums text-2xl font-bold ${card.valueColor}`}>
                      {card.display}
                    </span>
                    {card.suffix && (
                      <span className="text-sm text-muted-foreground">{card.suffix}</span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          {card.progress && (
            <div className="mt-2.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${getBarColor(card.progress.completed, card.progress.total)}`}
                  style={{ width: `${Math.round(getRate(card.progress.completed, card.progress.total) * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-right text-[10px] text-muted-foreground">
                {card.progress.total > 0
                  ? `${Math.round(getRate(card.progress.completed, card.progress.total) * 100)}%`
                  : "-"}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
