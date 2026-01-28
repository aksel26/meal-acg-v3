"use client";

import { useState, lazy, Suspense } from "react";
import { useMealDrawerStore } from "@/stores/mealDrawerStore";
import { motion, AnimatePresence } from "motion/react";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@repo/ui/src/drawer";
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
  onDeleteMeal?: (date: string) => Promise<void>;
}

export default function MealEntryDrawer({
  onFormSubmit,
  onDeleteMeal,
}: MealEntryDrawerProps) {
  const {
    isOpen,
    isEditMode,
    selectedDate,
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
      await onDeleteMeal(selectedDate.toISOString());
      closeDrawer();
    } finally {
      setIsDeleting(false);
    }
  };

  const canGoBack = currentStep !== "mealType" && completedSteps.length > 0;

  return (
    <Drawer open={isOpen} onOpenChange={closeDrawer} repositionInputs={false}>
      <DrawerContent className="max-h-[90vh] max-w-lg mx-auto bg-white rounded-t-3xl border-0 shadow-[0_-8px_40px_rgba(0,0,0,0.12)]">
        {/* Handle Bar */}
        <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-1" />

        <DrawerHeader className="px-5 pb-4 pt-2">
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
              <DrawerTitle className="text-base font-semibold text-gray-900">
                {isEditMode ? "식대 기록 수정" : "식대 기록"}
              </DrawerTitle>
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
                <DrawerClose asChild>
                  <button
                    type="button"
                    className="p-2 -mr-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </DrawerClose>
              )}
            </div>
          </div>
        </DrawerHeader>

        {/* Step Progress Indicator */}
        <div className="px-5 pb-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((step, index) => (
              <motion.div
                key={step}
                className="h-1 flex-1 rounded-full overflow-hidden bg-gray-100"
              >
                <motion.div
                  className="h-full bg-gray-900 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{
                    width: index < completedSteps.length ? "100%" : "0%",
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="px-5 pb-8 overflow-y-auto flex-1">
          <StepFormContainer
            onFormSubmit={onFormSubmit}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
