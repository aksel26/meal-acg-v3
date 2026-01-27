"use client";

import { motion } from "motion/react";
import CalendarComponent from "@/components/Calendar";
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

  const handleAddMeal = (mealType: "breakfast" | "lunch" | "dinner", date?: Date) => {
    const targetDate = date || selectedDate;
    console.log("Opening drawer for add meal:", { mealType, targetDate });
    openDrawer(mealType, targetDate);
  };

  const handleEditMeal = (mealType: "breakfast" | "lunch" | "dinner", mealInfo: MealData, date?: Date) => {
    const targetDate = date || selectedDate;
    console.log("Opening drawer for edit meal:", { mealType, mealInfo, targetDate });
    openDrawerForEdit(mealType, mealInfo, targetDate);
  };

  const handleHolidayAttendanceEdit = (mealInfo: MealData, date?: Date) => {
    const targetDate = date || selectedDate;
    console.log("Opening drawer for holiday edit:", { mealInfo, targetDate });
    openDrawerForHolidayEdit(mealInfo, targetDate);
  };

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
      <CalendarComponent
        onDateSelect={setSelectedDate}
        selectedDate={selectedDate}
        onMonthChange={handleMonthChange}
        mealData={mealData}
        onAddMeal={handleAddMeal}
        onEditMeal={handleEditMeal}
        onHolidayEdit={handleHolidayAttendanceEdit}
      />
    </motion.div>
  );
}