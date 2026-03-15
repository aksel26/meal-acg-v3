import { Briefcase, Users, UserCheck, FileCheck } from "lucide-react";

type Props = {
  summary: {
    activeJobCount: number;
    totalAssigned: number;
    attendanceCompleted: number;
    contractCompleted: number;
  };
};

function getRateColor(completed: number, total: number): string {
  if (total === 0) return "";
  const rate = completed / total;
  if (rate >= 0.8) return "text-green-400";
  if (rate >= 0.5) return "text-yellow-400";
  return "text-red-400";
}

export function DashboardSummary({ summary }: Props) {
  const cards = [
    {
      label: "진행 중 공고",
      value: summary.activeJobCount,
      icon: Briefcase,
      color: "bg-blue-500/10 text-blue-400",
      valueColor: "",
      suffix: "",
    },
    {
      label: "총 배정 인원",
      value: summary.totalAssigned,
      icon: Users,
      color: "bg-slate-500/10 text-slate-400",
      valueColor: "",
      suffix: "",
    },
    {
      label: "출석 완료",
      value: summary.attendanceCompleted,
      icon: UserCheck,
      color: "bg-green-500/10 text-green-400",
      valueColor: getRateColor(summary.attendanceCompleted, summary.totalAssigned),
      suffix: ` / ${summary.totalAssigned}`,
    },
    {
      label: "계약 완료",
      value: summary.contractCompleted,
      icon: FileCheck,
      color: "bg-blue-500/10 text-blue-400",
      valueColor: getRateColor(summary.contractCompleted, summary.totalAssigned),
      suffix: ` / ${summary.totalAssigned}`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border p-4">
          <div className="flex items-center gap-2.5">
            <div className={`rounded-lg p-2 ${card.color}`}>
              <card.icon size={18} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${card.valueColor}`}>
                  {card.value}
                </span>
                {card.suffix && (
                  <span className="text-sm text-muted-foreground">{card.suffix}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
