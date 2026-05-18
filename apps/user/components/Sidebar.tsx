"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock,
  AlarmClock,
  UtensilsCrossed,
  Wallet,
  UserPen,
  Megaphone,
  DoorOpen,
  MessageSquareText,
  ClipboardCheck,
  LogOut,
  X,
  Bell,
  BellOff,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FolderKanban,
  Inbox,
  LayoutDashboard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import LOGO from "@/public/images/ACG_LOGO_GRAY.png";
import { useUserStore } from "@/stores/userStore";
import { useSidebarStore } from "@/stores/sidebarStore";
import {
  isPushSupported,
  isIOSSafari,
  subscribeToPush,
  getExistingSubscription,
} from "@/lib/push-notifications";
import { toast } from "@repo/ui/src/sonner";
import { useAttendance, useCheckIn, useCheckOut } from "@/hooks/use-attendance";
import AttendanceConfirmDialog from "./dashboard/AttendanceConfirmDialog";
import { useMemberIdLookup } from "@/hooks/use-points-data";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useEffect, useState, useCallback } from "react";

dayjs.extend(utc);
dayjs.extend(timezone);

// ─── Menu Configuration ───

interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  external?: boolean;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
  href?: string;
  icon?: LucideIcon;
  external?: boolean;
}

const menuGroups: MenuGroup[] = [
  {
    label: "근태",
    items: [
      { id: "attendance", label: "근태 관리", href: "/attendance", icon: Clock },
      { id: "overtime", label: "시간외 근무 관리", href: "/overtime", icon: AlarmClock },
    ],
  },
  {
    label: "복지",
    items: [
      { id: "meals", label: "식대", href: "/meal", icon: UtensilsCrossed },
      { id: "points", label: "복지포인트/활동비", href: "/points", icon: Wallet },
    ],
  },
  {
    label: "기타",
    items: [
      { id: "profile", label: "내 정보", href: "/profile", icon: UserPen },
      { id: "notices", label: "공지/일정", href: "/notices", icon: Megaphone, badge: "New" },
      { id: "room", label: "회의실 예약", href: "/room-booking", icon: DoorOpen },
      { id: "sms", label: "SMS 전송", href: "/sms", icon: MessageSquareText },
      { id: "evaluations", label: "다면평가", href: "/evaluations", icon: ClipboardCheck },
    ],
  },
  {
    label: "업무 / 프로젝트",
    items: [
      {
        id: "project-dashboard",
        label: "대시보드",
        href: "/project-dashboard",
        icon: LayoutDashboard,
      },
      { id: "projects", label: "프로젝트", href: "/projects", icon: FolderKanban },
      { id: "requests", label: "업무 요청", href: "/requests", icon: Inbox },
    ],
  },
  {
    label: "ACG 라이프",
    items: [],
    href: "/acg-life",
  },
  {
    label: "감독관/면접교육 운영",
    items: [],
    href: "/part-time-supervisor",
    icon: ExternalLink,
    external: true,
  },
];

// ─── Helpers ───

const SIDEBAR_ICON_STROKE_WIDTH = 1.25;

function formatTime(isoString: string) {
  return dayjs(isoString).tz("Asia/Seoul").format("HH:mm");
}

function formatTimeWithSeconds(isoString: string) {
  return dayjs(isoString).tz("Asia/Seoul").format("HH:mm:ss");
}

function formatElapsedTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

// ─── Sub-components ───

