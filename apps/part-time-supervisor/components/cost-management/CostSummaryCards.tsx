"use client";

import { formatCurrency } from "@/lib/cost-utils";

type Props = {
  totalAmount: number;
  totalWorkers: number;
  totalWorkHours: number;
};

const cards = [
  { key: "amount", label: "총 산정 금액" },
  { key: "workers", label: "총 근무 인원" },
  { key: "hours", label: "총 근무 시간" },
] as const;

export function CostSummaryCards({ totalAmount, totalWorkers, totalWorkHours }: Props) {
  const values = {
    amount: formatCurrency(totalAmount),
    workers: `${totalWorkers}명`,
    hours: `${totalWorkHours}h`,
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card) => (
        <div key={card.key} className="rounded-md bg-white p-5">
          <p className="text-sm text-slate-500">{card.label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {values[card.key]}
          </p>
        </div>
      ))}
    </div>
  );
}
