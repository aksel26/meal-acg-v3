"use client";

import { useMemo } from "react";
import { DateRangePicker } from "@repo/ui/src/date-range-picker";
import { Button } from "@repo/ui/src/button";
import dayjs from "dayjs";

type Props = {
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
};

export function DashboardControls({ startDate, endDate, onChange }: Props) {
  const today = dayjs().format("YYYY-MM-DD");

  const presets = useMemo(() => {
    const day = dayjs().day();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = dayjs().add(diffToMonday, "day").format("YYYY-MM-DD");
    const sunday = dayjs().add(diffToMonday + 6, "day").format("YYYY-MM-DD");
    const monthFirst = dayjs().startOf("month").format("YYYY-MM-DD");
    const monthLast = dayjs().endOf("month").format("YYYY-MM-DD");

    return [
      { label: "오늘", start: today, end: today },
      { label: "이번 주", start: monday, end: sunday },
      { label: "이번 달", start: monthFirst, end: monthLast },
    ];
  }, [today]);

  const activePreset = presets.find(
    (p) => p.start === startDate && p.end === endDate
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onChange={onChange}
        className="w-auto"
      />
      <div className="flex gap-1.5">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant={activePreset?.label === preset.label ? "default" : "outline"}
            size="sm"
            onClick={() => onChange({ startDate: preset.start, endDate: preset.end })}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
