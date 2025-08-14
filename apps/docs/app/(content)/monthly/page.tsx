"use client";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@repo/ui/src/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/src/card";
import React, { useEffect, useState } from "react";
// import LOGO from "../../public/images/ACG_LOGO_GRAY.png";
import { useMonthlyData } from "@/hooks/useMonthlyData";
import { useAssignDrink } from "@/hooks/useAssignDrink";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/src/dialog";
import { AllHistoryDialog } from "../../../components/monthly/AllHistoryDialog";

const DRINKS = ["HOT 아메리카노", "ICE 아메리카노", "HOT 디카페인 아메리카노", "ICE 디카페인 아메리카노", "바닐라크림 콜드브루", "ICE 자몽허니블랙티", "선택안함"];

const MonthlyDrink = () => {
  const [selectedDrink, setSelectedDrink] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isAllHistoryDialogOpen, setIsAllHistoryDialogOpen] = useState<boolean>(false);

  const { data, isLoading, error, fetchData } = useMonthlyData();
  console.log("data:", data);
  const { isLoading: isAssigning, error: assignError, assignDrink } = useAssignDrink();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const drinkOptions = data?.drinkOptions || [];
  const pickupPersons = data?.pickupPersons || [];

  const availableDrinks = drinkOptions.filter((option) => option.available).map((option) => option.name);
  const displayDrinks = availableDrinks.length > 0 ? availableDrinks : DRINKS;

  const [currentUserName, setCurrentUserName] = useState<string>("");
  // 내가 선택한 음료 찾기
  const myDrink = data?.applications.find((app) => app.name === currentUserName)?.drink || null;

  // localStorage에서 name 가져오기

  useEffect(() => {
    const storedName = localStorage.getItem("name");
    if (storedName) {
      setCurrentUserName(storedName);
    }
  }, []);

  // 음료 아이콘 함수
  const getDrinkIcon = (drink: string) => {
    if (drink === "선택안함") return "❌";
    if (drink.includes("바닐라") || drink.includes("자몽")) return "🥤";
    if (drink.includes("ICE")) return "🧊";
    if (drink.includes("HOT")) return "☕";
    return "☕";
  };

  // 음료 선택 완료 처리
  const handleDrinkAssign = async () => {
    if (!currentUserName) {
      alert("사용자 이름을 찾을 수 없습니다. 로그인을 확인해주세요.");
      return;
    }

    if (!selectedDrink) {
      alert("음료를 선택해주세요.");
      return;
    }

    const success = await assignDrink(currentUserName, selectedDrink);
    if (success) {
      setIsDialogOpen(false);
      setSelectedDrink("");
      // 데이터 새로고침
      fetchData();
    } else {
      alert(`음료 선택 중 오류가 발생했습니다: ${assignError}`);
    }
  };

  return (
    <React.Fragment>
      <Card className="border-none shadow-none bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Monthly 음료 선택하기</CardTitle>
          <div className="flex flex-col text-gray-500 text-sm">
            <p>픽업인원</p>
            <p className="text-gray-900">
              {pickupPersons.length > 0
                ? pickupPersons.map((person, index) => {
                    const isCurrentUser = currentUserName && person.name.includes(currentUserName);
                    return (
                      <span key={index} className={isCurrentUser ? "bg-blue-100 text-blue-800 px-1 rounded" : ""}>
                        {person.name}
                        {index < pickupPersons.length - 1 ? ", " : ""}
                      </span>
                    );
                  })
                : ""}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 내가 선택한 음료 또는 미신청 상태 */}
          {currentUserName && (
            <>
              {myDrink ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getDrinkIcon(myDrink)}</span>
                      <div>
                        <p className="text-sm text-blue-600 font-medium">내가 선택한 음료</p>
                        <p className="text-md font-semibold text-blue-800">{myDrink}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-blue-600">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3">
                  <div className="flex items-center space-x-5">
                    <span className="text-2xl">💬</span>
                    <div>
                      <p className="text-sm text-gray-600 font-medium mb-1">음료 신청 상태</p>
                      <p className="text-md font-semibold text-gray-700">아직 신청하지 않았습니다</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <Button variant={"outline"} className="w-full" onClick={() => setIsAllHistoryDialogOpen(true)}>
            전체 신청 내역 조회
          </Button>
          <div className="grid grid-cols-2 gap-3">
            {displayDrinks.map((drink, index) => {
              const isSelected = selectedDrink === drink;
              const isIce = drink.includes("ICE");
              const isHot = drink.includes("HOT");
              const isSpecial = drink.includes("바닐라") || drink.includes("자몽");
              const isNoSelection = drink === "선택안함";

              return (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedDrink(drink);
                    setIsDialogOpen(true);
                  }}
                  className={`relative ${isNoSelection ? "aspect-[4/1] col-span-2" : "aspect-square"} p-4 border rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-md flex flex-col items-center justify-center text-center space-y-2 ${
                    isSelected ? "border-blue-500 bg-blue-50 shadow-lg" : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  {/* 음료 아이콘 */}
                  <span className="text-2xl">{drink === "선택안함" ? "❌" : isSpecial ? "🥤" : isIce ? "🧊" : isHot ? "☕" : "☕"}</span>

                  {/* 음료 이름 */}
                  <div className={`font-medium text-sm leading-tight transition-colors duration-200 ${isSelected ? "text-blue-700" : "text-gray-800"}`}>{drink}</div>

                  {/* 음료 태그 */}
                  <div className="flex flex-wrap gap-1 justify-center">
                    {drink !== "선택안함" && (
                      <span className={`px-1.5 py-0.5 text-xs rounded-full ${isIce ? "bg-blue-100 text-blue-700" : isHot ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>
                        {isIce ? "ICE" : isHot ? "HOT" : "COLD"}
                      </span>
                    )}
                  </div>

                  {/* 선택 체크 아이콘 */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 text-blue-500">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* 확인 Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-xs mx-auto p-6 bg-white rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-center">음료 선택 확인</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-3">
            <span className="text-4xl">
              {selectedDrink === "선택안함"
                ? "❌"
                : selectedDrink.includes("바닐라") || selectedDrink.includes("자몽")
                  ? "🥤"
                  : selectedDrink.includes("ICE")
                    ? "🧊"
                    : selectedDrink.includes("HOT")
                      ? "☕"
                      : "☕"}
            </span>
            <span className="text-md font-semibold text-gray-800">{selectedDrink}</span>

            <span className="text-sm text-gray-600">이 음료를 선택하시겠습니까?</span>
          </div>

          <DialogFooter className="flex-col space-y-2 sm:flex-col sm:space-x-0 sm:space-y-2">
            <Button onClick={handleDrinkAssign} disabled={isAssigning} className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
              {isAssigning ? "저장 중..." : "선택 완료"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setSelectedDrink("");
              }}
              className="w-full"
            >
              취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AllHistoryDialog isOpen={isAllHistoryDialogOpen} onClose={() => setIsAllHistoryDialogOpen(false)} />
    </React.Fragment>
  );
};

export default MonthlyDrink;
