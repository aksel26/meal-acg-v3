"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring, useTransform, motion } from "motion/react";

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
      suffix: "",
    },
    {
      label: "출근",
      value: checkedIn,
      suffix: "",
    },
    {
      label: "미출근 / 휴가",
      value: notCheckedIn + onLeave,
      suffix: "",
      detail: onLeave > 0 ? `휴가 ${onLeave}` : undefined,
    },
    {
      label: "승인 대기",
      value: pendingApprovals,
      suffix: "건",
    },
    {
      label: "식대 사용률",
      value: usageRate,
      suffix: "%",
      isPercent: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="admin-pressable rounded-xl bg-white p-5 transition-colors hover:bg-slate-50"
        >
          <div className="min-w-0">
            <p className="mb-1 text-sm font-normal leading-5 tracking-[-0.01em] text-[#7a7a7a]">
              {card.label}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="tabular-nums text-[34px] font-semibold leading-none tracking-[-0.02em] text-[#1d1d1f]">
                <NumberTicker value={card.value} />
              </span>
              {card.suffix && (
                <span className="text-sm leading-5 tracking-[-0.01em] text-[#7a7a7a]">
                  {card.suffix}
                </span>
              )}
            </div>
            {"detail" in card && card.detail && (
              <p className="mt-1 text-xs text-[#7a7a7a]">{card.detail}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
