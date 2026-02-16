"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarDays,
  Settings,
  LogOut,
  ChevronDown,
  Utensils,
  Shuffle,
  Coffee,
  Upload,
  Download,
  Cog,
  Grid3X3,
  Coins,
  Building2,
  PiggyBank,
  ClipboardCheck,
  UserCheck,
  BarChart3,
  Bell,
} from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

type NavigationItem = NavItem | NavGroup;

function isNavGroup(item: NavigationItem): item is NavGroup {
  return "items" in item;
}

const navigation: NavigationItem[] = [
  {
    name: "대시보드",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "식대 관리",
    icon: Utensils,
    items: [
      { name: "사용현황 (인원별)", href: "/meal-status", icon: Users },
      { name: "식대 입력", href: "/calendar", icon: Calendar },
      { name: "식대 기본금 설정", href: "/settings", icon: Settings },
      { name: "엑셀 가져오기", href: "/import", icon: Upload },
      { name: "엑셀 내보내기", href: "/export", icon: Download },
    ],
  },
  {
    name: "조직 관리",
    icon: Users,
    items: [
      { name: "조직 구성", href: "/organization", icon: Building2 },
      { name: "조직원 현황", href: "/member-status", icon: UserCheck },
      { name: "점심조 관리", href: "/lunch-groups", icon: Shuffle },
      { name: "Monthly 음료", href: "/monthly", icon: Coffee },
    ],
  },
  {
    name: "포인트 관리",
    icon: Coins,
    items: [
      { name: "예산 할당", href: "/budget", icon: PiggyBank },
      { name: "사용내역 검토", href: "/review", icon: ClipboardCheck },
      { name: "사용 내역 조회", href: "/points-overview", icon: BarChart3 },
    ],
  },
  {
    name: "알림 관리",
    href: "/notifications",
    icon: Bell,
  },
  {
    name: "설정",
    icon: Cog,
    items: [{ name: "공휴일 관리", href: "/holidays", icon: CalendarDays }],
  },
];

function NavItemComponent({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors",
        isActive
          ? "bg-blue-50 text-blue-600"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      <span>{item.name}</span>
    </Link>
  );
}

function NavGroupComponent({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname: string;
}) {
  const hasActiveItem = group.items.some(
    (item) =>
      pathname === item.href ||
      (item.href !== "/" && pathname.startsWith(item.href)),
  );
  const [isOpen, setIsOpen] = useState(hasActiveItem);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors",
          hasActiveItem
            ? "text-blue-600"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
        )}
      >
        <group.icon className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-left">{group.name}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen ? "rotate-180" : "",
            hasActiveItem ? "text-blue-400" : "text-slate-400",
          )}
        />
      </button>

      <div
        className={cn(
          "space-y-1 overflow-hidden pl-4 transition-all duration-200",
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        {group.items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="z-20 flex w-56 flex-col justify-between border-r border-slate-200 bg-white px-3 py-5">
      {/* Top section */}
      <div className="flex flex-col gap-6">
        {/* Logo Area */}
        <Link href="/" className="flex items-center gap-3 px-2">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Image
              src="/acg_ci_white.png"
              alt="ACG Logo"
              width={40}
              height={32}
              className="h-3 w-8"
            />
          </div>
          <h1 className="text-base font-medium tracking-tight text-slate-900">
            비용 관리 Admin
          </h1>
        </Link>

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
          {navigation.map((item) => {
            if (isNavGroup(item)) {
              return (
                <NavGroupComponent
                  key={item.name}
                  group={item}
                  pathname={pathname}
                />
              );
            }
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <NavItemComponent
                key={item.name}
                item={item}
                isActive={isActive}
              />
            );
          })}
        </nav>
      </div>

      {/* User Profile Bottom */}
      <div className="flex flex-col gap-4">
        <div className="h-[1px] w-full bg-slate-200" />

        <div className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-100">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-blue-600 text-sm font-bold text-white">
            {user?.fullName?.charAt(0) || "A"}
          </div>
          <div className="flex flex-col">
            <p className="text-xs font-bold text-slate-900">
              {user?.fullName || "Admin"}
            </p>
            <p className="text-[11px] text-slate-500">
              {user?.role === "admin" ? "관리자" : "사용자"}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex w-full items-center justify-start gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <LogOut className="h-4 w-4" />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
