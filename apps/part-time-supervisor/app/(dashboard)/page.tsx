"use client";

import { useState } from "react";
import dayjs from "dayjs";
import { useDashboard } from "@/hooks/use-dashboard";
import { DashboardControls } from "@/components/dashboard/DashboardControls";
import { DashboardSummary } from "@/components/dashboard/DashboardSummary";
import { JobPostingGrid } from "@/components/dashboard/JobPostingGrid";

export default function DashboardPage() {
  const today = dayjs().format("YYYY-MM-DD");
  const [dateRange, setDateRange] = useState({ startDate: today, endDate: today });

  const { data, isLoading } = useDashboard(dateRange.startDate, dateRange.endDate);

  return (
    <div className="space-y-6">
      <DashboardControls
        startDate={dateRange.startDate}
        endDate={dateRange.endDate}
        onChange={setDateRange}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          로딩 중...
        </div>
      ) : data ? (
        <>
          <DashboardSummary summary={data.summary} />
          <JobPostingGrid jobPostings={data.jobPostings} />
        </>
      ) : null}
    </div>
  );
}
