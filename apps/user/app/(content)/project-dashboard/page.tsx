import { MyCalendarPanel } from "@/components/dashboard/MyCalendarPanel";
import { ProjectSummaryCards } from "@/components/dashboard/ProjectSummaryCards";
import { RecentActivityWidget } from "@/components/dashboard/RecentActivityWidget";

export default function ProjectDashboardPage() {
  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-[#111111]">대시보드</h1>
        <p className="mt-1 text-sm text-slate-500">
          업무 요청과 프로젝트 현황을 한 곳에서 확인합니다.
        </p>
      </div>

      <ProjectSummaryCards />

      <div className="grid gap-4 lg:grid-cols-[6fr_4fr]">
        <MyCalendarPanel />
        <RecentActivityWidget />
      </div>
    </div>
  );
}
