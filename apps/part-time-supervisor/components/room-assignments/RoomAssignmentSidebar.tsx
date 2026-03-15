"use client";

import { Calendar } from "@repo/ui/src/calendar";
import type { JobPosting } from "@/lib/supabase/types";
import dayjs from "dayjs";

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

const hourOptions = Array.from({ length: 24 }, (_, i) => i);

export default function RoomAssignmentSidebar({
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
  const selectedDate = dayjs(date).toDate();

  const handleDateSelect = (day: Date | undefined) => {
    if (day) {
      onDateChange(dayjs(day).format("YYYY-MM-DD"));
    }
  };

  return (
    <aside className="w-[280px] shrink-0 space-y-4">
      {/* 달력 */}
      <div className="rounded-xl border bg-white p-1">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
        />
      </div>

      {/* 공고 선택 */}
      <div className="rounded-xl border bg-white p-4 space-y-2">
        <label className="block text-xs font-medium text-slate-500">
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

      {/* 표시 범위 */}
      <div className="rounded-xl border bg-white p-4 space-y-2">
        <label className="block text-xs font-medium text-slate-500">
          표시 범위
        </label>
        <div className="flex items-center gap-1.5">
          <select
            value={startHour}
            onChange={(e) => onStartHourChange(Number(e.target.value))}
            className="h-9 flex-1 rounded-lg border bg-white px-2 text-sm tabular-nums"
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
            className="h-9 flex-1 rounded-lg border bg-white px-2 text-sm tabular-nums"
          >
            {hourOptions.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </div>
      </div>
    </aside>
  );
}
