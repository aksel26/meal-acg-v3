"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { useUsers } from "@/hooks/useUsers";
import { useMealDrawerStore } from "@/stores/mealDrawerStore";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import Image from "next/image";

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@repo/ui/src/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/src/select";
import { AutoCompleteInput } from "@repo/ui/src/autocomplete-input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/src/dialog";
import { Search } from "@repo/ui/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/src/tooltip";
import { attendanceOptions, businessNumbers, mealTypeOptions } from "@/lib/const/const";

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
      if (!currentAttendance) {
        updateFormField("attendance", "근무");
      }

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

  return (
    <Drawer open={isOpen} onOpenChange={closeDrawer} repositionInputs={false}>
      <DrawerContent className="max-h-[82vh] max-w-lg mx-auto bg-gradient-to-br from-white to-gray-50">
        <DrawerHeader className="border-b border-gray-100 pb-4">
          <div className="relative">
            <DrawerTitle className="text-sm sm:text-base font-semibold text-gray-800 text-center">
              {selectedDate?.toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </DrawerTitle>
            <div className="absolute right-0 -top-1">
              {isEditMode && onDeleteMeal && (
                <Suspense fallback={null}>
                  <DeleteConfirmDialog selectedDate={selectedDate} isDeleting={isDeleting} onConfirm={handleDeleteMeal}>
                    <Button type="button" size="sm" className="text-red-500 bg-red-50 hover:text-red-600 hover:bg-red-100 text-xs px-4 py-1" disabled={isSubmitting || isDeleting}>
                      {isDeleting ? <div className="animate-spin rounded-full h-3 w-3 border border-red-500 border-t-transparent"></div> : "내역 삭제"}
                    </Button>
                  </DeleteConfirmDialog>
                </Suspense>
              )}
            </div>
          </div>
        </DrawerHeader>

        <form
          onSubmit={async (e) => {
            setIsSubmitting(true);
            try {
              await onFormSubmit(e);
              // 폼 제출 성공 후 drawer 닫기는 onFormSubmit에서 처리됨
            } finally {
              setIsSubmitting(false);
            }
          }}
          className="px-6 py-4 sm:space-y-6 space-y-6 overflow-y-auto flex-1"
        >
          {/* 식사 타입 선택 */}
          <div className="sm:space-y-3 space-y-1">
            <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Image src="/icons/mealType.png" alt="식사 타입" width={16} height={16} className="w-4 h-4 object-contain" />
              식사 타입
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {mealTypeOptions.map((meal) => (
                <Button
                  key={meal.value}
                  type="button"
                  onClick={() => setSelectedMealType(meal.value as "breakfast" | "lunch" | "dinner")}
                  className={`
                     border transition-all duration-200 h-8 sm:h-10 text-[10.5px] sm:text-xs rounded-md hover:bg-blue-50 hover:scale-102 hover:border-blue-300
                    ${selectedMealType === meal.value ? `${meal.color} shadow-lg scale-105` : `bg-white text-gray-700 ${meal.hoverColor}  hover:bg-blue-100 hover:scale-102`}
                  `}
                >
                  <span>{meal.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* 결제자 */}
          <div className="sm:space-y-3 space-y-1">
            <Label htmlFor="payer" className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Image src="/icons/payer.png" alt="결제자" width={16} height={16} className="w-4 h-4 object-contain" />
              결제자
            </Label>
            {usersError && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-800">{usersError}</p>
                <p className="text-xs text-orange-600 mt-1">기본 목록을 사용합니다</p>
              </div>
            )}
            <div className="relative">
              <AutoCompleteInput
                suggestions={users}
                value={currentFormData.payer}
                onValueChange={(value) => updateFormField("payer", value)}
                placeholder="결제자를 입력하거나 선택해주세요"
                allowFreeText={true}
                maxSuggestions={users.length}
                emptyText="결제자를 찾을 수 없습니다."
                disabled={usersLoading}
                className="rounded-lg border-gray-300 text-sm"
              />
            </div>
          </div>

          {/* 사용처 */}
          <div className="space-y-2">
            <Label htmlFor="store" className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Image src="/icons/place.png" alt="식당명" width={16} height={16} className="w-4 h-4 object-contain" />
              식당명
            </Label>

            <div className="flex flex-nowrap gap-x-2 items-center">
              <Input id="store" type="text" placeholder="식당명을 입력해주세요" value={currentFormData.store} onChange={(e) => updateFormField("store", e.target.value)} className="text-sm" />

              <Tooltip defaultOpen>
                <TooltipTrigger asChild>
                  <Button
                    size={"icon"}
                    variant={"secondary"}
                    type="button"
                    onClick={() => {
                      setIsBusinessDialogOpen(true);
                      setBusinessSearchTerm(""); // Dialog 열 때 검색어 초기화
                    }}
                  >
                    <Search />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-gray-900 text-white text-[10px] px-2 py-1">
                  <p>사업자번호 찾기</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* 금액 */}
          <div className="sm:space-y-3 space-y-1">
            <Label htmlFor="amount" className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Image src="/icons/amount.png" alt="금액" width={16} height={16} className="w-4 h-4 object-contain" />
              금액
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                placeholder="금액을 입력해주세요"
                value={currentFormData.amount}
                onChange={(e) => updateFormField("amount", e.target.value)}
                min="0"
                disabled={(currentFormData as { attendance: string }).attendance === "근무(개별식사 / 식사안함)" ? true : false}
                className="rounded-lg border-gray-300 pl-8 text-sm disabled:bg-gray-100 disabled:text-gray-500"
              />
              {selectedMealType === "lunch" && "attendance" in currentFormData && (currentFormData as { attendance: string }).attendance === "근무(개별식사 / 식사안함)" && (
                <p className="text-[11px] text-orange-500 mt-1">총 금액에서 10,000원이 차감됩니다.</p>
              )}
            </div>
          </div>

          {/* 근태 - 중식일 때만 표시 */}
          {selectedMealType === "lunch" && (
            <div className="sm:space-y-3 space-y-1">
              <Label htmlFor="attendance" className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Image src="/icons/attendance.png" alt="근태" width={16} height={16} className="w-4 h-4 object-contain" />
                근태
              </Label>
              <Select value={"attendance" in currentFormData ? (currentFormData as { attendance: string }).attendance || "" : ""} onValueChange={(value) => updateFormField("attendance", value)}>
                <SelectTrigger className="w-full rounded-lg border-gray-300 text-sm">
                  <SelectValue placeholder="근태를 선택해주세요" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {attendanceOptions?.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="rounded-lg">
                      <div className="flex items-center gap-2 text-sm sm:text-sm">
                        <Image src={option.icon} alt={option.label} width={16} height={16} className="w-4 h-4 object-contain" />
                        <span className={option.color}>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form>

        <DrawerFooter className="px-6 pb-8 pt-4 border-t border-gray-100 bg-white/50 flex gap-x-3">
          <DrawerClose asChild>
            <Button
              variant="outline"
              className="flex-1 rounded-sm border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 text-xs sm:text-sm  font-medium"
              disabled={isSubmitting || isDeleting}
            >
              닫기
            </Button>
          </DrawerClose>
          <Button
            type="submit"
            onClick={async (e) => {
              setIsSubmitting(true);
              try {
                await onFormSubmit(e);
                // 폼 제출 성공 후 drawer 닫기는 onFormSubmit에서 처리됨
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="flex-1 rounded-sm bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 text-xs sm:text-sm font-semibold"
            disabled={isSubmitting || isDeleting}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                {isEditMode ? "수정 중..." : "저장 중..."}
              </div>
            ) : (
              <div className="flex items-center gap-2 font-medium">{isEditMode ? "수정하기" : "저장하기"}</div>
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>

      {/* 사업자번호 찾기 Dialog */}
      <Dialog open={isBusinessDialogOpen} onOpenChange={setIsBusinessDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="sm:text-md text-sm font-semibold flex items-center gap-2">
              <Search className="w-5 h-5" />
              사업자번호 찾기
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* 검색 Input */}
            <div className="relative">
              {/* <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" /> */}
              <Input
                type="text"
                placeholder="상호명 입력..."
                value={businessSearchTerm}
                onChange={(e) => setBusinessSearchTerm(e.target.value)}
                className="pl-10 rounded-md border-gray-300 text-xs sm:text-sm"
              />
            </div>

            {/* 결과 목록 */}
            <div className="h-80 overflow-y-auto space-y-2">
              {filteredBusinessNumbers.length > 0 ? (
                filteredBusinessNumbers.map((business, index) => (
                  <button
                    key={index}
                    onClick={() => handleBusinessSelect(business)}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-xs sm:text-sm font-medium text-gray-900">{business.name}</span>
                      <span className="text-[11px] text-gray-500">사업자번호: {business.businessNumber}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>검색 결과가 없습니다.</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full text-xs" variant={"outline"} onClick={() => setIsBusinessDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Drawer>
  );
}
