"use client";

import { Calendar } from "@repo/ui/src/calendar";
import type { ScheduleItem } from "@/hooks/useCareersApi";

export interface DerivedScheduleItem extends ScheduleItem {
  bucket?: "upcoming" | "overdue" | "completed";
  date?: string;
  time?: string;
  phone?: string;
  email?: string;
  region?: string;
  field?: string;
}

export function localDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function scheduleDate(item: DerivedScheduleItem) {
  return item.date || (item.startsAt ? localDateKey(item.startsAt) : "");
}

export function scheduleTime(item: DerivedScheduleItem) {
  if (item.time) return item.time;
  if (!item.startsAt || Number.isNaN(new Date(item.startsAt).getTime()))
    return "";
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(item.startsAt));
}

export function ScheduleCalendar({
  schedules,
  selected,
  onSelect,
}: {
  schedules: DerivedScheduleItem[];
  selected?: Date;
  onSelect: (date?: Date) => void;
}) {
  const dates = new Set(schedules.map(scheduleDate).filter(Boolean));

  return (
    <Calendar
      mode="single"
      selected={selected}
      onSelect={onSelect}
      className="mx-auto p-2"
      modifiers={{
        hasSchedule: (date) => dates.has(localDateKey(date)),
      }}
      modifiersClassNames={{
        hasSchedule:
          "font-semibold text-blue-700 after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-blue-500",
      }}
    />
  );
}
