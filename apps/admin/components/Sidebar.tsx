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
  CalendarClock,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
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
    name: "근태 관리",
    href: "/dayoffs",
    icon: CalendarClock,
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
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}) {
  const link = (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center rounded-xl text-sm transition-colors",
        collapsed ? "justify-center px-0 py-3" : "gap-2.5 px-4 py-3",
        isActive
          ? "bg-white font-semibold text-slate-900"
          : "font-medium text-slate-400 hover:bg-white/60 hover:text-slate-600",
      )}
    >
      <item.icon
        className={cn(
          "flex-shrink-0 transition-all",
          collapsed ? "h-5 w-5" : "h-4 w-4",
        )}
      />
      {!collapsed && <span>{item.name}</span>}
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
        "flex w-full items-center rounded-xl text-sm transition-colors",
        collapsed ? "justify-center px-0 py-3" : "gap-2.5 px-4 py-3",
        hasActiveItem
          ? "font-semibold text-slate-900"
          : "font-medium text-slate-400 hover:bg-white/60 hover:text-slate-600",
      )}
    >
      <group.icon
        className={cn(
          "flex-shrink-0 transition-all",
          collapsed ? "h-5 w-5" : "h-4 w-4",
        )}
      />
      {!collapsed && (
        <>
          <span className="flex-1 text-left">{group.name}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isOpen ? "rotate-180" : "",
              hasActiveItem ? "text-slate-500" : "text-slate-400",
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
          "space-y-1 overflow-hidden transition-all duration-200",
          collapsed ? "pl-0" : "pl-4",
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        {group.items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const childLink = (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center rounded-xl text-sm transition-colors",
                collapsed
                  ? "justify-center px-0 py-2.5"
                  : "gap-2 px-4 py-2.5",
                isActive
                  ? "bg-white font-bold text-slate-900"
                  : "font-medium text-slate-400 hover:bg-white/60 hover:text-slate-600",
              )}
            >
              <item.icon
                className={cn(
                  "flex-shrink-0 transition-all",
                  collapsed ? "h-4.5 w-4.5" : "h-3.5 w-3.5",
                )}
              />
              {!collapsed && <span>{item.name}</span>}
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
        "glass-sidebar z-20 flex flex-col justify-between py-5 transition-all duration-300",
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
              "flex flex-col items-center gap-3 py-1",
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
              <h1 className="text-sm font-medium tracking-tight text-slate-900">
                비용 관리 Admin
              </h1>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex items-center justify-center rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/60 hover:text-slate-600",
              collapsed ? "mt-2" : "absolute right-0 top-0",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className={cn("flex flex-col gap-1", collapsed ? "px-2" : "")}>
          {navigation.map((item) => {
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
        <div className="h-[1px] w-full bg-slate-200/50" />

        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setIsPasswordDialogOpen(true)}
                className="flex w-full cursor-pointer items-center justify-center rounded-lg p-2 transition-colors hover:bg-white/60"
              >
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-blue-600 text-xs font-bold text-white">
                  {user?.fullName?.charAt(0) || "A"}
                </div>
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
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white/60"
          >
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-blue-600 text-sm font-bold text-white">
              {user?.fullName?.charAt(0) || "A"}
            </div>
            <div className="flex flex-col items-start">
              <p className="text-xs font-bold text-slate-900">
                {user?.fullName || "Admin"}
              </p>
              <p className="text-[11px] text-slate-500">
                {user?.role === "admin" ? "관리자" : "사용자"}
              </p>
            </div>
          </button>
        )}

        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={logout}
                className="flex w-full items-center justify-center rounded-lg border border-slate-200/50 py-3 text-xs font-medium text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-700"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              로그아웃
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={logout}
            className="flex w-full items-center justify-start gap-2 rounded-lg border border-slate-200/50 px-4 py-3.5 text-xs font-medium text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-700"
          >
            <LogOut className="h-4 w-4" />
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
