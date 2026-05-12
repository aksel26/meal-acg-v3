import { OverviewFlow } from "@/components/overview/OverviewFlow";
import { requireAuth } from "@/lib/auth";
import { getOverviewProjects } from "@/lib/overview";

export default async function OverviewPage() {
  const user = await requireAuth();
  const projects = await getOverviewProjects(user);
  const requestCount = projects.reduce(
    (total, project) => total + project.requests.length,
    0,
  );

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#111111]">한눈에 보기</h1>
          <p className="mt-1 text-sm text-slate-500">
            그룹, 계열사, 프로젝트, 요청을 계층 구조로 확인합니다.
          </p>
        </div>
        <div className="flex gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[#f3f3f3]">
            프로젝트 {projects.length.toLocaleString("ko-KR")}건
          </span>
          <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[#f3f3f3]">
            요청 {requestCount.toLocaleString("ko-KR")}건
          </span>
        </div>
      </div>
      <OverviewFlow projects={projects} />
    </div>
  );
}
