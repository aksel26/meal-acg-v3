"use client";

import type { LucideIcon } from "lucide-react";

type Props = {
  step: number;
  title: string;
  icon: LucideIcon;
  badge?: string | number;
  isActive: boolean;
  children: React.ReactNode;
};

export default function FlowNode({
  step,
  title,
  icon: Icon,
  badge,
  isActive,
  children,
}: Props) {
  return (
    <div
      className={`rounded-xl border bg-white transition-all ${
        isActive
          ? "border-indigo-300 shadow-sm"
          : "border-slate-200"
      }`}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${
            isActive ? "bg-indigo-500" : "bg-slate-300"
          }`}
        >
          {step}
        </span>
        <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="text-sm font-semibold text-slate-700">{title}</span>
        {badge !== undefined && (
          <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {badge}
          </span>
        )}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
