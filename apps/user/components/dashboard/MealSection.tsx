"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import dayjs from "dayjs";
import CalendarComponent from "@/components/Calendar";
import { MealCards } from "@/components/MealCards";
import { MealData } from "./types";
import { useMealDrawerStore } from "@/stores/mealDrawerStore";

interface MealSectionProps {
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  handleMonthChange: (month: number, year: number) => void;
  mealData: MealData[];
}

export default function MealSection({
  selectedDate,
  setSelectedDate,
  handleMonthChange,
  mealData,
}: MealSectionProps) {
  const { openDrawer, openDrawerForEdit, openDrawerForHolidayEdit } = useMealDrawerStore();

  // 선택된 날짜의 기존 meal 데이터 찾기
  const existingMealData = useMemo(() => {
    if (!selectedDate) return undefined;
    const dateStr = dayjs(selectedDate).format("YYYY-MM-DD");
    return mealData.find((meal) => meal.date === dateStr);
  }, [selectedDate, mealData]);

  const handleAddMeal = (mealType: "breakfast" | "lunch" | "dinner") => {
    openDrawer(mealType, selectedDate, existingMealData);
  };

  const handleEditMeal = (mealType: "breakfast" | "lunch" | "dinner", mealInfo: MealData) => {
    openDrawerForEdit(mealType, mealInfo, selectedDate);
  };

  const handleHolidayAttendanceEdit = (mealInfo: MealData) => {
    openDrawerForHolidayEdit(mealInfo, selectedDate);
  };

  return (
    <motion.div
      id="meal-calendar"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="scroll-mt-24 space-y-3 lg:flex lg:h-full lg:min-h-0 lg:flex-col"
    >
      <div className="flex items-end justify-between gap-4 px-1">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--slate-gray)]">
            Meal Calendar
          </p>
          <h2 className="mt-1 font-display text-2xl font-medium text-[var(--ink-black)] lg:text-xl">
            식사 기록
          </h2>
        </div>
        <p className="hidden max-w-[16rem] text-right text-xs leading-5 text-[var(--granite)] lg:text-[11px] sm:block">
          날짜를 선택해 해당 일자의 식사 기록을 입력하거나 수정합니다.
        </p>
      </div>
      <div className="space-y-4 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        <CalendarComponent
          onDateSelect={setSelectedDate}
          selectedDate={selectedDate}
          onMonthChange={handleMonthChange}
          mealData={mealData}
          className="lg:min-h-0 lg:flex-[1.45]"
        />
        <MealCards
          selectedDate={selectedDate}
          mealData={mealData}
          onAddMeal={handleAddMeal}
          onEditMeal={handleEditMeal}
          onHolidayEdit={handleHolidayAttendanceEdit}
          className="lg:mt-0 lg:min-h-0 lg:flex-[0.75] lg:overflow-hidden lg:p-4"
        />
      </div>
    </motion.div>
  );
}
