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
    },
    {
      label: "총 배정 인원",
      value: interview.totalAssigned,
      icon: Users,
      isCost: false,
    },
    {
      label: "활동 인력",
      value: interview.activePersonnel,
      icon: UserCheck,
      isCost: false,
    },
    {
      label: "이번달 인건비",
      value: interview.monthlyLaborCost,
      icon: Banknote,
      isCost: true,
    },
    {
      label: "지출결의 상태",
      value: 0,
      icon: FileCheck,
      isCost: false,
      isStatus: true,
      statusValue: interview.expenseReportStatus,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl bg-white p-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
            <div className="flex items-baseline gap-2">
              {"isStatus" in card && card.isStatus ? (
                <span className="text-lg font-bold">
                  {card.statusValue === "finalized" ? (
                    <span className="text-green-600">확정</span>
                  ) : card.statusValue === "draft" ? (
                    <span className="text-amber-600">작성중</span>
                  ) : (
                    <span className="text-muted-foreground">미작성</span>
                  )}
                </span>
              ) : card.isCost ? (
                <span className="tabular-nums text-lg font-bold leading-tight">
                  <NumberTicker value={card.value} prefix="₩" format={formatCost} />
                </span>
              ) : (
                <span className="tabular-nums text-2xl font-bold">
                  <NumberTicker value={card.value} />
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
