"use client";

import { useState } from "react";
import type { DashboardJobPosting } from "@/hooks/use-dashboard";
import { JobPostingDetailAttendance } from "./JobPostingDetailAttendance";
import { JobPostingDetailContract } from "./JobPostingDetailContract";
import { JobPostingDetailRooms } from "./JobPostingDetailRooms";

type Props = {
  jobPosting: DashboardJobPosting;
};

const TABS = [
  { id: "attendance", label: "출석" },
  { id: "contract", label: "계약" },
  { id: "rooms", label: "회의실" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function getTabCount(jobPosting: DashboardJobPosting, tabId: TabId): { count: number; alert: number } {
  const workers = jobPosting.workers;
  switch (tabId) {
    case "attendance": {
      const alert = workers.filter((w) => w.attendanceStatus === null).length;
      return { count: workers.length, alert };
    }
    case "contract": {
      const alert = workers.filter((w) => w.contractStatus === null).length;
      return { count: workers.length, alert };
    }
    case "rooms": {
      const assigned = workers.filter((w) => w.roomSlots && w.roomSlots.length > 0).length;
      const unassigned = workers.length - assigned;
      return { count: assigned, alert: unassigned };
    }
  }
}

export function JobPostingDetail({ jobPosting }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("attendance");

  if (jobPosting.workers.length === 0) {
    return (
      <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
        배정된 인원이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="flex items-center justify-between border-b bg-muted/20 px-5 py-3">
        <h4 className="text-sm font-semibold">{jobPosting.title} — 상세 현황</h4>
        <div className="flex">
          {TABS.map((tab) => {
            const { count, alert } = getTabCount(jobPosting, tab.id);
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/70"
                }`}
              >
                {tab.label}
                <span className={`tabular-nums rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {count}
                </span>
                {alert > 0 && (
                  <span className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                    {alert}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5">
        {activeTab === "attendance" && (
          <JobPostingDetailAttendance workers={jobPosting.workers} />
        )}
        {activeTab === "contract" && (
          <JobPostingDetailContract workers={jobPosting.workers} />
        )}
        {activeTab === "rooms" && (
          <JobPostingDetailRooms workers={jobPosting.workers} />
        )}
      </div>
    </div>
  );
}
