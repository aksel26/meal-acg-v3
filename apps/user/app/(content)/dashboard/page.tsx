"use client";

import DashboardGridCalendar from "@/components/dashboard/DashboardGridCalendar";
import { useMealData } from "@/hooks/use-meal-data";
import { useUserStore } from "@/stores/userStore";
import { CalendarPlus, UtensilsCrossed, Wallet, Cake, Coffee, Bell } from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import React, { useEffect, useState } from "react";
import { UpdateNotificationDialog } from "@/components/UpdateNotificationDialog";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useSupervisorCalendarByMonth, buildPostingsByDate, type SupervisorPosting } from "@/hooks/use-supervisor-calendar";
import { useDayoffs, type DayoffRecord } from "@/hooks/use-dayoffs";

dayjs.extend(utc);
dayjs.extend(timezone);

// ─── 바로가기 ───

function ApprovalShortcuts() {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Link
        href="/leave-request"
        className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-4 transition-colors active:bg-blue-100"
      >
        <p className="text-sm font-medium text-slate-700">휴가 신청</p>
        <CalendarPlus className="h-5 w-5 text-slate-400" />
      </Link>
      <Link
        href="/meal"
        className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-4 transition-colors active:bg-emerald-100"
      >
        <p className="text-sm font-medium text-slate-700">식대 입력</p>
        <UtensilsCrossed className="h-5 w-5 text-slate-400" />
      </Link>
      <Link
        href="/points"
        className="flex items-center justify-between rounded-lg bg-violet-50 px-4 py-4 transition-colors active:bg-violet-100"
      >
        <p className="text-sm font-medium text-slate-700">복지포인트</p>
        <Wallet className="h-5 w-5 text-slate-400" />
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
      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-xs text-slate-400 mb-1">2026.04.01</p>
        <p className="text-sm font-medium text-slate-800">4월 식대 정책 안내</p>
        <p className="mt-1 text-xs text-slate-500 line-clamp-2">
          4월부터 식대 한도가 조정됩니다. 자세한 내용은 공지사항을 확인해주세요.
        </p>
      </div>
      <div className="rounded-xl bg-slate-50 p-4">
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
            className="flex items-center gap-3 rounded-xl bg-pink-50 p-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/60 text-sm">
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
      <div className="rounded-xl bg-amber-50 p-4 text-center">
        <Coffee className="mx-auto mb-2 h-8 w-8 text-slate-500" />
        <p className="text-sm font-medium text-slate-700">
          음료 취합이 진행 중입니다
        </p>
        <Link
          href="/monthly"
          className="mt-2 inline-block text-xs font-medium text-slate-600 hover:text-slate-800"
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
    <div className="rounded-2xl bg-gray-50 overflow-hidden">
      {/* Tab Headers */}
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 px-4 py-4 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-slate-100 text-slate-800"
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
    <div>
      <h3 className="mb-3 text-sm font-semibold text-[#131313]">내 휴가 요약</h3>
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl bg-gray-50 p-3 text-center">
          <p className="text-[11px] text-[#131313]/50 mb-1">총 연차</p>
          <p className="text-lg font-bold text-[#131313]">15일</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 text-center">
          <p className="text-[11px] text-[#131313]/50 mb-1">잔여</p>
          <p className="text-lg font-bold text-[#131313]">8일</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 text-center">
          <p className="text-[11px] text-[#131313]/50 mb-1">사용</p>
          <p className="text-lg font-bold text-[#131313]">7일</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 text-center">
          <p className="text-[11px] text-[#131313]/50 mb-1">예정</p>
          <p className="text-lg font-bold text-[#131313]">1일</p>
        </div>
      </div>
    </div>
  );
}

// ─── 선택 날짜 상세 ───

