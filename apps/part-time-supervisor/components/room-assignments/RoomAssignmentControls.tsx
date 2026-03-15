"use client";

import { DatePicker } from "@repo/ui/src/date-picker";
import type { JobPosting } from "@/lib/supabase/types";
import { CalendarDays, Clock } from "lucide-react";

type Props = {
  date: string;
  onDateChange: (date: string) => void;
  jobPostings: JobPosting[];
  selectedJobPostingId: string | null;
  onJobPostingChange: (id: string | null) => void;
  startHour: number;
  endHour: number;
  onStartHourChange: (hour: number) => void;
  onEndHourChange: (hour: number) => void;
};

export default function RoomAssignmentControls({
  date,
  onDateChange,
  jobPostings,
  selectedJobPostingId,
  onJobPostingChange,
  startHour,
  endHour,
  onStartHourChange,
  onEndHourChange,
}: Props) {
  const hourOptions = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex flex-wrap items-end gap-5 rounded-xl border bg-white p-4">
      <div>
        <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-500">
          <CalendarDays size={12} />
          날짜
        </label>
        <DatePicker
          value={date}
          onChange={onDateChange}
          className="w-[180px]"
        />
      </div>

      <div className="min-w-[180px]">
        <label className="mb-1.5 block text-xs font-medium text-slate-500">
          공고
        </label>
        <select
          value={selectedJobPostingId || ""}
          onChange={(e) => onJobPostingChange(e.target.value || null)}
          className="h-9 w-full rounded-lg border bg-white px-3 text-sm"
        >
          <option value="">전체 공고</option>
          {jobPostings.map((jp) => (
            <option key={jp.id} value={jp.id}>
              {jp.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-500">
          <Clock size={12} />
          표시 범위
        </label>
        <div className="flex items-center gap-1.5">
          <select
            value={startHour}
            onChange={(e) => onStartHourChange(Number(e.target.value))}
            className="h-9 rounded-lg border bg-white px-2 text-sm tabular-nums"
          >
            {hourOptions.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
          <span className="text-sm text-slate-300">—</span>
          <select
            value={endHour}
            onChange={(e) => onEndHourChange(Number(e.target.value))}
            className="h-9 rounded-lg border bg-white px-2 text-sm tabular-nums"
          >
            {hourOptions.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
