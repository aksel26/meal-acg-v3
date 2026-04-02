"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  Home,
  Wallet,
  Users,
  Coffee,
  ExternalLink,
  LogOut,
} from "lucide-react";
import LOGO from "@/public/images/ACG_LOGO_WHITE.png";
import { useUserStore } from "@/stores/userStore";
import { useAttendance, useCheckIn, useCheckOut } from "@/hooks/use-attendance";
import { useMemberIdLookup } from "@/hooks/use-points-data";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

dayjs.extend(utc);
dayjs.extend(timezone);

const navItems = [
  { id: "dashboard", label: "홈", icon: Home },
  { id: "points", label: "복지포인트", icon: Wallet },
  { id: "lunch", label: "점심조", icon: Users },
  { id: "monthly", label: "음료취합", icon: Coffee },
];

function formatTime(isoString: string) {
  return dayjs(isoString).tz("Asia/Seoul").format("HH:mm");
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { userName, memberId, setMemberInfo, logout } = useUserStore();
  const { data: memberLookup } = useMemberIdLookup(!memberId ? userName : null);

  useEffect(() => {
    if (memberLookup && !memberId) {
      setMemberInfo(memberLookup.id, memberLookup.member_role || "팀원");
    }
  }, [memberLookup, memberId, setMemberInfo]);

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
  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <aside className="flex h-screen w-[240px] shrink-0 flex-col bg-[#131313] p-5">
      {/* Logo */}
      <div className="mb-8 px-1">
        <Image src={LOGO} alt="ACG" width={80} height={27} />
      </div>

      {/* User Info */}
      <div className="mb-6 rounded-xl bg-white/[0.06] px-4 py-3">
        <p className="text-sm font-semibold text-white/90">
          {userName || "사용자"}
        </p>
        <p className="mt-0.5 text-xs text-white/40">ACG</p>
      </div>

      {/* Attendance */}
      <div className="mb-6 px-1">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-widest text-white/30">
          출퇴근
        </p>
        {!hasCheckedIn ? (
          <button
            onClick={handleCheckIn}
            disabled={isMutating}
            className="w-full rounded-lg bg-white/10 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-50"
          >
            {isMutating ? "처리 중..." : "출근하기"}
          </button>
        ) : !hasCheckedOut ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">
                {formatTime(attendance!.check_in_at!)} 출근
              </span>
            </div>
            <button
              onClick={handleCheckOut}
              disabled={isMutating}
              className="w-full rounded-lg border border-white/10 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 disabled:opacity-50"
            >
              {isMutating ? "..." : "퇴근하기"}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2">
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
                stroke="#4ade80"
                strokeWidth="1.5"
              />
              <path
                d="M5 8.5L7 10.5L11 6"
                stroke="#4ade80"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-xs text-white/50">
              {formatTime(attendance!.check_in_at!)} →{" "}
              {formatTime(attendance!.check_out_at!)}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-widest text-white/30">
          메뉴
        </p>
        {navItems.map((item) => {
          const isActive = pathname === `/${item.id}`;
          return (
            <Link
              key={item.id}
              href={`/${item.id}`}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:bg-white/[0.04] hover:text-white/70"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
        <a
          href="https://workdna.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white/70"
        >
          <ExternalLink size={18} />
          유형검사
        </a>
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/30 transition-colors hover:text-white/50"
      >
        <LogOut size={18} />
        로그아웃
      </button>
    </aside>
  );
}
