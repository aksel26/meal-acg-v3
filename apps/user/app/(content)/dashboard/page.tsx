"use client";

import GreetingSection from "@/components/dashboard/GreetingSection";
import MealSection from "@/components/dashboard/MealSection";
import NoticeSection from "@/components/dashboard/NoticeSection";
import QuickActionsSection from "@/components/dashboard/QuickActionsSection";
import StatsSection from "@/components/dashboard/StatsSection";
import { CalculationData } from "@/components/dashboard/types";
import { Footer } from "@/components/Footer";
import { useMealData } from "@/hooks/use-meal-data";
import { useMealDelete } from "@/hooks/use-meal-delete";
import { useMealSubmit } from "@/hooks/use-meal-submit";
import { useMealDrawerStore } from "@/stores/mealDrawerStore";
import { useUserStore } from "@/stores/userStore";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import React, { lazy, Suspense, useEffect, useState } from "react";
import { UpdateNotificationDialog } from "@/components/UpdateNotificationDialog";
import { useRouter } from "next/navigation";
dayjs.extend(utc);
dayjs.extend(timezone);

// Lazy load the MealEntryDrawer component
const MealEntryDrawer = lazy(() =>
  import("@/components/MealEntryDrawer").then((module) => ({
    default: module.default,
  }))
);

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(dayjs().tz("Asia/Seoul").toDate());
  const [currentMonth, setCurrentMonth] = useState<number>(dayjs().tz("Asia/Seoul").month() + 1);
  const [currentYear, setCurrentYear] = useState<number>(dayjs().tz("Asia/Seoul").year());
  const [, setCalculationData] = useState<CalculationData | null>(null);

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

  const handleDeleteMeal = async (date: string, mealType: "breakfast" | "lunch" | "dinner") => {
    if (!userName) {
      return;
    }

    const deleteData = {
      userName,
      userId: userId || undefined,
      date: date,
      mealType,
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
      <div className="space-y-3 text-[0.92rem] lg:grid lg:h-[calc(100dvh-3rem)] lg:grid-cols-10 lg:grid-rows-12 lg:gap-3 lg:space-y-0 lg:overflow-hidden">
        <div className="lg:col-span-9 lg:row-span-1 lg:min-h-0 [&>*]:h-full">
          <GreetingSection userName={displayUserName} />
        </div>

        <div className="lg:col-span-1 lg:row-span-1 lg:min-h-0">
          <NoticeSection variant="icon" />
        </div>

        <div className="lg:col-span-5 lg:row-span-11 lg:min-h-0 lg:overflow-hidden">
          <MealSection selectedDate={selectedDate} setSelectedDate={setSelectedDate} handleMonthChange={handleMonthChange} mealData={mealData} />
        </div>

        <div className="lg:col-span-5 lg:row-span-11 lg:flex lg:min-h-0 lg:flex-col lg:gap-3 lg:overflow-hidden">
          <div className="lg:min-h-0 lg:flex-1 lg:overflow-hidden [&>*]:h-full [&>*>*]:h-full">
            <StatsSection userId={currentUserId} month={currentMonth} year={currentYear} onDataChange={setCalculationData} />
          </div>

          <div className="lg:h-[4.25rem] lg:shrink-0">
            <QuickActionsSection />
          </div>
        </div>
      </div>

      {/* Lazy-loaded Meal Entry Drawer */}
      <Suspense fallback={null}>
        <MealEntryDrawer onFormSubmit={handleFormSubmit} onDeleteMeal={handleDeleteMeal} />
      </Suspense>

      <Footer variant="compact" className="mt-4 lg:hidden" />

      {/* 업데이트 알림 Dialog */}
      <UpdateNotificationDialog />

    </React.Fragment>
  );
}
