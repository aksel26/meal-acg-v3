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
  CalendarClock,
  ClipboardList,
  ClipboardPenLine,
  Calculator,
  Eye,
  EyeOff,
  HardHat,
  KeyRound,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  ExternalLink,
} from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { toast } from "@repo/ui/src/sonner";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@repo/ui/src/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { hasAdminPermission, type AdminPermission } from "@/lib/rbac";
import Image from "next/image";
import dayjs from "dayjs";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: AdminPermission;
  external?: boolean;
  isLabel?: boolean;
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
    name: "비용 관리",
    icon: Coins,
    items: [
      { name: "식대 관리", href: "", icon: Coffee, isLabel: true },
      { name: "사용현황 (인원별)", href: "/meal-status", icon: Users, permission: "meal:read" },
      { name: "식대 입력", href: "/calendar", icon: Calendar, permission: "meal:write" },
      { name: "식대 기본금 설정", href: "/settings", icon: Settings, permission: "settings:write" },
      { name: "엑셀 가져오기", href: "/import", icon: Upload, permission: "meal:import" },
      { name: "엑셀 내보내기", href: "/export", icon: Download, permission: "meal:export" },
      { name: "포인트 관리", href: "", icon: PiggyBank, isLabel: true },
      { name: "예산 할당", href: "/budget", icon: PiggyBank, permission: "points:write" },
      { name: "사용내역 검토", href: "/review", icon: ClipboardCheck, permission: "points:review" },
      { name: "사용 내역 조회", href: "/points-overview", icon: BarChart3, permission: "points:read" },
    ],
  },
  {
    name: "조직 관리",
    icon: Users,
    items: [
      { name: "조직 구성", href: "/organization", icon: Building2, permission: "organization:read" },
      { name: "직급/직책 관리", href: "/job-titles", icon: Grid3X3, permission: "organization:write" },
      { name: "다면평가", href: "/evaluations", icon: ClipboardPenLine, permission: "evaluation:read" },
      { name: "점심조 관리", href: "/lunch-groups", icon: Shuffle, permission: "organization:write" },
      { name: "Monthly 음료", href: "/monthly", icon: Coffee, permission: "meal:write" },
    ],
  },
  {
    name: "근태 관리",
    icon: CalendarClock,
    items: [
      { name: "출퇴근 관리", href: "/attendance", icon: UserCheck, permission: "attendance:read" },
      { name: "휴가 관리", href: "/dayoffs", icon: CalendarDays, permission: "leave:read" },
      { name: "휴가 자동 계산", href: "/leave-calculator", icon: Calculator, permission: "leave:read" },
      { name: "승인 관리", href: "/approvals", icon: ClipboardList, permission: "leave:approve" },
    ],
  },
  {
    name: "알림 관리",
    href: "/notifications",
    icon: Bell,
    permission: "notifications:read",
  },
  {
    name: "아르바이트 관리",
    href: process.env.NEXT_PUBLIC_SUPERVISOR_APP_URL || "http://localhost:3002",
    icon: HardHat,
    external: true,
  },
  {
    name: "프로젝트 관리",
    href:
      process.env.NEXT_PUBLIC_PROJECT_MANAGEMENT_APP_URL ||
      process.env.NEXT_PUBLIC_REQUEST_MANAGEMENT_APP_URL ||
      "http://localhost:3013",
    icon: ClipboardList,
    external: true,
  },
  {
    name: "설정",
    icon: Cog,
    items: [
      { name: "공휴일 관리", href: "/holidays", icon: CalendarDays, permission: "settings:write" },
      { name: "휴가 유형 관리", href: "/leave-types", icon: CalendarClock, permission: "settings:write" },
    ],
  },
];

function canShowItem(item: NavItem, adminRole: string | null | undefined) {
  return !item.permission || hasAdminPermission(adminRole, item.permission);
}

function filterNavigation(
  items: NavigationItem[],
  adminRole: string | null | undefined,
): NavigationItem[] {
  return items.reduce<NavigationItem[]>((visible, item) => {
    if (!isNavGroup(item)) {
      if (canShowItem(item, adminRole)) visible.push(item);
      return visible;
    }

    const visibleItems = item.items.filter((child) => {
      if (child.isLabel) return true;
      return canShowItem(child, adminRole);
    });
    const hasVisibleLink = visibleItems.some((child) => !child.isLabel);

    if (hasVisibleLink) visible.push({ ...item, items: visibleItems });
    return visible;
  }, []);
}

