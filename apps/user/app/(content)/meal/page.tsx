"use client";

import MealSection from "@/components/dashboard/MealSection";
import PopularRestaurantsSection from "@/components/dashboard/PopularRestaurantsSection";
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
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

dayjs.extend(utc);
dayjs.extend(timezone);

const MealEntryDrawer = lazy(() =>
  import("@/components/MealEntryDrawer").then((module) => ({
    default: module.default,
  })),
);

export default function MealPage() {
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
      {/* ── 식대 통계 ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
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
        transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
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
        transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
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

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <Footer />
      </motion.div>
    </React.Fragment>
  );
}
