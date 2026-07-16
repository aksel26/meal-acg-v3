"use client";

import DashboardGridCalendar from "@/components/dashboard/DashboardGridCalendar";
import { useUserStore } from "@/stores/userStore";
import { AttendanceSection } from "@/components/Sidebar";
import { useMemberIdLookup } from "@/hooks/use-points-data";
import Link from "next/link";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { NOTICES } from "../notices/data";
import { Skeleton } from "@repo/ui/src/skeleton";
import {
  type RoomReservation,
  useRoomReservations,
} from "@/hooks/use-room-reservations";
import { TimelineGrid } from "@/components/room-booking/TimelineGrid";
import { getRoomById } from "@/lib/room-constants";
import {
  type DashboardDueRequest,
  type DashboardProjectSchedule,
  useDashboardCalendar,
} from "@/hooks/use-dashboard-calendar";
import type { SupervisorPosting } from "@/hooks/use-supervisor-calendar";
import type { DayoffRecord } from "@/hooks/use-dayoffs";

dayjs.extend(utc);
dayjs.extend(timezone);

// 세션 첫 진입에만 스태거 애니메이션 재생 (페이지 전환마다 재마운트되므로)
let hasAnimatedDashboard = false;

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

// ─── 탭 콘텐츠: 공지 / 생일자 ───

function NoticesContent() {
  const notices = NOTICES.slice(0, 5);

  return (
    <div className="space-y-3">
      {notices.map((notice) => (
        <Link
          key={notice.id}
          href={`/notices/${notice.id}`}
          className="group flex items-center gap-3 rounded-xl p-4 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-slate-800">
                {notice.title}
              </p>
              <time className="shrink-0 text-xs text-slate-400">
                {notice.createdAt.replaceAll("-", ".")}
              </time>
            </div>
            <p className="mt-1 line-clamp-1 text-xs text-slate-500">
              {notice.content}
            </p>
          </div>
          <ChevronRight
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500"
            strokeWidth={1.5}
          />
        </Link>
      ))}
    </div>
  );
}

