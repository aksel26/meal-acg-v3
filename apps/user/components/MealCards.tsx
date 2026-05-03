import * as React from "react";
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

const mealStyles: Record<MealType, { dot: string }> = {
  breakfast: {
    dot: "bg-[var(--slate-gray)]",
  },
  lunch: {
    dot: "bg-[var(--ink-black)]",
  },
  dinner: {
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
  const cardClassName = (baseClassName: string) =>
    `${baseClassName} ${className}`.trim();

  const currentMealData = React.useMemo(() => {
    if (!selectedDate || mealData.length === 0) return null;
    const dateString = dayjs(selectedDate).format("YYYY-MM-DD");
    return mealData.find((meal) => meal.date === dateString) || null;
  }, [selectedDate, mealData]);

  const formatDate = (date: Date) => dayjs(date).format("M월 D일 (ddd)");

  const hasMealEntry = (meal?: {
    store?: string | null;
    amount?: number | null;
    payer?: string | null;
  }): boolean => {
    if (!meal) return false;
    return Number(meal.amount) > 0 || (meal.store ?? "").trim().length > 0;
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
    Boolean(attendance && attendance.includes("재택"));

  if (!selectedDate) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cardClassName("card-premium mt-3 p-4 text-center")}
      >
        <p className="eyebrow-label justify-center">Meal Entry</p>
        <p className="mt-2 text-xs text-[var(--granite)]">날짜를 선택해주세요</p>
      </motion.div>
    );
  }

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

  const attendance = currentMealData?.attendance || "";
  const isLunchLeaveInfoAttendance =
    attendance.includes("반차") ||
    attendance.includes("연차") ||
    attendance.includes("재택") ||
    attendance === "휴무";
  const isBreakfastDinnerDisabled =
    isHoliday(attendance) || isRemoteWork(attendance);
  const isNonMealDay = Boolean(attendance && isBreakfastDinnerDisabled);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cardClassName("card-premium mt-3 p-4")}
    >
      <div className="mb-3 flex items-center justify-between gap-4 px-1">
        <div>
          <p className="eyebrow-label">Meal Entry</p>
          <span className="mt-1.5 block text-base font-medium tracking-normal text-[var(--ink-black)]">
            {formatDate(selectedDate)}
          </span>
        </div>
        {currentMealData?.attendance &&
          !currentMealData.attendance.includes("근무") && (
            <button
              type="button"
              onClick={() => onHolidayEdit?.(currentMealData)}
              className="min-w-0 max-w-[55%] truncate rounded-[14px] bg-white/80 px-3 py-1.5 text-xs text-[var(--granite)] transition-colors hover:bg-white"
            >
              {currentMealData.attendance}
            </button>
          )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {meals.map((meal, index) => {
          const hasEntry = hasMealEntry(meal.data);
          const isIndividualLunch =
            meal.type === "lunch" && attendance.includes("개별식사");
          const canEdit = Boolean(currentMealData && (hasEntry || isIndividualLunch));
          const isFilled = hasEntry || isIndividualLunch;
          const isDisabled = isBreakfastDinnerDisabled && meal.type !== "lunch";
          const isLunchLeaveInfo =
            isLunchLeaveInfoAttendance && meal.type === "lunch";

          const handleClick = () => {
            if (isDisabled) return;
            if (isLunchLeaveInfo && currentMealData && onHolidayEdit) {
              onHolidayEdit(currentMealData);
              return;
            }
            if (canEdit && currentMealData && onEditMeal) {
              onEditMeal(meal.type, currentMealData);
              return;
            }
            onAddMeal?.(meal.type);
          };

          return (
            <motion.button
              type="button"
              key={meal.type}
              disabled={isDisabled}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              onClick={handleClick}
              className={`flex min-h-[5.25rem] min-w-0 flex-col justify-between rounded-[15px] p-3 text-left transition-colors lg:min-h-0 ${
                isDisabled
                  ? "cursor-not-allowed bg-[var(--whisper-cream)] opacity-50"
                  : isFilled || isLunchLeaveInfo
                    ? "bg-[var(--whisper-cream)] hover:bg-[var(--soft-bone)]"
                    : "border border-dashed border-[var(--soft-bone)] bg-transparent hover:border-[var(--slate-gray)] hover:bg-[var(--whisper-cream)]"
              } ${isNonMealDay ? "opacity-70" : ""}`}
            >
              <div className="flex min-w-0 items-center justify-between gap-2">
                <span className="min-w-0 truncate text-xs font-semibold text-[var(--ink-black)]">
                  {meal.title}
                </span>
                <div className={`h-2 w-2 shrink-0 rounded-full ${meal.dot}`} />
              </div>

              <div className="min-w-0">
                {isLunchLeaveInfo ? (
                  <p className="truncate text-xs font-medium text-[var(--warning)]">
                    {attendance}
                  </p>
                ) : hasEntry ? (
                  <p className="truncate text-xs font-medium text-[var(--granite)]">
                    {meal.data?.store || "매장 미입력"}
                  </p>
                ) : (
                  <p className="truncate text-xs text-[var(--slate-gray)]">
                    {isIndividualLunch
                      ? "개별식사"
                      : isDisabled || isNonMealDay
                        ? "식대 미지급"
                        : "기록 없음"}
                  </p>
                )}
              </div>

              <div className="flex min-w-0 items-center justify-between gap-2">
                <span className="min-w-0 truncate text-xs font-semibold text-[var(--ink-black)]">
                  {meal.data?.amount && meal.data.amount > 0
                    ? `${meal.data.amount.toLocaleString()}원`
                    : "-"}
                </span>
                <span className="shrink-0 text-[10px] font-medium text-[var(--slate-gray)]">
                  {isDisabled ? "제외" : isLunchLeaveInfo ? "근태 수정" : canEdit ? "수정" : "추가"}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
