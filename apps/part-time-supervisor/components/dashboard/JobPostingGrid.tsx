"use client";

import { useState } from "react";
import { CalendarX } from "lucide-react";
import type { DashboardSupervisorJobPosting } from "@/hooks/use-dashboard";
import { JobPostingCard } from "./JobPostingCard";
import { JobPostingDetail } from "./JobPostingDetail";

type Props = {
  jobPostings: DashboardSupervisorJobPosting[];
};

export function JobPostingGrid({ jobPostings }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (jobPostings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16">
        <CalendarX size={40} className="text-muted-foreground/40" />
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">선택한 기간에 해당하는 공고가 없습니다</p>
          <p className="mt-0.5 text-xs text-muted-foreground/60">다른 날짜를 선택하거나 프리셋 버튼을 사용해보세요</p>
        </div>
      </div>
    );
  }

  const rows: DashboardSupervisorJobPosting[][] = [];
  for (let i = 0; i < jobPostings.length; i += 2) {
    rows.push(jobPostings.slice(i, i + 2));
  }

  const expandedJobPosting = jobPostings.find((jp) => jp.id === expandedId);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">공고별 현황</h3>
        <span className="text-xs text-muted-foreground/60">{jobPostings.length}건</span>
      </div>
      <div className="space-y-3">
        {rows.map((row, rowIdx) => {
          const rowHasExpanded = row.some((jp) => jp.id === expandedId);
          return (
            <div key={rowIdx}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {row.map((jp) => (
                  <JobPostingCard
                    key={jp.id}
                    jobPosting={jp}
                    isExpanded={jp.id === expandedId}
                    onClick={() =>
                      setExpandedId(expandedId === jp.id ? null : jp.id)
                    }
                  />
                ))}
              </div>
              {rowHasExpanded && expandedJobPosting && (
                <div className="mt-3">
                  <JobPostingDetail jobPosting={expandedJobPosting} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
