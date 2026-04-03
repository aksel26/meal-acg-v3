"use client";

import { useMemo } from "react";
import type { DayoffRecord } from "./types";

interface DayoffsSummaryProps {
  records: DayoffRecord[];
}

export default function DayoffsSummary({ records }: DayoffsSummaryProps) {
  const stats = useMemo(() => {
    const approved = records.filter((r) => !!r.approver_id).length;
    return {
      total: records.length,
      approved,
      pending: records.length - approved,
    };
  }, [records]);

  const items = [
    { label: "전체", value: `${stats.total}건` },
    { label: "승인", value: `${stats.approved}건` },
    { label: "대기", value: `${stats.pending}건` },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(({ label, value }) => (
        <div key={label} className="card-premium rounded-xl p-3 text-center">
          <p className="text-xs text-[oklch(0.55_0.01_250)] mb-0.5">{label}</p>
          <p className="text-base font-semibold text-[oklch(0.25_0.02_250)]">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
