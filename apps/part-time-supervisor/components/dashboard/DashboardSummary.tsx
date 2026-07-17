"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring, useTransform, motion } from "motion/react";
import { Briefcase, Users, UserCheck, FileCheck, Banknote } from "lucide-react";

type Props = {
  dateLabel: string;
  isFuture?: boolean;
  summary: {
    activeJobCount: number;
    totalAssigned: number;
    attendanceCompleted: number;
    contractCompleted: number;
    totalEstimatedCost: number;
  };
};

function formatCost(cost: number): string {
  return new Intl.NumberFormat("ko-KR").format(cost);
}

function NumberTicker({
  value,
  prefix = "",
  format,
}: {
  value: number;
  prefix?: string;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 120, damping: 20, mass: 0.5 });
  const display = useTransform(spring, (v) => {
    const rounded = Math.round(v);
    const formatted = format ? format(rounded) : String(rounded);
    return `${prefix}${formatted}`;
  });

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return <motion.span ref={ref}>{display}</motion.span>;
}

export function DashboardSummary({ summary, dateLabel, isFuture }: Props) {
  const cards = [
    {
      label: isFuture ? "진행 예정 공고" : "진행 중 공고",
      value: summary.activeJobCount,
      display: String(summary.activeJobCount),
      icon: Briefcase,
      color: "text-[#111111]",
      cardClassName: "bg-[#f9f9fa]",
      valueColor: "",
      suffix: "",
      progress: null as { completed: number; total: number } | null,
      disabled: false,
    },
    {
      label: "총 배정 인원",
      value: summary.totalAssigned,
      display: String(summary.totalAssigned),
      icon: Users,
      color: "text-[#111111]",
      cardClassName: "bg-[#f9f9fa]",
      valueColor: "",
      suffix: "",
      progress: null as { completed: number; total: number } | null,
      disabled: false,
    },
    {
      label: isFuture ? "출석 예정" : "출석 완료",
      value: summary.attendanceCompleted,
      display: String(summary.attendanceCompleted),
      icon: UserCheck,
      color: "text-[#111111]",
      cardClassName: "bg-[#f9f9fa]",
      valueColor: "",
      suffix: ` / ${summary.totalAssigned}`,
      disabled: !!isFuture,
    },
    {
      label: isFuture ? "계약 예정" : "계약 완료",
      value: summary.contractCompleted,
      display: String(summary.contractCompleted),
      icon: FileCheck,
      color: "text-[#111111]",
      cardClassName: "bg-[#f9f9fa]",
      valueColor: "",
      suffix: ` / ${summary.totalAssigned}`,
      disabled: !!isFuture,
    },
    {
      label: "총 예상 비용",
      value: summary.totalEstimatedCost,
      display: `₩${formatCost(summary.totalEstimatedCost)}`,
      icon: Banknote,
      color: "text-[#111111]",
      cardClassName: "bg-[#f9f9fa]",
      valueColor: "",
      suffix: "",
      isCost: true,
      disabled: false,
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-600">
        <span className="mr-1.5 inline-block size-2 rounded-full bg-slate-500 align-middle" />
        감독관 {dateLabel} 요약 현황
      </h3>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`group rounded-xl p-4 ${card.cardClassName} ${card.disabled ? "opacity-55" : ""}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs font-medium leading-5 tracking-[-0.01em] text-slate-600">
                {card.label}
              </p>
              <div className="flex items-baseline gap-2">
                {card.disabled ? (
                  <span className="text-xs text-slate-400">진행 전입니다</span>
                ) : "isCost" in card && card.isCost ? (
                  <span className={`tabular-nums text-lg font-extrabold leading-tight tracking-[-0.02em] text-slate-900 ${card.valueColor}`}>
                    <NumberTicker value={card.value} prefix="₩" format={(n) => formatCost(n)} />
                  </span>
                ) : (
                  <>
                    <span className={`tabular-nums text-2xl font-extrabold leading-none tracking-[-0.03em] text-slate-900 ${card.valueColor}`}>
                      <NumberTicker value={card.value} />
                    </span>
                    {card.suffix && (
                      <span className="text-sm leading-5 tracking-[-0.01em] text-slate-500">{card.suffix}</span>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className={`flex size-11 shrink-0 items-center justify-center ${card.color || "text-slate-600"}`}>
              <card.icon size={18} />
            </div>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}
