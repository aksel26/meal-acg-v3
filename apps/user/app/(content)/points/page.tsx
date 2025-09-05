"use client";

import { BottomNavigation } from "@/components/BottomNavigation";
import { Badge } from "@repo/ui/src/badge";
import { Card, CardContent } from "@repo/ui/src/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/src/select";
import { NumberTicker } from "@repo/ui/src/number-ticker";
import { ChartPieDonut } from "@repo/ui/src/chart-pie-donut";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui/src/tabs";
import { Check, Plus, SquircleDashed } from "@repo/ui/icons";
import React, { useState, useEffect } from "react";
import NoDataIcon from "@/public/icons/noData.png";
import Image from "next/image";
import { EditPointDrawer } from "@/components/points/EditPointDrawer";
import { ActivityViewDialog } from "../../../components/points/ActivityViewDialog";
import { PointsGuideDialog } from "@/components/points/PointsGuideDialog";
import { useWelfarePointsMonthly } from "@/hooks/use-welfare-points-monthly";
import { useAddWelfarePoint, useUpdateWelfarePoint, useDeleteWelfarePoint } from "@/hooks/use-welfare-points-mutations";
import dayjs from "dayjs";

interface WelfarePoint {
  id: string;
  date: string;
  type: "activity" | "welfare";
  vendor: string;
  amount: number;
  used: boolean;
  confirmed: boolean;
  notes?: string;
}

