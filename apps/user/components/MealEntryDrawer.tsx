"use client";

import { useState, useEffect, lazy, Suspense, useCallback } from "react";
import { useUsers } from "@/hooks/useUsers";
import { useMealDrawerStore } from "@/stores/mealDrawerStore";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { motion, AnimatePresence } from "motion/react";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@repo/ui/src/drawer";
import { AutoCompleteInput } from "@repo/ui/src/autocomplete-input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/src/dialog";
import { Search } from "@repo/ui/icons";
import { attendanceOptions, businessNumbers, mealTypeOptions } from "@/lib/const/const";
import { ReceiptScanner } from "./ReceiptScanner";
import { ReceiptScanResult } from "@/lib/types/receipt-types";
import { useIndividualMealAmount } from "@/hooks/useSettings";

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

// Meal type icons and gradients
const mealTypeConfig = {
  breakfast: {
    icon: "🌅",
    gradient: "from-[oklch(0.85_0.12_55)] to-[oklch(0.78_0.14_45)]",
    activeGradient: "from-[oklch(0.72_0.16_55)] to-[oklch(0.65_0.18_45)]",
    shadow: "shadow-[oklch(0.72_0.14_55/0.3)]",
    label: "조식",
  },
  lunch: {
    icon: "☀️",
    gradient: "from-[oklch(0.88_0.08_250)] to-[oklch(0.82_0.12_260)]",
    activeGradient: "from-[oklch(0.55_0.18_250)] to-[oklch(0.48_0.20_270)]",
    shadow: "shadow-[oklch(0.55_0.18_250/0.3)]",
    label: "중식",
  },
  dinner: {
    icon: "🌙",
    gradient: "from-[oklch(0.85_0.10_280)] to-[oklch(0.78_0.14_290)]",
    activeGradient: "from-[oklch(0.52_0.18_280)] to-[oklch(0.45_0.20_300)]",
    shadow: "shadow-[oklch(0.52_0.18_280/0.3)]",
    label: "석식",
  },
};

// Attendance config
const attendanceConfig: Record<string, { icon: string; color: string; bgColor: string }> = {
  "근무": { icon: "💼", color: "text-[oklch(0.45_0.15_250)]", bgColor: "bg-[oklch(0.94_0.04_250)]" },
  "근무(개별식사 / 식사안함)": { icon: "🍱", color: "text-[oklch(0.50_0.14_55)]", bgColor: "bg-[oklch(0.94_0.06_55)]" },
  "오전 반차/휴무": { icon: "🌤️", color: "text-[oklch(0.50_0.12_85)]", bgColor: "bg-[oklch(0.94_0.05_85)]" },
  "오후 반차/휴무": { icon: "🌆", color: "text-[oklch(0.50_0.12_35)]", bgColor: "bg-[oklch(0.94_0.05_35)]" },
  "연차/휴무": { icon: "🏖️", color: "text-[oklch(0.50_0.14_155)]", bgColor: "bg-[oklch(0.92_0.06_155)]" },
  "재택근무": { icon: "🏠", color: "text-[oklch(0.50_0.12_200)]", bgColor: "bg-[oklch(0.94_0.04_200)]" },
};

const shortLabels: Record<string, string> = {
  "근무": "근무",
  "근무(개별식사 / 식사안함)": "개별식사",
  "오전 반차/휴무": "오전반차",
  "오후 반차/휴무": "오후반차",
  "연차/휴무": "연차",
  "재택근무": "재택",
};

