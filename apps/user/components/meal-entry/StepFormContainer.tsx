"use client";

import { useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  useMealDrawerStore,
  StepId,
  STEP_ORDER_LUNCH,
  STEP_ORDER_OTHER,
  NO_MEAL_SUPPORT_ATTENDANCE,
  INDIVIDUAL_MEAL_ATTENDANCE,
} from "@/stores/mealDrawerStore";
import { CompletedStepItem } from "./CompletedStepItem";
import {
  MealTypeStep,
  AttendanceStep,
  ReceiptStep,
  PayerStep,
  StoreStep,
  AmountStep,
} from "./steps";
import { useRestaurantNames, useCreateRestaurant, parseRestaurantName } from "@/hooks/useRestaurants";

const mealTypeLabels = {
  breakfast: "조식",
  lunch: "중식",
  dinner: "석식",
};

const attendanceShortLabels: Record<string, string> = {
  "근무": "근무",
  "근무(개별식사 / 식사안함)": "개별식사",
  "오전 반차/휴무": "오전반차",
  "오후 반차/휴무": "오후반차",
  "연차/휴무": "연차",
  "재택근무": "재택",
};

interface StepFormContainerProps {
  onFormSubmit: (e: React.FormEvent) => Promise<void>;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
}

export function StepFormContainer({
  onFormSubmit,
  isSubmitting,
  setIsSubmitting,
}: StepFormContainerProps) {
  const {
    selectedMealType,
    formData,
    currentStep,
    completedSteps,
    isEditMode,
    goToStep,
  } = useMealDrawerStore();

  const { restaurantNames } = useRestaurantNames();
  const createRestaurant = useCreateRestaurant();
  const currentFormData = formData[selectedMealType];

  // Get steps to show based on meal type and attendance
  const visibleSteps = useMemo(() => {
    if (selectedMealType === "lunch") {
      const attendance = formData.lunch.attendance;
      // 식대 미지원 또는 개별식사인 경우 attendance만 표시
      if (NO_MEAL_SUPPORT_ATTENDANCE.includes(attendance) || attendance === INDIVIDUAL_MEAL_ATTENDANCE) {
        return ["attendance"] as StepId[];
      }
      // 근무인 경우: mealType 스킵 (attendance → payer → store → amount)
      if (attendance === "근무") {
        return STEP_ORDER_LUNCH.filter((step) => step !== "mealType");
      }
      // 아직 선택 안 한 경우
      return STEP_ORDER_LUNCH;
    }
    return STEP_ORDER_OTHER;
  }, [selectedMealType, formData.lunch.attendance]);

  // Get value to display for completed step
  const getStepValue = useCallback(
    (stepId: StepId): string => {
      switch (stepId) {
        case "mealType":
          return mealTypeLabels[selectedMealType];
        case "attendance":
          return attendanceShortLabels[formData.lunch.attendance] || formData.lunch.attendance;
        case "receipt":
          return "스캔 완료";
        case "payer":
          return currentFormData.payer;
        case "store":
          return currentFormData.store;
        case "amount":
          const amount = currentFormData.amount;
          if (!amount) {
            if (selectedMealType === "lunch" && formData.lunch.attendance === "근무(개별식사 / 식사안함)") {
              return "개별식사";
            }
            return "";
          }
          return `${Number(amount).toLocaleString()}원`;
        default:
          return "";
      }
    },
    [selectedMealType, formData, currentFormData]
  );

  // Check if step is completed
  const isStepCompleted = useCallback(
    (stepId: StepId): boolean => {
      return completedSteps.includes(stepId);
    },
    [completedSteps]
  );

  // Steps that require form input (excluding receipt which is optional)
  const formSteps = useMemo(() => {
    return visibleSteps.filter((step) => step !== "receipt");
  }, [visibleSteps]);

  // Check if all form steps are completed
  const allStepsCompleted = useMemo(() => {
    return formSteps.every((step) => completedSteps.includes(step));
  }, [formSteps, completedSteps]);

  // Check if we're in edit mode and showing summary view
  // In edit mode, show summary when all steps are completed and current step is also in completed
  const isShowingSummary = isEditMode && allStepsCompleted && completedSteps.includes(currentStep);

  // Get completed steps that should be displayed
  const displayedCompletedSteps = useMemo(() => {
    if (isShowingSummary) {
      // In summary view, show all form steps
      return formSteps;
    }
    // In edit mode or normal mode, show completed steps except current
    return visibleSteps.filter(
      (step) => isStepCompleted(step) && step !== currentStep && step !== "receipt"
    );
  }, [visibleSteps, formSteps, isStepCompleted, currentStep, isShowingSummary]);

  // Save new restaurant if needed
  const saveNewRestaurant = useCallback(
    async (storeName: string) => {
      if (!storeName || storeName.trim() === "") return;

      const { name, business_number } = parseRestaurantName(storeName);

      if (restaurantNames.includes(storeName)) {
        return;
      }

      try {
        await createRestaurant.mutateAsync({ name, business_number });
      } catch (error) {
        console.error("Restaurant save error:", error);
      }
    },
    [restaurantNames, createRestaurant]
  );

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Save new restaurant if needed
      if (currentFormData.store) {
        await saveNewRestaurant(currentFormData.store);
      }
      // Create synthetic event for form submission
      const syntheticEvent = {
        preventDefault: () => {},
      } as React.FormEvent;
      await onFormSubmit(syntheticEvent);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, currentFormData.store, saveNewRestaurant, onFormSubmit, setIsSubmitting]);

  // Render current step component
  const renderCurrentStep = () => {
    switch (currentStep) {
      case "mealType":
        return <MealTypeStep key="mealType" />;
      case "attendance":
        return (
          <AttendanceStep
            key="attendance"
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        );
      case "receipt":
        return <ReceiptStep key="receipt" />;
      case "payer":
        return <PayerStep key="payer" />;
      case "store":
        return <StoreStep key="store" />;
      case "amount":
        return (
          <AmountStep
            key="amount"
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-0">
      {/* Completed Steps */}
      {displayedCompletedSteps.length > 0 && (
        <div className="space-y-2 mb-6">
          {displayedCompletedSteps.map((stepId, index) => (
            <CompletedStepItem
              key={stepId}
              stepId={stepId}
              value={getStepValue(stepId)}
              onEdit={() => goToStep(stepId)}
              index={index}
            />
          ))}
        </div>
      )}

      {/* Current Step or Summary Save Button */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {isShowingSummary ? (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="pt-2"
            >
              <motion.button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-4 px-4 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    저장 중...
                  </div>
                ) : (
                  "수정 완료"
                )}
              </motion.button>
            </motion.div>
          ) : (
            renderCurrentStep()
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
