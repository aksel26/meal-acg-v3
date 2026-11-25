"use client";

import { motion } from "motion/react";
import { Check, Pencil } from "lucide-react";
import { StepId, STEP_LABELS } from "@/stores/mealDrawerStore";
import { EASE_OUT_EXPO } from "@/lib/motion";

interface CompletedStepItemProps {
  stepId: StepId;
  value: string;
  onEdit: () => void;
  index: number;
  /** false면 정보용 행이라 수정 표시(호버 배경·연필)를 숨긴다 */
  editable?: boolean;
}

export function CompletedStepItem({ stepId, value, onEdit, index, editable = true }: CompletedStepItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.3,
        delay: index * 0.05,
        ease: EASE_OUT_EXPO,
      }}
      className="relative"
    >
      <div
        onClick={onEdit}
        className={`flex items-center justify-between px-4 py-3 bg-[var(--whisper-cream)] rounded-[16px] ${
          editable ? "cursor-pointer hover:bg-[var(--soft-bone)] transition-colors duration-200" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-[rgba(0,168,126,0.12)] flex items-center justify-center">
            <Check className="w-3 h-3 text-[var(--teal)]" strokeWidth={3} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-[var(--slate-gray)] font-medium">
              {STEP_LABELS[stepId]}
            </span>
            <span className="text-sm font-medium text-[var(--ink-black)] leading-tight">
              {value || "-"}
            </span>
          </div>
        </div>
        {editable && (
          <button
            type="button"
            className="p-1.5 rounded-full hover:bg-white"
          >
            <Pencil className="w-3.5 h-3.5 text-[var(--slate-gray)]" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
