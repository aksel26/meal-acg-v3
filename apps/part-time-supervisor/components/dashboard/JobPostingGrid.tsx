"use client";

import { useState } from "react";
import type { DashboardJobPosting } from "@/hooks/use-dashboard";
import { JobPostingCard } from "./JobPostingCard";
import { JobPostingDetail } from "./JobPostingDetail";

type Props = {
  jobPostings: DashboardJobPosting[];
};

export function JobPostingGrid({ jobPostings }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (jobPostings.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        선택한 기간에 해당하는 공고가 없습니다.
      </div>
    );
  }

  // 2열 그리드에서 행 단위로 그룹핑 (확장 패널 위치 계산)
  const rows: DashboardJobPosting[][] = [];
  for (let i = 0; i < jobPostings.length; i += 2) {
    rows.push(jobPostings.slice(i, i + 2));
  }

  const expandedJobPosting = jobPostings.find((jp) => jp.id === expandedId);

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
        공고별 현황
      </h3>
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
