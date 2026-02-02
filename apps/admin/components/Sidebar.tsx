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
  Database,
  Cog,
  Grid3X3,
} from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { useAuth } from "@/hooks/useAuth";

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
      { name: "사용자 현황", href: "/users", icon: Users },
      { name: "식대 입력", href: "/calendar", icon: Calendar },
    ],
  },
  {
    name: "조직 관리",
    icon: Users,
    items: [
      { name: "점심조 관리", href: "/lunch-groups", icon: Shuffle },
      { name: "Monthly 음료", href: "/monthly", icon: Coffee },
    ],
  },
  {
    name: "데이터 관리",
    icon: Database,
    items: [
      { name: "엑셀 가져오기", href: "/import", icon: Upload },
      { name: "엑셀 내보내기", href: "/export", icon: Download },
    ],
  },
  {
    name: "설정",
    icon: Cog,
    items: [
      { name: "공휴일 관리", href: "/holidays", icon: CalendarDays },
      { name: "지원금 설정", href: "/settings", icon: Settings },
    ],
  },
];

function NavItemComponent({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-[#135bec]/10 text-[#135bec]"
          : "text-slate-500 hover:bg-white/50 hover:text-slate-900"
      )}
    >
      <item.icon className="h-5 w-5 flex-shrink-0" />
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
      pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
  );
  const [isOpen, setIsOpen] = useState(hasActiveItem);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          hasActiveItem
            ? "text-[#135bec]"
            : "text-slate-500 hover:bg-white/50 hover:text-slate-900"
        )}
      >
        <group.icon className="h-5 w-5 flex-shrink-0" />
        <span className="flex-1 text-left">{group.name}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen ? "rotate-180" : "",
            hasActiveItem ? "text-[#135bec]/60" : "text-slate-400"
          )}
        />
      </button>

      <div
        className={cn(
          "space-y-1 overflow-hidden pl-4 transition-all duration-200",
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
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
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-[#135bec]/10 text-[#135bec]"
                  : "text-slate-500 hover:bg-white/50 hover:text-slate-900"
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
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
    <aside className="glass-sidebar z-20 flex w-64 flex-col justify-between px-4 py-6">
      {/* Top section */}
      <div className="flex flex-col gap-6">
        {/* Logo Area */}
        <Link href="/" className="flex items-center gap-3 px-2">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#135bec] to-[#a855f7] text-white shadow-lg">
            <Grid3X3 className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            식대 Admin
          </h1>
        </Link>

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
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
      </div>

      {/* User Profile Bottom */}
      <div className="flex flex-col gap-4">
        <div className="relative h-[1px] w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

        <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/60">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-[#135bec] to-[#a855f7] text-sm font-bold text-white shadow-sm">
            {user?.fullName?.charAt(0) || "A"}
          </div>
          <div className="flex flex-col">
            <p className="text-sm font-bold text-slate-900">
              {user?.fullName || "Admin"}
            </p>
            <p className="text-xs text-slate-500">
              {user?.role === "admin" ? "관리자" : "사용자"}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex w-full items-center justify-start gap-2 rounded-xl bg-white/40 px-4 py-3 text-sm font-medium text-slate-500 transition-all hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="h-4 w-4" />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
