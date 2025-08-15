"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { useUsers } from "@/hooks/useUsers";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@repo/ui/src/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { Combobox } from "@repo/ui/src/combobox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Search } from "@repo/ui/icons";
import { ChartTooltip } from "@repo/ui/src/chart";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/src/tooltip";

// Lazy load DeleteConfirmDialog
const DeleteConfirmDialog = lazy(() =>
  import("./DeleteConfirmDialog").then((module) => ({
    default: module.DeleteConfirmDialog,
  }))
);

interface MealData {
  date: string;
  attendance: string;
  lunch?: {
    store: string;
    amount: number;
    payer: string;
  };
  dinner?: {
    store: string;
    amount: number;
    payer: string;
  };
  breakfast?: {
    store: string;
    amount: number;
    payer: string;
  };
}

interface MealEntryDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMealType: "breakfast" | "lunch" | "dinner";
  setSelectedMealType: (type: "breakfast" | "lunch" | "dinner") => void;
  isEditMode: boolean;
  formData: {
    payer: string;
    store: string;
    amount: string;
    attendance: string;
  };
  selectedDate?: Date;
  onFormSubmit: (e: React.FormEvent) => Promise<void>;
  onInputChange: (field: string, value: string) => void;
  onDeleteMeal?: (date: string) => Promise<void>;
}

const mealTypeOptions = [
  {
    value: "breakfast",
    label: "조식",
    emoji: "🌅",
    color: "bg-amber-50 border-amber-200 text-amber-800",
    hoverColor: "hover:bg-blue-100",
  },
  {
    value: "lunch",
    label: "중식",
    emoji: "🍽️",
    color: "bg-blue-50 border-blue-200 text-blue-800",
    hoverColor: "hover:bg-blue-100",
  },
  {
    value: "dinner",
    label: "석식",
    emoji: "🌙",
    color: "bg-purple-50 border-purple-200 text-purple-800",
    hoverColor: "hover:bg-purple-100",
  },
];

const attendanceOptions = [
  { value: "근무", label: "근무", emoji: "🍙", color: "text-green-700" },
  {
    value: "근무(개별식사 / 식사안함)",
    label: "근무(개별식사 / 식사안함)",
    emoji: "🍙",
    color: "text-green-700",
  },
  {
    value: "오전 반차/휴무",
    label: "오전 반차/휴무",
    emoji: "🕐",
    color: "text-orange-700",
  },
  {
    value: "오후 반차/휴무",
    label: "오후 반차/휴무",
    emoji: "🕐",
    color: "text-orange-700",
  },
  {
    value: "연차/휴무",
    label: "연차/휴무",
    emoji: "🏖️",
    color: "text-blue-700",
  },
  {
    value: "재택근무",
    label: "재택근무",
    emoji: "🏠",
    color: "text-purple-700",
  },
];

// 사업자번호 목록 (예시 데이터)
const businessNumbers = [
  { businessNumber: "123-45-67890", name: "맛있는 한식당" },
  { businessNumber: "987-65-43210", name: "이탈리아 피자하우스" },
  { businessNumber: "555-66-77888", name: "중국집 용궁" },
  { businessNumber: "111-22-33444", name: "일본식 돈카츠" },
  { businessNumber: "999-88-77666", name: "프랑스 베이커리" },
  { businessNumber: "222-33-44555", name: "스시 전문점" },
  { businessNumber: "777-88-99000", name: "태국 음식점" },
  { businessNumber: "444-55-66777", name: "인도 커리하우스" },
];

