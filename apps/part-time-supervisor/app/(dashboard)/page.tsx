"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { Briefcase, Users, HardHat } from "lucide-react";

type DashboardData = {
  openJobCount: number;
  totalWorkerCount: number;
  workingWorkerCount: number;
  recentJobs: Array<{
    id: string;
    title: string;
    status: string;
    headcount: number;
    created_at: string;
  }>;
};

function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: queryKeys.dashboard.all,
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
  });
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-slate-400">로딩 중...</div>;
  }

  const cards = [
    { label: "활성 공고", value: data?.openJobCount ?? 0, icon: Briefcase, color: "bg-blue-50 text-blue-600" },
    { label: "전체 지원자", value: data?.totalWorkerCount ?? 0, icon: Users, color: "bg-green-50 text-green-600" },
    { label: "근무중 인원", value: data?.workingWorkerCount ?? 0, icon: HardHat, color: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border p-5">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${card.color}`}>
                <card.icon size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border p-5">
        <h3 className="mb-4 font-semibold">최근 공고</h3>
        {data?.recentJobs?.length ? (
          <div className="space-y-2">
            {data.recentJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="font-medium">{job.title}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  job.status === "open" ? "bg-green-100 text-green-700" :
                  job.status === "draft" ? "bg-slate-100 text-slate-600" :
                  "bg-red-100 text-red-700"
                }`}>
                  {job.status === "open" ? "모집중" : job.status === "draft" ? "임시" : "마감"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">등록된 공고가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
