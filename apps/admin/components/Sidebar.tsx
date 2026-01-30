"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import acgLogo from "@/acg_ci_white.png";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarDays,
  Settings,
  LogOut,
  ChevronRight,
  ChevronDown,
  Utensils,
  Shuffle,
  Coffee,
  Upload,
  Download,
  Database,
  Cog,
} from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
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
    description: "전체 현황 요약",
  },
  {
    name: "식대 관리",
    icon: Utensils,
    items: [
      { name: "사용자 현황", href: "/users", icon: Users, description: "정산 관리" },
      { name: "식대 입력", href: "/calendar", icon: Calendar, description: "일별 식대 기록" },
    ],
  },
  {
    name: "조직 관리",
    icon: Users,
    items: [
      { name: "점심조 관리", href: "/lunch-groups", icon: Shuffle, description: "조 배정 관리" },
      { name: "Monthly 음료", href: "/monthly", icon: Coffee, description: "월별 음료 관리" },
    ],
  },
  {
    name: "데이터 관리",
    icon: Database,
    items: [
      { name: "엑셀 가져오기", href: "/import", icon: Upload, description: "데이터 업로드" },
      { name: "엑셀 내보내기", href: "/export", icon: Download, description: "데이터 다운로드" },
    ],
  },
  {
    name: "설정",
    icon: Cog,
    items: [
      { name: "공휴일 관리", href: "/holidays", icon: CalendarDays, description: "휴일 설정" },
      { name: "지원금 설정", href: "/settings", icon: Settings, description: "금액 설정" },
    ],
  },
];

function NavItemComponent({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "nav-item group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
        isActive
          ? "active bg-amber-500/10 text-amber-400"
          : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
          isActive
            ? "bg-amber-500/20 text-amber-400"
            : "bg-slate-800/50 text-slate-500 group-hover:bg-slate-700/50 group-hover:text-slate-300"
        )}
      >
        <item.icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <span className="block">{item.name}</span>
        <span
          className={cn(
            "block text-[10px] transition-colors",
            isActive ? "text-amber-400/60" : "text-slate-600 group-hover:text-slate-500"
          )}
        >
          {item.description}
        </span>
      </div>
      <ChevronRight
        className={cn(
          "h-4 w-4 transition-all",
          isActive
            ? "text-amber-400/60"
            : "text-slate-700 opacity-0 group-hover:opacity-100 group-hover:text-slate-500"
        )}
      />
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
  // 그룹 내 아이템 중 하나라도 활성화되어 있으면 그룹 열기
  const hasActiveItem = group.items.some(
    (item) =>
      pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
  );
  const [isOpen, setIsOpen] = useState(hasActiveItem);

  return (
    <div className="space-y-1">
      {/* 그룹 헤더 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
          hasActiveItem
            ? "text-amber-400"
            : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
        )}
      >
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
            hasActiveItem
              ? "bg-amber-500/20 text-amber-400"
              : "bg-slate-800/50 text-slate-500"
          )}
        >
          <group.icon className="h-4 w-4" />
        </div>
        <span className="flex-1 text-left">{group.name}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            isOpen ? "rotate-180" : "",
            hasActiveItem ? "text-amber-400/60" : "text-slate-600"
          )}
        />
      </button>

      {/* 하위 아이템 */}
      {isOpen && (
        <div className="ml-4 space-y-1 border-l border-slate-800 pl-3">
          {group.items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all",
                  isActive
                    ? "bg-amber-500/10 text-amber-400"
                    : "text-slate-500 hover:bg-slate-800/50 hover:text-slate-300"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-full w-[280px] flex-col bg-slate-900 shadow-2xl">
      {/* Logo Section */}
      <Link href="/" className="flex h-[72px] items-center gap-3 border-b border-slate-800/50 px-6">
        <Image
          src={acgLogo}
          alt="ACG"
          width={40}
          height={40}
        />
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">식대 Admin</h1>
          <p className="text-[11px] font-medium text-slate-500">Admin Console</p>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-6 overflow-y-auto">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Menu
        </p>
        {navigation.map((item) => {
          if (isNavGroup(item)) {
            return (
              <NavGroupComponent key={item.name} group={item} pathname={pathname} />
            );
          }
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return <NavItemComponent key={item.name} item={item} isActive={isActive} />;
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="border-t border-slate-800/50 p-4">
        <div className="mb-4 rounded-xl bg-slate-800/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-700 text-sm font-bold text-white shadow-inner">
              {user?.fullName?.charAt(0) || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-slate-200">
                {user?.fullName || "Admin"}
              </p>
              <p className="text-[11px] text-slate-500">
                {user?.role === "admin" ? "관리자" : "사용자"}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800/30 px-4 py-3 text-sm font-medium text-slate-400 transition-all hover:bg-rose-500/10 hover:text-rose-400"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
