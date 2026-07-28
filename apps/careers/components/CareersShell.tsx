"use client";

import {
  BriefcaseBusiness,
  CalendarDays,
  ListTree,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  UserRoundSearch,
  UserX,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@repo/ui/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/src/tooltip";
import acgLogo from "../../admin/public/acg_ci_gray.png";

type CareersUser = {
  fullName: string;
  role: "admin";
};

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navigation: NavigationItem[] = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/postings", label: "채용 공고", icon: BriefcaseBusiness },
  { href: "/process-management", label: "프로세스 관리", icon: ListTree },
  { href: "/applicants", label: "지원자", icon: UserRoundSearch },
  { href: "/separated", label: "별도 관리", icon: UserX },
  { href: "/schedules", label: "채용 일정", icon: CalendarDays },
];

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "채용 대시보드",
    subtitle: "진행 중인 공고와 가까운 일정을 한곳에서 확인합니다.",
  },
  "/postings": {
    title: "채용 공고",
    subtitle: "공고 기본 정보와 전형 프로세스를 관리합니다.",
  },
  "/process-management": {
    title: "프로세스 관리",
    subtitle: "기본 프리셋과 공고별 전형 단계 및 상태를 관리합니다.",
  },
  "/applicants": {
    title: "지원자",
    subtitle: "지원자와 공고별 지원 건을 검색하고 관리합니다.",
  },
  "/pipeline": {
    title: "지원자 파이프라인",
    subtitle: "전형 단계별 지원 현황과 다음 이동을 관리합니다.",
  },
  "/separated": {
    title: "별도 관리",
    subtitle: "진행 전형에서 분리된 지원 건을 확인하고 복원합니다.",
  },
  "/schedules": {
    title: "채용 일정",
    subtitle: "면접과 과제 등 지원자별 일정을 시간순으로 확인합니다.",
  },
  "/postings/detail": {
    title: "채용 공고 상세",
    subtitle: "공고 정보와 전형 프로세스를 확인하고 수정합니다.",
  },
  "/applicants/detail": {
    title: "지원자 상세",
    subtitle: "지원자 정보와 전형 이력, 운영 기록을 관리합니다.",
  },
};

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function CareersSidebar({
  user,
  collapsed,
  onCollapse,
}: {
  user: CareersUser;
  collapsed: boolean;
  onCollapse: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "careers-sidebar relative z-20 flex h-dvh shrink-0 flex-col border-r border-[#f3f3f3] bg-white py-5 text-slate-900 transition-[width] duration-200 max-md:w-16",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div
        className={cn(
          "mb-5 flex items-center",
          collapsed
            ? "justify-center"
            : "px-5 max-md:justify-center max-md:px-0",
        )}
      >
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <Image
            src={acgLogo}
            alt="ACG"
            width={48}
            height={48}
            className="h-10 w-10 shrink-0 object-contain"
            priority
          />
          {!collapsed && (
            <p className="truncate text-sm text-[#111111] max-md:hidden">
              채용 관리 Admin
            </p>
          )}
        </Link>
      </div>

      <button
        type="button"
        onClick={onCollapse}
        aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
        className="absolute -right-3 top-8 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-slate-400 shadow-sm transition-colors hover:bg-[#f9f9fa] hover:text-slate-700 max-md:hidden"
      >
        {collapsed ? (
          <PanelLeftOpen className="h-3.5 w-3.5" strokeWidth={1.25} />
        ) : (
          <PanelLeftClose className="h-3.5 w-3.5" strokeWidth={1.25} />
        )}
      </button>

      <nav
        aria-label="채용 관리 메뉴"
        className={cn(
          "flex flex-1 flex-col gap-1 overflow-y-auto",
          collapsed ? "items-center px-2" : "px-2",
        )}
      >
        {navigation.map((item) => {
          const active = isActivePath(pathname, item.href);
          const link = (
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "careers-interactive group flex items-center transition-colors",
                collapsed
                  ? "h-10 w-10 justify-center rounded-lg"
                  : "h-8 gap-2 rounded-md px-2 text-sm max-md:h-10 max-md:w-10 max-md:justify-center max-md:px-0",
                active
                  ? "bg-[#111111] font-medium text-white"
                  : "text-slate-500 hover:bg-[#f9f9fa] hover:text-[#111111]",
              )}
            >
              <item.icon
                className={cn(
                  "shrink-0",
                  collapsed ? "h-[18px] w-[18px]" : "h-4 w-4",
                )}
                strokeWidth={1.25}
                aria-hidden
              />
              {!collapsed && (
                <span className="truncate max-md:hidden">{item.label}</span>
              )}
            </Link>
          );

          if (!collapsed) return <span key={item.href}>{link}</span>;

          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <div
        className={cn(
          "space-y-2 pt-2",
          collapsed ? "px-2" : "px-3 max-md:px-2",
        )}
      >
        <div className="h-px w-full bg-[#f3f3f3]" />

        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg">
                <span className="text-sm font-bold text-[#111111]">
                  {user.fullName.charAt(0) || "A"}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {user.fullName}
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex w-full items-center justify-between rounded-xl bg-[#f9f9fa] px-4 py-3 max-md:h-10 max-md:w-10 max-md:justify-center max-md:p-0">
            <div className="flex flex-col items-start leading-tight">
              <p className="text-sm font-semibold text-[#111111] max-md:hidden">
                {user.fullName}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400 max-md:hidden">
                관리자
              </p>
              <span className="hidden text-sm font-bold text-[#111111] max-md:block">
                {user.fullName.charAt(0) || "A"}
              </span>
            </div>
          </div>
        )}

        <form action="/api/auth/logout" method="post">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="submit"
                  className="careers-interactive flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-[#f9f9fa] hover:text-slate-600"
                  aria-label="로그아웃"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.25} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                로그아웃
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              type="submit"
              className="careers-interactive flex w-full items-center justify-start gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-[#f9f9fa] hover:text-slate-600 max-md:h-10 max-md:w-10 max-md:justify-center max-md:px-0"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.25} />
              <span className="max-md:hidden">로그아웃</span>
            </button>
          )}
        </form>
      </div>
    </aside>
  );
}

function CareersHeader() {
  const pathname = usePathname();
  const normalizedPathname = pathname.startsWith("/postings/")
    ? "/postings/detail"
    : pathname.startsWith("/applicants/")
      ? "/applicants/detail"
      : pathname;
  const pageInfo = pageTitles[normalizedPathname] ?? pageTitles["/"]!;

  return (
    <header className="careers-topbar z-10 flex w-full items-center justify-between px-6 py-3.5">
      <div className="flex flex-1 flex-col gap-0.5 md:px-2">
        <h2 className="text-[18px] font-semibold leading-tight tracking-[-0.02em] text-[#1d1d1f]">
          {pageInfo.title}
        </h2>
        <p className="text-xs leading-4 tracking-[-0.01em] text-[#7a7a7a]">
          {pageInfo.subtitle}
        </p>
      </div>
    </header>
  );
}

function CareersContentFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto scroll-smooth bg-white px-6 py-4">
      <div className="md:px-2">{children}</div>
    </div>
  );
}

export function CareersShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: CareersUser;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="careers-shell flex h-dvh w-full gap-0 overflow-hidden">
      <CareersSidebar
        user={user}
        collapsed={collapsed}
        onCollapse={() => setCollapsed((value) => !value)}
      />

      <main className="careers-main relative flex h-full flex-1 flex-col overflow-hidden">
        <CareersHeader />
        <CareersContentFrame>{children}</CareersContentFrame>
      </main>
    </div>
  );
}
