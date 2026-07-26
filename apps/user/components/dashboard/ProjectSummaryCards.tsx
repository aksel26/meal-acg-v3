"use client";

import Link from "next/link";
import {
  CheckCircle2,
  FolderKanban,
  Inbox,
} from "lucide-react";
import { useProjectStats } from "@/hooks/use-project-stats";

export function ProjectSummaryCards() {
  const { data, isLoading } = useProjectStats();

  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl bg-white"
          />
        ))}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="grid gap-3 md:grid-cols-3">
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
        title="담당 업무 요청"
        subtitle="내 담당 활성 요청"
        icon={<Inbox size={20} strokeWidth={1.5} />}
        primary={{ label: "전체", value: data.openAssigned }}
        secondary={{ label: "마감 임박", value: data.urgentCount }}
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
        className="block rounded-xl bg-white px-4 py-4 transition hover:bg-slate-50"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-xl bg-white px-4 py-4">
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
    <div className="rounded-xl bg-white px-4 py-4">
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