export default function MealEntryDrawer({ onFormSubmit, onDeleteMeal }: MealEntryDrawerProps) {
  const { isOpen, isEditMode, selectedMealType, selectedDate, formData, closeDrawer, setSelectedMealType, updateFormField } = useMealDrawerStore();

  const { users, isLoading: usersLoading, error: usersError, fetchUsers } = useUsers();
  const { amount: individualMealAmount } = useIndividualMealAmount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBusinessDialogOpen, setIsBusinessDialogOpen] = useState(false);
  const [businessSearchTerm, setBusinessSearchTerm] = useState("");
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
  }, [isOpen, selectedMealType, updateFormField, formData.lunch.attendance, formData.lunch.amount]);

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

  const handleBusinessSelect = (business: { businessNumber: string; name: string }) => {
    updateFormField("store", `${business.name}(${business.businessNumber})`);
    setIsBusinessDialogOpen(false);
    setBusinessSearchTerm("");
  };

  const filteredBusinessNumbers = businessNumbers.filter((business) =>
    business.name.toLowerCase().includes(businessSearchTerm.toLowerCase()) || business.businessNumber.includes(businessSearchTerm)
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

  const config = mealTypeConfig[selectedMealType];

  return (
    <Drawer open={isOpen} onOpenChange={closeDrawer} repositionInputs={false}>
      <DrawerContent className="max-h-[85vh] max-w-lg mx-auto bg-white/95 backdrop-blur-2xl rounded-t-[2rem] border-0 shadow-[0_-8px_40px_rgba(0,0,0,0.12)]">
        {/* Handle Bar */}
        <div className="w-10 h-1 bg-[oklch(0.85_0.01_250)] rounded-full mx-auto mt-3 mb-2" />

        <DrawerHeader className="px-6 pb-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                key={selectedMealType}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${config.activeGradient} ${config.shadow} shadow-lg flex items-center justify-center`}
              >
                <span className="text-lg">{config.icon}</span>
              </motion.div>
              <div>
                <DrawerTitle className="text-base font-semibold text-[oklch(0.25_0.02_250)]">
                  {isEditMode ? "식대 기록 수정" : "식대 기록 추가"}
                </DrawerTitle>
                <p className="text-xs text-[oklch(0.55_0.01_250)] mt-0.5">
                  {selectedDate?.toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}
                </p>
              </div>
            </div>
            {isEditMode && onDeleteMeal && (
              <Suspense fallback={null}>
                <DeleteConfirmDialog selectedDate={selectedDate} isDeleting={isDeleting} onConfirm={handleDeleteMeal}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-[oklch(0.55_0.18_25)] bg-[oklch(0.95_0.04_25)] hover:bg-[oklch(0.92_0.06_25)] transition-colors"
                    disabled={isSubmitting || isDeleting}
                  >
                    {isDeleting ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-[oklch(0.55_0.18_25)] border-t-transparent" />
                    ) : (
                      "삭제"
                    )}
                  </motion.button>
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
              await onFormSubmit(e);
            } finally {
              setIsSubmitting(false);
            }
          }}
          className="px-6 py-4 space-y-5 overflow-y-auto flex-1"
        >
          {/* 식사 타입 선택 */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-[oklch(0.45_0.01_250)] uppercase tracking-wider">
              식사 타입
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {mealTypeOptions.map((meal, index) => {
                const typeConfig = mealTypeConfig[meal.value as keyof typeof mealTypeConfig];
                const isSelected = selectedMealType === meal.value;

                return (
                  <motion.button
                    key={meal.value}
                    type="button"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedMealType(meal.value as "breakfast" | "lunch" | "dinner");
                      setValidationError(null);
                    }}
                    className={`relative py-3 px-4 rounded-2xl font-medium text-sm transition-all duration-300 ${
                      isSelected
                        ? `bg-gradient-to-br ${typeConfig.activeGradient} text-white ${typeConfig.shadow} shadow-lg`
                        : `bg-gradient-to-br ${typeConfig.gradient} text-[oklch(0.35_0.05_250)] hover:shadow-md`
                    }`}
                  >
                    <span className="mr-1.5">{typeConfig.icon}</span>
                    {typeConfig.label}
                    {isSelected && (
                      <motion.div
                        layoutId="mealTypeIndicator"
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-white/60"
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* 영수증 스캔 */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-[oklch(0.45_0.01_250)] uppercase tracking-wider">
              영수증 스캔
            </Label>
            <div className="rounded-2xl overflow-hidden border border-[oklch(0.92_0.01_250)] bg-[oklch(0.98_0.005_250)]">
              <ReceiptScanner onScanComplete={handleScanComplete} />
            </div>
          </div>

          {/* 결제자 */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-[oklch(0.45_0.01_250)] uppercase tracking-wider">
              결제자
            </Label>
            {usersError && (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs text-[oklch(0.55_0.18_25)] bg-[oklch(0.95_0.04_25)] px-3 py-2 rounded-xl"
              >
                {usersError}
              </motion.p>
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
              className="h-12 text-sm rounded-xl border-[oklch(0.90_0.01_250)] bg-white/60 backdrop-blur-sm focus:border-[oklch(0.65_0.15_250)] focus:ring-2 focus:ring-[oklch(0.65_0.15_250/0.15)] transition-all"
            />
          </div>

          {/* 식당명 */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-[oklch(0.45_0.01_250)] uppercase tracking-wider">
              식당명
            </Label>
            <div className="flex gap-2">
              <Input
                id="store"
                type="text"
                placeholder="식당명 입력"
                value={currentFormData.store}
                onChange={(e) => updateFormField("store", e.target.value)}
                className="h-12 text-sm rounded-xl border-[oklch(0.90_0.01_250)] bg-white/60 backdrop-blur-sm focus:border-[oklch(0.65_0.15_250)] focus:ring-2 focus:ring-[oklch(0.65_0.15_250/0.15)] transition-all"
              />
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="h-12 w-12 shrink-0 rounded-xl border border-[oklch(0.90_0.01_250)] bg-white/60 backdrop-blur-sm flex items-center justify-center text-[oklch(0.50_0.01_250)] hover:bg-[oklch(0.96_0.02_250)] hover:border-[oklch(0.85_0.03_250)] transition-all"
                onClick={() => {
                  setIsBusinessDialogOpen(true);
                  setBusinessSearchTerm("");
                }}
              >
                <Search className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* 금액 */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-[oklch(0.45_0.01_250)] uppercase tracking-wider">
              금액
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={currentFormData.amount}
                onChange={(e) => updateFormField("amount", e.target.value)}
                min="0"
                disabled={(currentFormData as { attendance: string }).attendance === "근무(개별식사 / 식사안함)"}
                className="h-12 text-sm rounded-xl border-[oklch(0.90_0.01_250)] bg-white/60 backdrop-blur-sm focus:border-[oklch(0.65_0.15_250)] focus:ring-2 focus:ring-[oklch(0.65_0.15_250/0.15)] transition-all pr-10 disabled:bg-[oklch(0.96_0.01_250)] disabled:text-[oklch(0.55_0.01_250)] disabled:cursor-not-allowed"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[oklch(0.55_0.01_250)]">원</span>
            </div>
            <AnimatePresence>
              {selectedMealType === "lunch" && "attendance" in currentFormData && (currentFormData as { attendance: string }).attendance === "근무(개별식사 / 식사안함)" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[oklch(0.95_0.05_55)] to-[oklch(0.96_0.03_85)] border border-[oklch(0.90_0.06_55)]"
                >
                  <span className="text-base">💡</span>
                  <p className="text-xs text-[oklch(0.45_0.12_55)] font-medium">
                    총 금액에서 <span className="font-bold">{individualMealAmount.toLocaleString()}원</span>이 차감됩니다.
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
                className="space-y-3"
              >
                <Label className="text-xs font-semibold text-[oklch(0.45_0.01_250)] uppercase tracking-wider">
                  근태
                </Label>
                <div className={`grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-[oklch(0.97_0.005_250)] ${validationError ? "ring-2 ring-[oklch(0.65_0.20_25)]" : ""}`}>
                  {attendanceOptions?.map((option, index) => {
                    const currentAttendance = "attendance" in currentFormData ? (currentFormData as { attendance: string }).attendance : "";
                    const isSelected = currentAttendance === option.value;
                    const attConfig = attendanceConfig[option.value] || { icon: "📋", color: "text-gray-600", bgColor: "bg-gray-100" };

                    return (
                      <motion.button
                        key={option.value}
                        type="button"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.03 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          updateFormField("attendance", option.value);
                          setValidationError(null);
                        }}
                        className={`py-2.5 px-2 rounded-xl text-[11px] font-medium transition-all duration-200 ${
                          isSelected
                            ? `${attConfig.bgColor} ${attConfig.color} shadow-sm`
                            : "bg-transparent text-[oklch(0.50_0.01_250)] hover:bg-white/80"
                        }`}
                      >
                        <span className="mr-0.5">{attConfig.icon}</span>
                        {shortLabels[option.value] || option.label}
                      </motion.button>
                    );
                  })}
                </div>
                <AnimatePresence>
                  {validationError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-xs text-[oklch(0.55_0.18_25)] flex items-center gap-1.5"
                    >
                      <span>⚠️</span> {validationError}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        <DrawerFooter className="px-6 pb-8 pt-4 border-t border-[oklch(0.94_0.01_250)] flex gap-3 safe-area-bottom">
          <DrawerClose asChild>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 h-12 rounded-2xl text-sm font-semibold border border-[oklch(0.88_0.02_250)] text-[oklch(0.45_0.02_250)] bg-white/60 backdrop-blur-sm hover:bg-[oklch(0.97_0.01_250)] transition-all"
              disabled={isSubmitting || isDeleting}
            >
              취소
            </motion.button>
          </DrawerClose>
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
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
                await onFormSubmit(e);
              } finally {
                setIsSubmitting(false);
              }
            }}
            className={`flex-1 h-12 rounded-2xl text-sm font-semibold text-white transition-all bg-gradient-to-r ${config.activeGradient} ${config.shadow} shadow-lg hover:shadow-xl disabled:opacity-50`}
            disabled={isSubmitting || isDeleting}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                {isEditMode ? "수정 중..." : "저장 중..."}
              </div>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                {isEditMode ? "수정 완료" : "저장하기"}
                <span className="opacity-80">→</span>
              </span>
            )}
          </motion.button>
        </DrawerFooter>
      </DrawerContent>

      {/* 사업자번호 찾기 Dialog */}
      <Dialog open={isBusinessDialogOpen} onOpenChange={setIsBusinessDialogOpen}>
        <DialogContent className="max-w-sm p-0 gap-0 rounded-3xl bg-white/95 backdrop-blur-2xl border-0 shadow-2xl overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-[oklch(0.94_0.01_250)] bg-gradient-to-br from-[oklch(0.98_0.01_250)] to-white">
            <DialogTitle className="text-base font-semibold text-[oklch(0.25_0.02_250)] flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[oklch(0.55_0.18_250)] to-[oklch(0.48_0.20_270)] flex items-center justify-center shadow-lg shadow-[oklch(0.55_0.18_250/0.25)]">
                <Search className="w-4 h-4 text-white" />
              </span>
              사업자번호 검색
            </DialogTitle>
          </DialogHeader>
          <div className="p-5 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.60_0.01_250)]" />
              <Input
                type="text"
                placeholder="상호명 검색..."
                value={businessSearchTerm}
                onChange={(e) => setBusinessSearchTerm(e.target.value)}
                className="h-12 pl-11 text-sm rounded-xl border-[oklch(0.90_0.01_250)] bg-[oklch(0.98_0.005_250)] focus:border-[oklch(0.65_0.15_250)] focus:ring-2 focus:ring-[oklch(0.65_0.15_250/0.15)] transition-all"
              />
            </div>
            <div className="h-72 overflow-y-auto space-y-1.5 pr-1">
              {filteredBusinessNumbers.length > 0 ? (
                filteredBusinessNumbers.map((business, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    whileHover={{ scale: 1.01, x: 4 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleBusinessSelect(business)}
                    className="w-full text-left px-4 py-3.5 rounded-xl hover:bg-gradient-to-r hover:from-[oklch(0.97_0.02_250)] hover:to-[oklch(0.98_0.01_280)] border border-transparent hover:border-[oklch(0.92_0.02_250)] transition-all group"
                  >
                    <p className="text-sm font-medium text-[oklch(0.25_0.02_250)] group-hover:text-[oklch(0.40_0.15_250)]">
                      {business.name}
                    </p>
                    <p className="text-xs text-[oklch(0.55_0.01_250)] mt-0.5 font-mono">
                      {business.businessNumber}
                    </p>
                  </motion.button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-14 h-14 rounded-2xl bg-[oklch(0.96_0.02_250)] flex items-center justify-center mb-3">
                    <Search className="w-6 h-6 text-[oklch(0.70_0.01_250)]" />
                  </div>
                  <p className="text-sm text-[oklch(0.55_0.01_250)]">검색 결과가 없습니다</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="px-5 py-4 border-t border-[oklch(0.94_0.01_250)] bg-[oklch(0.99_0.002_250)]">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full h-11 rounded-xl text-sm font-medium border border-[oklch(0.88_0.02_250)] text-[oklch(0.45_0.02_250)] bg-white hover:bg-[oklch(0.97_0.01_250)] transition-all"
              onClick={() => setIsBusinessDialogOpen(false)}
            >
              닫기
            </motion.button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Drawer>
  );
}
