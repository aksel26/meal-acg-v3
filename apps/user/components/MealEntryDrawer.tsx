"use client";

import { useState, useEffect, lazy, Suspense, useCallback } from "react";
import { useUsers } from "@/hooks/useUsers";
import { useMealDrawerStore } from "@/stores/mealDrawerStore";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { motion, AnimatePresence } from "motion/react";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@repo/ui/src/drawer";
import { AutoCompleteInput } from "@repo/ui/src/autocomplete-input";
import { attendanceOptions, mealTypeOptions } from "@/lib/const/const";
import { ReceiptScanner } from "./ReceiptScanner";
import { ReceiptScanResult } from "@/lib/types/receipt-types";
import { useIndividualMealAmount } from "@/hooks/useSettings";
import { useRestaurantNames, useCreateRestaurant, parseRestaurantName } from "@/hooks/useRestaurants";

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

// Meal type config - muted colors
const mealTypeConfig = {
  breakfast: {
    label: "조식",
    bgColor: "bg-[oklch(0.96_0.02_60)]",
    activeColor: "bg-[oklch(0.92_0.04_60)]",
    textColor: "text-[oklch(0.40_0.06_60)]",
    borderColor: "border-[oklch(0.88_0.04_60)]",
  },
  lunch: {
    label: "중식",
    bgColor: "bg-[oklch(0.96_0.02_250)]",
    activeColor: "bg-[oklch(0.92_0.04_250)]",
    textColor: "text-[oklch(0.40_0.08_250)]",
    borderColor: "border-[oklch(0.88_0.04_250)]",
  },
  dinner: {
    label: "석식",
    bgColor: "bg-[oklch(0.96_0.02_280)]",
    activeColor: "bg-[oklch(0.92_0.04_280)]",
    textColor: "text-[oklch(0.40_0.06_280)]",
    borderColor: "border-[oklch(0.88_0.04_280)]",
  },
};

const shortLabels: Record<string, string> = {
  "근무": "근무",
  "근무(개별식사 / 식사안함)": "개별식사",
  "오전 반차/휴무": "오전반차",
  "오후 반차/휴무": "오후반차",
  "연차/휴무": "연차",
  "재택근무": "재택",
};

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

