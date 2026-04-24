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
  className?: string;
}

type MealType = "breakfast" | "lunch" | "dinner";

const mealStyles: Record<MealType, { tone: string; dot: string }> = {
  breakfast: {
    tone: "bg-[var(--soft-bone)]",
    dot: "bg-[var(--slate-gray)]",
  },
  lunch: {
    tone: "bg-[var(--whisper-cream)]",
    dot: "bg-[var(--ink-black)]",
  },
  dinner: {
    tone: "bg-[var(--soft-bone)]",
    dot: "bg-[var(--granite)]",
  },
};

export function MealCards({
  selectedDate,
  onAddMeal,
  onEditMeal,
  onHolidayEdit,
  mealData = [],
  className = "",
}: MealCardsProps) {
  const cardClassName = (baseClassName: string) => `${baseClassName} ${className}`;

  const currentMealData = React.useMemo(() => {
    if (!selectedDate || mealData.length === 0) return null;
    const dateString = dayjs(selectedDate).format("YYYY-MM-DD");
    return mealData.find((meal) => meal.date === dateString) || null;
  }, [selectedDate, mealData]);

  const formatDate = (date: Date) => dayjs(date).format("M월 D일 (ddd)");

  const hasMealEntry = (
    meal?: { store: string; amount: number; payer: string },
  ): boolean => {
    if (!meal) return false;
    return meal.amount > 0 || meal.store?.trim().length > 0;
  };

  const isHoliday = (attendance: string): boolean => {
    const normalizedAttendance = attendance?.trim().toLowerCase() || "";
    return Boolean(
      normalizedAttendance &&
        !normalizedAttendance.includes("반차") &&
        (normalizedAttendance.includes("연차") ||
          normalizedAttendance === "휴무"),
    );
  };

  const isRemoteWork = (attendance: string): boolean =>
    Boolean(attendance && attendance.includes("재택근무"));

  const isHalfDayAttendance = (attendance: string): boolean =>
    Boolean(attendance && attendance.includes("반차"));

  if (!selectedDate) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cardClassName("card-premium mt-4 p-6 text-center")}>
        <p className="eyebrow-label justify-center">Meal Entry</p>
        <p className="mt-3 text-sm text-[var(--granite)]">날짜를 선택해주세요</p>
      </motion.div>
    );
  }

  const hasMealData =
    currentMealData &&
    (currentMealData.breakfast ||
      currentMealData.lunch ||
      currentMealData.dinner ||
      currentMealData.attendance);

  const meals = [
    {
      title: "조식",
      data: currentMealData?.breakfast,
      type: "breakfast" as const,
      ...mealStyles.breakfast,
    },
    {
      title: "중식",
      data: currentMealData?.lunch,
      type: "lunch" as const,
      ...mealStyles.lunch,
    },
    {
      title: "석식",
      data: currentMealData?.dinner,
      type: "dinner" as const,
      ...mealStyles.dinner,
    },
  ];

  const visibleMeals = meals.filter((meal) => {
    const hasAmount = meal.data?.amount && meal.data.amount > 0;
    const hasStore = meal.data?.store && meal.data.store.trim().length > 0;

    if (hasAmount || hasStore) return true;

    if (
      meal.type === "lunch" &&
      currentMealData?.attendance?.includes("개별식사")
    ) {
      return true;
    }

    return false;
  });

  const isHalfDay = Boolean(
    currentMealData?.attendance && isHalfDayAttendance(currentMealData.attendance),
  );

  const availableHalfDayMeals = currentMealData
    ? (["breakfast", "dinner"] as const).filter((mealType) => {
        const meal = currentMealData[mealType];
        return !hasMealEntry(meal);
      })
    : [];

  if (!hasMealData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cardClassName("card-premium mt-4 p-5")}
      >
        <div className="py-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--soft-bone)]">
            <svg
              className="h-6 w-6 text-[var(--slate-gray)]"
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
          <p className="eyebrow-label justify-center">Meal Entry</p>
          <p className="mt-3 text-sm text-[var(--granite)]">
            {formatDate(selectedDate)} 기록 없음
          </p>
          <Button
            onClick={() => onAddMeal?.("lunch")}
            className="btn-primary mt-4 h-10 px-5 text-sm"
          >
            기록 추가
          </Button>
        </div>
      </motion.div>
    );
  }

  if (currentMealData && (isHoliday(currentMealData.attendance) || isRemoteWork(currentMealData.attendance))) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cardClassName("card-premium mt-4 p-5")}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow-label">Attendance</p>
            <span className="mt-2 block text-lg font-medium tracking-[-0.03em] text-[var(--ink-black)]">
              {formatDate(selectedDate)}
            </span>
          </div>
            <span className="rounded-[14px] bg-white/80 px-3 py-1.5 text-xs font-medium text-[var(--granite)]">
            {currentMealData.attendance}
          </span>
        </div>
        <p className="py-4 text-center text-sm text-[var(--granite)]">식대 미지급</p>
        <button
          onClick={() => onHolidayEdit?.(currentMealData)}
          className="btn-secondary w-full py-2 text-sm"
        >
          근태 수정
        </button>
      </motion.div>
    );
  }

  if (visibleMeals.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cardClassName("card-premium mt-4 p-5")}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow-label">Meal Entry</p>
            <span className="mt-2 block text-lg font-medium tracking-[-0.03em] text-[var(--ink-black)]">
              {formatDate(selectedDate)}
            </span>
          </div>
          {currentMealData?.attendance && (
            <span className="rounded-[14px] bg-white/80 px-3 py-1.5 text-xs text-[var(--granite)]">
              {currentMealData.attendance}
            </span>
          )}
        </div>
        <div className="py-4 text-center">
          <p className="text-sm text-[var(--granite)]">식사 기록 없음</p>
          {isHalfDay ? (
            <div className="mt-3 flex justify-center gap-2">
              {availableHalfDayMeals.map((mealType) => (
                <button
                  key={mealType}
                  onClick={() => onAddMeal?.(mealType)}
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  + {mealType === "breakfast" ? "조식" : "석식"} 추가
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => onAddMeal?.("lunch")}
              className="btn-secondary mt-3 px-4 py-2 text-sm"
            >
              + 추가
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cardClassName("card-premium mt-4 p-5")}
    >
      <div className="mb-4 flex items-center justify-between gap-4 px-1">
        <div>
          <p className="eyebrow-label">Meal Entry</p>
          <span className="mt-2 block text-lg font-medium tracking-[-0.03em] text-[var(--ink-black)]">
            {formatDate(selectedDate)}
          </span>
        </div>
        {currentMealData?.attendance &&
          !currentMealData.attendance.includes("근무") && (
            <span className="rounded-[14px] bg-white/80 px-3 py-1.5 text-xs text-[var(--granite)]">
              {currentMealData.attendance}
            </span>
          )}
      </div>

      <div className="space-y-2">
        {visibleMeals.map((meal, index) => (
          <motion.button
            type="button"
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
            className={`flex w-full items-center justify-between rounded-[16px] border border-[rgba(20,20,19,0.06)] p-3.5 text-left transition-colors ${meal.tone}`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className={`h-2.5 w-2.5 rounded-full ${meal.dot}`} />
              <span className="text-sm font-medium text-[var(--ink-black)]">
                {meal.title}
              </span>
              {meal.data?.store ? (
                <span className="max-w-[120px] truncate text-sm text-[var(--granite)]">
                  {meal.data.store}
                </span>
              ) : (
                meal.type === "lunch" &&
                currentMealData?.attendance?.includes("개별식사") && (
                  <span className="text-sm text-[var(--granite)]">개별식사</span>
                )
              )}
            </div>
            <div className="flex items-center gap-2">
              {meal.data?.amount && meal.data.amount > 0 ? (
                <span className="text-sm font-semibold text-[var(--ink-black)]">
                  {meal.data.amount.toLocaleString()}원
                </span>
              ) : (
                <span className="text-sm text-[rgba(20,20,19,0.28)]">-</span>
              )}
              <svg
                className="h-4 w-4 text-[var(--slate-gray)]"
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
          </motion.button>
        ))}
      </div>

      {isHalfDay ? (
        availableHalfDayMeals.length > 0 && (
          <div className="mt-3 flex gap-2">
            {availableHalfDayMeals.map((mealType) => (
              <button
                key={mealType}
                onClick={() => onAddMeal?.(mealType)}
                className="btn-secondary flex-1 py-2 text-sm"
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
            className="btn-secondary mt-3 w-full py-2 text-sm"
          >
            + 식사 추가
          </button>
        )
      )}
    </motion.div>
  );
}
