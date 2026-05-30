"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useMealDrawerStore } from "@/stores/mealDrawerStore";
import { useIndividualMealAmount } from "@/hooks/useSettings";
import { Input } from "@repo/ui/src/input";

// 천 단위 콤마 포맷팅
const formatNumberWithCommas = (value: string): string => {
  const numericValue = value.replace(/[^0-9]/g, "");
  if (!numericValue) return "";
  return Number(numericValue).toLocaleString("ko-KR");
};

// 콤마 제거하여 숫자 문자열로 변환
const parseFormattedNumber = (value: string): string => {
  return value.replace(/[^0-9]/g, "");
};

interface AmountStepProps {
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function AmountStep({ onSubmit, isSubmitting }: AmountStepProps) {
  const { formData, selectedMealType, updateFormField, completeStep } = useMealDrawerStore();
  const { amount: individualMealAmount } = useIndividualMealAmount();
  const currentAmount = formData[selectedMealType].amount;
  const isIndividualMeal = selectedMealType === "lunch" && formData.lunch.attendance === "근무(개별식사 / 식사안함)";
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input on mount (only if not individual meal)
    if (!isIndividualMeal) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isIndividualMeal]);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = parseFormattedNumber(e.target.value);
    updateFormField("amount", rawValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    // For individual meal, amount is not required
    if (isIndividualMeal || currentAmount.trim()) {
      completeStep("amount");
      onSubmit();
    }
  };

  const canSubmit = isIndividualMeal || currentAmount.trim();

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
          {isIndividualMeal ? "개별식사로 처리할게요" : "얼마였나요?"}
        </h3>
        <p className="text-sm text-gray-500">
          {isIndividualMeal
            ? `총 금액에서 ${individualMealAmount.toLocaleString()}원이 차감됩니다`
            : "결제 금액을 입력해주세요"
          }
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!isIndividualMeal && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="relative"
          >
            <Input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={formatNumberWithCommas(currentAmount)}
              onChange={handleValueChange}
              onKeyDown={handleKeyDown}
              className="h-14 text-2xl font-semibold text-right rounded-xl border-2 border-gray-100 bg-white focus:border-gray-300 focus:ring-0 transition-all placeholder:text-gray-300 placeholder:font-normal"
              style={{ paddingRight: '2.3rem' }}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-gray-400 font-medium pointer-events-none">
              원
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Individual meal info card */}
      <AnimatePresence>
        {isIndividualMeal && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-blue-50 border border-blue-100"
          >
            <div>
              <p className="text-sm font-medium text-blue-900">개별식사 처리</p>
              <p className="text-xs text-blue-700">
                -{individualMealAmount.toLocaleString()}원 자동 차감
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: canSubmit ? 1 : 0.5, y: 0 }}
        transition={{ duration: 0.2 }}
        onClick={handleSubmit}
        disabled={!canSubmit || isSubmitting}
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
      </motion.button>
    </motion.div>
  );
}
