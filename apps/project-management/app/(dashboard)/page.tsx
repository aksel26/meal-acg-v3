import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { CreateRequestDialog } from "@/components/requests/CreateRequestDialog";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { listProjectsForUser, type ProjectSummary } from "@/lib/projects";
import { listRequestsForUser, type RequestRecord } from "@/lib/requests";
import {
  Briefcase,
  Building2,
  CheckCircle2,
  FolderKanban,
  Inbox,
  UserRound,
} from "lucide-react";
import Link from "next/link";

type ContactStat = {
  name: string;
  count: number;
};

export default async function DashboardPage() {
  const user = await requireAuth();
  const requests = await listRequestsForUser(user, "queue");
  const projects = await listProjectsForUser(user);
  const stats = await getDashboardStats(user.id, requests, projects);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#111111]">나의 캘린더</h1>
          <p className="mt-1 text-sm text-slate-500">
            마감일 기준으로 내가 담당하는 요청을 한눈에 확인합니다.
          </p>
        </div>
        <CreateRequestDialog />
      </div>

      <DashboardSummaryCards stats={stats} />

      <DashboardClient requests={requests} />
    </div>
  );
}

async function getDashboardStats(
  userId: string,
  assignedRequests: RequestRecord[],
  projects: ProjectSummary[],
) {
  const now = new Date();
  const today = toDateKey(now);
  const soon = toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const yearKey = String(now.getFullYear());

  const activeAssigned = assignedRequests.filter(
    (request) => request.status !== "완료" && request.status !== "거절",
  );
  const completed = assignedRequests.filter((request) => request.status === "완료");
  const urgentCount = activeAssigned.filter(
    (request) =>
      request.due_date && request.due_date >= today && request.due_date <= soon,
  ).length;

  const contacts = await getContactStats(yearKey);

  return {
    activeProjects: projects.filter((project) => project.status !== "완료").length,
    urgentProjects: projects.filter(
      (project) =>
        project.status !== "완료" &&
        project.due_date &&
        project.due_date >= today &&
        project.due_date <= soon,
    ).length,
    completedThisMonth: completed.filter((request) =>
      (request.completed_at ?? "").startsWith(monthKey),
    ).length,
    completedThisYear: completed.filter((request) =>
      (request.completed_at ?? "").startsWith(yearKey),
    ).length,
    openAssigned: activeAssigned.length,
    urgentCount,
    topRequester: contacts.topRequester,
    topTeam: contacts.topTeam,
    topCustomer: contacts.topCustomer,
  };
}

async function getContactStats(yearKey: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("requests")
    .select("requester_name, team_name, team_names, customer_names, created_at")
    .gte("created_at", `${yearKey}-01-01T00:00:00.000Z`);

  if (error) {
    throw error;
  }

  const rows = data ?? [];

  return {
    topRequester: topByName(rows.map((row) => row.requester_name)),
    topTeam: topByName(
      rows.flatMap((row) => {
        if (Array.isArray(row.team_names) && row.team_names.length > 0) {
          return row.team_names;
        }
        return row.team_name ? [row.team_name] : [];
      }),
    ),
    topCustomer: topByName(
      rows.flatMap((row) =>
        Array.isArray(row.customer_names) ? row.customer_names : [],
      ),
    ),
  };
}

