"use client";

import { useState, lazy, Suspense } from "react";
import { useMealDrawerStore } from "@/stores/mealDrawerStore";
import { motion, AnimatePresence } from "motion/react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@repo/ui/src/dialog";
import { formatDate } from "utils";
import { StepFormContainer } from "./meal-entry";
import { X, ChevronLeft } from "lucide-react";

// Lazy load DeleteConfirmDialog
const DeleteConfirmDialog = lazy(() =>
  import("./DeleteConfirmDialog").then((module) => ({
    default: module.DeleteConfirmDialog,
  }))
);

interface MealEntryDrawerProps {
  onFormSubmit: (e: React.FormEvent) => Promise<void>;
  onDeleteMeal?: (date: string, mealType: "breakfast" | "lunch" | "dinner") => Promise<void>;
}

export default function MealEntryDrawer({
  onFormSubmit,
  onDeleteMeal,
}: MealEntryDrawerProps) {
  const {
    isOpen,
    isEditMode,
    selectedDate,
    selectedMealType,
    currentStep,
    completedSteps,
    closeDrawer,
    prevStep,
  } = useMealDrawerStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteMeal = async () => {
    if (!selectedDate || !onDeleteMeal) return;

    setIsDeleting(true);
    try {
      await onDeleteMeal(formatDate(selectedDate), selectedMealType);
      closeDrawer();
    } finally {
      setIsDeleting(false);
    }
  };

  // 중식은 attendance가 첫 스텝, 그 외는 mealType이 첫 스텝
  const firstStep = selectedMealType === "lunch" ? "attendance" : "mealType";
  const canGoBack = currentStep !== firstStep && completedSteps.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={closeDrawer}>
      <DialogContent
        className="max-w-md w-[calc(100%-2rem)] bg-white rounded-2xl border-0 shadow-2xl p-0 gap-0 max-h-[85vh] sm:max-h-[90vh] overflow-visible"
        showCloseButton={false}
      >
        <DialogHeader className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between">
            {/* Left: Back button or spacer */}
            <div className="w-10">
              <AnimatePresence mode="wait">
                {canGoBack && (
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    type="button"
                    onClick={prevStep}
                    className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Center: Title and date */}
            <div className="flex-1 text-center">
              <DialogTitle className="text-base font-semibold text-gray-900">
                {isEditMode ? "식대 기록 수정" : "식대 기록"}
              </DialogTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedDate?.toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                })}
              </p>
            </div>

            {/* Right: Close or Delete button */}
            <div className="w-10 flex justify-end">
              {isEditMode && onDeleteMeal ? (
                <Suspense fallback={null}>
                  <DeleteConfirmDialog
                    selectedDate={selectedDate}
                    mealType={selectedMealType}
                    isDeleting={isDeleting}
                    onConfirm={handleDeleteMeal}
                  >
                    <button
                      type="button"
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                      disabled={isSubmitting || isDeleting}
                    >
                      {isDeleting ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-red-600 border-t-transparent" />
                      ) : (
                        "삭제"
                      )}
                    </button>
                  </DeleteConfirmDialog>
                </Suspense>
              ) : (
                <DialogClose asChild>
                  <button
                    type="button"
                    className="p-2 -mr-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </DialogClose>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Form Content - overflow-visible for autocomplete dropdowns */}
        <div className="px-5 pb-6 pb-safe overflow-visible">
          <StepFormContainer
            onFormSubmit={onFormSubmit}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
