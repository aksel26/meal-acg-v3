"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Users,
  LayoutDashboard,
  DoorOpen,
  Calculator,
  GraduationCap,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

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

function isGroup(entry: NavEntry): entry is NavGroup {
  return entry.type === "group";
}

const navEntries: NavEntry[] = [
  { type: "item", href: "/", label: "대시보드", icon: LayoutDashboard },
  {
    type: "group",
    label: "감독관",
    icon: Briefcase,
    children: [
      { type: "item", href: "/supervisor/job-postings", label: "공고 관리", icon: Briefcase },
      { type: "item", href: "/supervisor/workers", label: "지원자 관리", icon: Users },
      { type: "item", href: "/room-assignments", label: "회의실 배정", icon: DoorOpen },
      { type: "item", href: "/supervisor/cost-management", label: "정산 관리", icon: Calculator },
    ],
  },
  {
    type: "group",
    label: "면접교육",
    icon: GraduationCap,
    children: [
      { type: "item", href: "/interview/personnel", label: "인력 관리", icon: Users },
      { type: "item", href: "/room-assignments", label: "회의실 배정", icon: DoorOpen },
      { type: "item", href: "/interview/settlement", label: "정산 관리", icon: Calculator },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [manuallyToggled, setManuallyToggled] = useState<Set<string>>(new Set());

  function isGroupActive(group: NavGroup): boolean {
    return group.children.some(
      (child) => child.href !== "/" && pathname.startsWith(child.href),
    );
  }

  function isGroupOpen(group: NavGroup): boolean {
    const active = isGroupActive(group);
    const toggled = manuallyToggled.has(group.label);
    // Active groups are always open; non-active groups can be toggled
    if (active) return true;
    return toggled;
  }

  function handleGroupClick(group: NavGroup) {
    if (isGroupActive(group)) return; // active groups stay open, ignore click
    setManuallyToggled((prev) => {
      const next = new Set(prev);
      if (next.has(group.label)) {
        next.delete(group.label);
      } else {
        next.add(group.label);
      }
      return next;
    });
  }

  return (
    <aside className="flex h-full w-60 flex-col rounded-lg bg-slate-900 p-4 text-white">
      <Link href="/" className="mb-8 block px-2 py-4">
        <Image
          src="/ACG_CI-WHITE.webp"
          alt="ACG"
          width={120}
          height={40}
          className="h-auto w-auto"
          priority
        />
        <p className="mt-1 text-sm text-slate-400">아르바이트 관리</p>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {navEntries.map((entry) => {
          if (!isGroup(entry)) {
            const isActive = pathname === entry.href;
            const Icon = entry.icon;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-white/10 font-medium text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {entry.label}
              </Link>
            );
          }

          const open = isGroupOpen(entry);
          const active = isGroupActive(entry);
          const GroupIcon = entry.icon;

          return (
            <div key={entry.label}>
              <button
                type="button"
                onClick={() => handleGroupClick(entry)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <GroupIcon size={18} />
                <span className="flex-1 text-left">{entry.label}</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                />
              </button>

              {open && (
                <div className="mt-0.5 flex flex-col gap-0.5">
                  {entry.children.map((child) => {
                    const isChildActive = pathname === child.href;
                    const ChildIcon = child.icon;
                    return (
                      <Link
                        key={`${entry.label}-${child.href}`}
                        href={child.href}
                        className={`flex items-center gap-3 rounded-lg py-2 pl-9 pr-3 text-sm transition-colors ${
                          isChildActive
                            ? "bg-white/10 font-medium text-white"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <ChildIcon size={16} />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
