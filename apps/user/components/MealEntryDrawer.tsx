"use client";

import { useState, useEffect, lazy, Suspense, useCallback } from "react";
import { useUsers } from "@/hooks/useUsers";
import { useMealDrawerStore } from "@/stores/mealDrawerStore";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@repo/ui/src/drawer";
import { AutoCompleteInput } from "@repo/ui/src/autocomplete-input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/src/dialog";
import { Search } from "@repo/ui/icons";
import { attendanceOptions, businessNumbers, mealTypeOptions } from "@/lib/const/const";
import { ReceiptScanner } from "./ReceiptScanner";
import { ReceiptScanResult } from "@/lib/types/receipt-types";

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

export default function MealEntryDrawer({ onFormSubmit, onDeleteMeal }: MealEntryDrawerProps) {
  // Zustand store 사용
  const { isOpen, isEditMode, selectedMealType, selectedDate, formData, closeDrawer, setSelectedMealType, updateFormField } = useMealDrawerStore();

  const { users, isLoading: usersLoading, error: usersError, fetchUsers } = useUsers();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBusinessDialogOpen, setIsBusinessDialogOpen] = useState(false);
  const [businessSearchTerm, setBusinessSearchTerm] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // 현재 선택된 식사 타입의 form 데이터 가져오기
  const currentFormData = formData[selectedMealType];

  // Fetch users when drawer opens
  useEffect(() => {
    if (isOpen && users.length === 0) {
      fetchUsers();
    }
  }, [isOpen, users.length, fetchUsers]);

  // Handle automatic amount setting for 근무(개별식사 / 식사안함) and set default attendance
  useEffect(() => {
    if (isOpen && selectedMealType === "lunch") {
      const lunchFormData = formData.lunch;
      const currentAttendance = lunchFormData.attendance || "";

      // Set default attendance to "근무" if empty
      // if (!currentAttendance) {
      //   updateFormField("attendance", "근무");
      // }

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
    setBusinessSearchTerm(""); // 검색어 초기화
  };

  // 검색 필터링된 사업자 목록
  const filteredBusinessNumbers = businessNumbers.filter((business) => business.name.toLowerCase().includes(businessSearchTerm.toLowerCase()) || business.businessNumber.includes(businessSearchTerm));

  // 영수증 스캔 완료 핸들러
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
      <DrawerContent className="max-h-[82vh] max-w-lg mx-auto bg-white">
        <DrawerHeader className="border-b border-gray-100 pb-3">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-sm font-medium text-gray-900">
              {selectedDate?.toLocaleDateString("ko-KR", {
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </DrawerTitle>
            {isEditMode && onDeleteMeal && (
              <Suspense fallback={null}>
                <DeleteConfirmDialog selectedDate={selectedDate} isDeleting={isDeleting} onConfirm={handleDeleteMeal}>
                  <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs h-7 px-2" disabled={isSubmitting || isDeleting}>
                    {isDeleting ? <div className="animate-spin rounded-full h-3 w-3 border border-red-500 border-t-transparent"></div> : "삭제"}
                  </Button>
                </DeleteConfirmDialog>
              </Suspense>
            )}
          </div>
        </DrawerHeader>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            // Validation logic
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
              // 폼 제출 성공 후 drawer 닫기는 onFormSubmit에서 처리됨
            } finally {
              setIsSubmitting(false);
            }
          }}
          className="px-5 py-4 space-y-5 overflow-y-auto flex-1"
        >
          {/* 식사 타입 선택 */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600">식사 타입</Label>
            <div className="grid grid-cols-3 gap-2">
              {mealTypeOptions.map((meal) => (
                <Button
                  key={meal.value}
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedMealType(meal.value as "breakfast" | "lunch" | "dinner");
                    setValidationError(null);
                  }}
                  className={`h-9 text-xs font-medium transition-colors ${
                    selectedMealType === meal.value
                      ? "bg-gray-900 text-white border-gray-900 hover:bg-gray-800"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  {meal.label}
                </Button>
              ))}
            </div>
          </div>

          {/* 영수증 스캔 */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-gray-600">영수증 스캔</Label>
            <ReceiptScanner onScanComplete={handleScanComplete} />
          </div>

          {/* 결제자 */}
          <div className="space-y-2">
            <Label htmlFor="payer" className="text-xs font-medium text-gray-600">결제자</Label>
            {usersError && (
              <p className="text-xs text-orange-600">{usersError}</p>
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
              className="h-9 text-sm border-gray-200"
            />
          </div>

          {/* 식당명 */}
          <div className="space-y-2">
            <Label htmlFor="store" className="text-xs font-medium text-gray-600">식당명</Label>
            <div className="flex gap-2">
              <Input
                id="store"
                type="text"
                placeholder="식당명 입력"
                value={currentFormData.store}
                onChange={(e) => updateFormField("store", e.target.value)}
                className="h-9 text-sm border-gray-200"
              />
              <Button
                size="icon"
                variant="outline"
                type="button"
                className="h-9 w-9 shrink-0 border-gray-200"
                onClick={() => {
                  setIsBusinessDialogOpen(true);
                  setBusinessSearchTerm("");
                }}
              >
                <Search className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          </div>

          {/* 금액 */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-xs font-medium text-gray-600">금액</Label>
            <Input
              id="amount"
              type="number"
              placeholder="금액 입력"
              value={currentFormData.amount}
              onChange={(e) => updateFormField("amount", e.target.value)}
              min="0"
              disabled={(currentFormData as { attendance: string }).attendance === "근무(개별식사 / 식사안함)"}
              className="h-9 text-sm border-gray-200 disabled:bg-gray-50 disabled:text-gray-400"
            />
            {selectedMealType === "lunch" && "attendance" in currentFormData && (currentFormData as { attendance: string }).attendance === "근무(개별식사 / 식사안함)" && (
              <p className="text-[11px] text-gray-500">총 금액에서 10,000원이 차감됩니다.</p>
            )}
          </div>

          {/* 근태 - 중식일 때만 표시 */}
          {selectedMealType === "lunch" && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-600">근태</Label>
              <div className={`grid grid-cols-6 gap-1 bg-muted p-1 rounded-lg ${validationError ? "ring-1 ring-red-400" : ""}`}>
                {attendanceOptions?.map((option) => {
                  const currentAttendance = "attendance" in currentFormData ? (currentFormData as { attendance: string }).attendance : "";
                  const isSelected = currentAttendance === option.value;
                  const shortLabels: Record<string, string> = {
                    "근무": "근무",
                    "근무(개별식사 / 식사안함)": "개별식사",
                    "오전 반차/휴무": "오전반차",
                    "오후 반차/휴무": "오후반차",
                    "연차/휴무": "연차",
                    "재택근무": "재택",
                  };
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant={isSelected ? "default" : "ghost"}
                      size="sm"
                      onClick={() => {
                        updateFormField("attendance", option.value);
                        setValidationError(null);
                      }}
                      className={`text-[11px] h-7 px-1 ${isSelected ? "" : "hover:bg-background/50"}`}
                    >
                      {shortLabels[option.value] || option.label}
                    </Button>
                  );
                })}
              </div>
              {validationError && <p className="text-xs text-red-500">{validationError}</p>}
            </div>
          )}
        </form>

        <DrawerFooter className="px-5 pb-6 pt-4 border-t border-gray-100 flex gap-2">
          <DrawerClose asChild>
            <Button
              variant="outline"
              className="flex-1 h-10 text-sm font-medium border-gray-200 hover:bg-gray-50"
              disabled={isSubmitting || isDeleting}
            >
              취소
            </Button>
          </DrawerClose>
          <Button
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
                await onFormSubmit(e);
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="flex-1 h-10 text-sm font-medium bg-gray-900 hover:bg-gray-800 text-white"
            disabled={isSubmitting || isDeleting}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                {isEditMode ? "수정 중" : "저장 중"}
              </div>
            ) : (
              isEditMode ? "수정" : "저장"
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>

      {/* 사업자번호 찾기 Dialog */}
      <Dialog open={isBusinessDialogOpen} onOpenChange={setIsBusinessDialogOpen}>
        <DialogContent className="max-w-xs p-0 gap-0">
          <DialogHeader className="px-4 py-3 border-b border-gray-100">
            <DialogTitle className="text-sm font-medium">사업자번호 검색</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-3">
            <Input
              type="text"
              placeholder="상호명 검색"
              value={businessSearchTerm}
              onChange={(e) => setBusinessSearchTerm(e.target.value)}
              className="h-9 text-sm border-gray-200"
            />
            <div className="h-64 overflow-y-auto space-y-1">
              {filteredBusinessNumbers.length > 0 ? (
                filteredBusinessNumbers.map((business, index) => (
                  <button
                    key={index}
                    onClick={() => handleBusinessSelect(business)}
                    className="w-full text-left px-3 py-2.5 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-sm text-gray-900">{business.name}</p>
                    <p className="text-[11px] text-gray-400">{business.businessNumber}</p>
                  </button>
                ))
              ) : (
                <p className="text-center py-8 text-sm text-gray-400">검색 결과 없음</p>
              )}
            </div>
          </div>
          <DialogFooter className="px-4 py-3 border-t border-gray-100">
            <Button className="w-full h-9 text-sm" variant="outline" onClick={() => setIsBusinessDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Drawer>
  );
}