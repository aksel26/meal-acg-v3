"use client";


import GreetingSection from "@/components/dashboard/GreetingSection";
import MealSection from "@/components/dashboard/MealSection";
import PopularRestaurantsSection from "@/components/dashboard/PopularRestaurantsSection";
import StatsSection from "@/components/dashboard/StatsSection";
import { CalculationData } from "@/components/dashboard/types";
import { Footer } from "@/components/Footer";
import { useMealData } from "@/hooks/use-meal-data";
import { useMealDelete } from "@/hooks/use-meal-delete";
import { useMealSubmit } from "@/hooks/use-meal-submit";
import { useMyAttendanceToday, useCheckIn, useCheckOut } from "@/hooks/useAttendance";
import { useApprovals } from "@/hooks/use-approvals";
import { CalendarPlus, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useMealDrawerStore } from "@/stores/mealDrawerStore";
import { useUserStore } from "@/stores/userStore";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import React, { lazy, Suspense, useEffect, useState } from "react";
import { UpdateNotificationDialog } from "@/components/UpdateNotificationDialog";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
dayjs.extend(utc);
dayjs.extend(timezone);

// Lazy load the MealEntryDrawer component
const MealEntryDrawer = lazy(() =>
  import("@/components/MealEntryDrawer").then((module) => ({
    default: module.default,
  }))
);

function AttendanceWidget() {
  const { data: attendance } = useMyAttendanceToday();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const [now, setNow] = useState(() => dayjs().tz("Asia/Seoul"));

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(dayjs().tz("Asia/Seoul"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hasCheckedIn = attendance && attendance.check_in_at;
  const hasCheckedOut = attendance && attendance.check_out_at;

  // 퇴근 가능 시각: 출근 시각 + 9시간
  const checkOutAvailable =
    hasCheckedIn && !hasCheckedOut
      ? dayjs(attendance.check_in_at).tz("Asia/Seoul").add(9, "hour")
      : null;

  // 지각 여부: 출근 시각이 10:00 이후
  const isLate =
    hasCheckedIn &&
    dayjs(attendance.check_in_at).tz("Asia/Seoul").isAfter(
      dayjs(attendance.check_in_at).tz("Asia/Seoul").startOf("day").hour(10)
    );

  // 근무시간 계산
  const workDuration =
    hasCheckedIn && hasCheckedOut
      ? (() => {
          const diffSec = dayjs(attendance.check_out_at)
            .diff(dayjs(attendance.check_in_at), "second");
          const h = Math.floor(diffSec / 3600);
          const m = Math.floor((diffSec % 3600) / 60);
          const s = diffSec % 60;
          return `${h}시간 ${m}분 ${s}초`;
        })()
      : null;

  return (
    <div className="rounded-2xl border bg-white p-5">
      {!hasCheckedIn && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-2xl font-semibold tabular-nums text-slate-800">
            🕐 현재 시각: {now.format("HH:mm:ss")}
          </p>
          <button
            className="w-full rounded-xl bg-slate-900 py-4 text-lg font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            onClick={() => checkIn.mutate()}
            disabled={checkIn.isPending}
          >
            출근하기
          </button>
          <p className="text-sm text-slate-500">08:00 ~ 10:00 출근 가능</p>
        </div>
      )}

      {hasCheckedIn && !hasCheckedOut && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium text-slate-700">
              출근 {dayjs(attendance.check_in_at).tz("Asia/Seoul").format("HH:mm:ss")}
            </span>
            {isLate && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                지각
              </span>
            )}
          </div>
          {checkOutAvailable && (
            <p className="text-sm text-slate-500">
              퇴근 가능: {checkOutAvailable.format("HH:mm:ss")}
            </p>
          )}
          <button
            className="w-full rounded-xl border-2 border-slate-900 py-3 text-base font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-50"
            onClick={() => checkOut.mutate()}
            disabled={checkOut.isPending}
          >
            퇴근하기
          </button>
        </div>
      )}

      {hasCheckedIn && hasCheckedOut && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-base font-medium text-slate-700">
            <span>출근 {dayjs(attendance.check_in_at).tz("Asia/Seoul").format("HH:mm:ss")}</span>
            <span className="text-slate-400">→</span>
            <span>퇴근 {dayjs(attendance.check_out_at).tz("Asia/Seoul").format("HH:mm:ss")}</span>
          </div>
          {workDuration && (
            <p className="text-sm text-slate-600">근무시간: {workDuration}</p>
          )}
          {attendance.overtime_minutes > 0 && (
            <p className="text-sm font-medium text-blue-600">
              초과 {attendance.overtime_minutes}분
            </p>
          )}
          <p className="text-sm font-semibold text-emerald-600">✓ 퇴근 완료</p>
        </div>
      )}
    </div>
  );
}

