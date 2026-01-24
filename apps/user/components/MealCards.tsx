import * as React from "react";
import { Button } from "@repo/ui/src/button";
import dayjs from "dayjs";
import Image from "next/image";
import { motion } from "motion/react";

interface MealData {
  date: string;
  attendance: string;
  lunch?: {
    store: string;
    amount: number;
    payer: string;
  };
  dinner?: {
    store: string;
    amount: number;
    payer: string;
  };
  breakfast?: {
    store: string;
    amount: number;
    payer: string;
  };
}

interface MealCardsProps {
  selectedDate?: Date;
  onAddMeal?: (mealType: "breakfast" | "lunch" | "dinner") => void;
  onEditMeal?: (mealType: "breakfast" | "lunch" | "dinner", mealInfo: MealData) => void;
  onHolidayEdit?: (mealInfo: MealData) => void;
  mealData?: MealData[];
}

export function MealCards({ selectedDate, onAddMeal, onEditMeal, onHolidayEdit, mealData = [] }: MealCardsProps) {
  const [currentMealData, setCurrentMealData] = React.useState<MealData | null>(null);

  React.useEffect(() => {
    if (selectedDate && mealData.length > 0) {
      const dateString = dayjs(selectedDate).format("YYYY-MM-DD");
      const dayData = mealData.find((meal) => meal.date === dateString) || null;
      setCurrentMealData(dayData);
    } else {
      setCurrentMealData(null);
    }
  }, [selectedDate, mealData]);

  if (!selectedDate) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card-premium p-8 text-center mt-6"
      >
        <p className="text-sm text-[oklch(0.50_0.01_250)]">날짜를 선택해주세요</p>
      </motion.div>
    );
  }

  const formatDate = (date: Date) => {
    return dayjs(date).format("YYYY-MM-DD");
  };

  const hasMealData = currentMealData && (currentMealData.breakfast || currentMealData.lunch || currentMealData.dinner || currentMealData.attendance);

  const meals = [
    {
      title: "조식",
      data: currentMealData?.breakfast,
      type: "breakfast" as const,
      icon: "/icons/breakfast.png",
      gradientClass: "meal-card-breakfast",
      accentColor: "oklch(0.55 0.15 55)",
      textColor: "text-[oklch(0.45_0.12_55)]",
    },
    {
      title: "중식",
      data: currentMealData?.lunch,
      type: "lunch" as const,
      icon: "/icons/lunch.png",
      gradientClass: "meal-card-lunch",
      accentColor: "oklch(0.50 0.18 250)",
      textColor: "text-[oklch(0.40_0.15_250)]",
    },
    {
      title: "석식",
      data: currentMealData?.dinner,
      type: "dinner" as const,
      icon: "/icons/dinner.png",
      gradientClass: "meal-card-dinner",
      accentColor: "oklch(0.48 0.18 280)",
      textColor: "text-[oklch(0.40_0.15_280)]",
    },
  ];

  const visibleMeals = meals.filter((meal) => {
    if (meal.data) return true;
    if (meal.type === "lunch" && (currentMealData?.attendance === "근무" || currentMealData?.attendance?.includes("개별식사"))) {
      return true;
    }
    return false;
  });

  const isHoliday = (attendance: string): boolean => {
    return Boolean(attendance && attendance.includes("휴무"));
  };

  const isRemoteWork = (attendance: string): boolean => {
    return Boolean(attendance && attendance.includes("재택근무"));
  };

  // Empty State
  if (!hasMealData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="card-premium p-6 mt-6"
      >
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-semibold text-[oklch(0.30_0.02_250)]">
            {formatDate(selectedDate)}
          </span>
        </div>

        <div className="flex flex-col items-center py-6">
          <div className="w-16 h-16 rounded-2xl bg-[oklch(0.96_0.02_250)] flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[oklch(0.70_0.01_250)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <p className="text-sm text-[oklch(0.50_0.01_250)] mb-6">
            이 날짜에 등록된 식대 기록이 없습니다
          </p>
          <Button
            onClick={() => onAddMeal?.("lunch")}
            className="btn-primary w-full h-12 text-sm font-medium"
          >
            식대 기록 추가하기
          </Button>
        </div>
      </motion.div>
    );
  }

  // Holiday State
  if (currentMealData && isHoliday(currentMealData.attendance)) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="card-premium p-6 mt-6"
      >
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-semibold text-[oklch(0.30_0.02_250)]">
            {formatDate(selectedDate)}
          </span>
        </div>

        <div className="flex flex-col items-center py-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[oklch(0.92_0.08_55)] to-[oklch(0.88_0.10_45)] flex items-center justify-center mb-4 shadow-lg shadow-[oklch(0.72_0.12_55/0.2)]">
            <Image src="/icons/holiday2.png" alt="휴무" width={36} height={36} className="object-contain" />
          </div>
          <p className="text-base font-semibold text-[oklch(0.50_0.14_55)] mb-2">휴무일</p>
          <p className="text-sm text-[oklch(0.55_0.01_250)] mb-6">휴무일에는 식대가 제공되지 않습니다</p>
          <Button
            onClick={() => currentMealData && onHolidayEdit?.(currentMealData)}
            variant="outline"
            className="w-full h-11 rounded-xl border-[oklch(0.85_0.08_55)] text-[oklch(0.50_0.12_55)] hover:bg-[oklch(0.96_0.04_55)]"
          >
            근태 상태 수정하기
          </Button>
        </div>
      </motion.div>
    );
  }

  // Remote Work State
  if (currentMealData && isRemoteWork(currentMealData.attendance)) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="card-premium p-6 mt-6"
      >
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-semibold text-[oklch(0.30_0.02_250)]">
            {formatDate(selectedDate)}
          </span>
        </div>

        <div className="flex flex-col items-center py-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[oklch(0.90_0.08_155)] to-[oklch(0.85_0.10_165)] flex items-center justify-center mb-4 shadow-lg shadow-[oklch(0.68_0.14_155/0.2)]">
            <Image src="/icons/homeOffice.png" alt="재택근무" width={36} height={36} className="object-contain" />
          </div>
          <p className="text-base font-semibold text-[oklch(0.45_0.14_155)] mb-2">재택근무</p>
          <p className="text-sm text-[oklch(0.55_0.01_250)] mb-6">재택근무일에는 식대가 제공되지 않습니다</p>
          <Button
            onClick={() => currentMealData && onHolidayEdit?.(currentMealData)}
            variant="outline"
            className="w-full h-11 rounded-xl border-[oklch(0.80_0.10_155)] text-[oklch(0.45_0.14_155)] hover:bg-[oklch(0.95_0.04_155)]"
          >
            근태 상태 수정하기
          </Button>
        </div>
      </motion.div>
    );
  }

  // Meal Cards Display
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="card-premium p-5 mt-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-sm font-semibold text-[oklch(0.30_0.02_250)]">
          {formatDate(selectedDate)}
        </span>
      </div>

      {/* Meal List */}
      <div className="space-y-3">
        {visibleMeals.map((meal, index) => (
          <motion.div
            key={meal.type}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            onClick={() => {
              if (currentMealData && onEditMeal) {
                onEditMeal(meal.type, currentMealData);
              } else {
                onAddMeal?.(meal.type);
              }
            }}
            className={`meal-card ${meal.gradientClass} group cursor-pointer`}
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <Image src={meal.icon} alt={meal.title} width={28} height={28} className="object-contain" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-semibold ${meal.textColor}`}>
                    {meal.title}
                  </span>
                  <span className={`font-bold ${meal.textColor} ${
                    meal.type === "lunch" && currentMealData?.attendance?.includes("개별식사") && !meal.data?.amount
                      ? "text-sm font-normal"
                      : "text-base"
                  }`}>
                    {meal.data?.amount
                      ? `-${meal.data.amount.toLocaleString()}원`
                      : meal.type === "lunch" && currentMealData?.attendance?.includes("개별식사")
                      ? "개별식사"
                      : "0원"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[oklch(0.50_0.01_250)] truncate pr-2">
                    {meal.data?.store || (meal.type === "lunch" && !meal.data ? "입력 내용이 없습니다" : "식당 정보 없음")}
                  </span>
                  {meal.data?.payer && (
                    <span className="text-xs text-[oklch(0.55_0.01_250)] flex-shrink-0">
                      {meal.data.payer}
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <motion.div
                className="text-[oklch(0.75_0.01_250)] group-hover:text-[oklch(0.55_0.01_250)] transition-colors"
                whileHover={{ x: 3 }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
