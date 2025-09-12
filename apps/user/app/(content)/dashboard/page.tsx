"use client";

export const dynamic = "force-dynamic";

import { BottomNavigation } from "@/components/BottomNavigation";
import BalanceSection from "@/components/dashboard/BalanceSection";
import GreetingSection from "@/components/dashboard/GreetingSection";
import MealSection from "@/components/dashboard/MealSection";
import NoticeSection from "@/components/dashboard/NoticeSection";
import StatsSection from "@/components/dashboard/StatsSection";
import { CalculationData } from "@/components/dashboard/types";
import { useScrollHandler } from "@/components/dashboard/useScrollHandler";
import { Footer } from "@/components/Footer";
import { useMealData } from "@/hooks/use-meal-data";
import { useMealDelete } from "@/hooks/use-meal-delete";
import { useMealSubmit } from "@/hooks/use-meal-submit";
import { useMealDrawerStore } from "@/stores/mealDrawerStore";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import React, { Suspense, lazy, useEffect, useState } from "react";

dayjs.extend(utc);
dayjs.extend(timezone);

// Lazy load the MealEntryDrawer component
const MealEntryDrawer = lazy(() =>
  import("@/components/MealEntryDrawer").then((module) => ({
    default: module.default,
  }))
);

export default function DashboardPage() {
  const [userName, setUserName] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(dayjs().tz("Asia/Seoul").toDate());
  const [currentMonth, setCurrentMonth] = useState<number>(dayjs().tz("Asia/Seoul").month() + 1);
  const [currentYear, setCurrentYear] = useState<number>(dayjs().tz("Asia/Seoul").year());
  const [calculationData, setCalculationData] = useState<CalculationData | null>(null);
  const router = useRouter();

  // Zustand store
  const { formData, selectedDate: drawerSelectedDate, closeDrawer, resetForm } = useMealDrawerStore();

  // TanStack Query hooks 사용
  const { data: mealData = [] } = useMealData(userName, currentMonth, currentYear);
  const mealSubmitMutation = useMealSubmit();
  const mealDeleteMutation = useMealDelete();

  // Custom hooks
  useScrollHandler(() => {});

  useEffect(() => {
    const name = localStorage.getItem("name");
    if (!name) {
      router.push("/");
      return;
    }
    setUserName(name);
  }, [router]);

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

    if (!userName) {
      console.log("No userName available");
      return;
    }

    // 3개 독립된 form 데이터를 한번에 전송
    const requestData = {
      userName: userName,
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
      userName: userName,
      date: date,
    };

    try {
      await mealDeleteMutation.mutateAsync(deleteData);
    } catch (error) {
      // 에러는 mutation에서 이미 처리됨
      console.error("Meal delete error:", error);
    }
  };

  if (!userName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <React.Fragment>
      <GreetingSection userName={userName} />
      <NoticeSection />
      <BalanceSection currentMonth={currentMonth} calculationData={calculationData} />
      <StatsSection userName={userName} month={currentMonth} year={currentYear} onDataChange={setCalculationData} />
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
      <BottomNavigation />
    </React.Fragment>
  );
}
