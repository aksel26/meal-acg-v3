"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useMealDrawerStore } from "@/stores/mealDrawerStore";
import { useRestaurantNames } from "@/hooks/useRestaurants";
import { AutoCompleteInput } from "@repo/ui/src/autocomplete-input";

export function StoreStep() {
  const { formData, selectedMealType, updateFormField, completeStep } = useMealDrawerStore();
  const { restaurantNames, isLoading } = useRestaurantNames();
  const currentStore = formData[selectedMealType].store;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input on mount
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleValueChange = (value: string) => {
    updateFormField("store", value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && currentStore.trim()) {
      e.preventDefault();
      completeStep("store");
    }
  };

  const handleSelect = () => {
    if (currentStore.trim()) {
      completeStep("store");
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
        <h3 className="text-lg font-semibold text-gray-900">
          어디서 식사했나요?
        </h3>
        <p className="text-sm text-gray-500">
          식당 이름을 입력하거나 선택해주세요
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <AutoCompleteInput
          ref={inputRef}
          suggestions={restaurantNames}
          value={currentStore}
          onValueChange={handleValueChange}
          onSuggestionSelect={handleSelect}
          placeholder="식당명"
          allowFreeText={true}
          maxSuggestions={10}
          emptyText="저장된 식당이 없습니다"
          disabled={isLoading}
          onKeyDown={handleKeyDown}
          className="h-14 text-base rounded-xl border-2 border-gray-100 bg-white focus:border-gray-300 focus:ring-0 transition-all placeholder:text-gray-400"
        />
      </motion.div>

      {currentStore.trim() && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => completeStep("store")}
          className="w-full py-3.5 px-4 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
        >
          다음
        </motion.button>
      )}
    </motion.div>
  );
}
