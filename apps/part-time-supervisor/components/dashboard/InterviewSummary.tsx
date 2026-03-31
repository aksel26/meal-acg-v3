"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring, useTransform, motion } from "motion/react";
import { Briefcase, Users, UserCheck, Banknote, FileCheck } from "lucide-react";

type Props = {
  interview: {
    activeJobCount: number;
    totalAssigned: number;
    activePersonnel: number;
    monthlyLaborCost: number;
    expenseReportStatus: string | null;
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

export function InterviewSummary({ interview }: Props) {
  const cards = [
    {
      label: "진행 중 공고",
      value: interview.activeJobCount,
      icon: Briefcase,
      isCost: false,
      iconClassName: "text-[#111111]",
      cardClassName: "bg-[#eef5fe]",
    },
    {
      label: "총 배정 인원",
      value: interview.totalAssigned,
      icon: Users,
      isCost: false,
      iconClassName: "text-[#111111]",
      cardClassName: "bg-[#f9f9fa]",
    },
    {
      label: "활동 인력",
      value: interview.activePersonnel,
      icon: UserCheck,
      isCost: false,
      iconClassName: "text-[#111111]",
      cardClassName: "bg-[#eaf7ee]",
    },
    {
      label: "이번달 인건비",
      value: interview.monthlyLaborCost,
      icon: Banknote,
      isCost: true,
      iconClassName: "text-[#111111]",
      cardClassName: "bg-[#f9f9fa]",
    },
    {
      label: "지출결의 상태",
      value: 0,
      icon: FileCheck,
      isCost: false,
      isStatus: true,
      statusValue: interview.expenseReportStatus,
      iconClassName: "text-[#111111]",
      cardClassName: "bg-[#f9f9fa]",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-xl p-4 ${card.cardClassName}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs font-medium leading-5 tracking-[-0.01em] text-slate-600">
                {card.label}
              </p>
              <div className="flex items-baseline gap-2">
                {"isStatus" in card && card.isStatus ? (
                  <span className="text-lg font-extrabold tracking-[-0.02em]">
                    {card.statusValue === "finalized" ? (
                      <span className="text-green-600">확정</span>
                    ) : card.statusValue === "draft" ? (
                      <span className="text-amber-600">작성중</span>
                    ) : (
                      <span className="text-slate-500">미작성</span>
                    )}
                  </span>
                ) : card.isCost ? (
                  <span className="tabular-nums text-lg font-extrabold leading-tight tracking-[-0.02em] text-slate-900">
                    <NumberTicker value={card.value} prefix="₩" format={formatCost} />
                  </span>
                ) : (
                  <span className="tabular-nums text-2xl font-extrabold leading-none tracking-[-0.03em] text-slate-900">
                    <NumberTicker value={card.value} />
                  </span>
                )}
              </div>
            </div>
            <div className={`flex size-11 shrink-0 items-center justify-center ${card.iconClassName}`}>
              <card.icon size={18} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
