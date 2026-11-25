"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import dayjs from "dayjs";
import CalendarComponent from "@/components/Calendar";
import { MealCards } from "@/components/MealCards";
import StateBlock from "@/components/StateBlock";
import { enterMotion } from "@/lib/motion";
import { MealData } from "./types";
import { useMealDrawerStore } from "@/stores/mealDrawerStore";

interface MealSectionProps {
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  handleMonthChange: (month: number, year: number) => void;
  mealData: MealData[];
  isMealDataError?: boolean;
  onRetryMealData?: () => void;
}

export default function MealSection({
  selectedDate,
  setSelectedDate,
  handleMonthChange,
  mealData,
  isMealDataError = false,
  onRetryMealData,
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
      initial={enterMotion.initial}
      animate={enterMotion.animate}
      transition={{ ...enterMotion.transition, delay: 0.1 }}
      className="scroll-mt-24 lg:flex lg:h-full lg:min-h-0 lg:flex-col"
    >
      <div className="space-y-3 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        <CalendarComponent
          onDateSelect={setSelectedDate}
          selectedDate={selectedDate}
          onMonthChange={handleMonthChange}
          mealData={mealData}
          className="lg:min-h-0 lg:flex-[1.6]"
        />
        {isMealDataError ? (
          <div className="card-premium mt-3 lg:mt-0 lg:min-h-0 lg:flex-[0.55] lg:overflow-hidden">
            <StateBlock
              title="식대 기록을 불러오지 못했어요"
              description="연결을 확인하고 다시 시도해 주세요."
              action={
                onRetryMealData
                  ? { label: "다시 시도", onClick: onRetryMealData }
                  : undefined
              }
              className="h-full"
            />
          </div>
        ) : (
          <MealCards
            selectedDate={selectedDate}
            mealData={mealData}
            onAddMeal={handleAddMeal}
            onEditMeal={handleEditMeal}
            onHolidayEdit={handleHolidayAttendanceEdit}
            className="lg:mt-0 lg:min-h-0 lg:flex-[0.55] lg:overflow-hidden lg:p-3"
          />
        )}
      </div>
    </motion.div>
  );
}
