"use client";

import DashboardGridCalendar from "@/components/dashboard/DashboardGridCalendar";
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
import {
  type DashboardAttendanceRecord,
  type DashboardDueRequest,
  type DashboardProjectSchedule,
  useDashboardCalendar,
} from "@/hooks/use-dashboard-calendar";
import type { SupervisorPosting } from "@/hooks/use-supervisor-calendar";
import type { DayoffRecord } from "@/hooks/use-dayoffs";

dayjs.extend(utc);
dayjs.extend(timezone);

function buildPostingsByDate(postings: SupervisorPosting[] = []) {
  const map = new Map<string, SupervisorPosting[]>();

  postings.forEach((posting) => {
    const start = dayjs(posting.start_date);
    const end = dayjs(posting.end_date);

    for (
      let cursor = start;
      cursor.isBefore(end, "day") || cursor.isSame(end, "day");
      cursor = cursor.add(1, "day")
    ) {
      const key = cursor.format("YYYY-MM-DD");
      const list = map.get(key) || [];
      list.push(posting);
      map.set(key, list);
    }
  });

  return map;
}

function formatTime(value: string | null) {
  if (!value) return null;
  return dayjs(value).format("HH:mm");
}

function getAttendanceStatusLabel(status: string | null) {
  switch (status) {
    case "late":
      return "지각";
    case "early_leave":
      return "조퇴";
    case "absent":
      return "결근";
    default:
      return null;
  }
}

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
  attendanceRecords,
  postings,
  dayoffs,
  requests,
  projects,
}: {
  date: Date | undefined;
  attendanceRecords: DashboardAttendanceRecord[];
  postings: SupervisorPosting[];
  dayoffs: DayoffRecord[];
  requests: DashboardDueRequest[];
  projects: DashboardProjectSchedule[];
}) {
  if (!date) return null;
  const dateStr = dayjs(date).tz("Asia/Seoul").format("M월 D일 (ddd)");

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-800">
        {dateStr} 일정
      </h3>
      {(() => {
        const interviewPostings = postings.filter((p) => p.type === "interview");
        const supervisorPostings = postings.filter((p) => p.type === "supervisor");

        return (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* 내 근태 */}
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-semibold text-[#131313] mb-2">내 근태</p>
              {attendanceRecords.length === 0 && dayoffs.length === 0 ? (
                <p className="text-xs text-slate-400">없음</p>
              ) : (
                <ul className="space-y-1">
                  {attendanceRecords.map((record) => {
                    const checkIn = formatTime(record.check_in_at);
                    const checkOut = formatTime(record.check_out_at);
                    const timeLabel = [checkIn, checkOut].filter(Boolean).join("~");
                    const statusLabel = getAttendanceStatusLabel(record.status);

                    return (
                      <li key={record.id} className="text-xs text-[#131313]">
                        <span className="font-medium">
                          {record.attendance_type || "근무"}
                        </span>
                        {statusLabel && (
                          <span className="text-amber-600 ml-1">{statusLabel}</span>
                        )}
                        {timeLabel && (
                          <span className="text-slate-400 ml-1">{timeLabel}</span>
                        )}
                      </li>
                    );
                  })}
                  {dayoffs.map((d) => (
                    <li key={d.id} className="text-xs text-[#131313]">
                      <span className="font-medium">{d.leave_type?.name || "휴가"}</span>
                      {!d.approved_at && (
                        <span className="text-amber-600 ml-1">승인대기</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 검사/면접 일정 */}
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-semibold text-[#131313] mb-2">
                검사/면접 일정
              </p>
              {postings.length === 0 ? (
                <p className="text-xs text-slate-400">없음</p>
              ) : (
                <ul className="space-y-1">
                  {[...supervisorPostings, ...interviewPostings].map((p) => (
                    <li
                      key={p.id}
                      className="flex items-start justify-between gap-2 text-xs text-[#131313]"
                    >
                      <span className="min-w-0 truncate font-medium">{p.title}</span>
                      <span className="shrink-0 whitespace-nowrap text-right text-slate-400">
                        {p.type === "interview" ? "면접교육" : "검사"} ·{" "}
                        {dayjs(p.start_date).format("MM/DD")}~
                        {dayjs(p.end_date).format("MM/DD")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 프로젝트 일정 */}
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-semibold text-[#131313] mb-2">
                프로젝트 일정
              </p>
              {projects.length === 0 ? (
                <p className="text-xs text-slate-400">없음</p>
              ) : (
                <ul className="space-y-1">
                  {projects.map((project) => (
                    <li
                      key={project.id}
                      className="flex items-start justify-between gap-2 text-xs text-[#131313]"
                    >
                      <Link
                        href={`/projects/${project.id}`}
                        className="min-w-0 truncate font-medium hover:underline"
                      >
                        {project.title}
                      </Link>
                      <span className="shrink-0 whitespace-nowrap text-right text-slate-400">
                        마감일 · {project.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 요청 마감 */}
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-semibold text-[#131313] mb-2">요청 마감</p>
              {requests.length === 0 ? (
                <p className="text-xs text-slate-400">없음</p>
              ) : (
                <ul className="space-y-1">
                  {requests.map((request) => (
                    <li
                      key={request.id}
                      className="flex items-start justify-between gap-2 text-xs text-[#131313]"
                    >
                      <Link
                        href={`/requests/${request.id}`}
                        className="min-w-0 truncate font-medium hover:underline"
                      >
                        {request.title}
                      </Link>
                      <span className="shrink-0 whitespace-nowrap text-right text-slate-400">
                        마감일 {dayjs(request.due_date).format("MM/DD")} ·{" "}
                        {request.status} · {request.priority}
                      </span>
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

  const { data: calendarData } = useDashboardCalendar(currentYear, currentMonth);
  const postingsByDate = React.useMemo(
    () => buildPostingsByDate(calendarData?.postings),
    [calendarData?.postings],
  );

  const selectedDateStr = selectedDate ? dayjs(selectedDate).format("YYYY-MM-DD") : "";
  const selectedPostings = selectedDateStr ? (postingsByDate.get(selectedDateStr) || []) : [];
  const selectedAttendanceRecords = selectedDateStr
    ? (calendarData?.attendanceRecords ?? []).filter((record) => record.date === selectedDateStr)
    : [];
  const selectedDayoffs = selectedDateStr
    ? (calendarData?.dayoffs ?? []).filter((d) => d.leave_date === selectedDateStr)
    : [];
  const selectedRequests = selectedDateStr
    ? (calendarData?.requests ?? []).filter(
        (request) =>
          request.due_date === selectedDateStr &&
          request.status !== "완료" &&
          request.status !== "거절",
      )
    : [];
  const selectedProjects = selectedDateStr
    ? (calendarData?.projects ?? []).filter(
        (project) => project.due_date === selectedDateStr && project.status !== "완료",
      )
    : [];

  // 그리드 캘린더용 dayDataMap
  const dayDataMap = React.useMemo(() => {
    const map = new Map<
      string,
      {
        dayoffs: string[];
        tasks: string[];
        requests: string[];
        projects: string[];
      }
    >();
    const ensure = (key: string) => {
      if (!map.has(key)) {
        map.set(key, {
          dayoffs: [],
          tasks: [],
          requests: [],
          projects: [],
        });
      }
      return map.get(key)!;
    };
    postingsByDate.forEach((postings, dateKey) => {
      const d = ensure(dateKey);
      postings.forEach((p) => {
        d.tasks.push(p.title);
      });
    });
    calendarData?.attendanceRecords.forEach((record) => {
      ensure(record.date).dayoffs.push(record.attendance_type || "근무");
    });
    calendarData?.dayoffs.forEach((r) => {
      ensure(r.leave_date).dayoffs.push(r.leave_type?.name || "휴가");
    });
    calendarData?.requests.forEach((request) => {
      if (!request.due_date || request.status === "완료" || request.status === "거절") return;
      ensure(request.due_date).requests.push(request.title);
    });
    calendarData?.projects.forEach((project) => {
      if (!project.due_date || project.status === "완료") return;
      ensure(project.due_date).projects.push(project.title);
    });
    return map;
  }, [postingsByDate, calendarData]);

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
                attendanceRecords={selectedAttendanceRecords}
                postings={selectedPostings}
                dayoffs={selectedDayoffs}
                requests={selectedRequests}
                projects={selectedProjects}
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
