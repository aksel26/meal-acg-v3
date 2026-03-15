"use client";

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

  const presets = [
    {
      label: "오늘",
      onClick: () => onChange({ startDate: today, endDate: today }),
    },
    {
      label: "이번 주",
      onClick: () => {
        const day = dayjs().day();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const monday = dayjs().add(diffToMonday, "day").format("YYYY-MM-DD");
        const sunday = dayjs().add(diffToMonday + 6, "day").format("YYYY-MM-DD");
        onChange({ startDate: monday, endDate: sunday });
      },
    },
    {
      label: "이번 달",
      onClick: () => {
        const first = dayjs().startOf("month").format("YYYY-MM-DD");
        const last = dayjs().endOf("month").format("YYYY-MM-DD");
        onChange({ startDate: first, endDate: last });
      },
    },
  ];

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
            variant="outline"
            size="sm"
            onClick={preset.onClick}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
