"use client";

import { useMemo } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar, CalendarDayButton } from "@repo/ui/src/calendar";
import { ko } from "date-fns/locale";
import FlowNode from "./FlowNode";
import type { JobPosting } from "@/lib/supabase/types";
import dayjs from "dayjs";

type Props = {
  date: string;
  onDateChange: (date: string) => void;
  jobPostings: JobPosting[];
  jobPostingDates: Set<string>;
  selectedJobPostingId: string | null;
  onJobPostingSelect: (id: string | null) => void;
};

export default function DateJobPostingNode({
  date,
  onDateChange,
  jobPostings,
  jobPostingDates,
  selectedJobPostingId,
  onJobPostingSelect,
}: Props) {
  const selectedDate = dayjs(date).toDate();

  const handleDateSelect = (day: Date | undefined) => {
    if (day) {
      onDateChange(dayjs(day).format("YYYY-MM-DD"));
    }
  };

  const badge = dayjs(date).format("M/D");

  const DayButtonWithDot = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function DotDay(props: any) {
      const dateStr = dayjs(props.day.date).format("YYYY-MM-DD");
      const hasDot = jobPostingDates.has(dateStr);
      return (
        <div className="relative w-full">
          <CalendarDayButton {...props} />
          {hasDot && (
            <span className="absolute top-0.5 right-0.5 h-1 w-1 rounded-full bg-indigo-500" />
          )}
        </div>
      );
    };
  }, [jobPostingDates]);

  return (
    <FlowNode
      step={1}
      title="날짜 / 공고"
      icon={CalendarIcon}
      badge={badge}
      isActive
    >
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={handleDateSelect}
        locale={ko}
        className="w-full"
        components={{
          DayButton: DayButtonWithDot,
        }}
      />

      <div className="mt-3 border-t pt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">공고 선택</span>
          <span className="text-xs text-slate-400">
            {jobPostings.length}건
          </span>
        </div>
        <div className="max-h-[200px] space-y-1 overflow-y-auto">
          {jobPostings.map((jp) => {
            const isSelected = selectedJobPostingId === jp.id;
            return (
              <button
                key={jp.id}
                onClick={() => onJobPostingSelect(jp.id)}
                className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                  isSelected
                    ? "bg-indigo-50"
                    : "hover:bg-slate-50"
                }`}
              >
                <div
                  className={`text-sm font-medium ${isSelected ? "text-indigo-700" : "text-slate-700"}`}
                >
                  {jp.title}
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  {dayjs(jp.start_date).format("M/D")} ~{" "}
                  {dayjs(jp.end_date).format("M/D")}
                </div>
              </button>
            );
          })}
          {jobPostings.length === 0 && (
            <div className="py-4 text-center text-xs text-slate-400">
              공고가 없습니다
            </div>
          )}
        </div>
      </div>
    </FlowNode>
  );
}
