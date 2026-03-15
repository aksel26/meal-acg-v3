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
    <div className="rounded-xl border p-5 transition-all duration-200">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-semibold">{jobPosting.title} — 상세 현황</h4>
        <div className="flex border-b border-transparent">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                activeTab === tab.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/70"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="transition-opacity duration-150">
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
