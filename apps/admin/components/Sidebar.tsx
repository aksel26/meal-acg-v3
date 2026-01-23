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
} from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "대시보드", href: "/", icon: LayoutDashboard },
  { name: "사용자 현황", href: "/users", icon: Users },
  { name: "식대 입력", href: "/calendar", icon: Calendar },
  { name: "공휴일 관리", href: "/holidays", icon: CalendarDays },
  { name: "설정", href: "/settings", icon: Settings },
  { name: "엑셀 내보내기", href: "/export", icon: FileSpreadsheet },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">ACG 식대 Admin</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center rounded-md px-3 py-2 text-sm font-medium",
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive
                    ? "text-white"
                    : "text-gray-400 group-hover:text-white"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User info & Logout */}
      <div className="border-t border-gray-800 p-4">
        <div className="mb-3 text-sm text-gray-400">
          <p className="font-medium text-white">{user?.fullName || "Admin"}</p>
          <p className="text-xs">{user?.role === "admin" ? "관리자" : "사용자"}</p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
        >
          <LogOut className="mr-3 h-5 w-5" />
          로그아웃
        </button>
      </div>
    </div>
  );
}
