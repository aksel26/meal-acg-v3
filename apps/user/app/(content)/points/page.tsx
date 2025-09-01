"use client";

import { BottomNavigation } from "@/components/BottomNavigation";
import { Badge } from "@repo/ui/src/badge";
import { Card, CardContent } from "@repo/ui/src/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/src/select";
import { NumberTicker } from "@repo/ui/src/number-ticker";
import { ChartPieDonut } from "@repo/ui/src/chart-pie-donut";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui/src/tabs";
import { Check, Plus, X } from "@repo/ui/icons";
import React, { useState } from "react";
import NoDataIcon from "@/public/icons/noData.png";
import Image from "next/image";
import { EditPointDrawer } from "@/components/points/EditPointDrawer";
import { ActivityViewDialog } from "../../../components/points/ActivityViewDialog";
// import { Button } from "@meal/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@meal/ui/card";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@meal/ui/dialog";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@meal/ui/select";

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
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [editingPoint, setEditingPoint] = useState<WelfarePoint | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewPoint, setIsNewPoint] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "amount-high" | "amount-low">("newest");
  const [points, setPoints] = useState<WelfarePoint[]>([
    {
      id: "1",
      date: "2025-09-01",
      type: "welfare",
      vendor: "월 복지포인트 지급",
      amount: 100000,
      used: false,
      confirmed: true,
    },
    {
      id: "2",
      date: "2025-09-15",
      type: "activity",
      vendor: "스타벅스 강남점",
      amount: 8500,
      used: true,
      confirmed: true,
      notes: "팀 회의용 커피",
    },
    {
      id: "3",
      date: "2025-09-22",
      type: "welfare",
      vendor: "CGV 영등포점",
      amount: 15000,
      used: true,
      confirmed: false,
      notes: "영화 관람",
    },
    {
      id: "4",
      date: "2025-09-28",
      type: "activity",
      vendor: "교보문고 광화문점",
      amount: 25000,
      used: true,
      confirmed: true,
    },
  ]);

  // 현재 날짜를 기준으로 하반기/상반기 구분
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12

  const isSecondHalf = currentMonth >= 7; // 7월 이상이면 하반기

  const months = Array.from({ length: 6 }, (_, i) => {
    const monthNum = isSecondHalf ? i + 7 : i + 1; // 하반기: 7-12월, 상반기: 1-6월
    const date = new Date(currentYear, monthNum - 1, 1);
    return {
      value: date.toISOString().slice(0, 7),
      label: `${monthNum}월`,
    };
  });

  const filteredAndSortedPoints = points
    .filter((point) => point.date.startsWith(selectedMonth))
    .sort((a, b) => {
      switch (sortOrder) {
        case "newest":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "oldest":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "amount-high":
          return b.amount - a.amount;
        case "amount-low":
          return a.amount - b.amount;
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

  const totalAmount = filteredAndSortedPoints.reduce((sum, point) => sum + point.amount, 0);
  const usedAmount = filteredAndSortedPoints.filter((point) => point.used).reduce((sum, point) => sum + point.amount, 0);
  const remainingAmount = totalAmount - usedAmount;

  // Separate welfare and activity points data
  const welfarePoints = filteredAndSortedPoints.filter((point) => point.type === "welfare");
  const activityPoints = filteredAndSortedPoints.filter((point) => point.type === "activity");

  const welfareTotalAmount = welfarePoints.reduce((sum, point) => sum + point.amount, 0);
  const welfareUsedAmount = welfarePoints.filter((point) => point.used).reduce((sum, point) => sum + point.amount, 0);

  const activityTotalAmount = activityPoints.reduce((sum, point) => sum + point.amount, 0);
  const activityUsedAmount = activityPoints.filter((point) => point.used).reduce((sum, point) => sum + point.amount, 0);

  const handleEditPoint = (point: WelfarePoint) => {
    setEditingPoint(point);
    setIsNewPoint(false);
    setIsEditDialogOpen(true);
  };

  const handleSavePoint = () => {
    if (editingPoint) {
      if (editingPoint.id && points.find((p) => p.id === editingPoint.id)) {
        // 기존 포인트 수정
        setPoints(points.map((p) => (p.id === editingPoint.id ? editingPoint : p)));
      } else {
        // 새 포인트 추가
        const newPoint = { ...editingPoint, id: Date.now().toString() };
        setPoints([newPoint, ...points]);
      }
      setEditingPoint(null);
    }
  };

  const handleAddNewPoint = () => {
    const newPoint: WelfarePoint = {
      id: "",
      date: new Date().toISOString().slice(0, 10),
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

  return (
    <React.Fragment>
      {/* Header */}
      <Card className="border-0 shadow-none bg-white p-5 py-8 mb-8 space-y-8">
        <div>
          <h1 className="text-lg sm:text-xl! font-semibold text-gray-900 mb-1">복지포인트/활동비</h1>
          <p className="text-sm text-gray-500">월별 포인트 현황을 확인하세요</p>
        </div>

        {/* Balance Summary */}
        <div className="flex justify-between items-end mb-8">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-medium text-gray-600">{selectedMonth.split("-")[0]}년 하반기 남은 금액</p>
            <div className="flex space-x-1">
              <NumberTicker className={`text-2xl font-black ${remainingAmount < 0 ? "text-red-600" : "text-gray-900"}`} value={remainingAmount} />
              <span className="text-2xl font-black text-gray-900">원</span>
            </div>
            <p className="text-xs text-gray-400">복지포인트 + 활동비 잔액</p>
          </div>
          <div>
            <ActivityViewDialog selectedMonth={selectedMonth} />
          </div>
        </div>

        {/* Chart Section */}
        <div className="mb-4">
          <Tabs defaultValue="welfare" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="welfare" className="text-xs">
                복지포인트
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs">
                활동비
              </TabsTrigger>
            </TabsList>
            <TabsContent value="welfare" className="mt-4">
              <ChartPieDonut availableAmount={welfareTotalAmount} totalUsed={welfareUsedAmount} className="relative" chartType="welfare" />
            </TabsContent>
            <TabsContent value="activity" className="mt-4">
              <ChartPieDonut availableAmount={activityTotalAmount} totalUsed={activityUsedAmount} className="relative" chartType="activity" />
            </TabsContent>
          </Tabs>
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

          {filteredAndSortedPoints.length === 0 ? (
            <Card className="border-0 shadow-none bg-white">
              <CardContent className="p-8 text-center">
                <Image src={NoDataIcon} alt="No Data" width={40} height={40} className="mx-auto mb-4" />
                <p className="text-gray-500 text-sm">선택한 월에 포인트 내역이 없습니다.</p>
              </CardContent>
            </Card>
          ) : (
            filteredAndSortedPoints.map((point) => {
              const pointDate = new Date(point.date);
              const dayOfWeek = pointDate.toLocaleDateString("ko-KR", { weekday: "short" });

              return (
                <Card key={point.id} className="border-0 shadow-none bg-white hover:shadow-md transition-shadow duration-200 cursor-pointer" onClick={() => handleEditPoint(point)}>
                  <CardContent className="p-5">
                    <div className="space-y-3">
                      {/* Header Row */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-sm font-medium text-gray-400">
                            {pointDate.getFullYear()}년 {pointDate.getMonth() + 1}월 {pointDate.getDate()}일 ({dayOfWeek})
                          </span>
                        </div>
                        <div className="text-right">
                          <p className={`text-base font-semibold ${point.used ? "text-gray-900" : "text-blue-600"}`}>
                            {point.used ? "-" : "+"}
                            {point.amount.toLocaleString()}원
                          </p>
                        </div>
                      </div>

                      {/* Vendor */}
                      <div>
                        <p className="font-medium text-gray-900">{point.vendor}</p>
                        {point.notes && <p className="text-gray-500 text-sm mt-1">{point.notes}</p>}
                      </div>

                      {/* Bottom Info */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <Badge variant={point.type === "activity" ? "secondary" : "outline"} className="text-xs">
                          {point.type === "activity" ? "활동비" : "복지포인트"}
                        </Badge>
                        <div className="flex items-center space-x-1">
                          {point.confirmed ? (
                            <>
                              <Check className="w-3 h-3 text-blue-600" />
                              <span className="text-xs text-blue-600">확인됨</span>
                            </>
                          ) : (
                            <>
                              <X className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-400">미확인</span>
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
      <EditPointDrawer isOpen={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} editingPoint={editingPoint} onSave={handleSavePoint} onPointChange={setEditingPoint} isNewPoint={isNewPoint} />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </React.Fragment>
  );
}
