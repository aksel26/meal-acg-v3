"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useMealDrawerStore } from "@/stores/mealDrawerStore";
import { useUsers } from "@/hooks/useUsers";
import { AutoCompleteInput } from "@repo/ui/src/autocomplete-input";

export function PayerStep() {
  const { formData, selectedMealType, updateFormField, completeStep } = useMealDrawerStore();
  const { users, isLoading, error, fetchUsers } = useUsers();
  const currentPayer = formData[selectedMealType].payer;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (users.length === 0) {
      fetchUsers();
    }
  }, [users.length, fetchUsers]);

  useEffect(() => {
    // Focus input on mount
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleValueChange = (value: string) => {
    updateFormField("payer", value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && currentPayer.trim()) {
      e.preventDefault();
      completeStep("payer");
    }
  };

  const handleSelect = () => {
    if (currentPayer.trim()) {
      completeStep("payer");
    }
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
        <h3 className="text-lg font-semibold text-slate-900">
          누가 결제했나요?
        </h3>
        <p className="text-sm text-slate-500">
          결제자 이름을 입력하거나 선택해주세요
        </p>
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg"
        >
          {error}
        </motion.p>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <AutoCompleteInput
          ref={inputRef}
          suggestions={users}
          value={currentPayer}
          onValueChange={handleValueChange}
          onSuggestionSelect={handleSelect}
          placeholder="결제자 이름"
          allowFreeText={true}
          maxSuggestions={users.length}
          emptyText="결제자를 찾을 수 없습니다"
          disabled={isLoading}
          onKeyDown={handleKeyDown}
          className="h-14 text-base rounded-xl border-2 border-slate-100 bg-white focus:border-slate-300 focus:ring-0 transition-all placeholder:text-slate-400"
        />
      </motion.div>

      {currentPayer.trim() && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => completeStep("payer")}
          className="w-full py-3.5 px-4 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors"
        >
          다음
        </motion.button>
      )}
    </motion.div>
  );
}