export default function MealEntryDrawer({ onFormSubmit, onDeleteMeal }: MealEntryDrawerProps) {
  const { isOpen, isEditMode, selectedMealType, selectedDate, formData, closeDrawer, setSelectedMealType, updateFormField } = useMealDrawerStore();

  const { users, isLoading: usersLoading, error: usersError, fetchUsers } = useUsers();
  const { amount: individualMealAmount } = useIndividualMealAmount();
  const { restaurantNames, isLoading: restaurantsLoading } = useRestaurantNames();
  const createRestaurant = useCreateRestaurant();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const currentFormData = formData[selectedMealType];

  useEffect(() => {
    if (isOpen && users.length === 0) {
      fetchUsers();
    }
  }, [isOpen, users.length, fetchUsers]);

  useEffect(() => {
    if (isOpen && selectedMealType === "lunch") {
      const lunchFormData = formData.lunch;
      const currentAttendance = lunchFormData.attendance || "";

      if (currentAttendance === "근무(개별식사 / 식사안함)" && lunchFormData.amount !== "") {
        updateFormField("amount", "");
      }
    }
  }, [isOpen, selectedMealType, updateFormField, formData.lunch]);

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

  // 새 식당 저장 함수
  const saveNewRestaurant = useCallback(
    async (storeName: string) => {
      if (!storeName || storeName.trim() === "") return;

      const { name, business_number } = parseRestaurantName(storeName);

      // 이미 목록에 있는지 확인
      if (restaurantNames.includes(storeName)) {
        console.log("Restaurant already exists:", storeName);
        return;
      }

      try {
        console.log("Saving new restaurant:", { name, business_number });
        await createRestaurant.mutateAsync({ name, business_number });
        console.log("Restaurant saved successfully");
      } catch (error) {
        // 중복 등록 에러는 무시
        console.error("Restaurant save error:", error);
      }
    },
    [restaurantNames, createRestaurant]
  );

  const handleScanComplete = useCallback(
    (result: ReceiptScanResult) => {
      if (result.storeName) {
        updateFormField("store", result.storeName);
      }
      if (result.totalAmount > 0) {
        updateFormField("amount", result.totalAmount.toString());
      }
    },
    [updateFormField]
  );

  return (
    <Drawer open={isOpen} onOpenChange={closeDrawer} repositionInputs={false}>
      <DrawerContent className="max-h-[85vh] max-w-lg mx-auto bg-white rounded-t-2xl border-0 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        {/* Handle Bar */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-2" />

        <DrawerHeader className="px-5 pb-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-base font-semibold text-gray-900">
                {isEditMode ? "식대 기록 수정" : "식대 기록 추가"}
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
            {isEditMode && onDeleteMeal && (
              <Suspense fallback={null}>
                <DeleteConfirmDialog selectedDate={selectedDate} isDeleting={isDeleting} onConfirm={handleDeleteMeal}>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
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
            )}
          </div>
        </DrawerHeader>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (selectedMealType === "lunch") {
              const lunchData = currentFormData as { attendance: string };
              if (!lunchData.attendance) {
                setValidationError("근태를 선택해주세요.");
                return;
              }
            }
            setValidationError(null);

            setIsSubmitting(true);
            try {
              // 새 식당 저장 (폼 제출 전에 완료)
              if (currentFormData.store) {
                await saveNewRestaurant(currentFormData.store);
              }
              await onFormSubmit(e);
              // 폼 제출 성공 후 drawer 닫기는 onFormSubmit에서 처리됨
            } finally {
              setIsSubmitting(false);
            }
          }}
          className="px-5 py-4 space-y-5 overflow-y-auto flex-1"
        >
          {/* 식사 타입 선택 */}
          <div className="space-y-2.5">
            <Label className="text-xs font-medium text-gray-600">식사 타입</Label>
            <div className="grid grid-cols-3 gap-2">
              {mealTypeOptions.map((meal) => {
                const typeConfig = mealTypeConfig[meal.value as keyof typeof mealTypeConfig];
                const isSelected = selectedMealType === meal.value;

                return (
                  <button
                    key={meal.value}
                    type="button"
                    onClick={() => {
                      setSelectedMealType(meal.value as "breakfast" | "lunch" | "dinner");
                      setValidationError(null);
                    }}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all border ${
                      isSelected
                        ? `${typeConfig.activeColor} ${typeConfig.textColor} ${typeConfig.borderColor}`
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {typeConfig.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 영수증 스캔 */}
          <div className="space-y-2.5">
            <Label className="text-xs font-medium text-gray-600">영수증 스캔</Label>
            <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              <ReceiptScanner onScanComplete={handleScanComplete} />
            </div>
          </div>

          {/* 결제자 */}
          <div className="space-y-2.5">
            <Label className="text-xs font-medium text-gray-600">결제자</Label>
            {usersError && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                {usersError}
              </p>
            )}
            <AutoCompleteInput
              suggestions={users}
              value={currentFormData.payer}
              onValueChange={(value) => updateFormField("payer", value)}
              placeholder="결제자 선택"
              allowFreeText={true}
              maxSuggestions={users.length}
              emptyText="결제자를 찾을 수 없습니다."
              disabled={usersLoading}
              className="h-11 text-sm rounded-xl border-gray-200 bg-white focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all"
            />
          </div>

          {/* 식당명 */}
          <div className="space-y-2.5">
            <Label className="text-xs font-medium text-gray-600">식당명</Label>
            <AutoCompleteInput
              id="store"
              suggestions={restaurantNames}
              value={currentFormData.store}
              onValueChange={(value) => updateFormField("store", value)}
              placeholder="식당명 입력"
              allowFreeText={true}
              maxSuggestions={10}
              emptyText="저장된 식당이 없습니다"
              disabled={restaurantsLoading}
              className="h-11 text-sm rounded-xl border-gray-200 bg-white focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all"
            />
          </div>

          {/* 금액 */}
          <div className="space-y-2.5">
            <Label className="text-xs font-medium text-gray-600">금액</Label>
            <div className="relative">
              <Input
                id="amount"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={formatNumberWithCommas(currentFormData.amount)}
                onChange={(e) => {
                  const rawValue = parseFormattedNumber(e.target.value);
                  updateFormField("amount", rawValue);
                }}
                disabled={(currentFormData as { attendance: string }).attendance === "근무(개별식사 / 식사안함)"}
                className="h-11 text-sm rounded-xl border-gray-200 bg-white focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all pr-10 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">원</span>
            </div>
            <AnimatePresence>
              {selectedMealType === "lunch" && "attendance" in currentFormData && (currentFormData as { attendance: string }).attendance === "근무(개별식사 / 식사안함)" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-100"
                >
                  <p className="text-xs text-blue-700">
                    총 금액에서 <span className="font-semibold">{individualMealAmount.toLocaleString()}원</span>이 차감됩니다.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 근태 - 중식일 때만 표시 */}
          <AnimatePresence>
            {selectedMealType === "lunch" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2.5"
              >
                <Label className="text-xs font-medium text-gray-600">근태</Label>
                <div className={`grid grid-cols-3 gap-1.5 p-1.5 rounded-xl bg-gray-100 ${validationError ? "ring-2 ring-red-300" : ""}`}>
                  {attendanceOptions?.map((option) => {
                    const currentAttendance = "attendance" in currentFormData ? (currentFormData as { attendance: string }).attendance : "";
                    const isSelected = currentAttendance === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          updateFormField("attendance", option.value);
                          setValidationError(null);
                        }}
                        className={`py-2 px-2 rounded-lg text-[11px] font-medium transition-all ${
                          isSelected
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {shortLabels[option.value] || option.label}
                      </button>
                    );
                  })}
                </div>
                <AnimatePresence>
                  {validationError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-xs text-red-500"
                    >
                      {validationError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        <DrawerFooter className="px-5 pb-8 pt-4 border-t border-gray-100 flex gap-3 safe-area-bottom">
          <DrawerClose asChild>
            <button
              className="flex-1 h-11 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-all disabled:opacity-50"
              disabled={isSubmitting || isDeleting}
            >
              취소
            </button>
          </DrawerClose>
          <button
            type="submit"
            onClick={async (e) => {
              if (selectedMealType === "lunch") {
                const lunchData = currentFormData as { attendance: string };
                if (!lunchData.attendance) {
                  setValidationError("근태를 선택해주세요.");
                  return;
                }
              }
              setValidationError(null);
              setIsSubmitting(true);
              try {
                // 새 식당 저장 (폼 제출 전에 완료)
                if (currentFormData.store) {
                  await saveNewRestaurant(currentFormData.store);
                }
                await onFormSubmit(e);
                // 폼 제출 성공 후 drawer 닫기는 onFormSubmit에서 처리됨
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="flex-1 h-11 rounded-xl text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 transition-all disabled:opacity-50"
            disabled={isSubmitting || isDeleting}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                {isEditMode ? "수정 중..." : "저장 중..."}
              </div>
            ) : (
              isEditMode ? "수정 완료" : "저장하기"
            )}
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
