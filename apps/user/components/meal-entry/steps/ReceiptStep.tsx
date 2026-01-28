"use client";

import { useCallback } from "react";
import { motion } from "motion/react";
import { Camera, PenLine } from "lucide-react";
import { useMealDrawerStore } from "@/stores/mealDrawerStore";
import { ReceiptScanner } from "@/components/ReceiptScanner";
import { ReceiptScanResult } from "@/lib/types/receipt-types";

export function ReceiptStep() {
  const { updateFormField, completeStep, setManualInput, isManualInput } = useMealDrawerStore();

  const handleScanComplete = useCallback(
    (result: ReceiptScanResult) => {
      if (result.storeName) {
        updateFormField("store", result.storeName);
      }
      if (result.totalAmount > 0) {
        updateFormField("amount", result.totalAmount.toString());
      }
      // Skip to payer step after successful scan
      completeStep("receipt");
    },
    [updateFormField, completeStep]
  );

  const handleManualInput = () => {
    setManualInput(true);
    completeStep("receipt");
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
          영수증이 있나요?
        </h3>
        <p className="text-sm text-gray-500">
          영수증을 스캔하면 자동으로 입력돼요
        </p>
      </div>

      <div className="space-y-3">
        {/* Receipt Scanner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50 transition-all"
        >
          <ReceiptScanner onScanComplete={handleScanComplete} />
        </motion.div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">또는</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Manual Input Button */}
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          onClick={handleManualInput}
          className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-xl border-2 border-gray-100 bg-white text-gray-700 hover:border-gray-200 hover:bg-gray-50 transition-all duration-200"
        >
          <PenLine className="w-4 h-4" />
          <span className="text-sm font-medium">직접 입력할게요</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
