"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarDays,
  Settings,
  FileSpreadsheet,
  LogOut,
  ChevronRight,
  Utensils,
  Shuffle,
} from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "대시보드", href: "/", icon: LayoutDashboard, description: "전체 현황 요약" },
  { name: "사용자 현황", href: "/users", icon: Users, description: "정산 관리" },
  { name: "식대 입력", href: "/calendar", icon: Calendar, description: "일별 식대 기록" },
  { name: "점심조 관리", href: "/lunch-groups", icon: Shuffle, description: "조 배정 관리" },
  { name: "공휴일 관리", href: "/holidays", icon: CalendarDays, description: "휴일 설정" },
  { name: "설정", href: "/settings", icon: Settings, description: "지원금 설정" },
  { name: "엑셀 내보내기", href: "/export", icon: FileSpreadsheet, description: "데이터 다운로드" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-full w-[280px] flex-col bg-slate-900 shadow-2xl">
      {/* Logo Section */}
      <div className="flex h-[72px] items-center gap-3 border-b border-slate-800/50 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/20">
          <Utensils className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-white">ACG 식대</h1>
          <p className="text-[11px] font-medium text-slate-500">Admin Console</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-6">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Menu
        </p>
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "nav-item group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all",
                isActive
                  ? "active bg-amber-500/10 text-amber-400"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-all",
                  isActive
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-slate-800/50 text-slate-500 group-hover:bg-slate-700/50 group-hover:text-slate-300"
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
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
