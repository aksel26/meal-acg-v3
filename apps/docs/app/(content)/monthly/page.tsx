"use client";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@repo/ui/src/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/src/card";
import React, { useState } from "react";
// import LOGO from "../../public/images/ACG_LOGO_GRAY.png";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/src/dialog";

const DRINKS = ["HOT 아메리카노", "ICE 아메리카노", "HOT 디카페인 아메리카노", "ICE 디카페인 아메리카노", "바닐라크림 콜드브루", "ICE 자몽허니블랙티", "선택안함"];

const MonthlyDrink = () => {
  const [selectedDrink, setSelectedDrink] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  return (
    <React.Fragment>
      <Card className="border-none shadow-none bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Monthly 음료 선택하기</CardTitle>
          <CardDescription>
            <p>픽업인원</p>
            <p>ㄴㅇㅇ,ㅇㄴㅇㅇ,ㄴㅇㄴㅇ</p>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 음료 선택 */}
          <div className="grid grid-cols-2 gap-3">
            {DRINKS.map((drink, index) => {
              const isSelected = selectedDrink === drink;
              const isIce = drink.includes("ICE");
              const isHot = drink.includes("HOT");
              const isSpecial = drink.includes("바닐라") || drink.includes("자몽");

              return (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedDrink(drink);
                    setIsDialogOpen(true);
                  }}
                  className={`relative aspect-square p-4 border rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-md flex flex-col items-center justify-center text-center space-y-2 ${
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
            <Button
              onClick={() => {
                setIsDialogOpen(false);
                alert(`"${selectedDrink}"를 선택하셨습니다!`);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              선택 완료
            </Button>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full">
              취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
};

export default MonthlyDrink;
