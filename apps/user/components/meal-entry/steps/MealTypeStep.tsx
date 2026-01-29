"use client";

import { motion } from "motion/react";
import { useMealDrawerStore } from "@/stores/mealDrawerStore";
import { mealTypeOptions } from "@/lib/const/const";

const mealTypeConfig = {
  breakfast: {
    label: "조식",
    emoji: "🌅",
    bgColor: "bg-amber-50",
    activeColor: "bg-amber-100",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
    hoverBorder: "hover:border-amber-300",
  },
  lunch: {
    label: "중식",
    emoji: "☀️",
    bgColor: "bg-blue-50",
    activeColor: "bg-blue-100",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
    hoverBorder: "hover:border-blue-300",
  },
  dinner: {
    label: "석식",
    emoji: "🌙",
    bgColor: "bg-violet-50",
    activeColor: "bg-violet-100",
    textColor: "text-violet-700",
    borderColor: "border-violet-200",
    hoverBorder: "hover:border-violet-300",
  },
};

export function MealTypeStep() {
  const { selectedMealType, setSelectedMealType } = useMealDrawerStore();

  const handleSelect = (type: "breakfast" | "lunch" | "dinner") => {
    // setSelectedMealType now handles completing the step and advancing
    setSelectedMealType(type);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-gray-900">
          어떤 식사인가요?
        </h3>
        <p className="text-sm text-gray-500">
          기록할 식사 타입을 선택해주세요
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {mealTypeOptions.map((meal, index) => {
          const config = mealTypeConfig[meal.value as keyof typeof mealTypeConfig];
          const isSelected = selectedMealType === meal.value;

          return (
            <motion.button
              key={meal.value}
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              onClick={() => handleSelect(meal.value as "breakfast" | "lunch" | "dinner")}
              className={`relative flex flex-col items-center gap-2 py-5 px-4 rounded-2xl border-2 transition-all duration-200 ${
                isSelected
                  ? `${config.activeColor} ${config.borderColor} ${config.textColor} shadow-sm`
                  : `bg-white border-gray-100 text-gray-600 ${config.hoverBorder} hover:bg-gray-50`
              }`}
            >
              <span className="text-2xl">{config.emoji}</span>
              <span className="text-sm font-semibold">{config.label}</span>
              {isSelected && (
                <motion.div
                  layoutId="mealTypeIndicator"
                  className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${config.activeColor} border-2 ${config.borderColor} flex items-center justify-center`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${config.textColor.replace("text-", "bg-")}`} />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
