"use client";

import { motion } from "motion/react";
import { useMealDrawerStore } from "@/stores/mealDrawerStore";
import { attendanceOptions } from "@/lib/const/const";

const attendanceConfig: Record<string, { emoji: string; shortLabel: string }> = {
  "근무": { emoji: "💼", shortLabel: "근무" },
  "근무(개별식사 / 식사안함)": { emoji: "🍱", shortLabel: "개별식사" },
  "오전 반차/휴무": { emoji: "🌅", shortLabel: "오전반차" },
  "오후 반차/휴무": { emoji: "🌆", shortLabel: "오후반차" },
  "연차/휴무": { emoji: "🏖️", shortLabel: "연차" },
  "재택근무": { emoji: "🏠", shortLabel: "재택" },
};

export function AttendanceStep() {
  const { formData, updateFormField, completeStep } = useMealDrawerStore();
  const currentAttendance = formData.lunch.attendance;

  const handleSelect = (value: string) => {
    updateFormField("attendance", value);
    completeStep("attendance");
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
          오늘 근태는 어떤가요?
        </h3>
        <p className="text-sm text-gray-500">
          중식 기록에 필요한 근태 정보예요
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {attendanceOptions?.map((option, index) => {
          const config = attendanceConfig[option.value];
          const isSelected = currentAttendance === option.value;

          return (
            <motion.button
              key={option.value}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.25 }}
              onClick={() => handleSelect(option.value)}
              className={`flex items-center gap-3 py-3.5 px-4 rounded-xl border-2 transition-all duration-200 text-left ${
                isSelected
                  ? "bg-gray-900 border-gray-900 text-white shadow-lg shadow-gray-900/20"
                  : "bg-white border-gray-100 text-gray-700 hover:border-gray-200 hover:bg-gray-50"
              }`}
            >
              <span className="text-lg">{config?.emoji}</span>
              <span className="text-sm font-medium">{config?.shortLabel}</span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