export default function MealEntryDrawer({
  isOpen,
  onOpenChange,
  selectedMealType,
  setSelectedMealType,
  isEditMode,
  formData,
  selectedDate,
  onFormSubmit,
  onInputChange,
  onDeleteMeal,
}: MealEntryDrawerProps) {
  const {
    users,
    isLoading: usersLoading,
    error: usersError,
    fetchUsers,
  } = useUsers();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBusinessDialogOpen, setIsBusinessDialogOpen] = useState(false);
  const [businessSearchTerm, setBusinessSearchTerm] = useState("");

  // Fetch users when drawer opens
  useEffect(() => {
    if (isOpen && users.length === 0) {
      fetchUsers();
    }
  }, [isOpen, users.length, fetchUsers]);

  const handleDeleteMeal = async () => {
    if (!selectedDate || !onDeleteMeal) return;

    setIsDeleting(true);
    try {
      await onDeleteMeal(selectedDate.toISOString());
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBusinessSelect = (business: {
    businessNumber: string;
    name: string;
  }) => {
    onInputChange("store", `${business.name}(${business.businessNumber})`);
    setIsBusinessDialogOpen(false);
    setBusinessSearchTerm(""); // 검색어 초기화
  };

  // 검색 필터링된 사업자 목록
  const filteredBusinessNumbers = businessNumbers.filter(
    (business) =>
      business.name.toLowerCase().includes(businessSearchTerm.toLowerCase()) ||
      business.businessNumber.includes(businessSearchTerm)
  );

  const currentMealOption = mealTypeOptions.find(
    (option) => option.value === selectedMealType
  );

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] max-w-lg mx-auto bg-gradient-to-br from-white to-gray-50">
        <DrawerHeader className="text-center border-b border-gray-100 pb-6">
          <DrawerTitle className="text-base font-bold text-gray-800">
            {selectedDate?.toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "short",
            })}
          </DrawerTitle>
        </DrawerHeader>

        <form
          onSubmit={async (e) => {
            setIsSubmitting(true);
            try {
              await onFormSubmit(e);
            } finally {
              setIsSubmitting(false);
            }
          }}
          className="px-6 py-4 space-y-6 overflow-y-auto flex-1"
        >
          {/* 식사 타입 선택 */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span>🍴</span> 식사 타입
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {mealTypeOptions.map((meal) => (
                <Button
                  key={meal.value}
                  type="button"
                  onClick={() =>
                    setSelectedMealType(
                      meal.value as "breakfast" | "lunch" | "dinner"
                    )
                  }
                  className={`
                     border transition-all duration-200 h-10 rounded-md hover:bg-blue-50 hover:scale-102 hover:border-blue-300
                    ${
                      selectedMealType === meal.value
                        ? `${meal.color} shadow-lg scale-105`
                        : `bg-white text-gray-700 ${meal.hoverColor}  hover:bg-blue-100 hover:scale-102`
                    }
                  `}
                >
                  <span className="text-xs font-semibold">{meal.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* 결제자 */}
          <div className="space-y-3">
            <Label
              htmlFor="payer"
              className="text-sm font-semibold text-gray-700 flex items-center gap-2"
            >
              <span>💳</span> 결제자
            </Label>
            {usersError && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-800">{usersError}</p>
                <p className="text-xs text-orange-600 mt-1">
                  기본 목록을 사용합니다
                </p>
              </div>
            )}
            <div className="relative">
              <Combobox
                options={users}
                value={formData.payer}
                onValueChange={(value) => onInputChange("payer", value)}
                placeholder="결제자를 선택해주세요"
                searchPlaceholder="이름으로 검색..."
                emptyText="결제자를 찾을 수 없습니다."
                loading={usersLoading}
                popoverContentClassName="!w-auto !max-h-[200px]"
              />
            </div>
          </div>

          {/* 사용처 */}
          <div className="space-y-2">
            <Label
              htmlFor="store"
              className="text-sm font-semibold text-gray-700 flex items-center gap-2"
            >
              <span>🏪</span> 사용처
            </Label>

            <div className="flex flex-nowrap gap-x-2 items-center">
              <Input
                id="store"
                type="text"
                placeholder="식당명을 입력해주세요"
                value={formData.store}
                onChange={(e) => onInputChange("store", e.target.value)}
                className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 text-sm"
              />

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
                <TooltipContent side="top" className="bg-gray-900 text-white text-xs px-2 py-1">
                  <p>사업자번호 찾기</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* 금액 */}
          <div className="space-y-3">
            <Label
              htmlFor="amount"
              className="text-sm font-semibold text-gray-700 flex items-center gap-2"
            >
              <span>💰</span> 금액
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                placeholder="금액을 입력해주세요"
                value={formData.amount}
                onChange={(e) => onInputChange("amount", e.target.value)}
                min="0"
                className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500/20 pl-8 text-sm"
              />
            </div>
          </div>

          {/* 근태 - 중식일 때만 표시 */}
          {selectedMealType === "lunch" && (
            <div className="space-y-3">
              <Label
                htmlFor="attendance"
                className="text-sm font-semibold text-gray-700 flex items-center gap-2"
              >
                <span>📋</span> 근태
              </Label>
              <Select
                value={formData.attendance}
                onValueChange={(value) => onInputChange("attendance", value)}
              >
                <SelectTrigger className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500/20">
                  <SelectValue placeholder="근태를 선택해주세요" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {attendanceOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span>{option.emoji}</span>
                        <span className={option.color}>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form>

        <DrawerFooter className="px-6 pt-4 pb-8! border-t border-gray-100 bg-white/50 space-y-3">
          <div className="flex gap-3 flex-col">
            {/* 저장/수정 버튼 */}
            <Button
              type="submit"
              onClick={async (e) => {
                setIsSubmitting(true);
                try {
                  await onFormSubmit(e);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 c font-semibold"
              disabled={isSubmitting || isDeleting}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  {isEditMode ? "수정 중..." : "저장 중..."}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {isEditMode ? "수정하기" : "저장하기"}
                </div>
              )}
            </Button>
            <DrawerClose asChild>
              <Button
                variant="outline"
                className="flex-1 rounded-lg border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 py-2.5  font-medium"
                disabled={isSubmitting || isDeleting}
              >
                닫기
              </Button>
            </DrawerClose>
          </div>

          {/* 삭제 버튼 (편집 모드에서만) */}
          {isEditMode && onDeleteMeal && (
            <Suspense
              fallback={
                <Button
                  variant="destructive"
                  className="w-full rounded-lg"
                  disabled
                >
                  🗑️ 이 날짜 내역 삭제
                </Button>
              }
            >
              <DeleteConfirmDialog
                selectedDate={selectedDate}
                isDeleting={isDeleting}
                onConfirm={handleDeleteMeal}
              >
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full rounded-xl hover:bg-red-700 shadow-lg hover:shadow-xl transition-all duration-200 h-12 font-semibold"
                  disabled={isSubmitting || isDeleting}
                >
                  {isDeleting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      삭제 중...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>🗑️</span>이 날짜 내역 삭제
                    </div>
                  )}
                </Button>
              </DeleteConfirmDialog>
            </Suspense>
          )}

          {/* 취소 버튼 */}
        </DrawerFooter>
      </DrawerContent>

      {/* 사업자번호 찾기 Dialog */}
      <Dialog
        open={isBusinessDialogOpen}
        onOpenChange={setIsBusinessDialogOpen}
      >
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-md font-semibold flex items-center gap-2">
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
                className="pl-10 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>

            {/* 결과 목록 */}
            <div className="max-h-80 overflow-y-auto space-y-2">
              {filteredBusinessNumbers.length > 0 ? (
                filteredBusinessNumbers.map((business, index) => (
                  <button
                    key={index}
                    onClick={() => handleBusinessSelect(business)}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-gray-900">
                        {business.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        사업자번호: {business.businessNumber}
                      </span>
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
            <Button
              className="w-full"
              variant={"outline"}
              onClick={() => setIsBusinessDialogOpen(false)}
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Drawer>
  );
}
