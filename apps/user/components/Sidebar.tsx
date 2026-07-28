"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock,
  Wallet,
  X,
  Bell,
  BellOff,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FolderKanban,
  Ellipsis,
  Heart,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import LOGO from "@/public/images/ACG_LOGO_GRAY.png";
import { useUserStore } from "@/stores/userStore";
import { useSidebarStore } from "@/stores/sidebarStore";
import {
  isPushSupported,
  subscribeToPush,
  getExistingSubscription,
} from "@/lib/push-notifications";
import { toast } from "@repo/ui/src/sonner";
import { Skeleton } from "@repo/ui/src/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/src/tooltip";
import { useAttendance, useCheckIn, useCheckOut } from "@/hooks/use-attendance";
import { getAttendanceStatusInfos } from "@/lib/attendance-status";
import AttendanceConfirmDialog from "./dashboard/AttendanceConfirmDialog";
import { useMemberIdLookup } from "@/hooks/use-points-data";
import { useProfile } from "@/hooks/use-profile";
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
    icon: Clock,
    items: [
      {
        id: "attendance-stats",
        label: "근태/연차 관리",
        href: "/attendance-stats",
      },
      {
        id: "overtime",
        label: "시간외 근무 관리",
        href: "/overtime",
      },
    ],
  },
  {
    label: "복지",
    icon: Wallet,
    items: [
      { id: "meals", label: "식대", href: "/meal" },
      {
        id: "points",
        label: "복지포인트/활동비",
        href: "/points",
      },
    ],
  },
  {
    label: "기타",
    icon: Ellipsis,
    items: [
      { id: "profile", label: "내 정보", href: "/profile" },
      {
        id: "notices",
        label: "공지/일정",
        href: "/notices",
        badge: "New",
      },
      {
        id: "room",
        label: "회의실 예약",
        href: "/room-booking",
      },
      {
        id: "lockers",
        label: "개인 사물함",
        href: "/lockers",
      },
      {
        id: "assets",
        label: "물품관리대장",
        href: "/assets",
      },
      {
        id: "vehicles",
        label: "사내 차량",
        href: "/vehicles",
      },
      {
        id: "library",
        label: "도서관",
        href: "/library",
      },
      {
        id: "offboarding",
        label: "오프보딩",
        href: "/offboarding",
      },
      {
        id: "seating",
        label: "좌석",
        href: "/seating",
      },
      {
        id: "parking",
        label: "주차",
        href: "/parking",
      },
      {
        id: "corporate-cards",
        label: "기업카드",
        href: "/corporate-cards",
      },
      {
        id: "company-documents",
        label: "전사 자료실",
        href: "/company-documents",
      },
      {
        id: "evaluations",
        label: "다면평가",
        href: "/evaluations",
      },
    ],
  },
  {
    label: "업무 / 프로젝트",
    icon: FolderKanban,
    items: [
      {
        id: "project-dashboard",
        label: "대시보드",
        href: "/project-dashboard",
      },
      {
        id: "projects",
        label: "프로젝트",
        href: "/projects",
      },
      { id: "requests", label: "업무 요청", href: "/requests" },
    ],
  },
  {
    label: "ACG 라이프",
    items: [],
    href: "/acg-life",
    icon: Heart,
  },
  {
    label: "감독관/면접교육 운영",
    items: [],
    href: "/api/auth/sso/part-time",
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

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
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

export function AttendanceSection({
  memberId,
  className = "mx-3 mb-4",
}: {
  memberId: string | null;
  className?: string;
}) {
  const todayStr = dayjs().tz("Asia/Seoul").format("YYYY-MM-DD");
  const { data: attendance, isLoading } = useAttendance(memberId, todayStr);
  const { data: profile } = useProfile(memberId);
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
  const attendanceType = attendance?.check_in_at
    ? attendance.attendance_type || "출근"
    : null;
  const checkInStatus = attendance?.check_in_at
    ? getAttendanceStatusInfos(attendance)[0]
    : null;
  const checkInStatusBadgeClass =
    checkInStatus?.text === "지각"
      ? "bg-rose-50 text-rose-600"
      : checkInStatus?.text === "조기출근"
        ? "bg-blue-50 text-blue-600"
        : "bg-emerald-50 text-emerald-600";
  const attendanceStatusTime = attendance?.check_in_at
    ? formatTimeWithSeconds(attendance.check_in_at)
    : null;

  useEffect(() => {
    if (!isWorking) return;

    setNow(Date.now());
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, [isWorking, attendance?.check_in_at]);

  const handleCheckIn = () => {
    if (!memberId) {
      toast.error(
        "사용자 정보를 동기화하는 중입니다. 잠시 후 다시 시도해 주세요.",
      );
      return;
    }

    checkInMutation.mutate(memberId, {
      onSuccess: () => setCheckInDialogOpen(false),
    });
  };
  const handleCheckOut = (earlyLeaveReason?: string) => {
    if (!memberId) {
      toast.error(
        "사용자 정보를 동기화하는 중입니다. 잠시 후 다시 시도해 주세요.",
      );
      return;
    }

    checkOutMutation.mutate(
      { memberId, earlyLeaveReason },
      { onSuccess: () => setCheckOutDialogOpen(false) },
    );
  };

  if (!memberId || isLoading) {
    return (
      <div
        className={className}
        aria-busy="true"
        aria-label="근태현황 불러오는 중"
      >
        <div className="mb-2 flex items-center justify-between px-1">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <>
      <div className={className}>
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
            근태현황
          </p>
          <div className="flex items-center gap-1.5">
            {isWorking && checkInStatus && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${checkInStatusBadgeClass}`}
              >
                {checkInStatus.text}
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
          </div>
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
              <div className="rounded-lg bg-slate-50 px-3 py-2.5">
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
          <div className="space-y-2 rounded-lg bg-[#f9f9fa] px-3 py-2">
            {attendanceType && (
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-semibold text-[#131313]">
                  {attendanceType}
                </p>
                {attendanceStatusTime && (
                  <p className="shrink-0 text-[11px] font-medium tabular-nums text-slate-500">
                    {attendanceStatusTime}
                  </p>
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                className="shrink-0"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="7"
                  stroke="#22c55e"
                  strokeWidth="1.5"
                />
                <path
                  d="M5 8.5L7 10.5L11 6"
                  stroke="#22c55e"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-xs text-slate-500">
                {formatTime(attendance!.check_in_at!)} →{" "}
                {formatTime(attendance!.check_out_at!)}
              </span>
            </div>
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
        birthDate={profile?.birth_date}
      />
    </>
  );
}

function NavMenu({
  iconOnly = false,
  onExpand,
}: {
  iconOnly?: boolean;
  onExpand?: () => void;
}) {
  const pathname = usePathname();
  const { close } = useSidebarStore();

  // 현재 활성 경로가 포함된 그룹은 기본 열림
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    menuGroups.forEach((group) => {
      const hasActive = group.items.some((item) =>
        pathname.startsWith(item.href),
      );
      initial[group.label] = !hasActive;
    });
    return initial;
  });

  const toggleGroup = useCallback((label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  }, []);

  if (iconOnly) {
    return (
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-1">
        {menuGroups.map((group) => {
          const Icon = group.icon;
          if (!Icon) return null;
          const isActive = group.href
            ? pathname === group.href || pathname.startsWith(`${group.href}/`)
            : group.items.some(
                (item) =>
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`),
              );
          const className = `flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
            isActive
              ? "bg-[#111111] text-white"
              : "text-slate-500 hover:bg-[#f3f3f3] hover:text-[#111111]"
          }`;
          const control = group.href ? (
            group.external ? (
              <a
                href={group.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className={className}
                aria-label={group.label}
              >
                <Icon size={18} strokeWidth={SIDEBAR_ICON_STROKE_WIDTH} />
              </a>
            ) : (
              <Link
                href={group.href}
                onClick={close}
                className={className}
                aria-label={group.label}
              >
                <Icon size={18} strokeWidth={SIDEBAR_ICON_STROKE_WIDTH} />
              </Link>
            )
          ) : (
            <button
              type="button"
              onClick={() => {
                setCollapsed((current) => ({
                  ...current,
                  [group.label]: false,
                }));
                onExpand?.();
              }}
              className={className}
              aria-label={`${group.label} 메뉴 펼치기`}
            >
              <Icon size={18} strokeWidth={SIDEBAR_ICON_STROKE_WIDTH} />
            </button>
          );

          return (
            <Tooltip key={group.label}>
              <TooltipTrigger asChild>{control}</TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {group.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2">
      {menuGroups.map((group) => {
        const Icon = group.icon;
        // 링크 그룹: 제목 자체가 링크 (외부 또는 내부)
        if (group.href) {
          const isActive = pathname === group.href;
          return (
            <div key={group.label}>
              {group.external ? (
                <a
                  href={group.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={close}
                  className="group flex h-8 w-full items-center gap-2 rounded-md p-2"
                >
                  {Icon && (
                    <Icon
                      size={16}
                      strokeWidth={SIDEBAR_ICON_STROKE_WIDTH}
                      className="shrink-0 text-slate-500"
                    />
                  )}
                  <p className="flex-1 text-left text-sm font-medium text-slate-700">
                    {group.label}
                  </p>
                </a>
              ) : (
                <Link
                  href={group.href}
                  onClick={close}
                  className="group flex h-8 w-full items-center gap-2 rounded-md p-2"
                >
                  {Icon && (
                    <Icon
                      size={16}
                      strokeWidth={SIDEBAR_ICON_STROKE_WIDTH}
                      className="shrink-0 text-slate-500"
                    />
                  )}
                  <p
                    className={`flex-1 text-left text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? "text-[#111111]"
                        : "text-slate-700 group-hover:text-[#111111]"
                    }`}
                  >
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
          <div key={group.label}>
            <button
              onClick={() => toggleGroup(group.label)}
              className="group flex h-8 w-full items-center gap-2 rounded-md p-2"
            >
              {Icon && (
                <Icon
                  size={16}
                  strokeWidth={SIDEBAR_ICON_STROKE_WIDTH}
                  className="shrink-0 text-slate-500"
                />
              )}
              <p className="flex-1 text-left text-sm font-medium text-slate-700">
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
              <div className="mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-slate-200 px-2.5 py-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  const className = `flex h-7 min-w-0 -translate-x-px items-center overflow-hidden rounded-md px-2 text-sm transition-colors ${
                    isActive
                      ? "bg-[#111111] font-medium text-white"
                      : "text-slate-500 hover:bg-[#f9f9fa] hover:text-[#111111]"
                  }`;

                  const content = (
                    <>
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

function NotificationToggle({ iconOnly = false }: { iconOnly?: boolean }) {
  const { userId } = useUserStore();
  const [status, setStatus] = useState<
    "loading" | "unsupported" | "denied" | "subscribed" | "unsubscribed"
  >("loading");

  useEffect(() => {
    if (!userId) return;

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
      className={`flex w-full items-center rounded-lg py-2.5 text-sm text-slate-400 transition-colors hover:bg-[#f9f9fa] hover:text-slate-500 disabled:hover:bg-transparent disabled:hover:text-slate-400 ${
        iconOnly ? "justify-center px-0" : "gap-3 px-3"
      }`}
      aria-label={
        isSubscribed ? "알림 켜짐" : isDenied ? "알림 차단됨" : "알림 받기"
      }
    >
      {isSubscribed ? (
        <Bell size={18} strokeWidth={SIDEBAR_ICON_STROKE_WIDTH} />
      ) : (
        <BellOff size={18} strokeWidth={SIDEBAR_ICON_STROKE_WIDTH} />
      )}
      <span className={iconOnly ? "sr-only" : "flex-1 text-left"}>
        {isSubscribed ? "알림 켜짐" : isDenied ? "알림 차단됨" : "알림 받기"}
      </span>
      {isSubscribed && !iconOnly && (
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      )}
    </button>
  );
}

// ─── Main Sidebar ───

export function Sidebar() {
  const { isCollapsed, toggleCollapsed } = useSidebarStore();
  const { userName, memberId, memberRole, setMemberInfo } = useUserStore();
  const { data: memberLookup } = useMemberIdLookup(userName);
  const resolvedMemberId = memberLookup?.id ?? memberId;

  useEffect(() => {
    if (
      memberLookup &&
      (memberLookup.id !== memberId || memberLookup.member_role !== memberRole)
    ) {
      setMemberInfo(
        memberLookup.id,
        memberLookup.member_role || "팀원",
        memberLookup.hire_date,
      );
    }
  }, [memberLookup, memberId, memberRole, setMemberInfo]);

  return (
    <aside
      className={`relative flex h-screen shrink-0 flex-col border-r border-[#f3f3f3] bg-white py-5 text-slate-900 transition-[width] duration-200 ${
        isCollapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Header */}
      <div
        className={`mb-5 flex items-center ${isCollapsed ? "justify-center" : "px-5"}`}
      >
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
          <Image
            src={LOGO}
            alt="ACG"
            width={48}
            height={48}
            className="h-10 w-10 shrink-0 object-contain"
          />
          {!isCollapsed && (
            <p className="truncate text-sm text-[#111111]">ACG 그룹웨어</p>
          )}
        </Link>
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

      {/* User Info */}
      {!isCollapsed && <UserInfoCard />}

      {/* Attendance */}
      {!isCollapsed && <AttendanceSection memberId={resolvedMemberId} />}

      {/* Navigation (scrollable) */}
      <NavMenu iconOnly={isCollapsed} onExpand={toggleCollapsed} />

      {/* Footer */}
      <div className={`${isCollapsed ? "px-2" : "px-3"} space-y-0.5 pt-2`}>
        <NotificationToggle iconOnly={isCollapsed} />
      </div>
    </aside>
  );
}

// ─── Mobile Sidebar (overlay) ───

export function MobileSidebar() {
  const { isOpen, close } = useSidebarStore();
  const { userName, memberId, memberRole, setMemberInfo } = useUserStore();
  const { data: memberLookup } = useMemberIdLookup(userName);
  const resolvedMemberId = memberLookup?.id ?? memberId;

  useEffect(() => {
    if (
      memberLookup &&
      (memberLookup.id !== memberId || memberLookup.member_role !== memberRole)
    ) {
      setMemberInfo(
        memberLookup.id,
        memberLookup.member_role || "팀원",
        memberLookup.hire_date,
      );
    }
  }, [memberLookup, memberId, memberRole, setMemberInfo]);

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
                <Image
                  src={LOGO}
                  alt="ACG"
                  width={48}
                  height={48}
                  className="h-12 w-12 object-contain"
                />
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
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
