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
        <p className="text-sm text-gray-400">날짜를 선택해주세요</p>
      </motion.div>
    );
  }

  const formatDate = (date: Date) => {
    return dayjs(date).format("M월 D일 (ddd)");
  };

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
      color: "bg-violet-50",
      dotColor: "bg-violet-400",
    },
  ];

  const attendance = currentMealData?.attendance || "";
  // 중식 박스에서 근태 정보로 노출할 근태 (반차 포함 전체 식대 미지급)
  const isLunchLeaveInfoAttendance =
    attendance.includes("반차") ||
    attendance.includes("연차") ||
    attendance.includes("재택") ||
    attendance === "휴무";
  // 조식/석식 비활성화할 근태 (반차 제외 - 반차에는 조식/석식 등록 가능)
  const isBreakfastDinnerDisabled =
    attendance.includes("연차") ||
    attendance.includes("재택") ||
    attendance === "휴무";

  // Meal Cards Display - 3-column Grid (통합: 빈 상태/반차/연차/재택/일반)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card-premium p-4 mt-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-sm font-medium text-gray-900">
          {formatDate(selectedDate)}
        </span>
        {currentMealData?.attendance &&
          !currentMealData.attendance.includes("근무") && (
            <span className="text-xs text-gray-400">
              {currentMealData.attendance}
            </span>
          )}
      </div>

      {/* Meal List - 3-column Grid (조식 / 중식 / 석식) */}
      <div className="grid grid-cols-3 gap-2">
        {meals.map((meal, index) => {
          const hasEntry = hasMealEntry(meal.data);
          const isIndividualLunch =
            meal.type === "lunch" && attendance.includes("개별식사");
          const isFilled = hasEntry || isIndividualLunch;

          // 연차/재택/휴무: 조식·석식 비활성화. 반차: 조식·석식 등록 가능.
          // 중식 박스: 반차 포함 모든 식대 미지급 근태에서 근태 정보 표시.
          const isDisabled = isBreakfastDinnerDisabled && meal.type !== "lunch";
          const isLunchLeaveInfo =
            isLunchLeaveInfoAttendance && meal.type === "lunch";

          const handleClick = () => {
            if (isDisabled) return;
            if (isLunchLeaveInfo && currentMealData && onHolidayEdit) {
              onHolidayEdit(currentMealData);
              return;
            }
            if (isFilled && currentMealData && onEditMeal) {
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
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              onClick={handleClick}
              className={`flex flex-col items-start gap-1.5 rounded-xl p-3 text-left transition-colors ${
                isDisabled
                  ? "bg-gray-50/60 cursor-not-allowed opacity-60"
                  : isLunchLeaveInfo
                    ? "bg-amber-50 hover:bg-amber-100"
                    : isFilled
                      ? "bg-gray-50 hover:bg-gray-100"
                      : "border border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isDisabled ? "bg-gray-300" : meal.dotColor
                  }`}
                />
                <span
                  className={`text-xs font-medium ${
                    isDisabled
                      ? "text-gray-400"
                      : isFilled || isLunchLeaveInfo
                        ? "text-gray-700"
                        : "text-gray-400"
                  }`}
                >
                  {meal.title}
                </span>
              </div>

              {isLunchLeaveInfo ? (
                <>
                  <span className="text-xs font-medium text-amber-700 truncate w-full">
                    {attendance}
                  </span>
                  <span className="text-[11px] text-amber-600/70">
                    근태 수정
                  </span>
                </>
              ) : isDisabled ? (
                <span className="text-[11px] text-gray-400 leading-tight">
                  식대 미지급
                </span>
              ) : (
                <>
                  {meal.data?.store ? (
                    <span className="text-xs text-gray-500 truncate w-full">
                      {meal.data.store}
                    </span>
                  ) : isIndividualLunch ? (
                    <span className="text-xs text-gray-500 truncate w-full">
                      개별식사
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">-</span>
                  )}
                  {meal.data?.amount && meal.data.amount > 0 ? (
                    <span className="text-sm font-semibold text-gray-900">
                      {meal.data.amount.toLocaleString()}원
                    </span>
                  ) : (
                    <span className="text-sm text-gray-300">-</span>
                  )}
                </>
              )}
            </motion.button>
          );
        })}
      </div>

    </motion.div>
  );
}
