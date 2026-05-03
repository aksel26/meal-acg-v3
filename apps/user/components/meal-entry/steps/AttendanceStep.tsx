"use client";

import { useState } from "react";
import {
  useMealDrawerStore,
  NO_MEAL_SUPPORT_ATTENDANCE,
  DINNER_NO_MEAL_SUPPORT_ATTENDANCE,
  INDIVIDUAL_MEAL_ATTENDANCE,
} from "@/stores/mealDrawerStore";
import { attendanceOptions } from "@/lib/const/const";

const attendanceConfig: Record<string, { emoji: string; shortLabel: string }> =
  {
    근무: { emoji: "💼", shortLabel: "근무" },
    "근무(개별식사 / 식사안함)": { emoji: "🍱", shortLabel: "개별식사" },
    "오전 반차/휴무": { emoji: "🌅", shortLabel: "오전반차" },
    "오후 반차/휴무": { emoji: "🌆", shortLabel: "오후반차" },
    "연차/휴무": { emoji: "🏖️", shortLabel: "연차" },
    재택근무: { emoji: "🏠", shortLabel: "재택" },
  };

interface AttendanceStepProps {
  onSubmit?: () => Promise<void>;
  isSubmitting?: boolean;
}

export function AttendanceStep({
  onSubmit,
  isSubmitting,
}: AttendanceStepProps) {
  const { formData, selectedMealType, updateFormField, completeStep } = useMealDrawerStore();
  const currentAttendance = formData.lunch.attendance;
  const [selectedValue, setSelectedValue] = useState<string>(currentAttendance);

  const isLunchFlow = selectedMealType === "lunch";
  const isNoMealSupport = isLunchFlow
    ? NO_MEAL_SUPPORT_ATTENDANCE.includes(selectedValue)
    : DINNER_NO_MEAL_SUPPORT_ATTENDANCE.includes(selectedValue);
  const isIndividualMeal = isLunchFlow && selectedValue === INDIVIDUAL_MEAL_ATTENDANCE;
  const showSaveButton = isNoMealSupport || isIndividualMeal;

  const handleSelect = (value: string) => {
    setSelectedValue(value);
    updateFormField("attendance", value);

    const shouldAdvance = isLunchFlow
      ? value === "근무"
      : !DINNER_NO_MEAL_SUPPORT_ATTENDANCE.includes(value);

    if (shouldAdvance) {
      completeStep("attendance");
    }
  };

  const handleSave = async () => {
    if (onSubmit) {
      await onSubmit();
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-medium text-[var(--ink-black)]">
          오늘 근태는 어떤가요?
        </h3>
        <p className="text-sm text-[var(--slate-gray)]">
          {selectedMealType === "dinner"
            ? "석식 기록에 필요한 근태 정보예요"
            : "중식 기록에 필요한 근태 정보예요"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {attendanceOptions?.map((option) => {
          const config = attendanceConfig[option.value];
          const isSelected = selectedValue === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`flex items-center gap-3 py-3.5 px-4 rounded-[16px] transition-all duration-200 text-left ${
                isSelected
                  ? "bg-[var(--ink-black)] text-white"
                  : "bg-[var(--whisper-cream)] text-[var(--granite)] hover:bg-[var(--soft-bone)]"
              }`}
            >
              <span className="text-lg">{config?.emoji}</span>
              <span className="text-sm font-medium">{config?.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* 식대 미지원 메시지 및 저장 버튼 */}
      {showSaveButton && (
        <div className="space-y-3 pt-2">
          {isNoMealSupport && (
            <div className="bg-[rgba(236,126,0,0.1)] rounded-[16px] p-4">
              <p className="text-sm text-[var(--warning)] font-medium">
                {attendanceConfig[selectedValue]?.shortLabel} 시에는 식대가
                지원되지 않습니다.
              </p>
              <p className="text-xs text-[var(--warning)]/80 mt-1">
                근태 정보만 저장됩니다.
              </p>
            </div>
          )}

          {isIndividualMeal && (
            <div className="bg-[var(--whisper-cream)] rounded-[16px] p-4">
              <p className="text-sm text-[var(--ink-black)] font-medium">
                개별식사로 기록됩니다.
              </p>
              <p className="text-xs text-[var(--granite)] mt-1">
                식대 입력 없이 저장됩니다.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="w-full py-4 px-4 rounded-full bg-[var(--ink-black)] text-white font-medium hover:bg-[var(--granite)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                저장 중...
              </div>
            ) : (
              "저장하기"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
