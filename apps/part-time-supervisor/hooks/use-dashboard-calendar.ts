"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

export type CalendarJobPosting = {
  id: string;
  title: string;
  platform: string | null;
  startDate: string;
  endDate: string;
  status: string;
};

type CalendarResponse = {
  jobPostings: CalendarJobPosting[];
};

export type DayJobLabel = {
  id: string;
  title: string;
  platform: string | null;
};

export function useDashboardCalendar(year: number, month: number) {
  const { data, isLoading } = useQuery<CalendarResponse>({
    queryKey: ["dashboard", "calendar", year, month],
    queryFn: async () => {
      const res = await fetch(
        `/api/dashboard/calendar?year=${year}&month=${month}`
      );
      if (!res.ok) throw new Error("Failed to fetch calendar data");
      return res.json();
    },
  });

  const dayMap = useMemo(() => {
    const map = new Map<string, DayJobLabel[]>();
    if (!data?.jobPostings) return map;

    const sorted = [...data.jobPostings].sort(
      (a, b) => a.startDate.localeCompare(b.startDate)
    );

    for (const jp of sorted) {
      const start = new Date(jp.startDate);
      const end = new Date(jp.endDate);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);

      const from = start < monthStart ? monthStart : start;
      const to = end > monthEnd ? monthEnd : end;

      const current = new Date(from);
      while (current <= to) {
        const key = current.toISOString().slice(0, 10);
        const existing = map.get(key) ?? [];
        existing.push({
          id: jp.id,
          title: jp.title,
          platform: jp.platform,
        });
        map.set(key, existing);
        current.setDate(current.getDate() + 1);
      }
    }

    return map;
  }, [data, year, month]);

  return { jobPostings: data?.jobPostings ?? [], dayMap, isLoading };
}