function NavItemComponent({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  const linkClassName = cn(
    "admin-pressable group flex items-center rounded-lg border border-transparent text-[13px] leading-tight",
    collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2.5",
    isActive
      ? "bg-[#f5f5f7] font-semibold text-[#1d1d1f]"
      : "font-normal text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]",
  );

  const linkContent = (
    <>
      <item.icon
        className={cn(
          "flex-shrink-0 transition-all",
          collapsed ? "h-[18px] w-[18px]" : "h-[14px] w-[14px]",
        )}
      />
      {!collapsed && (
        <>
          <span className={cn("text-[13px]", item.external && "flex-1")}>
            {item.name}
          </span>
          {item.external && (
            <ExternalLink className="h-[14px] w-[14px] text-slate-400" />
          )}
        </>
      )}
    </>
  );

  const link = item.external ? (
    <a
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClassName}
    >
      {linkContent}
    </a>
  ) : (
    <Link href={item.href} className={linkClassName}>
      {linkContent}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.name}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

function NavGroupComponent({
  group,
  pathname,
  collapsed,
}: {
  group: NavGroup;
  pathname: string;
  collapsed: boolean;
}) {
  const hasActiveItem = group.items.some(
    (item) =>
      pathname === item.href ||
      (item.href !== "/" && pathname.startsWith(item.href)),
  );
  const [isOpen, setIsOpen] = useState(hasActiveItem);

  const parentButton = (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      className={cn(
        "admin-pressable flex w-full items-center rounded-lg border border-transparent text-[13px] leading-tight",
        collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2.5",
        "font-normal text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]",
      )}
    >
      <group.icon
        className={cn(
          "flex-shrink-0 transition-all",
          collapsed ? "h-[18px] w-[18px]" : "h-[14px] w-[14px]",
        )}
      />
      {!collapsed && (
        <>
          <span className="flex-1 text-left text-[13px]">{group.name}</span>
          <ChevronDown
            className={cn(
              "h-[14px] w-[14px] transition-transform duration-200",
              isOpen ? "rotate-180" : "",
              "text-[#cccccc]",
            )}
          />
        </>
      )}
    </button>
  );

  return (
    <div className="space-y-1">
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{parentButton}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {group.name}
          </TooltipContent>
        </Tooltip>
      ) : (
        parentButton
      )}

      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          collapsed ? "space-y-1 pl-0" : "relative ml-4 space-y-1 pl-4",
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
          !collapsed &&
            "before:absolute before:top-2 before:bottom-2 before:left-1 before:w-px before:bg-[#eeeeee]",
        )}
      >
        {group.items.map((item) => {
          if (item.isLabel) {
            if (collapsed) return null;
            return (
              <div
                key={item.name}
                className="relative px-3 pt-2.5 pb-1 text-[13px] font-semibold uppercase tracking-wider text-[#cccccc] before:absolute before:left-[-12px] before:top-[18px] before:h-px before:w-3 before:bg-[#eeeeee]"
              >
                {item.name}
              </div>
            );
          }

          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const childLink = (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "admin-pressable flex items-center rounded-lg border border-transparent text-[13px] leading-tight",
                collapsed
                  ? "justify-center px-0 py-2.5"
                  : "relative px-3 py-2 before:absolute before:left-[-12px] before:top-1/2 before:h-px before:w-3 before:bg-[#eeeeee]",
                isActive
                  ? "bg-[#f5f5f7] font-semibold text-[#1d1d1f]"
                  : "font-normal text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]",
              )}
            >
              {collapsed && (
                <item.icon className="h-[18px] w-[18px] flex-shrink-0 transition-all" />
              )}
              {!collapsed && <span className="text-[13px]">{item.name}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>{childLink}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.name}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <span key={item.name}>{childLink}</span>;
        })}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const visibleNavigation = filterNavigation(navigation, user?.adminRole);

  const [collapsed, setCollapsed] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setPasswordError("");
  };

  const handlePasswordChange = async () => {
    setPasswordError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("모든 필드를 입력해주세요.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    if (newPassword.length < 4) {
      setPasswordError("새 비밀번호는 4자 이상이어야 합니다.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || "비밀번호 변경에 실패했습니다.");
        return;
      }

      toast.success("비밀번호가 변경되었습니다.");
      setIsPasswordDialogOpen(false);
      resetPasswordForm();
    } catch {
      setPasswordError("비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <aside
      className={cn(
        "admin-sidebar z-20 flex flex-col justify-between py-5 transition-all duration-300",
        collapsed ? "w-16" : "w-56",
      )}
    >
      {/* Top section */}
      <div className="flex flex-col gap-4">
        {/* Logo Area + Toggle */}
        <div className="relative flex flex-col items-center px-2">
          <Link
            href="/"
            className={cn(
              "flex flex-col items-center gap-1.5 py-1",
              collapsed && "gap-0",
            )}
          >
            <Image
              src="/acg_ci_gray.png"
              alt="ACG Logo"
              width={100}
              height={40}
              className={cn(
                "w-auto transition-all duration-300",
                collapsed ? "h-5" : "h-6",
              )}
            />
            {!collapsed && (
              <h1 className="text-[13px] font-medium tracking-[-0.01em] text-[#1d1d1f]">
                비용 관리 Admin
              </h1>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "admin-pressable flex items-center justify-center rounded-lg border border-transparent p-1.5 text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]",
              collapsed ? "mt-2" : "absolute right-0 top-0",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-[18px] w-[18px]" />
            ) : (
              <PanelLeftClose className="h-[14px] w-[14px]" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className={cn("flex flex-col gap-1", collapsed ? "px-2" : "")}>
          {visibleNavigation.map((item) => {
            if (isNavGroup(item)) {
              return (
                <NavGroupComponent
                  key={item.name}
                  group={item}
                  pathname={pathname}
                  collapsed={collapsed}
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
                collapsed={collapsed}
              />
            );
          })}
        </nav>
      </div>

      {/* User Profile Bottom */}
      <div className={cn("flex flex-col gap-4", collapsed ? "px-2" : "")}>
        <div className="h-px w-full bg-black/8" />

        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setIsPasswordDialogOpen(true)}
                className="admin-pressable flex w-full cursor-pointer items-center justify-center rounded-lg border border-transparent p-2 hover:bg-[#f5f5f7]"
              >
                <span className="text-[13px] font-bold text-[#1d1d1f]">
                  {user?.fullName?.charAt(0) || "A"}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {user?.fullName || "Admin"}
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={() => setIsPasswordDialogOpen(true)}
            className="admin-pressable flex w-full cursor-pointer items-center justify-between rounded-lg border border-transparent px-3 py-2.5 hover:bg-[#f5f5f7]"
          >
            <div className="flex flex-col items-start leading-tight">
              <p className="text-[13px] font-semibold text-[#1d1d1f]">
                {user?.fullName || "Admin"}
              </p>
              <p className="text-[13px] text-[#7a7a7a]">
                {user?.adminRole ?? (user?.role === "admin" ? "관리자" : "사용자")}
              </p>
            </div>
            {user?.hireDate && (
              <span className="rounded-full border border-black/8 bg-[#fafafc] px-2 py-0.5 text-[13px] font-semibold text-[#7a7a7a]">
                D+{dayjs().diff(dayjs(user.hireDate), "day")}
              </span>
            )}
          </button>
        )}

        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={logout}
                className="admin-pressable flex w-full items-center justify-center rounded-lg border border-black/8 py-2.5 text-[13px] font-medium text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
              >
                <LogOut className="h-[14px] w-[14px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              로그아웃
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={logout}
            className="admin-pressable flex w-full items-center justify-start gap-2 rounded-lg border border-black/8 px-3 py-2.5 text-[13px] font-medium text-[#7a7a7a] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
          >
            <LogOut className="h-[14px] w-[14px]" />
            <span>로그아웃</span>
          </button>
        )}
      </div>

      {/* Password Change Dialog */}
      <Dialog
        open={isPasswordDialogOpen}
        onOpenChange={(open) => {
          setIsPasswordDialogOpen(open);
          if (!open) resetPasswordForm();
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              비밀번호 변경
            </DialogTitle>
            <DialogDescription>
              현재 비밀번호를 확인한 후 새 비밀번호로 변경합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">현재 비밀번호</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">새 비밀번호</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type={showNewPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {passwordError && (
              <p className="text-sm text-red-500">{passwordError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPasswordDialogOpen(false);
                resetPasswordForm();
              }}
            >
              취소
            </Button>
            <Button
              onClick={handlePasswordChange}
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  변경 중...
                </>
              ) : (
                "변경"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
