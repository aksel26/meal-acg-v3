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

const MealEntryDrawer = lazy(() =>
  import("@/components/MealEntryDrawer").then((module) => ({
    default: module.default,
  })),
);

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
  const [calculationData, setCalculationData] =
    useState<CalculationData | null>(null);

  const router = useRouter();

  const formData = useMealDrawerStore((s) => s.formData);
  const drawerSelectedDate = useMealDrawerStore((s) => s.selectedDate);
  const closeDrawer = useMealDrawerStore((s) => s.closeDrawer);
  const resetForm = useMealDrawerStore((s) => s.resetForm);
  const userId = useUserStore((s) => s.userId);
  const userName = useUserStore((s) => s.userName);
  const isLoggedIn = useUserStore((s) => s.isLoggedIn);
  const hydrate = useUserStore((s) => s.hydrate);
  const hasHydrated = useUserStore((s) => s.hasHydrated);

  const { data: mealData = [] } = useMealData(
    userName || "",
    currentMonth,
    currentYear,
  );
  const mealSubmitMutation = useMealSubmit();
  const mealDeleteMutation = useMealDelete();

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

  const handleMonthChange = (month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!drawerSelectedDate) return;
    if (!userName && !userId) return;

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
      closeDrawer();
      resetForm();
    } catch (error) {
      console.error("Form submit error:", error);
    }
  };

  const handleDeleteMeal = async (date: string) => {
    if (!userName) return;

    try {
      await mealDeleteMutation.mutateAsync({
        userName,
        userId: userId || undefined,
        date,
      });
    } catch (error) {
      console.error("Meal delete error:", error);
    }
  };

  const displayUserName = userName || "";
  const currentUserId = userId || "";

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

      {/* ── 식대 통계 ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        <StatsSection
          userId={currentUserId}
          month={currentMonth}
          year={currentYear}
          onDataChange={setCalculationData}
        />
      </motion.div>

      {/* ── 식사 기록 (캘린더 + 카드) ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <MealSection
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          handleMonthChange={handleMonthChange}
          mealData={mealData}
        />
      </motion.div>

      {/* ── 인기 식당 ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <PopularRestaurantsSection />
      </motion.div>

      {/* Lazy-loaded Meal Entry Drawer */}
      <Suspense fallback={null}>
        <MealEntryDrawer
          onFormSubmit={handleFormSubmit}
          onDeleteMeal={handleDeleteMeal}
        />
      </Suspense>

      {/* Bottom Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <Footer />
      </motion.div>

      <UpdateNotificationDialog />
    </React.Fragment>
  );
}
