"use client";

import { motion } from "motion/react";
import { StepId, STEP_LABELS } from "@/stores/mealDrawerStore";

interface CompletedStepItemProps {
  stepId: StepId;
  value: string;
  onEdit: () => void;
  index: number;
}

export function CompletedStepItem({ stepId, value, onEdit, index }: CompletedStepItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.3,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="group relative"
    >
      <div
        onClick={onEdit}
        className="flex items-center justify-between px-4 py-3 bg-gray-50/80 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100/80 hover:border-gray-200 transition-all duration-200"
      >
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
            {STEP_LABELS[stepId]}
          </span>
          <span className="text-sm font-medium text-gray-800 leading-tight">
            {value || "-"}
          </span>
        </div>
        <span className="opacity-0 group-hover:opacity-100 px-2 py-1 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-200 transition-all duration-200">
          수정
        </span>
      </div>
    </motion.div>
  );
}
