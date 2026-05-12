"use client";

import Link from "next/link";
import {
  Briefcase,
  Building2,
  CheckCircle2,
  FolderKanban,
  Inbox,
  UserRound,
} from "lucide-react";
import { useProjectStats } from "@/hooks/use-project-stats";

export function ProjectSummaryCards() {
  const { data, isLoading } = useProjectStats();

  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl border border-[#f3f3f3] bg-white"
          />
        ))}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <ProjectCard
        title="프로젝트"
        subtitle="진행 중 프로젝트"
        icon={<FolderKanban size={20} strokeWidth={1.5} />}
        href="/projects"
        primary={{ label: "활성", value: data.activeProjects }}
        secondary={{ label: "마감 임박", value: data.urgentProjects }}
      />
      <CompletionCard
        thisMonth={data.completedThisMonth}
        thisYear={data.completedThisYear}
      />
      <ProjectCard
        title="처리할 업무 요청"
        subtitle="내 요청 목록 활성 요청"
        icon={<Inbox size={20} strokeWidth={1.5} />}
        primary={{ label: "전체", value: data.openAssigned }}
        secondary={{ label: "마감 임박", value: data.urgentCount }}
      />
      <ContactCard
        requester={data.topRequester}
        team={data.topTeam}
        customer={data.topCustomer}
      />
    </div>
  );
}

function ProjectCard({
  title,
  subtitle,
  icon,
  href,
  primary,
  secondary,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  href?: string;
  primary: { label: string; value: number };
  secondary: { label: string; value: number };
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#111111]">{title}</p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-500">
          {icon}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatItem label={primary.label} value={primary.value} />
        <StatItem label={secondary.label} value={secondary.value} />
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl border border-[#f3f3f3] bg-white px-4 py-4 transition hover:border-slate-300 hover:bg-slate-50"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-xl border border-[#f3f3f3] bg-white px-4 py-4">
      {content}
    </div>
  );
}

function CompletionCard({
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
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-500">
          <CheckCircle2 size={20} strokeWidth={1.5} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatItem label="올해" value={thisYear} />
        <StatItem label="이번 달" value={thisMonth} />
      </div>
    </div>
  );
}

function ContactCard({
  requester,
  team,
  customer,
}: {
  requester: { name: string; count: number } | null;
  team: { name: string; count: number } | null;
  customer: { name: string; count: number } | null;
}) {
  return (
    <div className="rounded-xl border border-[#f3f3f3] bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#111111]">올해 컨택 상위</p>
          <p className="mt-1 text-xs text-slate-400">요청 생성 기준</p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-500">
          <UserRound size={20} strokeWidth={1.5} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <ContactSummaryItem icon={UserRound} label="직원" stat={requester} />
        <ContactSummaryItem icon={Building2} label="팀" stat={team ?? customer} />
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
  stat: { name: string; count: number } | null;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg bg-[#f9f9fa] px-3 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md text-slate-500">
        <Icon size={16} strokeWidth={1.5} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">컨택이 많은 {label}</p>
        <p className="mt-0.5 truncate text-base font-semibold text-[#111111]">
          {stat?.name ?? "-"}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          {stat ? `${stat.count.toLocaleString("ko-KR")}건` : "데이터 없음"}
        </p>
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[#f9f9fa] px-3 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-[#111111]">
        {value.toLocaleString("ko-KR")}건
      </p>
    </div>
  );
}

// keep imports warning-free
void Briefcase;
