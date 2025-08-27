"use client";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@repo/ui/src/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/src/card";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useMonthlyData } from "@/hooks/useMonthlyData";
import { useAssignDrink } from "@/hooks/useAssignDrink";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { AllHistoryDialog } from "@/components/monthly/AllHistoryDialog";
import { motion } from "motion/react";

const DRINKS = [
  "HOT 아메리카노",
  "ICE 아메리카노",
  "HOT 디카페인 아메리카노",
  "ICE 디카페인 아메리카노",
  "바닐라크림 콜드브루",
  "ICE 자몽허니블랙티",
  "선택안함",
];

const MonthlyDrink = () => {
  const [selectedDrink, setSelectedDrink] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isAllHistoryDialogOpen, setIsAllHistoryDialogOpen] =
    useState<boolean>(false);

  const { data, isLoading, error, fetchData } = useMonthlyData();
  console.log("data:", data);
  const {
    isLoading: isAssigning,
    error: assignError,
    assignDrink,
  } = useAssignDrink();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const drinkOptions = data?.drinkOptions || [];
  const pickupPersons = data?.pickupPersons || [];

  const availableDrinks = drinkOptions
    .filter((option) => option.available)
    .map((option) => option.name);
  const displayDrinks = availableDrinks.length > 0 ? availableDrinks : DRINKS;

  const [currentUserName, setCurrentUserName] = useState<string>("");
  // 내가 선택한 음료 찾기
  const myDrink =
    data?.applications.find((app) => app.name === currentUserName)?.drink ||
    null;

  // localStorage에서 name 가져오기

  useEffect(() => {
    const storedName = localStorage.getItem("name");
    if (storedName) {
      setCurrentUserName(storedName);
    }
  }, []);

  // 음료 아이콘 함수
  const getDrinkIcon = (drink: string) => {
    if (drink === "선택안함") return "/icons/pending.png";
    if (drink.includes("바닐라") || drink.includes("자몽")) return "/icons/etcDrink.png";
    if (drink.includes("ICE")) return "/icons/ice.png";
    if (drink.includes("HOT")) return "/icons/hot.png";
    return "/icons/pending.png";
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
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay: 0.1,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        <Card className="border-none shadow-none bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Monthly 음료 선택하기
            </CardTitle>
            <div className="flex flex-col text-gray-500 text-sm">
              <p>픽업인원</p>
              <div className="text-gray-900">
                {isLoading ? (
                  <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
                ) : pickupPersons.length > 0 ? (
                  pickupPersons.map((person, index) => {
                    const isCurrentUser =
                      currentUserName && person.name.includes(currentUserName);
                    return (
                      <span
                        key={index}
                        className={
                          isCurrentUser
                            ? "bg-blue-100 text-blue-800 px-1 rounded"
                            : ""
                        }
                      >
                        {person.name}
                        {index < pickupPersons.length - 1 ? ", " : ""}
                      </span>
                    );
                  })
                ) : (
                  ""
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* 내가 선택한 음료 또는 미신청 상태 */}
            {currentUserName && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.2,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              >
                {isLoading ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div>
                          <div className="w-24 h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="w-32 h-5 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                      <div className="w-5 h-5 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ) : myDrink ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 relative">
                          <Image
                            src={getDrinkIcon(myDrink)}
                            alt={myDrink}
                            width={32}
                            height={32}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-blue-600 font-medium">
                            내가 선택한 음료
                          </p>
                          <p className="text-sm font-semibold text-blue-800">
                            {myDrink}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center text-blue-600">
                        <svg
                          className="w-5 h-5"
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
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3">
                    <div className="flex items-center space-x-5">
                      <div className="w-8 h-8 relative">
                        <Image
                          src="/icons/pending.png"
                          alt="미신청"
                          width={32}
                          height={32}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 font-medium mb-1">
                          음료 신청 상태
                        </p>
                        <p className="text-md font-semibold text-gray-700">
                          아직 신청하지 않았습니다
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.3,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <Button
                variant={"outline"}
                className="w-full"
                onClick={() => setIsAllHistoryDialogOpen(true)}
              >
                전체 신청 내역 조회
              </Button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="grid grid-cols-2 gap-3"
            >
              {isLoading
                ? // Skeleton UI for loading state
                  Array.from({ length: 8 }).map((_, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        duration: 0.4,
                        delay: index * 0.05,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                      className={`${index === 7 ? "aspect-[4/1] col-span-2" : "aspect-square"} p-4 border border-gray-200 rounded-xl animate-pulse bg-gray-50 flex flex-col items-center justify-center space-y-2`}
                    >
                      {/* Skeleton icon */}
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      {/* Skeleton text */}
                      <div className="w-16 h-4 bg-gray-200 rounded"></div>
                      {/* Skeleton tag */}
                      <div className="w-10 h-3 bg-gray-200 rounded-full"></div>
                    </motion.div>
                  ))
                : displayDrinks.map((drink, index) => {
                    const isSelected = selectedDrink === drink;
                    const isIce = drink.includes("ICE");
                    const isHot = drink.includes("HOT");
                    const isSpecial =
                      drink.includes("바닐라") || drink.includes("자몽");
                    const isNoSelection = drink === "선택안함";

                    return (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                          duration: 0.4,
                          delay: index * 0.08,
                          ease: [0.25, 0.46, 0.45, 0.94],
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedDrink(drink);
                          setIsDialogOpen(true);
                        }}
                        className={`relative ${isNoSelection ? "aspect-[4/1] col-span-2" : "aspect-square"} p-4 border rounded-xl transition-all duration-300 hover:shadow-md flex flex-col items-center justify-center text-center space-y-2 ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 shadow-lg"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        {/* 음료 아이콘 */}
                        <div className="w-8 h-8 relative">
                          <Image
                            src={getDrinkIcon(drink)}
                            alt={drink}
                            width={32}
                            height={32}
                            className="w-full h-full object-contain"
                          />
                        </div>

                        {/* 음료 이름 */}
                        <div
                          className={`font-medium text-sm leading-tight transition-colors duration-200 ${isSelected ? "text-blue-700" : "text-gray-800"}`}
                        >
                          {drink}
                        </div>

                        {/* 음료 태그 */}
                        <div className="flex flex-wrap gap-1 justify-center">
                          {drink !== "선택안함" && (
                            <span
                              className={`px-1.5 py-0.5 text-xs rounded-full ${isIce ? "bg-blue-100 text-blue-700" : isHot ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}
                            >
                              {isIce ? "ICE" : isHot ? "HOT" : "COLD"}
                            </span>
                          )}
                        </div>

                        {/* 선택 체크 아이콘 */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 text-blue-500">
                            <svg
                              className="w-4 h-4"
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
                        )}
                      </motion.button>
                    );
                  })}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom Navigation */}
      <BottomNavigation />

      {/* 확인 Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-xs mx-auto p-6 bg-white rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-center">음료 선택 확인</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-3">
            <div className="w-16 h-16 relative">
              <Image
                src={getDrinkIcon(selectedDrink)}
                alt={selectedDrink}
                width={64}
                height={64}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-md font-semibold text-gray-800">
              {selectedDrink}
            </span>

            <span className="text-sm text-gray-600">
              이 음료를 선택하시겠습니까?
            </span>
          </div>

          <DialogFooter className="flex-col space-y-2 sm:flex-col sm:space-x-0 sm:space-y-2">
            <Button
              onClick={handleDrinkAssign}
              disabled={isAssigning}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
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

      <AllHistoryDialog
        isOpen={isAllHistoryDialogOpen}
        onClose={() => setIsAllHistoryDialogOpen(false)}
      />
    </React.Fragment>
  );
};

export default MonthlyDrink;