function topByName(names: (string | null)[]): ContactStat | null {
  const counts = new Map<string, number>();

  for (const name of names) {
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? { name: top[0], count: top[1] } : null;
}

function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function DashboardSummaryCards({
  stats,
}: {
  stats: Awaited<ReturnType<typeof getDashboardStats>>;
}) {
  return (
    <section>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ProjectSummaryCard
          activeCount={stats.activeProjects}
          urgentCount={stats.urgentProjects}
        />
        <CompletionSummaryCard
          thisMonth={stats.completedThisMonth}
          thisYear={stats.completedThisYear}
        />
        <PendingSummaryCard
          openCount={stats.openAssigned}
          urgentCount={stats.urgentCount}
        />
        <ContactSummaryCard requester={stats.topRequester} team={stats.topTeam} />
      </div>
    </section>
  );
}

function ProjectSummaryCard({
  activeCount,
  urgentCount,
}: {
  activeCount: number;
  urgentCount: number;
}) {
  return (
    <Link
      href="/projects"
      className="block rounded-xl border border-[#f3f3f3] bg-white px-4 py-4 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#111111]">프로젝트</p>
          <p className="mt-1 text-xs text-slate-400">진행 중 프로젝트</p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#f9f9fa] text-slate-500">
          <FolderKanban size={20} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <CompletionStatItem label="활성" value={activeCount} />
        <CompletionStatItem label="마감 임박" value={urgentCount} />
      </div>
    </Link>
  );
}

function CompletionSummaryCard({
  thisMonth,
  thisYear,
}: {
  thisMonth: number;
  thisYear: number;
}) {
  return (
    <div className="rounded-xl border border-[#f3f3f3] bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#111111]">처리완료한 요청</p>
          <p className="mt-1 text-xs text-slate-400">내가 처리 완료</p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#f9f9fa] text-slate-500">
          <CheckCircle2 size={20} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <CompletionStatItem label="올해" value={thisYear} />
        <CompletionStatItem label="이번 달" value={thisMonth} />
      </div>
    </div>
  );
}

function CompletionStatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[#f9f9fa] px-3 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-[#111111]">
        {value.toLocaleString("ko-KR")}건
      </p>
    </div>
  );
}

function PendingSummaryCard({
  openCount,
  urgentCount,
}: {
  openCount: number;
  urgentCount: number;
}) {
  return (
    <Link
      href="/queue"
      className="block rounded-xl border border-[#f3f3f3] bg-white px-4 py-4 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#111111]">처리해야 할 요청</p>
          <p className="mt-1 text-xs text-slate-400">내 요청 목록 활성 요청</p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#f9f9fa] text-slate-500">
          <Inbox size={20} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <CompletionStatItem label="전체" value={openCount} />
        <CompletionStatItem label="마감 임박" value={urgentCount} />
      </div>
    </Link>
  );
}

function TopCustomerCard({ stat }: { stat: ContactStat | null }) {
  return (
    <div className="rounded-xl border border-[#f3f3f3] bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">컨택이 가장 많은 고객사</p>
          <p className="mt-2 truncate text-xl font-semibold text-[#111111]">
            {stat?.name ?? "-"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {stat ? `${stat.count.toLocaleString("ko-KR")}건 · 올해` : "올해 데이터 없음"}
          </p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#f9f9fa] text-slate-500">
          <Briefcase size={20} />
        </div>
      </div>
    </div>
  );
}

function ContactSummaryCard({
  requester,
  team,
}: {
  requester: ContactStat | null;
  team: ContactStat | null;
}) {
  return (
    <div className="rounded-xl border border-[#f3f3f3] bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#111111]">올해 컨택 상위</p>
          <p className="mt-1 text-xs text-slate-400">요청 생성 기준</p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#f9f9fa] text-slate-500">
          <UserRound size={20} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <ContactSummaryItem icon={UserRound} label="직원" stat={requester} />
        <ContactSummaryItem icon={Building2} label="팀" stat={team} />
      </div>
    </div>
  );
}

function ContactSummaryItem({
  icon: Icon,
  label,
  stat,
}: {
  icon: typeof UserRound;
  label: string;
  stat: ContactStat | null;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg bg-[#f9f9fa] px-3 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white text-slate-500">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">컨택이 가장 많은 {label}</p>
        <p className="mt-0.5 truncate text-base font-semibold text-[#111111]">
          {stat?.name ?? "-"}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          {stat ? `${stat.count.toLocaleString("ko-KR")}건` : "올해 데이터 없음"}
        </p>
      </div>
    </div>
  );
}
