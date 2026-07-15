import * as React from "react";
import { Button } from "@repo/ui/src/button";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { motion } from "motion/react";

dayjs.locale("ko");

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
  onEditMeal?: (
    mealType: "breakfast" | "lunch" | "dinner",
    mealInfo: MealData,
  ) => void;
  onHolidayEdit?: (mealInfo: MealData) => void;
  mealData?: MealData[];
}

export function MealCards({
  selectedDate,
  onAddMeal,
  onEditMeal,
  onHolidayEdit,
  mealData = [],
}: MealCardsProps) {
  // 파생 상태: useMemo로 직접 계산 (불필요한 리렌더 방지)
  const currentMealData = React.useMemo(() => {
    if (!selectedDate || mealData.length === 0) return null;
    const dateString = dayjs(selectedDate).format("YYYY-MM-DD");
    return mealData.find((meal) => meal.date === dateString) || null;
  }, [selectedDate, mealData]);

  if (!selectedDate) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card-premium p-6 text-center mt-4"
      >
        <p className="text-sm text-slate-400">날짜를 선택해주세요</p>
      </motion.div>
    );
  }

  const formatDate = (date: Date) => {
    return dayjs(date).format("M월 D일 (ddd)");
  };

  const hasMealData =
    currentMealData &&
    (currentMealData.breakfast ||
      currentMealData.lunch ||
      currentMealData.dinner ||
      currentMealData.attendance);

  const hasMealEntry = (
    meal?: { store: string; amount: number; payer: string },
  ): boolean => {
    if (!meal) return false;

    const hasAmount = meal.amount > 0;
    const hasStore = meal.store?.trim().length > 0;

    return hasAmount || hasStore;
  };

  const meals = [
    {
      title: "조식",
      data: currentMealData?.breakfast,
      type: "breakfast" as const,
      color: "bg-amber-50",
      dotColor: "bg-amber-400",
    },
    {
      title: "중식",
      data: currentMealData?.lunch,
      type: "lunch" as const,
      color: "bg-blue-50",
      dotColor: "bg-blue-400",
    },
    {
      title: "석식",
      data: currentMealData?.dinner,
      type: "dinner" as const,
      color: "bg-blue-50",
      dotColor: "bg-blue-400",
    },
  ];

  // 조식/중식: 금액이 0이고 식당 정보 없으면 제외
  // 석식: 데이터가 있으면 표시
  // 개별식사인 경우 중식은 표시
  const visibleMeals = meals.filter((meal) => {
    const hasAmount = meal.data?.amount && meal.data.amount > 0;
    const hasStore = meal.data?.store && meal.data.store.trim().length > 0;

    // 금액이 있거나 식당 정보가 있으면 표시
    if (hasAmount || hasStore) return true;

    // 중식이고 개별식사인 경우 표시
    if (
      meal.type === "lunch" &&
      currentMealData?.attendance?.includes("개별식사")
    ) {
      return true;
    }

    return false;
  });

  const isHoliday = (attendance: string): boolean => {
    const normalizedAttendance = attendance?.trim().toLowerCase() || "";
    return Boolean(
      normalizedAttendance &&
        !normalizedAttendance.includes("반차") &&
        (normalizedAttendance.includes("연차") ||
          normalizedAttendance === "휴무"),
    );
  };

  const isRemoteWork = (attendance: string): boolean => {
    return Boolean(attendance && attendance.includes("재택근무"));
  };

  const isHalfDayAttendance = (attendance: string): boolean => {
    return Boolean(attendance && attendance.includes("반차"));
  };

  const isHalfDay = Boolean(
    currentMealData?.attendance && isHalfDayAttendance(currentMealData.attendance),
  );

  const availableHalfDayMeals = currentMealData
    ? (["breakfast", "dinner"] as const).filter((mealType) => {
        const meal = currentMealData[mealType];
        return !hasMealEntry(meal);
      })
    : [];

  // Empty State
  if (!hasMealData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card-premium p-5 mt-4"
      >
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-slate-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            {formatDate(selectedDate)} 기록 없음
          </p>
          <Button
            onClick={() => onAddMeal?.("lunch")}
            className="h-9 px-4 text-sm font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
          >
            기록 추가
          </Button>
        </div>
      </motion.div>
    );
  }

  // Holiday State
  if (currentMealData && isHoliday(currentMealData.attendance)) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card-premium p-5 mt-4"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-900">
            {formatDate(selectedDate)}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-600 font-medium">
            휴무
          </span>
        </div>
        <p className="text-sm text-slate-400 text-center py-4">식대 미지급</p>
        <button
          onClick={() => currentMealData && onHolidayEdit?.(currentMealData)}
          className="w-full text-sm text-slate-500 hover:text-slate-700 py-2"
        >
          근태 수정
        </button>
      </motion.div>
    );
  }

  // Remote Work State
  if (currentMealData && isRemoteWork(currentMealData.attendance)) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card-premium p-5 mt-4"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-900">
            {formatDate(selectedDate)}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 font-medium">
            재택
          </span>
        </div>
        <p className="text-sm text-slate-400 text-center py-4">식대 미지급</p>
        <button
          onClick={() => currentMealData && onHolidayEdit?.(currentMealData)}
          className="w-full text-sm text-slate-500 hover:text-slate-700 py-2"
        >
          근태 수정
        </button>
      </motion.div>
    );
  }

  // No visible meals after filter
  if (visibleMeals.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card-premium p-5 mt-4"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-900">
            {formatDate(selectedDate)}
          </span>
          {currentMealData?.attendance && (
            <span className="text-xs px-2 py-1 rounded-full bg-slate-50 text-slate-500 font-medium">
              {currentMealData.attendance}
            </span>
          )}
        </div>
        <div className="text-center py-4">
          <p className="text-sm text-slate-400 mb-3">식사 기록 없음</p>
          {isHalfDay ? (
            <div className="flex justify-center gap-2">
              {availableHalfDayMeals.map((mealType) => (
                <button
                  key={mealType}
                  onClick={() => onAddMeal?.(mealType)}
                  className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                >
                  + {mealType === "breakfast" ? "조식" : "석식"} 추가
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => onAddMeal?.("lunch")}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              + 추가
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // Meal Cards Display - Minimal Style
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card-premium p-4 mt-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-sm font-medium text-slate-900">
          {formatDate(selectedDate)}
        </span>
        {currentMealData?.attendance &&
          !currentMealData.attendance.includes("근무") && (
            <span className="text-xs text-slate-400">
              {currentMealData.attendance}
            </span>
          )}
      </div>

      {/* Meal List - Compact */}
      <div className="space-y-2">
        {visibleMeals.map((meal, index) => (
          <motion.div
            key={meal.type}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            onClick={() => {
              if (currentMealData && onEditMeal) {
                onEditMeal(meal.type, currentMealData);
              } else {
                onAddMeal?.(meal.type);
              }
            }}
            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${meal.dotColor}`} />
              <span className="text-sm font-medium text-slate-700">
                {meal.title}
              </span>
              {meal.data?.store && (
                <span className="text-sm text-slate-400 truncate max-w-[120px]">
                  {meal.data.store}
                </span>
              )}
              {meal.type === "lunch" &&
                currentMealData?.attendance?.includes("개별식사") &&
                !meal.data?.store && (
                  <span className="text-sm text-slate-400">개별식사</span>
                )}
            </div>
            <div className="flex items-center gap-2">
              {meal.data?.amount && meal.data.amount > 0 ? (
                <span className="text-sm font-semibold text-slate-900">
                  {meal.data.amount.toLocaleString()}원
                </span>
              ) : (
                <span className="text-sm text-slate-300">-</span>
              )}
              <svg
                className="w-4 h-4 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add button if needed */}
      {isHalfDay ? (
        availableHalfDayMeals.length > 0 && (
          <div className="mt-2 flex gap-2">
            {availableHalfDayMeals.map((mealType) => (
              <button
                key={mealType}
                onClick={() => onAddMeal?.(mealType)}
                className="flex-1 rounded-lg py-2 text-sm text-slate-400 transition-colors hover:text-slate-600"
              >
                + {mealType === "breakfast" ? "조식" : "석식"} 추가
              </button>
            ))}
          </div>
        )
      ) : (
        visibleMeals.length < 3 && (
          <button
            onClick={() => onAddMeal?.("dinner")}
            className="w-full mt-2 py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            + 식사 추가
          </button>
        )
      )}
    </motion.div>
  );
}