function ApprovalShortcuts() {
  const { memberId } = useUserStore();
  const { data: pendingApprovals } = useApprovals(memberId || "", "pending");
  const pendingCount = pendingApprovals?.length || 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      <Link
        href="/leave-request"
        className="flex items-center gap-3 rounded-2xl border bg-white p-4 transition-colors hover:bg-slate-50"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
          <CalendarPlus className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">휴가 신청</p>
          <p className="text-xs text-slate-500">승인 요청</p>
        </div>
      </Link>
      <Link
        href="/approvals"
        className="relative flex items-center gap-3 rounded-2xl border bg-white p-4 transition-colors hover:bg-slate-50"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
          <ClipboardList className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">승인함</p>
          <p className="text-xs text-slate-500">
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

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(dayjs().tz("Asia/Seoul").toDate());
  const [currentMonth, setCurrentMonth] = useState<number>(dayjs().tz("Asia/Seoul").month() + 1);
  const [currentYear, setCurrentYear] = useState<number>(dayjs().tz("Asia/Seoul").year());
  const [calculationData, setCalculationData] = useState<CalculationData | null>(null);

  const router = useRouter();

  // Zustand stores (개별 selector로 불필요 리렌더 방지)
  const formData = useMealDrawerStore((s) => s.formData);
  const drawerSelectedDate = useMealDrawerStore((s) => s.selectedDate);
  const closeDrawer = useMealDrawerStore((s) => s.closeDrawer);
  const resetForm = useMealDrawerStore((s) => s.resetForm);
  const userId = useUserStore((s) => s.userId);
  const userName = useUserStore((s) => s.userName);
  const isLoggedIn = useUserStore((s) => s.isLoggedIn);
  const hydrate = useUserStore((s) => s.hydrate);
  const hasHydrated = useUserStore((s) => s.hasHydrated);

  // TanStack Query hooks 사용
  const { data: mealData = [] } = useMealData(userName || "", currentMonth, currentYear);
  const mealSubmitMutation = useMealSubmit();
  const mealDeleteMutation = useMealDelete();


  useEffect(() => {
    setMounted(true);
    // userStore hydrate (localStorage에서 상태 복원)
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    // hydration이 완료되지 않았으면 대기
    if (!hasHydrated) {
      return;
    }

    // 로그인 상태 확인 (hydration 완료 후)
    if (!userName && !isLoggedIn) {
      router.push("/");
    }
  }, [router, isLoggedIn, userName, hasHydrated]);

  const handleMonthChange = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!drawerSelectedDate) {
      console.log("No drawerSelectedDate available");
      return;
    }

    if (!userName && !userId) {
      console.log("No user info available");
      return;
    }

    // 3개 독립된 form 데이터를 한번에 전송
    const requestData = {
      userName: userName || "",
      userId: userId || "",
      date: dayjs(drawerSelectedDate).tz("Asia/Seoul").format("YYYY-MM-DD"),
      breakfast: {
        store: formData.breakfast.store || "",
        amount: formData.breakfast.amount || "0",
        payer: formData.breakfast.payer || "",
      },
      lunch: {
        store: formData.lunch.store || "",
        amount: formData.lunch.amount || "0",
        payer: formData.lunch.payer || "",
        attendance: formData.lunch.attendance || "",
      },
      dinner: {
        store: formData.dinner.store || "",
        amount: formData.dinner.amount || "0",
        payer: formData.dinner.payer || "",
      },
    };

    try {
      await mealSubmitMutation.mutateAsync(requestData);

      // 성공 시 폼 닫기 및 모든 form 초기화
      closeDrawer();
      resetForm();
    } catch (error) {
      // 에러는 mutation에서 이미 처리됨
      console.error("Form submit error:", error);
    }
  };

  const handleDeleteMeal = async (date: string) => {
    if (!userName) {
      return;
    }

    const deleteData = {
      userName,
      userId: userId || undefined,
      date: date,
    };

    try {
      await mealDeleteMutation.mutateAsync(deleteData);
    } catch (error) {
      // 에러는 mutation에서 이미 처리됨
      console.error("Meal delete error:", error);
    }
  };

  const displayUserName = userName || "";
  const currentUserId = userId || "";

  if (!mounted || !hasHydrated || !displayUserName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <React.Fragment>
      <AttendanceWidget />
      <ApprovalShortcuts />
      <GreetingSection userName={displayUserName} />
      <StatsSection userId={currentUserId} month={currentMonth} year={currentYear} onDataChange={setCalculationData} />
      <PopularRestaurantsSection />
      <MealSection selectedDate={selectedDate} setSelectedDate={setSelectedDate} handleMonthChange={handleMonthChange} mealData={mealData} />

      {/* Lazy-loaded Meal Entry Drawer */}
      <Suspense fallback={null}>
        <MealEntryDrawer onFormSubmit={handleFormSubmit} onDeleteMeal={handleDeleteMeal} />
      </Suspense>

      {/* Bottom Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay: 0.6,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        <Footer />
      </motion.div>
      {/* 업데이트 알림 Dialog */}
      <UpdateNotificationDialog />

    </React.Fragment>
  );
}