export default function Points() {
  const [selectedMonth, setSelectedMonth] = useState<string>(dayjs().format("YYYY-MM"));
  const [editingPoint, setEditingPoint] = useState<WelfarePoint | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewPoint, setIsNewPoint] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "amount-high" | "amount-low">("newest");
  const [userName, setUserName] = useState<string>("");
  const [gradeName, setGradeName] = useState<string>("");
  const [selectedTab, setSelectedTab] = useState<"welfare" | "activity">("welfare");
  const [displayRemainingAmount, setDisplayRemainingAmount] = useState(0);
  const [displayTabName, setDisplayTabName] = useState("복지포인트");
  const [isDeleting, setIsDeleting] = useState(false);

  // localStorage에서 사용자명과 등급명 가져오기
  useEffect(() => {
    const storedName = localStorage.getItem("name");
    const storedGradeName = localStorage.getItem("grade");

    if (storedName) {
      setUserName(storedName);
    }
    if (storedGradeName) {
      setGradeName(storedGradeName);
    }
  }, []);

  // dayjs로 날짜 처리
  const selectedDate = dayjs(selectedMonth);
  const selectedYear = selectedDate.year();
  const selectedMonthNum = selectedDate.month() + 1;

  // 새로운 복지포인트 월별 API 사용
  const { data: welfareMonthlyResponse, isLoading: isWelfareLoading, error: welfareError } = useWelfarePointsMonthly(userName, selectedYear, selectedMonthNum, !!userName);
  console.log("welfareMonthlyResponse:", welfareMonthlyResponse);

  // Mutation hooks
  const addWelfarePointMutation = useAddWelfarePoint();
  const updateWelfarePointMutation = useUpdateWelfarePoint();
  const deleteWelfarePointMutation = useDeleteWelfarePoint();

  const welfareData = welfareMonthlyResponse?.data;
  const welfareHistory = welfareMonthlyResponse?.data.history;

  // API 데이터를 WelfarePoint 형식으로 변환

  // dayjs를 사용한 하반기/상반기 구분
  const currentDate = dayjs();
  const currentYear = currentDate.year();
  const currentMonth = currentDate.month() + 1; // dayjs는 0부터 시작하므로 +1

  const isSecondHalf = currentMonth >= 7; // 7월 이상이면 하반기

  const months = Array.from({ length: 6 }, (_, i) => {
    const monthNum = isSecondHalf ? i + 7 : i + 1; // 하반기: 7-12월, 상반기: 1-6월
    const date = dayjs()
      .year(currentYear)
      .month(monthNum - 1)
      .date(1);
    return {
      value: date.format("YYYY-MM"),
      label: `${monthNum}월`,
    };
  });

  // API 데이터와 로컬에서 추가된 데이터를 합치기

  // API에서 제공되는 데이터 사용 (문자열을 숫자로 변환)
  const welfareTotalAmount = parseInt((welfareData?.welfareStats?.totalAmount || "0").toString().replace(/,/g, "")) || 0;
  const welfareUsedAmount = parseInt((welfareData?.welfareStats?.usedAmount || "0").toString().replace(/,/g, "")) || 0;
  const welfareRemainingAmount = parseInt((welfareData?.welfareStats?.remainingAmount || "0").toString().replace(/,/g, "")) || 0;

  const activityTotalAmount = parseInt((welfareData?.activityStats?.totalAmount || "0").toString().replace(/,/g, "")) || 0;
  const activityUsedAmount = parseInt((welfareData?.activityStats?.usedAmount || "0").toString().replace(/,/g, "")) || 0;
  const activityRemainingAmount = parseInt((welfareData?.activityStats?.remainingAmount || "0").toString().replace(/,/g, "")) || 0;

  // 팀장, 본부장만 탭과 활동비 볼 수 있음
  const isManager = gradeName === "팀장" || gradeName === "본부장";

  // 탭이나 API 데이터가 변경될 때 표시 금액 업데이트
  useEffect(() => {
    // 팀장/본부장이 아니면 항상 복지포인트만 표시
    if (!isManager) {
      setDisplayRemainingAmount(welfareRemainingAmount);
      setDisplayTabName("복지포인트");
      setSelectedTab("welfare");
      return;
    }

    const newDisplayRemainingAmount = selectedTab === "welfare" ? welfareRemainingAmount : activityRemainingAmount;
    const newDisplayTabName = selectedTab === "welfare" ? "복지포인트" : "활동비";

    setDisplayRemainingAmount(newDisplayRemainingAmount);
    setDisplayTabName(newDisplayTabName);
  }, [selectedTab, welfareRemainingAmount, activityRemainingAmount, isManager]);

  const handleEditPoint = (apiPoint: any) => {
    // API 데이터를 EditPointDrawer 형식으로 변환
    const editablePoint: WelfarePoint = {
      id: apiPoint.no?.toString() || "",
      date: `${apiPoint.year}-${String(apiPoint.month).padStart(2, "0")}-${String(apiPoint.day).padStart(2, "0")}`,
      type: apiPoint.type?.includes("복지") ? "welfare" : "activity",
      vendor: apiPoint.vendor || "",
      amount: apiPoint.amount || 0,
      used: true, // API 데이터는 이미 사용된 것으로 간주
      confirmed: apiPoint.confirmed || false,
      notes: apiPoint.notes || "",
    };

    setEditingPoint(editablePoint);
    setIsNewPoint(false);
    setIsEditDialogOpen(true);
  };

  const handleSavePoint = async () => {
    if (!editingPoint || !userName) return;
    try {
      // date를 year, month, day로 분할
      const selectedDate = dayjs(editingPoint.date);
      const year = selectedDate.year();
      const month = selectedDate.month() + 1;
      const day = selectedDate.date();
      const dayOfWeek = selectedDate.format("dd"); // 월, 화, 수, 목, 금, 토, 일

      // type을 API 형식으로 변환
      const typeText = editingPoint.type === "welfare" ? "복지포인트" : "활동비";

      const apiData = {
        name: userName,
        year,
        month,
        day,
        dayOfWeek,
        type: typeText,
        vendor: editingPoint.vendor,
        amount: editingPoint.amount,
        notes: editingPoint.notes || "",
      };
      if (isNewPoint) {
        // 새로운 포인트 추가
        await addWelfarePointMutation.mutateAsync(apiData);
      } else {
        // 기존 포인트 수정 (editingPoint.id에서 no를 가져옴)
        const no = parseInt(editingPoint.id);
        if (no) {
          await updateWelfarePointMutation.mutateAsync({
            no,
            ...apiData,
          });
        }
      }

      setEditingPoint(null);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("포인트 저장 오류:", error);
      // TODO: 오류 메시지 표시
    }
  };

  const handleDeletePoint = async (point: WelfarePoint) => {
    console.log("point:", point);
    if (!point.id || !userName) return;

    setIsDeleting(true);
    try {
      const no = parseInt(point.id);
      console.log("no:", no);
      if (no) {
        // date에서 year, month 추출
        const selectedDate = dayjs(point.date);
        const year = selectedDate.year();
        const month = selectedDate.month() + 1;

        await deleteWelfarePointMutation.mutateAsync({
          no,
          name: userName,
          year,
          month,
        });

        setEditingPoint(null);
        setIsEditDialogOpen(false);
      }
    } catch (error) {
      console.error("포인트 삭제 오류:", error);
      // TODO: 오류 메시지 표시
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddNewPoint = () => {
    const newPoint: WelfarePoint = {
      id: "",
      date: dayjs().format("YYYY-MM-DD"),
      type: "welfare",
      vendor: "",
      amount: 0,
      used: false,
      confirmed: false,
      notes: "",
    };
    setEditingPoint(newPoint);
    setIsNewPoint(true);
    setIsEditDialogOpen(true);
  };

  const filteredAndSortedPoints: any = [];

  return (
    <React.Fragment>
      {/* Header */}
      <Card className="border-0 shadow-none bg-white p-5 py-8 mb-8 space-y-8">
        <div className="flex items-center justify-between flex-1">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 justify-between">
              <h1 className="text-lg sm:text-xl! font-semibold text-gray-900">복지포인트 · 활동비</h1>
              <PointsGuideDialog />
            </div>
            <p className="text-sm text-gray-500">월별 포인트 현황을 확인하세요</p>
          </div>
        </div>

        {/* Balance Summary */}
        <div className="flex justify-between items-end mb-8">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-medium text-gray-600">
              {selectedMonth.split("-")[0]}년 {displayTabName} 남은 금액
            </p>
            <div className="flex space-x-1">
              {isWelfareLoading ? (
                <div className="animate-pulse bg-gray-200 rounded h-8 w-32"></div>
              ) : (
                <NumberTicker className={`text-2xl font-black ${displayRemainingAmount < 0 ? "text-red-600" : "text-gray-900"}`} value={displayRemainingAmount} />
              )}
              <span className="text-2xl font-black text-gray-900">원</span>
            </div>
            {welfareError && <p className="text-xs text-red-500">데이터 로딩 중 오류가 발생했습니다.</p>}
          </div>
          <div>
            <ActivityViewDialog />
          </div>
        </div>

        {/* Chart Section */}
        <div className="mb-4">
          {isManager ? (
            <Tabs defaultValue="welfare" className="w-full" onValueChange={(value) => setSelectedTab(value as "welfare" | "activity")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="welfare" className="text-xs">
                  복지포인트
                </TabsTrigger>
                <TabsTrigger value="activity" className="text-xs">
                  활동비
                </TabsTrigger>
              </TabsList>
              <TabsContent value="welfare" className="mt-4">
                <ChartPieDonut availableAmount={welfareTotalAmount} remainingAmount={welfareRemainingAmount} totalUsed={welfareUsedAmount} className="relative" chartType="welfare" />
              </TabsContent>
              <TabsContent value="activity" className="mt-4">
                <ChartPieDonut availableAmount={activityTotalAmount} remainingAmount={activityRemainingAmount} totalUsed={activityUsedAmount} className="relative" chartType="activity" />
              </TabsContent>
            </Tabs>
          ) : (
            // 팀장/본부장이 아닌 경우 복지포인트만 표시
            <div className="mt-4">
              <ChartPieDonut availableAmount={welfareTotalAmount} totalUsed={welfareUsedAmount} className="relative" chartType="welfare" />
            </div>
          )}
        </div>
      </Card>

      {/* Points List */}
      <div>
        {/* Month Selector */}

        <div className="mb-3 flex justify-between items-center">
          <h2 className="text-md font-semibold text-gray-900">포인트 사용 내역</h2>
          <div className="flex gap-2">
            <Select value={sortOrder} onValueChange={(value: "newest" | "oldest" | "amount-high" | "amount-low") => setSortOrder(value)}>
              <SelectTrigger className="w-auto min-w-[100px] h-11 border-0 bg-white shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">최신순</SelectItem>
                <SelectItem value="oldest">오래된순</SelectItem>
                <SelectItem value="amount-high">금액 높은순</SelectItem>
                <SelectItem value="amount-low">금액 낮은순</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-auto min-w-[80px] h-11 border-0 bg-white shadow-sm">
                <SelectValue placeholder="월을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-3">
          {/* Add New Point Button */}
          <Card className="border border-blue-200 shadow-none bg-blue-50 hover:bg-blue-100 transition-colors duration-200 cursor-pointer" onClick={handleAddNewPoint}>
            <CardContent className="p-5">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-blue-900">새 포인트 내역 추가</p>
                  <p className="text-xs text-blue-600">클릭하여 새로운 내역을 등록하세요</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {isWelfareLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-0 shadow-none bg-white">
                  <CardContent className="p-5">
                    <div className="animate-pulse space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="bg-gray-200 rounded h-4 w-32"></div>
                        <div className="bg-gray-200 rounded h-4 w-20"></div>
                      </div>
                      <div className="bg-gray-200 rounded h-5 w-48"></div>
                      <div className="flex justify-between items-center pt-2">
                        <div className="bg-gray-200 rounded h-5 w-16"></div>
                        <div className="bg-gray-200 rounded h-4 w-12"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : welfareHistory?.length === 0 ? (
            <Card className="border-0 shadow-none bg-white">
              <CardContent className="p-8 text-center">
                <Image src={NoDataIcon} alt="No Data" width={40} height={40} className="mx-auto mb-4" />
                <p className="text-gray-500 text-sm">{welfareError ? "포인트 내역을 불러올 수 없습니다." : "선택한 월에 포인트 내역이 없습니다."}</p>
              </CardContent>
            </Card>
          ) : (
            welfareHistory
              ?.sort((a: any, b: any) => {
                switch (sortOrder) {
                  case "newest":
                    return new Date(b.year, b.month - 1, b.day).getTime() - new Date(a.year, a.month - 1, a.day).getTime();
                  case "oldest":
                    return new Date(a.year, a.month - 1, a.day).getTime() - new Date(b.year, b.month - 1, b.day).getTime();
                  case "amount-high":
                    return b.amount - a.amount;
                  case "amount-low":
                    return a.amount - b.amount;
                  default:
                    return 0;
                }
              })
              ?.map((point: any, index: number) => {
                const { year, month, day, dayOfWeek } = point;
                console.log("point:", point);

                return (
                  <Card key={index} className="border-0 shadow-none bg-white hover:shadow-md transition-shadow duration-200 cursor-pointer" onClick={() => handleEditPoint(point)}>
                    <CardContent className="p-5">
                      <div className="space-y-3">
                        {/* Header Row */}
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-sm font-light text-gray-400">
                              {year}년 {month}월 {day}일 ({dayOfWeek})
                            </span>
                          </div>
                          <div className="text-right">
                            <p className={`text-base font-semibold`}>{point.amount.toLocaleString()} 원</p>
                          </div>
                        </div>

                        {/* Vendor */}
                        <div>
                          <p className="font-medium text-gray-900">{point.vendor}</p>
                          {point.notes && <p className="text-gray-500 text-sm mt-1">{point.notes}</p>}
                        </div>

                        {/* Bottom Info */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <Badge variant={point.type === "활동비" ? "secondary" : "outline"} className="text-xs">
                            {point.type}
                          </Badge>
                          <div className="flex items-center space-x-1">
                            {point.confirmed ? (
                              <Badge className="bg-lime-50 flex items-center space-x-1">
                                <Check className="w-3 h-3 text-lime-500" />
                                <span className="text-xs text-lime-500">P&C 확인</span>
                              </Badge>
                            ) : (
                              <>
                                <SquircleDashed className="w-4 h-4 text-gray-400" />
                                <span className="text-xs font-light text-gray-400">P&C 확인 전</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
          )}
        </div>
      </div>
      {/* Edit Drawer */}
      <EditPointDrawer
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        editingPoint={editingPoint}
        onSave={handleSavePoint}
        onDelete={handleDeletePoint}
        onPointChange={setEditingPoint}
        isNewPoint={isNewPoint}
        isDeleting={isDeleting}
      />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </React.Fragment>
  );
}
