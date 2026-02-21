"use client";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@repo/ui/src/button";
import { useEffect, useState } from "react";
import { useMonthlyData } from "@/hooks/useMonthlyData";
import { useAssignDrink } from "@/hooks/useAssignDrink";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { AllHistoryDialog } from "@/components/monthly/AllHistoryDialog";
import { DRINKS } from "@/lib/const/const";

const MonthlyDrink = () => {
  const [selectedDrink, setSelectedDrink] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isAllHistoryDialogOpen, setIsAllHistoryDialogOpen] =
    useState<boolean>(false);

  const { data, isLoading } = useMonthlyData();
  const { mutateAsync: assignDrink, isPending: isAssigning } = useAssignDrink();

  const drinkOptions = data?.drinkOptions || [];
  const pickupPersons = data?.pickupPersons || [];

  const availableDrinks = drinkOptions
    .filter((option) => option.available)
    .map((option) => option.name);
  const displayDrinks = availableDrinks.length > 0 ? availableDrinks : DRINKS;

  const [currentUserName, setCurrentUserName] = useState<string>("");
  const myDrink =
    data?.applications.find((app) => app.name === currentUserName)?.drink ||
    null;

  useEffect(() => {
    const storedName = localStorage.getItem("name");
    if (storedName) {
      setCurrentUserName(storedName);
    }
  }, []);

  const handleDrinkAssign = async () => {
    if (!currentUserName) {
      alert("사용자 이름을 찾을 수 없습니다. 로그인을 확인해주세요.");
      return;
    }

    if (!selectedDrink) {
      alert("음료를 선택해주세요.");
      return;
    }

    try {
      await assignDrink({ name: currentUserName, drink: selectedDrink });
      setIsDialogOpen(false);
      setSelectedDrink("");
      // TanStack Query의 onSuccess에서 자동으로 데이터 무효화됨
    } catch (error) {
      alert(
        `음료 선택 중 오류가 발생했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
      );
    }
  };

  // 신청 완료 인원 수 (선택안함도 신청 완료로 카운트)
  const completedCount =
    data?.applications.filter((app) => app.drink).length || 0;
  const totalCount = data?.totalMembers || 0;

  return (
    <div className=" bg-white rounded-xl pb-12">
      {/* Header */}
      <header className="px-5 pt-10 pb-5">
        <div>
          <p className="text-gray-400 text-xs font-medium tracking-wide">
            Monthly Coffee
          </p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">
            이번 달 음료
          </h1>
        </div>
      </header>

      {/* Status */}
      <div className="mb-5">
        <div className="flex gap-3">
          <button
            onClick={() => setIsAllHistoryDialogOpen(true)}
            className="flex-1 bg-gray-50 rounded-xl p-4 text-left transition-colors hover:bg-gray-100 active:bg-gray-100"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-gray-400 font-medium">신청현황</p>
              <p className="text-[10px] text-gray-400">전체보기 &rsaquo;</p>
            </div>
            <p className="text-xl font-bold text-gray-900 mt-1">
              {isLoading ? (
                <span className="inline-block w-10 h-6 bg-gray-200 rounded animate-pulse" />
              ) : (
                <>
                  {completedCount}
                  <span className="text-gray-300 text-sm font-medium">
                    /{totalCount}
                  </span>
                </>
              )}
            </p>
          </button>
          <div className="flex-1 bg-gray-50 rounded-xl p-4">
            <p className="text-[11px] text-gray-400 font-medium">픽업담당</p>
            <p className="text-sm font-semibold text-gray-900 mt-1.5 truncate">
              {isLoading ? (
                <span className="inline-block w-14 h-5 bg-gray-200 rounded animate-pulse" />
              ) : pickupPersons.length > 0 ? (
                pickupPersons.map((p) => p.name).join(", ")
              ) : (
                <span className="text-gray-300">미정</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* My Selection */}
      {currentUserName && (
        <div className="px-5 mb-5">
          {isLoading ? (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
          ) : myDrink ? (
            <div className="bg-gray-900 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-[11px] font-medium">
                    내 선택
                  </p>
                  <p className="text-white font-semibold mt-0.5">{myDrink}</p>
                </div>
                <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-3.5 h-3.5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-gray-200 rounded-xl p-4">
              <p className="text-gray-400 text-[11px] font-medium">내 선택</p>
              <p className="text-gray-400 text-sm mt-0.5">
                아래에서 음료를 선택해주세요
              </p>
            </div>
          )}
        </div>
      )}

      {/* Drink Options */}
      <div className="px-5">
        <p className="text-[11px] text-gray-400 font-medium mb-2">음료 선택</p>
        <div className="space-y-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-12 bg-gray-50 rounded-xl animate-pulse"
                />
              ))
            : displayDrinks.map((drink) => {
                const isMyDrink = myDrink === drink;
                const isNoSelection = drink === "선택안함";

                return (
                  <button
                    key={drink}
                    onClick={() => {
                      setSelectedDrink(drink);
                      setIsDialogOpen(true);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                      isMyDrink
                        ? "bg-gray-900 text-white"
                        : isNoSelection
                          ? "bg-gray-100 text-gray-400"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span className="text-sm font-medium">{drink}</span>
                    {isMyDrink && (
                      <svg
                        className="w-4 h-4 text-emerald-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* Confirm Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-xs mx-auto bg-white rounded-2xl shadow-xl border-0 p-5">
          <DialogHeader className="text-center mb-4">
            <DialogTitle className="text-lg font-bold text-gray-900">
              {selectedDrink}
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-sm mt-1">
              이 음료를 선택하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsDialogOpen(false);
                setSelectedDrink("");
              }}
              className="flex-1 h-11 text-gray-500 hover:text-gray-700 hover:bg-gray-100 font-medium rounded-xl"
            >
              취소
            </Button>
            <Button
              onClick={handleDrinkAssign}
              disabled={isAssigning}
              className="flex-1 h-11 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl disabled:opacity-50"
            >
              {isAssigning ? "저장 중..." : "확인"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AllHistoryDialog
        isOpen={isAllHistoryDialogOpen}
        onClose={() => setIsAllHistoryDialogOpen(false)}
      />
    </div>
  );
};

export default MonthlyDrink;
