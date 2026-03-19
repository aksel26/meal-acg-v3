"use client";

import { Calculator, Users, Clock, CalendarDays } from "lucide-react";
import { formatCurrency } from "@/lib/cost-utils";

type Props = {
  totalAmount: number;
  totalWorkers: number;
  totalWorkHours: number;
  totalWorkDays: number;
};

const cards = [
  { key: "amount", label: "총 산정 금액", icon: Calculator, color: "text-emerald-600" },
  { key: "workers", label: "총 근무 인원", icon: Users, color: "text-blue-600" },
  { key: "hours", label: "총 근무 시간", icon: Clock, color: "text-amber-600" },
  { key: "days", label: "총 근무 일수", icon: CalendarDays, color: "text-purple-600" },
] as const;

export function CostSummaryCards({ totalAmount, totalWorkers, totalWorkHours, totalWorkDays }: Props) {
  const values = {
    amount: formatCurrency(totalAmount),
    workers: `${totalWorkers}명`,
    hours: `${totalWorkHours}h`,
    days: `${totalWorkDays}일`,
  };

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.key} className="rounded-xl border bg-white p-5">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Icon size={16} className={card.color} />
              {card.label}
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {values[card.key]}
            </p>
          </div>
        );
      })}
    </div>
  );
}
