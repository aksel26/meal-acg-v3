"use client";

import { useMemo } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { Plus } from "lucide-react";
import { MealData } from "@/components/dashboard/types";
import { useMealDrawerStore } from "@/stores/mealDrawerStore";
import { SectionLabel } from "./SectionLabel";

dayjs.locale("ko");

type MealType = "breakfast" | "lunch" | "dinner";

const MEAL_SLOTS: { type: MealType; title: string; dotColor: string }[] = [
  { type: "breakfast", title: "조식", dotColor: "bg-amber-400" },
  { type: "lunch", title: "중식", dotColor: "bg-blue-500" },
  { type: "dinner", title: "석식", dotColor: "bg-violet-400" },
];

function hasMealSlotRecord(meal: MealData | undefined, type: MealType) {
  if (!meal) return false;
  const record = meal[type];
  const hasMealValue = Boolean(
    record?.store || record?.payer || (record?.amount ?? 0) > 0,
  );

  if (type !== "lunch") return hasMealValue;

  const isMealAttendance =
    !meal.attendance_source || meal.attendance_source === "meal";
  return hasMealValue || Boolean(isMealAttendance && meal.attendance);
}

function getLunchAttendanceLabel(attendance: string | undefined) {
  if (!attendance) return "식사 기록";
  if (attendance.includes("개별식사")) return "개별식사";
  if (attendance.includes("오전") && attendance.includes("반차"))
    return "오전 반차";
  if (attendance.includes("오후") && attendance.includes("반차"))
    return "오후 반차";
  if (attendance.includes("반차")) return "반차";
  if (attendance.includes("재택")) return "재택근무";
  if (
    attendance.includes("연차") ||
    attendance.includes("휴가") ||
    attendance.includes("휴무")
  ) {
    return "휴가";
  }
  return "식사 기록";
}

interface MealEntryCardProps {
  selectedDate?: Date;
  mealData: MealData[];
}

export default function MealEntryCard({
  selectedDate,
  mealData,
}: MealEntryCardProps) {
  const { openDrawer, openDrawerForEdit } = useMealDrawerStore();

  const currentMeal = useMemo(() => {
    if (!selectedDate) return undefined;
    const dateStr = dayjs(selectedDate).format("YYYY-MM-DD");
    return mealData.find((meal) => meal.date === dateStr);
  }, [selectedDate, mealData]);

  const isIndividualLunch = !!currentMeal?.attendance?.includes("개별식사");

  const handleSlotClick = (type: MealType) => {
    if (currentMeal && hasMealSlotRecord(currentMeal, type)) {
      openDrawerForEdit(type, currentMeal, selectedDate);
    } else {
      openDrawer(type, selectedDate, currentMeal);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <SectionLabel>Meal Entry</SectionLabel>

      <h3 className="mt-3 mb-4 text-lg font-bold tracking-tight text-slate-900">
        {selectedDate
          ? dayjs(selectedDate).format("M월 D일 (ddd)")
          : "날짜를 선택해주세요"}
      </h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {MEAL_SLOTS.map((slot) => {
          const record = currentMeal?.[slot.type];
          const hasRecord = hasMealSlotRecord(currentMeal, slot.type);
          const showIndividual =
            slot.type === "lunch" &&
            isIndividualLunch &&
            (!currentMeal?.attendance_source ||
              currentMeal.attendance_source === "meal");
          const hasAmountOrStore =
            !!(record?.amount && record.amount > 0) || !!record?.store;

          const storeLabel = hasAmountOrStore
            ? record?.store || "식사 기록"
            : hasRecord && slot.type === "lunch"
              ? getLunchAttendanceLabel(currentMeal?.attendance)
              : showIndividual
                ? "개별식사"
                : "기록 없음";

          return (
            <button
              key={slot.type}
              type="button"
              disabled={!selectedDate}
              onClick={() => handleSlotClick(slot.type)}
              className="flex min-h-[78px] cursor-pointer flex-col rounded-xl border border-dashed border-gray-200 p-2.5 text-left transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-default disabled:opacity-50"
            >
              {/* 상단: 식사명 + 타입 점 */}
              <div className="flex items-start justify-between">
                <span className="text-[13px] font-semibold text-slate-900">
                  {slot.title}
                </span>
                <span
                  className={`mt-0.5 h-1.5 w-1.5 rounded-full ${slot.dotColor}`}
                />
              </div>

              {/* 식당명 */}
              <p
                className={`mt-1 truncate text-[11px] ${
                  hasRecord || showIndividual
                    ? "text-slate-600"
                    : "text-slate-400"
                }`}
              >
                {storeLabel}
              </p>

              {/* 하단: 금액 + 추가/수정 */}
              <div className="mt-auto flex items-end justify-between pt-1.5">
                <span
                  className={`text-[13px] font-semibold ${
                    hasAmountOrStore ? "text-slate-900" : "text-slate-300"
                  }`}
                >
                  {hasAmountOrStore
                    ? `${record!.amount.toLocaleString()}원`
                    : "-"}
                </span>
                <span className="flex items-center gap-0.5 text-[11px] font-medium text-slate-400 transition-colors group-hover:text-slate-600">
                  {hasRecord ? (
                    "수정"
                  ) : (
                    <>
                      <Plus className="h-2.5 w-2.5" />
                      추가
                    </>
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
