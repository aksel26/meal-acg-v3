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
  renderMode?: "all" | "calendar" | "cards";
}

export default function MealSection({
  selectedDate,
  setSelectedDate,
  handleMonthChange,
  mealData,
  renderMode = "all",
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

  const showCalendar = renderMode === "all" || renderMode === "calendar";
  const showCards = renderMode === "all" || renderMode === "cards";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {showCalendar && (
        <CalendarComponent
          onDateSelect={setSelectedDate}
          selectedDate={selectedDate}
          onMonthChange={handleMonthChange}
          mealData={mealData}
        />
      )}
      {showCards && (
        <MealCards
          selectedDate={selectedDate}
          mealData={mealData}
          onAddMeal={handleAddMeal}
          onEditMeal={handleEditMeal}
          onHolidayEdit={handleHolidayAttendanceEdit}
        />
      )}
    </motion.div>
  );
}