"use client";

import { DashboardClient } from "@/components/project-dashboard/DashboardClient";
import { useMyRequests } from "@/hooks/use-my-requests";

interface MyCalendarPanelProps {
  rightTopSlot?: React.ReactNode;
}

export function MyCalendarPanel({ rightTopSlot }: MyCalendarPanelProps) {
  const { data, isLoading } = useMyRequests();

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white p-4">
        <div className="h-64 animate-pulse rounded-lg bg-[#f9f9fa]" />
      </div>
    );
  }

  return <DashboardClient requests={data ?? []} rightTopSlot={rightTopSlot} />;
}
