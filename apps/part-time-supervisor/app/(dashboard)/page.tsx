"use client";

import { useState } from "react";
import dayjs from "dayjs";
import { useDashboard } from "@/hooks/use-dashboard";
import { DashboardControls } from "@/components/dashboard/DashboardControls";
import { DashboardSummary } from "@/components/dashboard/DashboardSummary";
import { JobPostingGrid } from "@/components/dashboard/JobPostingGrid";

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-muted" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-16 rounded bg-muted" />
                <div className="h-6 w-12 rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="space-y-1.5">
                    <div className="h-5 w-40 rounded bg-muted" />
                    <div className="h-3 w-56 rounded bg-muted" />
                  </div>
                  <div className="h-5 w-14 rounded-full bg-muted" />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="rounded-lg bg-muted/50 p-2 h-12" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const today = dayjs().format("YYYY-MM-DD");
  const [dateRange, setDateRange] = useState({ startDate: today, endDate: today });

  const { data, isLoading } = useDashboard(dateRange.startDate, dateRange.endDate);

  const dateLabel = dateRange.startDate === dateRange.endDate
    ? dayjs(dateRange.startDate).format("M월 D일 (ddd)")
    : `${dayjs(dateRange.startDate).format("M/D")} ~ ${dayjs(dateRange.endDate).format("M/D")}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">대시보드</h1>
          <p className="text-sm text-muted-foreground">{dateLabel} 기준 현황</p>
        </div>
        <DashboardControls
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onChange={setDateRange}
        />
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : data ? (
        <>
          <DashboardSummary summary={data.summary} />
          <JobPostingGrid jobPostings={data.jobPostings} />
        </>
      ) : null}
    </div>
  );
}
