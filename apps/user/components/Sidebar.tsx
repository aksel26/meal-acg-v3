"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock,
  CalendarDays,
  AlarmClock,
  UtensilsCrossed,
  Wallet,
  Coins,
  UserPen,
  FileCheck,
  Megaphone,
  DoorOpen,
  MessageSquareText,
  LogOut,
  X,
  Bell,
  BellOff,
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
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: "근태",
    items: [
      { id: "attendance", label: "출퇴근 관리", href: "/attendance", icon: Clock },
      { id: "dayoffs", label: "휴가/연차 관리", href: "/dayoffs", icon: CalendarDays },
      { id: "overtime", label: "시간외 근무 관리", href: "/overtime", icon: AlarmClock },
    ],
  },
  {
    label: "복지",
    items: [
      { id: "meals", label: "식대", href: "/meal", icon: UtensilsCrossed },
      { id: "points", label: "복지포인트", href: "/points", icon: Wallet },
      { id: "activity", label: "활동비", href: "/points-dashboard", icon: Coins },
    ],
  },
  {
    label: "기타",
    items: [
      { id: "profile", label: "내 정보 수정", href: "/profile", icon: UserPen },
      { id: "approvals", label: "결재/승인", href: "/approvals", icon: FileCheck, badge: "New" },
      { id: "notices", label: "공지/일정", href: "/notices", icon: Megaphone, badge: "New" },
      { id: "room", label: "회의실 예약", href: "/room-booking", icon: DoorOpen },
      { id: "sms", label: "SMS 전송", href: "/sms", icon: MessageSquareText },
    ],
  },
];

// ─── Helpers ───

function formatTime(isoString: string) {
  return dayjs(isoString).tz("Asia/Seoul").format("HH:mm");
}

// ─── Sub-components ───

function UserInfoCard() {
  const { userName, memberRole } = useUserStore();

  return (
    <div className="mx-3 mb-4 rounded-xl bg-[#f9f9fa] px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-sm font-bold text-white">
          {userName?.charAt(0) || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#111111]">
            {userName || "사용자"}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {memberRole || "팀원"} · ACG
          </p>
        </div>
      </div>
    </div>
  );
}

function AttendanceSection({ memberId }: { memberId: string | null }) {
  const todayStr = dayjs().tz("Asia/Seoul").format("YYYY-MM-DD");
  const { data: attendance } = useAttendance(memberId, todayStr);
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  const hasCheckedIn = !!attendance?.check_in_at;
  const hasCheckedOut = !!attendance?.check_out_at;
  const isMutating = checkInMutation.isPending || checkOutMutation.isPending;

  const handleCheckIn = () => {
    if (memberId) checkInMutation.mutate(memberId);
  };
  const handleCheckOut = () => {
    if (memberId) checkOutMutation.mutate(memberId);
  };

  return (
    <div className="mx-3 mb-4">
      <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-widest text-slate-400">
        출퇴근
      </p>
      {!hasCheckedIn ? (
        <button
          onClick={handleCheckIn}
          disabled={isMutating}
          className="w-full rounded-lg bg-[#111111] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#222222] disabled:opacity-50"
        >
          {isMutating ? "처리 중..." : "출근하기"}
        </button>
      ) : !hasCheckedOut ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-emerald-600">
              {formatTime(attendance!.check_in_at!)} 출근
            </span>
          </div>
          <button
            onClick={handleCheckOut}
            disabled={isMutating}
            className="w-full rounded-lg border border-[#f3f3f3] py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-[#f9f9fa] disabled:opacity-50"
          >
            {isMutating ? "..." : "퇴근하기"}
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
  );
}

function NavMenu() {
  const pathname = usePathname();
  const { close } = useSidebarStore();

  return (
    <nav className="flex-1 overflow-y-auto px-3">
      {menuGroups.map((group) => (
        <div key={group.label} className="mb-4">
          <p className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-widest text-slate-400">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={close}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-[#111111] font-medium text-white"
                      : "text-slate-500 hover:bg-[#f9f9fa] hover:text-[#111111]"
                  }`}
                >
                  <item.icon size={18} className="shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

// ─── Notification Toggle ───

function NotificationToggle() {
  const { userId } = useUserStore();
  const [status, setStatus] = useState<"loading" | "unsupported" | "denied" | "subscribed" | "unsubscribed">("loading");

  useEffect(() => {
    if (!userId) return;

    if (isIOSSafari() && !("standalone" in navigator && (navigator as any).standalone)) {
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
      {isSubscribed ? <Bell size={18} /> : <BellOff size={18} />}
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
  const { data: memberLookup } = useMemberIdLookup(!memberId ? userName : null);

  useEffect(() => {
    if (memberLookup && !memberId) {
      setMemberInfo(memberLookup.id, memberLookup.member_role || "팀원");
    }
  }, [memberLookup, memberId, setMemberInfo]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-[#f3f3f3] bg-white py-5 text-slate-900">
      {/* Logo */}
      <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-5">
        <Image src={LOGO} alt="ACG" width={48} height={48} className="h-12 w-12 object-contain" />
        <p className="text-sm text-[#111111]">ACG 그룹웨어</p>
      </Link>

      {/* User Info */}
      <UserInfoCard />

      {/* Attendance */}
      <AttendanceSection memberId={memberId} />

      {/* Navigation (scrollable) */}
      <NavMenu />

      {/* Bottom actions */}
      <div className="px-3 space-y-0.5 pt-2">
        <NotificationToggle />
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-[#f9f9fa] hover:text-slate-500"
        >
          <LogOut size={18} />
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
  const { data: memberLookup } = useMemberIdLookup(!memberId ? userName : null);

  useEffect(() => {
    if (memberLookup && !memberId) {
      setMemberInfo(memberLookup.id, memberLookup.member_role || "팀원");
    }
  }, [memberLookup, memberId, setMemberInfo]);

  const handleLogout = () => {
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
            <div className="mb-8 flex items-center justify-between px-5">
              <div className="flex items-center gap-3">
                <Image src={LOGO} alt="ACG" width={48} height={48} className="h-12 w-12 object-contain" />
                <p className="text-sm text-[#111111]">ACG 그룹웨어</p>
              </div>
              <button
                onClick={close}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-[#f9f9fa] hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* User Info */}
            <UserInfoCard />

            {/* Attendance */}
            <AttendanceSection memberId={memberId} />

            {/* Navigation (scrollable) */}
            <NavMenu />

            {/* Bottom actions */}
            <div className="px-3 space-y-0.5 pt-2">
              <NotificationToggle />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-[#f9f9fa] hover:text-slate-500"
              >
                <LogOut size={18} />
                로그아웃
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