function UserInfoCard() {
  const { userName, memberRole, hireDate } = useUserStore();

  const daysFromHire = hireDate ? dayjs().diff(dayjs(hireDate), "day") : null;

  return (
    <Link href="/profile" className="block">
      <div className="mx-3 mb-4 rounded-xl bg-[#f9f9fa] px-4 py-3 transition-colors hover:bg-[#f0f0f1]">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#111111]">
              {userName || "사용자"}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {memberRole || "팀원"} · ACG
            </p>
          </div>
          {daysFromHire !== null && (
            <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 shadow-sm">
              D+{daysFromHire}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function AttendanceSection({ memberId }: { memberId: string | null }) {
  const todayStr = dayjs().tz("Asia/Seoul").format("YYYY-MM-DD");
  const { data: attendance } = useAttendance(memberId, todayStr);
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const hasCheckedIn = !!attendance?.check_in_at;
  const hasCheckedOut = !!attendance?.check_out_at;
  const isMutating = checkInMutation.isPending || checkOutMutation.isPending;
  const isWorking = hasCheckedIn && !hasCheckedOut;
  const statusBadge = !memberId
    ? { label: "동기화중", className: "bg-slate-100 text-slate-400" }
    : hasCheckedOut
      ? { label: "퇴근완료", className: "bg-slate-100 text-slate-500" }
      : hasCheckedIn
        ? { label: "근무중", className: "bg-emerald-50 text-emerald-600" }
        : { label: "미출근", className: "bg-amber-50 text-amber-600" };
  const elapsedTime =
    isWorking && attendance?.check_in_at
      ? formatElapsedTime(now - new Date(attendance.check_in_at).getTime())
      : null;

  useEffect(() => {
    if (!isWorking) return;

    setNow(Date.now());
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, [isWorking, attendance?.check_in_at]);

  const handleCheckIn = () => {
    if (!memberId) {
      toast.error("사용자 정보를 동기화하는 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    checkInMutation.mutate(memberId, {
      onSuccess: () => setCheckInDialogOpen(false),
    });
  };
  const handleCheckOut = (earlyLeaveReason?: string) => {
    if (!memberId) {
      toast.error("사용자 정보를 동기화하는 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    checkOutMutation.mutate(
      { memberId, earlyLeaveReason },
      { onSuccess: () => setCheckOutDialogOpen(false) }
    );
  };

  return (
    <>
    <div className="mx-3 mb-4">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
          출퇴근
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge.className}`}
        >
          {statusBadge.label}
        </span>
      </div>
      {!hasCheckedIn ? (
        <button
          onClick={() => setCheckInDialogOpen(true)}
          disabled={isMutating || !memberId}
          className="w-full rounded-lg bg-[#111111] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#222222] disabled:opacity-50"
        >
          출근하기
        </button>
      ) : !hasCheckedOut ? (
        <div className="space-y-2">
          {elapsedTime && (
            <div className="rounded-lg border border-emerald-100 bg-white px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-slate-400">
                  출근 시간
                </p>
                <p className="font-mono text-[11px] font-medium tabular-nums text-slate-500">
                  {formatTimeWithSeconds(attendance!.check_in_at!)}
                </p>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-slate-400">
                  근무 경과
                </p>
                <p className="font-mono text-[11px] font-medium tabular-nums text-slate-500">
                  {elapsedTime}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={() => setCheckOutDialogOpen(true)}
            disabled={isMutating || !memberId}
            className="w-full rounded-lg border border-[#f3f3f3] py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-[#f9f9fa] disabled:opacity-50"
          >
            퇴근하기
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-[#f9f9fa] px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <circle cx="8" cy="8" r="7" stroke="#22c55e" strokeWidth="1.5" />
            <path d="M5 8.5L7 10.5L11 6" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-xs text-slate-500">
            {formatTime(attendance!.check_in_at!)} → {formatTime(attendance!.check_out_at!)}
          </span>
        </div>
      )}
    </div>
    <AttendanceConfirmDialog
      mode="check-in"
      open={checkInDialogOpen}
      onOpenChange={setCheckInDialogOpen}
      onConfirm={handleCheckIn}
      isPending={checkInMutation.isPending}
    />
    <AttendanceConfirmDialog
      mode="check-out"
      open={checkOutDialogOpen}
      onOpenChange={setCheckOutDialogOpen}
      onConfirm={handleCheckOut}
      isPending={checkOutMutation.isPending}
      checkInAt={attendance?.check_in_at}
    />
    </>
  );
}

function NavMenu() {
  const pathname = usePathname();
  const { close } = useSidebarStore();

  // 현재 활성 경로가 포함된 그룹은 기본 열림
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    menuGroups.forEach((group) => {
      const hasActive = group.items.some((item) => pathname.startsWith(item.href));
      initial[group.label] = !hasActive;
    });
    return initial;
  });

  const toggleGroup = useCallback((label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  }, []);

  return (
    <nav className="flex-1 overflow-y-auto px-3">
      {menuGroups.map((group) => {
        // 링크 그룹: 제목 자체가 링크 (외부 또는 내부)
        if (group.href) {
          const Icon = group.icon;
          const isActive = pathname === group.href;
          return (
            <div key={group.label} className="mb-4">
              {group.external ? (
                <a
                  href={group.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={close}
                  className="flex w-full items-center justify-between px-1 mb-1.5 group"
                >
                  <p className="text-sm font-semibold text-slate-700">
                    {group.label}
                  </p>
                  {Icon && (
                    <Icon
                      size={14}
                      strokeWidth={SIDEBAR_ICON_STROKE_WIDTH}
                      className="text-slate-300 group-hover:text-slate-400"
                    />
                  )}
                </a>
              ) : (
                <Link
                  href={group.href}
                  onClick={close}
                  className="flex w-full items-center justify-between px-1 mb-1.5 group"
                >
                  <p className={`text-sm font-semibold transition-colors duration-200 ${
                    isActive ? "text-[#111111]" : "text-slate-700 group-hover:text-[#111111]"
                  }`}>
                    {group.label}
                  </p>
                  <ChevronRight
                    size={14}
                    strokeWidth={SIDEBAR_ICON_STROKE_WIDTH}
                    className="text-slate-300 transition-colors duration-200 group-hover:text-slate-500"
                  />
                </Link>
              )}
            </div>
          );
        }

        const isCollapsed = collapsed[group.label];
        return (
          <div key={group.label} className="mb-4">
            <button
              onClick={() => toggleGroup(group.label)}
              className="flex w-full items-center justify-between px-1 mb-1.5 group"
            >
              <p className="text-sm font-semibold text-slate-700">
                {group.label}
              </p>
              <ChevronDown
                size={14}
                strokeWidth={SIDEBAR_ICON_STROKE_WIDTH}
                className={`text-slate-300 transition-transform duration-200 group-hover:text-slate-400 ${
                  isCollapsed ? "-rotate-90" : ""
                }`}
              />
            </button>
            {!isCollapsed && (
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const className = `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-[#111111] font-medium text-white"
                      : "text-slate-500 hover:bg-[#f9f9fa] hover:text-[#111111]"
                  }`;

                  const content = (
                    <>
                      <item.icon
                        size={18}
                        strokeWidth={SIDEBAR_ICON_STROKE_WIDTH}
                        className="shrink-0"
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                          {item.badge}
                        </span>
                      )}
                    </>
                  );

                  return item.external ? (
                    <a
                      key={item.id}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={close}
                      className={className}
                    >
                      {content}
                    </a>
                  ) : (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={close}
                      className={className}
                    >
                      {content}
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

// ─── Notification Toggle ───

function NotificationToggle() {
  const { userId } = useUserStore();
  const [status, setStatus] = useState<"loading" | "unsupported" | "denied" | "subscribed" | "unsubscribed">("loading");

  useEffect(() => {
    if (!userId) return;

    const isStandalone =
      "standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

    if (isIOSSafari() && !isStandalone) {
      setStatus("unsupported");
      return;
    }

    if (!isPushSupported()) {
      setStatus("unsupported");
      return;
    }

    const permission = Notification.permission;
    if (permission === "denied") {
      setStatus("denied");
      return;
    }

    if (permission === "granted") {
      getExistingSubscription().then((sub) => {
        setStatus(sub ? "subscribed" : "unsubscribed");
      });
      return;
    }

    setStatus("unsubscribed");
  }, [userId]);

  const handleToggle = useCallback(async () => {
    if (!userId) return;

    if (status === "unsubscribed") {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        const success = await subscribeToPush(userId);
        if (success) {
          setStatus("subscribed");
          toast.success("알림이 설정되었습니다");
        } else {
          toast.error("알림 등록에 실패했습니다");
        }
      } else if (result === "denied") {
        setStatus("denied");
      }
    }
  }, [userId, status]);

  if (status === "loading" || status === "unsupported") return null;

  const isSubscribed = status === "subscribed";
  const isDenied = status === "denied";

  return (
    <button
      onClick={handleToggle}
      disabled={isSubscribed || isDenied}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-[#f9f9fa] hover:text-slate-500 disabled:hover:bg-transparent disabled:hover:text-slate-400"
    >
      {isSubscribed ? (
        <Bell size={18} strokeWidth={SIDEBAR_ICON_STROKE_WIDTH} />
      ) : (
        <BellOff size={18} strokeWidth={SIDEBAR_ICON_STROKE_WIDTH} />
      )}
      <span className="flex-1 text-left">
        {isSubscribed ? "알림 켜짐" : isDenied ? "알림 차단됨" : "알림 받기"}
      </span>
      {isSubscribed && (
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      )}
    </button>
  );
}

// ─── Main Sidebar ───

export function Sidebar() {
  const router = useRouter();
  const { userName, memberId, setMemberInfo, logout } = useUserStore();
  const { data: memberLookup } = useMemberIdLookup(userName);
  const resolvedMemberId = memberLookup?.id ?? memberId;

  useEffect(() => {
    if (memberLookup && memberLookup.id !== memberId) {
      setMemberInfo(memberLookup.id, memberLookup.member_role || "팀원", memberLookup.hire_date);
    }
  }, [memberLookup, memberId, setMemberInfo]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    logout();
    router.push("/");
  };

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-[#f3f3f3] bg-white py-5 text-slate-900">
      {/* Logo */}
      <Link href="/dashboard" className="mb-5 flex items-center gap-2 px-5">
        <Image src={LOGO} alt="ACG" width={48} height={48} className="h-12 w-12 object-contain" />
        <p className="text-sm text-[#111111]">ACG 그룹웨어</p>
      </Link>

      {/* User Info */}
      <UserInfoCard />

      {/* Attendance */}
      <AttendanceSection memberId={resolvedMemberId} />

      {/* Navigation (scrollable) */}
      <NavMenu />

      {/* Bottom actions */}
      <div className="px-3 space-y-0.5 pt-2">
        <NotificationToggle />
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-[#f9f9fa] hover:text-slate-500"
        >
          <LogOut size={18} strokeWidth={SIDEBAR_ICON_STROKE_WIDTH} />
          로그아웃
        </button>
      </div>
    </aside>
  );
}

// ─── Mobile Sidebar (overlay) ───

export function MobileSidebar() {
  const router = useRouter();
  const { isOpen, close } = useSidebarStore();
  const { userName, memberId, setMemberInfo, logout } = useUserStore();
  const { data: memberLookup } = useMemberIdLookup(userName);
  const resolvedMemberId = memberLookup?.id ?? memberId;

  useEffect(() => {
    if (memberLookup && memberLookup.id !== memberId) {
      setMemberInfo(memberLookup.id, memberLookup.member_role || "팀원", memberLookup.hire_date);
    }
  }, [memberLookup, memberId, setMemberInfo]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    close();
    logout();
    router.push("/");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            className="fixed inset-0 z-[60] bg-black/50"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-[70] flex w-[280px] flex-col bg-white py-5"
          >
            {/* Header with close */}
            <div className="mb-5 flex items-center justify-between px-5">
              <div className="flex items-center gap-2">
                <Image src={LOGO} alt="ACG" width={48} height={48} className="h-12 w-12 object-contain" />
                <p className="text-sm text-[#111111]">ACG 그룹웨어</p>
              </div>
              <button
                onClick={close}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-[#f9f9fa] hover:text-slate-600"
              >
                <X size={20} strokeWidth={SIDEBAR_ICON_STROKE_WIDTH} />
              </button>
            </div>

            {/* User Info */}
            <UserInfoCard />

            {/* Attendance */}
            <AttendanceSection memberId={resolvedMemberId} />

            {/* Navigation (scrollable) */}
            <NavMenu />

            {/* Bottom actions */}
            <div className="px-3 space-y-0.5 pt-2">
              <NotificationToggle />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-[#f9f9fa] hover:text-slate-500"
              >
                <LogOut size={18} strokeWidth={SIDEBAR_ICON_STROKE_WIDTH} />
                로그아웃
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
