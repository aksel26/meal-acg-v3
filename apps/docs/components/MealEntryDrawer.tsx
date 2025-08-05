"use client";

import { useState, useEffect } from "react";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@repo/ui/src/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/src/select";
import { Combobox, ComboboxOption } from "@repo/ui/src/combobox";

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
  onFormSubmit: (e: React.FormEvent) => void;
  onInputChange: (field: string, value: string) => void;
}

export default function MealEntryDrawer({ isOpen, onOpenChange, selectedMealType, setSelectedMealType, isEditMode, formData, selectedDate, onFormSubmit, onInputChange }: MealEntryDrawerProps) {
  const [users, setUsers] = useState<ComboboxOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Fetch users when drawer opens
  useEffect(() => {
    if (isOpen && users.length === 0) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);

    try {
      // Get token from localStorage
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch("/api/users/ids", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Add Bearer prefix
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setUsers(result.data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsersError(error instanceof Error ? error.message : "Failed to load users");
      // Fallback to default users if API fails
      setUsers([
        { value: "1", label: "김철수" },
        { value: "2", label: "이영희" },
        { value: "3", label: "박민수" },
        { value: "4", label: "최지영" },
        { value: "5", label: "정우진" },
      ]);
    } finally {
      setUsersLoading(false);
    }
  };
  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[80vh] max-w-md mx-auto">
        <DrawerHeader>
          <DrawerTitle>
            {selectedMealType === "breakfast" ? "조식" : selectedMealType === "lunch" ? "중식" : "석식"} 기록 {isEditMode ? "수정" : "추가"}
          </DrawerTitle>
          <DrawerDescription>
            {selectedDate?.toLocaleDateString("ko-KR")} 식사 정보를 {isEditMode ? "수정" : "입력"}해주세요.
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={onFormSubmit} className="px-4 pb-4 space-y-6">
          {/* 식사 타입 선택 */}
          <div className="space-y-2">
            <Label>식사 타입</Label>
            <div className="flex space-x-2">
              {[
                { value: "breakfast", label: "조식", emoji: "🌅" },
                { value: "lunch", label: "중식", emoji: "🍽️" },
                { value: "dinner", label: "석식", emoji: "🌙" },
              ].map((meal) => (
                <button
                  key={meal.value}
                  type="button"
                  onClick={() => setSelectedMealType(meal.value as "breakfast" | "lunch" | "dinner")}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg border-2 transition-all duration-200 ${
                    selectedMealType === meal.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:border-gray-300 text-gray-600"
                  }`}
                >
                  <span className="text-md">{meal.emoji}</span>
                  <span className="text-sm">{meal.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 결제자 Combobox */}
          <div className="space-y-2">
            <Label htmlFor="payer">결제자</Label>
            {usersError && <p className="text-sm text-red-600 mb-2">{usersError} (기본 목록을 사용합니다)</p>}
            <Combobox
              options={users}
              value={formData.payer}
              onValueChange={(value) => onInputChange("payer", value)}
              placeholder="결제자를 선택해주세요"
              searchPlaceholder="이름으로 검색..."
              emptyText="결제자를 찾을 수 없습니다."
              loading={usersLoading}
              popoverContentClassName="w-full"
            />
          </div>

          {/* 사용처 Input */}
          <div className="space-y-2">
            <Label htmlFor="store">사용처</Label>
            <Input id="store" type="text" placeholder="식당명을 입력해주세요" value={formData.store} onChange={(e) => onInputChange("store", e.target.value)} />
          </div>

          {/* 금액 Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">금액</Label>
            <Input id="amount" type="number" placeholder="금액을 입력해주세요" value={formData.amount} onChange={(e) => onInputChange("amount", e.target.value)} min="0" step="100" />
          </div>

          {/* 근태 Select */}
          <div className="space-y-2">
            <Label htmlFor="attendance">근태</Label>
            <Select value={formData.attendance} onValueChange={(value) => onInputChange("attendance", value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="근태를 선택해주세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="근무">🍙 근무</SelectItem>
                <SelectItem value="근무(개별식사 / 식사안함)">🍙 근무(개별식사 / 식사안함)</SelectItem>
                <SelectItem value="오전 반차/휴무">🕐 오전 반차/휴무</SelectItem>
                <SelectItem value="오후 반차/휴무">🕐 오후 반차/휴무</SelectItem>
                <SelectItem value="연차/휴무">🏖️ 연차/휴무</SelectItem>
                <SelectItem value="재택근무">🏠 재택근무</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DrawerFooter className="px-0">
            <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600">
              {isEditMode ? "수정하기" : "저장하기"}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                취소
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
