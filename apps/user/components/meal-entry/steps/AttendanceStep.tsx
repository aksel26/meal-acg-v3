"use client";

import { useState } from "react";
import {
  useMealDrawerStore,
  NO_MEAL_SUPPORT_ATTENDANCE,
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
  const { formData, updateFormField, completeStep } = useMealDrawerStore();
  const currentAttendance = formData.lunch.attendance;
  const [selectedValue, setSelectedValue] = useState<string>(currentAttendance);

  // 선택한 값이 식대 미지원 또는 개별식사인지 확인
  const isNoMealSupport = NO_MEAL_SUPPORT_ATTENDANCE.includes(selectedValue);
  const isIndividualMeal = selectedValue === INDIVIDUAL_MEAL_ATTENDANCE;
  const showSaveButton = isNoMealSupport || isIndividualMeal;

  const handleSelect = (value: string) => {
    setSelectedValue(value);
    updateFormField("attendance", value);

    // 근무 선택 시에만 바로 다음 단계로 진행
    if (value === "근무") {
      completeStep("attendance");
    }
    // 식대 미지원/개별식사는 저장 버튼 표시 후 사용자가 직접 저장
  };

  const handleSave = async () => {
    if (onSubmit) {
      await onSubmit();
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-medium text-gray-900">
          오늘 근태는 어떤가요?
        </h3>
        <p className="text-sm text-gray-500">
          중식 기록에 필요한 근태 정보예요
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {attendanceOptions?.map((option, index) => {
          const config = attendanceConfig[option.value];
          const isSelected = selectedValue === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`flex items-center gap-3 py-3.5 px-4 rounded-xl border-2 transition-all duration-200 text-left ${
                isSelected
                  ? "bg-gray-900 border-gray-900 text-white shadow-lg shadow-gray-900/20"
                  : "bg-white border-gray-100 text-gray-700 hover:border-gray-200 hover:bg-gray-50"
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
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-800 font-medium">
                {attendanceConfig[selectedValue]?.shortLabel} 시에는 식대가
                지원되지 않습니다.
              </p>
              <p className="text-xs text-amber-600 mt-1">
                근태 정보만 저장됩니다.
              </p>
            </div>
          )}

          {isIndividualMeal && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800 font-medium">
                개별식사로 기록됩니다.
              </p>
              <p className="text-xs text-blue-600 mt-1">
                식대 입력 없이 저장됩니다.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="w-full py-4 px-4 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
