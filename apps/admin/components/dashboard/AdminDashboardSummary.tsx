"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring, useTransform, motion } from "motion/react";
import {
  Users,
  UserCheck,
  UserX,
  ClipboardCheck,
  Banknote,
} from "lucide-react";

type Props = {
  totalMembers: number;
  checkedIn: number;
  notCheckedIn: number;
  onLeave: number;
  pendingApprovals: number;
  usageRate: number;
};

function NumberTicker({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    stiffness: 120,
    damping: 20,
    mass: 0.5,
  });
  const display = useTransform(spring, (v) => String(Math.round(v)));

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return <motion.span ref={ref}>{display}</motion.span>;
}

export function AdminDashboardSummary({
  totalMembers,
  checkedIn,
  notCheckedIn,
  onLeave,
  pendingApprovals,
  usageRate,
}: Props) {
  const cards = [
    {
      label: "총 인원",
      value: totalMembers,
      icon: Users,
      cardClassName: "bg-[#eef5fe]",
      suffix: "",
    },
    {
      label: "출근",
      value: checkedIn,
      icon: UserCheck,
      cardClassName: "bg-[#eaf7ee]",
      suffix: "",
    },
    {
      label: "미출근 / 휴가",
      value: notCheckedIn + onLeave,
      icon: UserX,
      cardClassName: "bg-[#f9f9fa]",
      suffix: "",
      detail: onLeave > 0 ? `휴가 ${onLeave}` : undefined,
    },
    {
      label: "승인 대기",
      value: pendingApprovals,
      icon: ClipboardCheck,
      cardClassName: "bg-[#f9f9fa]",
      suffix: "건",
    },
    {
      label: "식대 사용률",
      value: usageRate,
      icon: Banknote,
      cardClassName: "bg-[#eef5fe]",
      suffix: "%",
      isPercent: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl p-4 ${card.cardClassName}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs font-medium leading-5 tracking-[-0.01em] text-slate-600">
                {card.label}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="tabular-nums text-2xl font-extrabold leading-none tracking-[-0.03em] text-slate-900">
                  <NumberTicker value={card.value} />
                </span>
                {card.suffix && (
                  <span className="text-sm leading-5 tracking-[-0.01em] text-slate-500">
                    {card.suffix}
                  </span>
                )}
              </div>
              {"detail" in card && card.detail && (
                <p className="mt-1 text-[11px] text-slate-400">{card.detail}</p>
              )}
            </div>
            <div className="flex size-11 shrink-0 items-center justify-center text-[#111111]">
              <card.icon size={18} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