function SelectedDateDetail({
  date,
  postings,
  dayoffs,
}: {
  date: Date | undefined;
  postings: SupervisorPosting[];
  dayoffs: DayoffRecord[];
}) {
  if (!date) return null;
  const dateStr = dayjs(date).tz("Asia/Seoul").format("M월 D일 (ddd)");
  const hasData = postings.length > 0 || dayoffs.length > 0;

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-800">
        {dateStr} 일정
      </h3>
      {(() => {
        const interviewPostings = postings.filter((p) => p.type === "interview");
        const supervisorPostings = postings.filter((p) => p.type === "supervisor");

        return (
          <div className="grid grid-cols-3 gap-3">
            {/* 근태 */}
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-semibold text-[#131313] mb-2">근태</p>
              {dayoffs.length === 0 ? (
                <p className="text-xs text-slate-400">없음</p>
              ) : (
                <ul className="space-y-1">
                  {dayoffs.map((d) => (
                    <li key={d.id} className="text-xs text-[#131313]">
                      <span className="font-medium">{d.target?.full_name || ""}</span>
                      <span className="text-slate-400 ml-1">{d.leave_type?.name || "휴가"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 면접교육 */}
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-semibold text-[#131313] mb-2">면접교육</p>
              {interviewPostings.length === 0 ? (
                <p className="text-xs text-slate-400">없음</p>
              ) : (
                <ul className="space-y-1">
                  {interviewPostings.map((p) => (
                    <li key={p.id} className="text-xs text-[#131313]">
                      <span className="font-medium truncate block">{p.title}</span>
                      <span className="text-slate-400">{dayjs(p.start_date).format("MM/DD")}~{dayjs(p.end_date).format("MM/DD")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 검사 */}
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-semibold text-[#131313] mb-2">검사</p>
              {supervisorPostings.length === 0 ? (
                <p className="text-xs text-slate-400">없음</p>
              ) : (
                <ul className="space-y-1">
                  {supervisorPostings.map((p) => (
                    <li key={p.id} className="text-xs text-[#131313]">
                      <span className="font-medium truncate block">{p.title}</span>
                      <span className="text-slate-400">{dayjs(p.start_date).format("MM/DD")}~{dayjs(p.end_date).format("MM/DD")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Dashboard Page ───

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    dayjs().tz("Asia/Seoul").toDate(),
  );
  const [currentMonth, setCurrentMonth] = useState<number>(
    dayjs().tz("Asia/Seoul").month() + 1,
  );
  const [currentYear, setCurrentYear] = useState<number>(
    dayjs().tz("Asia/Seoul").year(),
  );
  const router = useRouter();

  const userName = useUserStore((s) => s.userName);
  const isLoggedIn = useUserStore((s) => s.isLoggedIn);
  const hydrate = useUserStore((s) => s.hydrate);
  const hasHydrated = useUserStore((s) => s.hasHydrated);

  const { data: mealData = [] } = useMealData(
    userName || "",
    currentMonth,
    currentYear,
  );

  // 공고 + 휴가 데이터
  const { data: supervisorData } = useSupervisorCalendarByMonth(currentYear, currentMonth);
  const postingsByDate = React.useMemo(() => buildPostingsByDate(supervisorData), [supervisorData]);
  const { data: dayoffsData } = useDayoffs(currentYear, currentMonth);

  const selectedDateStr = selectedDate ? dayjs(selectedDate).format("YYYY-MM-DD") : "";
  const selectedPostings = selectedDateStr ? (postingsByDate.get(selectedDateStr) || []) : [];
  const selectedDayoffs = selectedDateStr && dayoffsData
    ? dayoffsData.filter((d) => d.leave_date === selectedDateStr)
    : [];

  // 그리드 캘린더용 dayDataMap
  const dayDataMap = React.useMemo(() => {
    const map = new Map<string, { hasMeal: boolean; mealLabel: string | null; dayoffs: string[]; supervisors: string[]; interviews: string[] }>();
    const ensure = (key: string) => {
      if (!map.has(key)) map.set(key, { hasMeal: false, mealLabel: null, dayoffs: [], supervisors: [], interviews: [] });
      return map.get(key)!;
    };
    postingsByDate.forEach((postings, dateKey) => {
      const d = ensure(dateKey);
      postings.forEach((p) => {
        if (p.type === "supervisor") d.supervisors.push(p.title);
        if (p.type === "interview") d.interviews.push(p.title);
      });
    });
    dayoffsData?.forEach((r) => {
      ensure(r.leave_date).dayoffs.push(r.target?.full_name || "휴가");
    });
    return map;
  }, [postingsByDate, dayoffsData]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) { setCurrentYear(currentYear - 1); setCurrentMonth(12); }
    else setCurrentMonth(currentMonth - 1);
  };
  const handleNextMonth = () => {
    if (currentMonth === 12) { setCurrentYear(currentYear + 1); setCurrentMonth(1); }
    else setCurrentMonth(currentMonth + 1);
  };

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
      <div className="md:grid md:grid-cols-2 md:gap-6">
          {/* ── 좌측: 캘린더 + 바로가기 ── */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6"
            >
              <DashboardGridCalendar
                year={currentYear}
                month={currentMonth}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                mealData={mealData}
                dayDataMap={dayDataMap}
              />
            </motion.div>

          </div>

          {/* ── 우측: 바로가기 + 탭 + 휴가요약 ── */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6"
            >
              <ApprovalShortcuts />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6"
            >
              <SelectedDateDetail
                date={selectedDate}
                postings={selectedPostings}
                dayoffs={selectedDayoffs}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6"
            >
              <LeaveSummary />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6"
            >
              <InfoTabs />
            </motion.div>
          </div>
        </div>

      <UpdateNotificationDialog />
    </React.Fragment>
  );
}
