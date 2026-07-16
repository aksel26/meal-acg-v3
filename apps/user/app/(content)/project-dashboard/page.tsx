import { MyCalendarPanel } from "@/components/dashboard/MyCalendarPanel";
import { ProjectSummaryCards } from "@/components/dashboard/ProjectSummaryCards";
import { RecentActivityWidget } from "@/components/dashboard/RecentActivityWidget";

export default function ProjectDashboardPage() {
  return (
    <div className="space-y-5 p-4 md:p-6">
      <ProjectSummaryCards />

      <div className="grid gap-4 lg:grid-cols-[6fr_4fr]">
        <MyCalendarPanel />
        <RecentActivityWidget />
      </div>
    </div>
  );
}
