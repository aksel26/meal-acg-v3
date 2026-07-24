"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Calculator,
  ChevronDown,
  DoorOpen,
  FileText,
  GraduationCap,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/src/tooltip";
import { useState } from "react";
import { useSidebarStore } from "@/stores/sidebarStore";

type NavItem = {
  type: "item";
  href: string;
  label: string;
  icon: LucideIcon;
};

type NavGroup = {
  type: "group";
  label: string;
  icon: LucideIcon;
  children: NavItem[];
};

type NavEntry = NavItem | NavGroup;

const SIDEBAR_ICON_STROKE_WIDTH = 1.25;

const navEntries: NavEntry[] = [
  { type: "item", href: "/", label: "대시보드", icon: LayoutDashboard },
  {
    type: "item",
    href: "/room-assignments",
    label: "회의실 배정",
    icon: DoorOpen,
  },
  {
    type: "group",
    label: "감독관",
    icon: Briefcase,
    children: [
      {
        type: "item",
        href: "/supervisor/job-postings",
        label: "공고 관리",
        icon: Briefcase,
      },
      {
        type: "item",
        href: "/supervisor/workers",
        label: "지원자 관리",
        icon: Users,
      },
      {
        type: "item",
        href: "/supervisor/cost-management",
        label: "정산 관리",
        icon: Calculator,
      },
    ],
  },
  {
    type: "group",
    label: "면접교육",
    icon: GraduationCap,
    children: [
      {
        type: "item",
        href: "/interview/job-postings",
        label: "공고 관리",
        icon: Briefcase,
      },
      {
        type: "item",
        href: "/interview/personnel",
        label: "인력 관리",
        icon: Users,
      },
      {
        type: "item",
        href: "/interview/settlement",
        label: "정산 관리",
        icon: Calculator,
      },
      {
        type: "item",
        href: "/interview/expense-reports",
        label: "지출결의서",
        icon: FileText,
      },
    ],
  },
];

function isGroup(entry: NavEntry): entry is NavGroup {
  return entry.type === "group";
}

function isPathActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

function NavMenu({
  iconOnly = false,
  onExpand,
}: {
  iconOnly?: boolean;
  onExpand?: () => void;
}) {
  const pathname = usePathname();
  const [manuallyToggled, setManuallyToggled] = useState<Set<string>>(
    new Set(),
  );

  function isGroupActive(group: NavGroup) {
    return group.children.some((child) => isPathActive(pathname, child.href));
  }

  function isGroupOpen(group: NavGroup) {
    return isGroupActive(group) || manuallyToggled.has(group.label);
  }

  function toggleGroup(group: NavGroup) {
    if (isGroupActive(group)) return;
    setManuallyToggled((current) => {
      const next = new Set(current);
      if (next.has(group.label)) next.delete(group.label);
      else next.add(group.label);
      return next;
    });
  }

  if (iconOnly) {
    return (
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-1">
        {navEntries.map((entry) => {
          const Icon = entry.icon;
          const active = isGroup(entry)
            ? isGroupActive(entry)
            : isPathActive(pathname, entry.href);
          const className = `flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
            active
              ? "bg-[#111111] text-white"
              : "text-slate-500 hover:bg-[#f3f3f3] hover:text-[#111111]"
          }`;
          const control = isGroup(entry) ? (
            <button
              type="button"
              className={className}
              aria-label={`${entry.label} 메뉴 펼치기`}
              onClick={() => {
                if (!active) {
                  setManuallyToggled((current) =>
                    new Set(current).add(entry.label),
                  );
                }
                onExpand?.();
              }}
            >
              <Icon size={18} strokeWidth={SIDEBAR_ICON_STROKE_WIDTH} />
            </button>
          ) : (
            <Link
              href={entry.href}
              className={className}
              aria-label={entry.label}
            >
              <Icon size={18} strokeWidth={SIDEBAR_ICON_STROKE_WIDTH} />
            </Link>
          );

          return (
            <Tooltip key={entry.label}>
              <TooltipTrigger asChild>{control}</TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {entry.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2">
      {navEntries.map((entry) => {
        const Icon = entry.icon;

        if (!isGroup(entry)) {
          const active = isPathActive(pathname, entry.href);
          return (
            <Link
              key={entry.href}
              href={entry.href}
              className={`flex h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors ${
                active
                  ? "bg-[#111111] font-medium text-white"
                  : "text-slate-500 hover:bg-[#f9f9fa] hover:text-[#111111]"
              }`}
            >
              <Icon size={16} strokeWidth={SIDEBAR_ICON_STROKE_WIDTH} />
              {entry.label}
            </Link>
          );
        }

        const open = isGroupOpen(entry);
        return (
          <div key={entry.label}>
            <button
              type="button"
              onClick={() => toggleGroup(entry)}
              className="group flex h-8 w-full items-center gap-2 rounded-md p-2"
            >
              <Icon
                size={16}
                strokeWidth={SIDEBAR_ICON_STROKE_WIDTH}
                className="shrink-0 text-slate-500"
              />
              <span className="flex-1 text-left text-sm font-medium text-slate-700">
                {entry.label}
              </span>
              <ChevronDown
                size={14}
                strokeWidth={SIDEBAR_ICON_STROKE_WIDTH}
                className={`text-slate-300 transition-transform duration-200 group-hover:text-slate-400 ${
                  open ? "" : "-rotate-90"
                }`}
              />
            </button>

            {open && (
              <div className="mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-slate-200 px-2.5 py-0.5">
                {entry.children.map((child) => {
                  const active = isPathActive(pathname, child.href);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`flex h-7 min-w-0 -translate-x-px items-center overflow-hidden rounded-md px-2 text-sm transition-colors ${
                        active
                          ? "bg-[#111111] font-medium text-white"
                          : "text-slate-500 hover:bg-[#f9f9fa] hover:text-[#111111]"
                      }`}
                    >
                      <span className="truncate">{child.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function SidebarLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2">
      <Image
        src="/acg_ci_gray.png"
        alt="ACG"
        width={40}
        height={40}
        className="h-10 w-10 shrink-0 object-contain"
        priority
      />
      {!compact && (
        <p className="truncate text-sm text-[#111111]">아르바이트 관리</p>
      )}
    </Link>
  );
}

export default function Sidebar() {
  const { isCollapsed, toggleCollapsed } = useSidebarStore();

  return (
    <aside
      className={`relative flex h-screen shrink-0 flex-col border-r border-[#f3f3f3] bg-white py-5 text-slate-900 transition-[width] duration-200 ${
        isCollapsed ? "w-16" : "w-60"
      }`}
    >
      <div
        className={`mb-5 flex items-center ${
          isCollapsed ? "justify-center" : "px-5"
        }`}
      >
        <SidebarLogo compact={isCollapsed} />
      </div>

      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={isCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
        className="absolute -right-3 top-8 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-slate-400 shadow-sm transition-colors hover:bg-[#f9f9fa] hover:text-slate-700"
      >
        {isCollapsed ? (
          <PanelLeftOpen size={14} strokeWidth={SIDEBAR_ICON_STROKE_WIDTH} />
        ) : (
          <PanelLeftClose size={14} strokeWidth={SIDEBAR_ICON_STROKE_WIDTH} />
        )}
      </button>

      <NavMenu iconOnly={isCollapsed} onExpand={toggleCollapsed} />
    </aside>
  );
}