function BirthdaysContent() {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        {[
          { name: "홍길동", date: "04.05", team: "개발팀" },
          { name: "김철수", date: "04.12", team: "디자인팀" },
          { name: "이영희", date: "04.20", team: "기획팀" },
        ].map((person) => (
          <div
            key={person.name}
            className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="w-20 shrink-0 truncate text-[11px] text-slate-400">
                {person.team}
              </span>
              <span className="truncate text-sm font-medium text-slate-800">
                {person.name}
              </span>
            </div>
            <span className="text-xs text-slate-400">{person.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoSection() {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-[#131313]">공지사항</h3>
      <NoticesContent />
    </section>
  );
}

function BirthdaySection() {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-[#131313]">
        {dayjs().tz("Asia/Seoul").format("M")}월 생일자
      </h3>
      <BirthdaysContent />
    </section>
  );
}

// ─── 휴가 요약 ───

function LeaveSummary({
  hireDate,
  dayoffs,
}: {
  hireDate: string | null;
  dayoffs: DayoffRecord[];
}) {
  const yearsOfService = hireDate
    ? dayjs().diff(dayjs(hireDate), "year")
    : null;
  const usedLeaveCounts = dayoffs.reduce<Record<string, number>>(
    (counts, dayoff) => {
      if (dayjs(dayoff.leave_date).isAfter(dayjs(), "day")) return counts;
      const name = dayoff.leave_type?.name ?? "기타 휴가";
      counts[name] = (counts[name] ?? 0) + 1;
      return counts;
    },
    {},
  );
  const usedLeaveEntries = Object.entries(usedLeaveCounts);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[#131313]">내 휴가 요약</h3>
        <Link
          href="/leave"
          className="flex items-center gap-0.5 text-xs text-slate-400 transition-colors hover:text-slate-600"
        >
          자세히보기
          <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-3 divide-x divide-slate-200/60 overflow-hidden rounded-xl bg-slate-50">
        <div className="p-3 text-center">
          <p className="text-[11px] text-[#131313]/50 mb-1">총 연차</p>
          <p className="text-lg font-bold tabular-nums text-[#131313]">15일</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-[11px] text-[#131313]/50 mb-1">사용</p>
          <p className="text-lg font-bold tabular-nums text-[#131313]">7일</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-[11px] text-[#131313]/50 mb-1">잔여</p>
          <p className="text-lg font-bold tabular-nums text-[#131313]">8일</p>
        </div>
      </div>
      <div className="mt-2 space-y-1 text-[11px] text-slate-400">
        <div>
          내 근속년수:{" "}
          {yearsOfService === null
            ? "-"
            : yearsOfService === 0
              ? "1년 미만"
              : `${yearsOfService}년`}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span>이번 달 사용:</span>
          {usedLeaveEntries.length > 0 ? (
            usedLeaveEntries.map(([name, count], index) => (
              <React.Fragment key={name}>
                {index > 0 && <span aria-hidden="true">·</span>}
                <span>
                  {name} {count}개
                </span>
              </React.Fragment>
            ))
          ) : (
            <span>없음</span>
          )}
        </div>
      </div>
    </div>
  );
}

type ScheduleView = "calendar" | "rooms";

function ScheduleViewSegment({
  value,
  onChange,
}: {
  value: ScheduleView;
  onChange: (value: ScheduleView) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="일정 보기"
      className="inline-flex rounded-lg bg-slate-100 p-1"
    >
      {(
        [
          ["calendar", "캘린더"],
          ["rooms", "회의실"],
        ] as const
      ).map(([view, label]) => (
        <button
          key={view}
          type="button"
          role="tab"
          aria-selected={value === view}
          onClick={() => onChange(view)}
          className={`h-7 rounded-md px-2.5 text-xs font-medium transition-colors ${
            value === view
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const ROOM_DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];
const ROOM_TYPE_LABELS: Record<RoomReservation["type"], string> = {
  supervisor: "감독관",
  interview: "면접",
  meeting: "회의",
  client_meeting: "고객사 미팅",
  partner_meeting: "협력사 미팅",
};

const TODAY_ROOM_RESERVATIONS: RoomReservation[] = [
  {
    id: "dashboard-dummy-room-1",
    room_id: "C1",
    date: dayjs().tz("Asia/Seoul").format("YYYY-MM-DD"),
    start_time: "10:00",
    end_time: "11:30",
    type: "meeting",
    title: "주간 운영 회의",
    content: "이번 주 운영 현황과 주요 이슈를 공유합니다.",
    reserved_by: "정진우",
    cc_members: ["김철수", "이영희"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "dashboard-dummy-room-2",
    room_id: "R",
    date: dayjs().tz("Asia/Seoul").format("YYYY-MM-DD"),
    start_time: "13:00",
    end_time: "14:00",
    type: "client_meeting",
    title: "고객사 프로젝트 미팅",
    content: "프로젝트 진행 일정과 요청사항을 논의합니다.",
    reserved_by: "김관리",
    cc_members: ["박영희"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "dashboard-dummy-room-3",
    room_id: "406-1",
    date: dayjs().tz("Asia/Seoul").format("YYYY-MM-DD"),
    start_time: "15:30",
    end_time: "17:00",
    type: "interview",
    title: "면접위원 사전 교육",
    content: "평가 기준과 면접 진행 방식을 안내합니다.",
    reserved_by: "이지원",
    cc_members: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

function RoomReservationStatus({
  date,
  reservations,
  isLoading,
  onPrevDate,
  onNextDate,
  headerAction,
}: {
  date: Date;
  reservations: RoomReservation[];
  isLoading: boolean;
  onPrevDate: () => void;
  onNextDate: () => void;
  headerAction: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevDate}
            aria-label="이전 날짜"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="min-w-36 text-center text-base font-semibold text-slate-800">
            {dayjs(date).format("M월 D일")} ({ROOM_DAY_NAMES[dayjs(date).day()]}
            )
          </h2>
          <button
            type="button"
            onClick={onNextDate}
            aria-label="다음 날짜"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        {headerAction}
      </div>

      {isLoading ? (
        <Skeleton className="h-[400px] w-full rounded-lg" />
      ) : (
        <>
          <TimelineGrid
            reservations={reservations}
            onCreateRequest={() => undefined}
            onMoveReservation={() => undefined}
            onResizeReservation={() => undefined}
            onClickReservation={() => undefined}
            readOnly
          />

          <div className="mt-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">
              예약 상세
            </h3>
            <div className="space-y-3">
              {reservations.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-400">
                  예약이 없습니다.
                </div>
              ) : (
                [...reservations]
                  .sort((a, b) => a.start_time.localeCompare(b.start_time))
                  .map((reservation) => (
                    <article
                      key={reservation.id}
                      className="rounded-xl bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500">
                              {getRoomById(reservation.room_id)?.name ??
                                reservation.room_id}
                            </span>
                            <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                              {ROOM_TYPE_LABELS[reservation.type]}
                            </span>
                          </div>
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="max-w-[45%] shrink-0 truncate text-sm font-semibold text-slate-800">
                              {reservation.title || "제목 없음"}
                            </p>
                            {reservation.content && (
                              <>
                                <span
                                  aria-hidden="true"
                                  className="shrink-0 text-slate-300"
                                >
                                  ·
                                </span>
                                <p className="truncate text-xs text-slate-500">
                                  {reservation.content}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                        <time className="shrink-0 text-xs tabular-nums text-slate-500">
                          {reservation.start_time.slice(0, 5)}–
                          {reservation.end_time.slice(0, 5)}
                        </time>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200/70 pt-3 text-[11px] text-slate-400">
                        <span>예약자 {reservation.reserved_by}</span>
                        {reservation.cc_members.length > 0 && (
                          <span>참조 {reservation.cc_members.join(", ")}</span>
                        )}
                      </div>
                    </article>
                  ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── 선택 날짜 상세 ───

function SelectedDateDetail({
  date,
  postings,
  requests,
  projects,
}: {
  date: Date | undefined;
  postings: SupervisorPosting[];
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
        const interviewPostings = postings.filter(
          (p) => p.type === "interview",
        );
        const supervisorPostings = postings.filter(
          (p) => p.type === "supervisor",
        );

        return (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {/* 검사/면접 일정 */}
            <div className="rounded-xl bg-slate-50 p-3">
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
                      <span className="min-w-0 truncate font-medium">
                        {p.title}
                      </span>
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
            <div className="rounded-xl bg-slate-50 p-3">
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
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-[#131313] mb-2">
                요청 마감
              </p>
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
  const [scheduleView, setScheduleView] = useState<ScheduleView>("calendar");
  const router = useRouter();

  const userName = useUserStore((s) => s.userName);
  const isLoggedIn = useUserStore((s) => s.isLoggedIn);
  const hydrate = useUserStore((s) => s.hydrate);
  const hasHydrated = useUserStore((s) => s.hasHydrated);
  const memberId = useUserStore((s) => s.memberId);
  const storedHireDate = useUserStore((s) => s.hireDate);

  // 모바일 출퇴근 카드용 memberId (Sidebar와 동일한 fallback 조회)
  const { data: memberLookup } = useMemberIdLookup(userName || null);
  const resolvedMemberId = memberLookup?.id ?? memberId;

  // 세션 첫 진입에만 스태거 애니메이션 재생
  const shouldAnimate = !hasAnimatedDashboard;
  useEffect(() => {
    hasAnimatedDashboard = true;
  }, []);

  const { data: calendarData } = useDashboardCalendar(
    currentYear,
    currentMonth,
  );
  const today = dayjs().tz("Asia/Seoul");
  const { data: currentMonthCalendarData } = useDashboardCalendar(
    today.year(),
    today.month() + 1,
  );
  const postingsByDate = React.useMemo(
    () => buildPostingsByDate(calendarData?.postings),
    [calendarData?.postings],
  );

  const selectedDateStr = selectedDate
    ? dayjs(selectedDate).format("YYYY-MM-DD")
    : "";
  const { data: roomReservations = [], isLoading: roomReservationsLoading } =
    useRoomReservations(scheduleView === "rooms" ? selectedDateStr : "");
  const displayedRoomReservations =
    selectedDateStr === dayjs().tz("Asia/Seoul").format("YYYY-MM-DD")
      ? [...roomReservations, ...TODAY_ROOM_RESERVATIONS]
      : roomReservations;
  const selectedPostings = selectedDateStr
    ? postingsByDate.get(selectedDateStr) || []
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
        (project) =>
          project.due_date === selectedDateStr && project.status !== "완료",
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
      if (
        !request.due_date ||
        request.status === "완료" ||
        request.status === "거절"
      )
        return;
      ensure(request.due_date).requests.push(request.title);
    });
    calendarData?.projects.forEach((project) => {
      if (!project.due_date || project.status === "완료") return;
      ensure(project.due_date).projects.push(project.title);
    });
    return map;
  }, [postingsByDate, calendarData]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(12);
    } else setCurrentMonth(currentMonth - 1);
  };
  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(1);
    } else setCurrentMonth(currentMonth + 1);
  };
  const handleRoomDateChange = (amount: -1 | 1) => {
    const nextDate = dayjs(selectedDate ?? new Date()).add(amount, "day");
    setSelectedDate(nextDate.toDate());
    setCurrentYear(nextDate.year());
    setCurrentMonth(nextDate.month() + 1);
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
      {/* 모바일 전용 출퇴근 카드 (데스크톱은 사이드바에 표시) */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6 md:hidden"
      >
        <AttendanceSection memberId={resolvedMemberId} className="" />
      </motion.div>

      <div className="md:grid md:grid-cols-2 md:gap-6">
        {/* ── 좌측: 캘린더 + 선택 날짜 상세 ── */}
        <div>
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6"
          >
            {scheduleView === "calendar" ? (
              <DashboardGridCalendar
                year={currentYear}
                month={currentMonth}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                dayDataMap={dayDataMap}
                headerAction={
                  <ScheduleViewSegment
                    value={scheduleView}
                    onChange={setScheduleView}
                  />
                }
              />
            ) : (
              <RoomReservationStatus
                date={selectedDate ?? new Date()}
                reservations={displayedRoomReservations}
                isLoading={roomReservationsLoading}
                onPrevDate={() => handleRoomDateChange(-1)}
                onNextDate={() => handleRoomDateChange(1)}
                headerAction={
                  <ScheduleViewSegment
                    value={scheduleView}
                    onChange={setScheduleView}
                  />
                }
              />
            )}
          </motion.div>

          {scheduleView === "calendar" && (
            <motion.div
              initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="mb-6"
            >
              <SelectedDateDetail
                date={selectedDate}
                postings={selectedPostings}
                requests={selectedRequests}
                projects={selectedProjects}
              />
            </motion.div>
          )}
        </div>

        {/* ── 우측: 휴가요약 + 정보 ── */}
        <div>
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6 grid gap-6 lg:grid-cols-[3fr_2fr]"
          >
            <LeaveSummary
              hireDate={memberLookup?.hire_date ?? storedHireDate}
              dayoffs={currentMonthCalendarData?.dayoffs ?? []}
            />
            <BirthdaySection />
          </motion.div>

          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6"
          >
            <InfoSection />
          </motion.div>
        </div>
      </div>
    </React.Fragment>
  );
}
