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
  })),
);

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    dayjs().tz("Asia/Seoul").toDate(),
  );
  const [currentMonth, setCurrentMonth] = useState<number>(
    dayjs().tz("Asia/Seoul").month() + 1,
  );
  const [currentYear, setCurrentYear] = useState<number>(
    dayjs().tz("Asia/Seoul").year(),
  );
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
  const { data: mealData = [] } = useMealData(
    userName || "",
    currentMonth,
    currentYear,
  );
  const mealSubmitMutation = useMealSubmit();
  const mealDeleteMutation = useMealDelete();

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateViewport = () => setIsDesktop(mediaQuery.matches);

    updateViewport();
    setMounted(true);
    // userStore hydrate (localStorage에서 상태 복원)
    hydrate();

    mediaQuery.addEventListener("change", updateViewport);
    return () => {
      mediaQuery.removeEventListener("change", updateViewport);
    };
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

    // 이미 저장된 다른 식사 타입 데이터 보존 (formData가 stale하거나 미입력인 경우 fallback)
    const dateStr = dayjs(drawerSelectedDate).tz("Asia/Seoul").format("YYYY-MM-DD");
    const existingMealForDate = mealData.find((m) => m.date === dateStr);

    // 3개 독립된 form 데이터를 한번에 전송
    const requestData = {
      userName: userName || "",
      userId: userId || "",
      date: dateStr,
      breakfast: {
        store: formData.breakfast.store || existingMealForDate?.breakfast?.store || "",
        amount:
          formData.breakfast.amount ||
          (existingMealForDate?.breakfast?.amount
            ? String(existingMealForDate.breakfast.amount)
            : "0"),
        payer: formData.breakfast.payer || existingMealForDate?.breakfast?.payer || "",
      },
      lunch: {
        store: formData.lunch.store || existingMealForDate?.lunch?.store || "",
        amount:
          formData.lunch.amount ||
          (existingMealForDate?.lunch?.amount
            ? String(existingMealForDate.lunch.amount)
            : "0"),
        payer: formData.lunch.payer || existingMealForDate?.lunch?.payer || "",
        attendance: formData.lunch.attendance || existingMealForDate?.attendance || "",
      },
      dinner: {
        store: formData.dinner.store || existingMealForDate?.dinner?.store || "",
        amount:
          formData.dinner.amount ||
          (existingMealForDate?.dinner?.amount
            ? String(existingMealForDate.dinner.amount)
            : "0"),
        payer: formData.dinner.payer || existingMealForDate?.dinner?.payer || "",
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

  const handleDeleteMeal = async (
    date: string,
    mealType: "breakfast" | "lunch" | "dinner",
  ) => {
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
      {isDesktop ? (
        <div className="grid h-[calc(100dvh-3rem)] grid-cols-10 grid-rows-12 gap-3 overflow-hidden text-[0.92rem]">
          <div className="col-span-9 row-span-1 min-h-0 [&>*]:h-full">
            <GreetingSection userName={displayUserName} />
          </div>

          <div className="col-span-1 row-span-1 min-h-0">
            <NoticeSection variant="icon" />
          </div>

          <div className="col-span-5 row-span-11 min-h-0 overflow-hidden">
            <MealSection
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              handleMonthChange={handleMonthChange}
              mealData={mealData}
            />
          </div>

          <div className="col-span-5 row-span-11 flex min-h-0 flex-col gap-3 overflow-hidden">
            <div className="min-h-0 flex-1 overflow-hidden [&>*]:h-full [&>*>*]:h-full">
              <StatsSection
                userId={currentUserId}
                month={currentMonth}
                year={currentYear}
                onDataChange={setCalculationData}
              />
            </div>

            <div className="h-[4.25rem] shrink-0">
              <QuickActionsSection excludeIds={["dashboard"]} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 text-[0.92rem]">
          <div className="flex min-w-0 items-stretch gap-2">
            <div className="min-w-0 flex-1">
              <GreetingSection userName={displayUserName} />
            </div>
            <div className="w-16 shrink-0">
              <NoticeSection variant="icon" />
            </div>
          </div>

          <StatsSection
            userId={currentUserId}
            month={currentMonth}
            year={currentYear}
            onDataChange={setCalculationData}
          />

          <MealSection
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            handleMonthChange={handleMonthChange}
            mealData={mealData}
          />

          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[820px] px-4 pb-4 sm:px-6">
            <QuickActionsSection excludeIds={["dashboard"]} />
          </div>
        </div>
      )}

      {/* Lazy-loaded Meal Entry Drawer */}
      <Suspense fallback={null}>
        <MealEntryDrawer
          onFormSubmit={handleFormSubmit}
          onDeleteMeal={handleDeleteMeal}
        />
      </Suspense>

      <Footer variant="compact" className="mt-4 mb-24 lg:hidden" />

      {/* 업데이트 알림 Dialog */}
      <UpdateNotificationDialog />
    </React.Fragment>
  );
}
