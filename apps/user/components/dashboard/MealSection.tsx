"use client";

import { motion } from "motion/react";
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

  const handleAddMeal = (mealType: "breakfast" | "lunch" | "dinner") => {
    console.log("Opening drawer for add meal:", { mealType, selectedDate });
    openDrawer(mealType, selectedDate);
  };

  const handleEditMeal = (mealType: "breakfast" | "lunch" | "dinner", mealInfo: MealData) => {
    console.log("Opening drawer for edit meal:", { mealType, mealInfo, selectedDate });
    openDrawerForEdit(mealType, mealInfo, selectedDate);
  };

  const handleHolidayAttendanceEdit = (mealInfo: MealData) => {
    console.log("Opening drawer for holiday edit:", { mealInfo, selectedDate });
    openDrawerForHolidayEdit(mealInfo, selectedDate);
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
      <CalendarComponent onDateSelect={setSelectedDate} selectedDate={selectedDate} onMonthChange={handleMonthChange} mealData={mealData} />
      <MealCards selectedDate={selectedDate} onAddMeal={handleAddMeal} onEditMeal={handleEditMeal} onHolidayEdit={handleHolidayAttendanceEdit} mealData={mealData} />
    </motion.div>
  );
}