"use client";

import GreetingSection from "@/components/dashboard/GreetingSection";
import { useApprovals } from "@/hooks/use-approvals";
import { useUserStore } from "@/stores/userStore";
import { CalendarPlus, ClipboardList, Cake, Coffee, Bell } from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import React, { useEffect, useState } from "react";
import { UpdateNotificationDialog } from "@/components/UpdateNotificationDialog";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

dayjs.extend(utc);
dayjs.extend(timezone);

// ─── 바로가기 ───

function ApprovalShortcuts() {
  const { memberId } = useUserStore();
  const { data: pendingApprovals } = useApprovals(memberId || "", "pending");
  const pendingCount = pendingApprovals?.length || 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      <Link
        href="/leave-request"
        className="snow-card flex items-center gap-3 p-4 transition-colors active:bg-slate-50"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
          <CalendarPlus className="h-5 w-5 text-blue-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">휴가 신청</p>
          <p className="text-xs text-slate-400">승인 요청</p>
        </div>
      </Link>
      <Link
        href="/approvals"
        className="snow-card relative flex items-center gap-3 p-4 transition-colors active:bg-slate-50"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
          <ClipboardList className="h-5 w-5 text-amber-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">승인함</p>
          <p className="text-xs text-slate-400">
            {pendingCount > 0 ? `${pendingCount}건 대기` : "요청 관리"}
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {pendingCount}
          </span>
        )}
      </Link>
    </div>
  );
}

// ─── 탭 콘텐츠: 공지 / 생일자 / 음료 ───

type TabId = "notices" | "birthdays" | "drinks";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "notices", label: "공지", icon: Bell },
  { id: "birthdays", label: "생일자", icon: Cake },
  { id: "drinks", label: "음료", icon: Coffee },
];

function NoticesContent() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-100 bg-white p-4">
        <p className="text-xs text-slate-400 mb-1">2026.04.01</p>
        <p className="text-sm font-medium text-slate-800">4월 식대 정책 안내</p>
        <p className="mt-1 text-xs text-slate-500 line-clamp-2">
          4월부터 식대 한도가 조정됩니다. 자세한 내용은 공지사항을 확인해주세요.
        </p>
      </div>
      <div className="rounded-xl border border-slate-100 bg-white p-4">
        <p className="text-xs text-slate-400 mb-1">2026.03.28</p>
        <p className="text-sm font-medium text-slate-800">시스템 업데이트 공지</p>
        <p className="mt-1 text-xs text-slate-500 line-clamp-2">
          앱 v1.3 업데이트가 적용되었습니다. 새로운 기능을 확인해보세요.
        </p>
      </div>
    </div>
  );
}

function BirthdaysContent() {
  const today = dayjs().tz("Asia/Seoul");
  const monthName = today.format("M");

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">{monthName}월 생일자</p>
      <div className="flex flex-col gap-2">
        {[
          { name: "홍길동", date: "04.05", team: "개발팀" },
          { name: "김철수", date: "04.12", team: "디자인팀" },
          { name: "이영희", date: "04.20", team: "기획팀" },
        ].map((person) => (
          <div
            key={person.name}
            className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-50 text-sm">
              🎂
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800">
                {person.name}
              </p>
              <p className="text-[11px] text-slate-400">{person.team}</p>
            </div>
            <span className="text-xs text-slate-400">{person.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DrinksContent() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">이번 달 음료 취합</p>
      <div className="rounded-xl border border-slate-100 bg-white p-4 text-center">
        <Coffee className="mx-auto mb-2 h-8 w-8 text-amber-400" />
        <p className="text-sm font-medium text-slate-700">
          음료 취합이 진행 중입니다
        </p>
        <Link
          href="/monthly"
          className="mt-2 inline-block text-xs font-medium text-blue-500 hover:text-blue-600"
        >
          참여하기 →
        </Link>
      </div>
    </div>
  );
}

function InfoTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("notices");

  return (
    <div className="snow-card overflow-hidden">
      {/* Tab Headers */}
      <div className="flex border-b border-slate-100">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-slate-800 text-slate-800"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === "notices" && <NoticesContent />}
        {activeTab === "birthdays" && <BirthdaysContent />}
        {activeTab === "drinks" && <DrinksContent />}
      </div>
    </div>
  );
}

// ─── 휴가 요약 ───

function LeaveSummary() {
  return (
    <div className="snow-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-800">휴가 요약</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-blue-50/60 p-3 text-center">
          <p className="text-[11px] text-blue-500 mb-1">총 연차</p>
          <p className="text-lg font-bold text-blue-700">15일</p>
        </div>
        <div className="rounded-xl bg-emerald-50/60 p-3 text-center">
          <p className="text-[11px] text-emerald-500 mb-1">잔여</p>
          <p className="text-lg font-bold text-emerald-700">8일</p>
        </div>
        <div className="rounded-xl bg-amber-50/60 p-3 text-center">
          <p className="text-[11px] text-amber-500 mb-1">사용</p>
          <p className="text-lg font-bold text-amber-700">7일</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <p className="text-[11px] text-slate-400 mb-1">예정</p>
          <p className="text-lg font-bold text-slate-600">1일</p>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Page ───

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const userName = useUserStore((s) => s.userName);
  const isLoggedIn = useUserStore((s) => s.isLoggedIn);
  const hydrate = useUserStore((s) => s.hydrate);
  const hasHydrated = useUserStore((s) => s.hasHydrated);

  useEffect(() => {
    setMounted(true);
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!userName && !isLoggedIn) {
      router.push("/");
    }
  }, [router, isLoggedIn, userName, hasHydrated]);

  const displayUserName = userName || "";

  if (!mounted || !hasHydrated || !displayUserName) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
      </div>
    );
  }

  return (
    <React.Fragment>
      {/* ── 인사 + 출퇴근 ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <GreetingSection userName={displayUserName} />
      </motion.div>

      {/* ── 바로가기 ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <ApprovalShortcuts />
      </motion.div>

      {/* ── 공지 / 생일자 / 음료 탭 ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <InfoTabs />
      </motion.div>

      {/* ── 휴가 요약 ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <LeaveSummary />
      </motion.div>

      <UpdateNotificationDialog />
    </React.Fragment>
  );
}
