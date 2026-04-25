"use client";

import { motion } from "motion/react";
import { Check, Pencil } from "lucide-react";
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
        className="flex items-center justify-between px-4 py-3 bg-[var(--whisper-cream)] rounded-[16px] cursor-pointer hover:bg-[var(--soft-bone)] transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-[rgba(0,168,126,0.12)] flex items-center justify-center">
            <Check className="w-3 h-3 text-[var(--teal)]" strokeWidth={3} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--slate-gray)] font-medium uppercase tracking-[0.12em]">
              {STEP_LABELS[stepId]}
            </span>
            <span className="text-sm font-medium text-[var(--ink-black)] leading-tight">
              {value || "-"}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-white transition-all duration-200"
        >
          <Pencil className="w-3.5 h-3.5 text-[var(--granite)]" />
        </button>
      </div>
    </motion.div>
  );
}
