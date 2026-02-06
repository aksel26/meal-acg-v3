"use client";

import { BottomNavigation } from "@/components/BottomNavigation";
import { Badge } from "@repo/ui/src/badge";
import { Card, CardContent } from "@repo/ui/src/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/src/select";
import { NumberTicker } from "@repo/ui/src/number-ticker";
import { ChartPieDonut } from "@repo/ui/src/chart-pie-donut";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/src/tabs";
import { Check, Plus, SquircleDashed } from "@repo/ui/icons";
import React, { useState, useEffect, useMemo } from "react";
import NoDataIcon from "@/public/icons/noData.png";
import Image from "next/image";
import { EditPointDrawer } from "@/components/points/EditPointDrawer";
import { ActivityViewDialog } from "../../../components/points/ActivityViewDialog";
import { PointsGuideDialog } from "@/components/points/PointsGuideDialog";
import {
  useMemberIdLookup,
  usePointsWelfare,
  usePointsActivity,
  type UsageRecord,
} from "@/hooks/use-points-data";
import {
  useAddUsageRecord,
  useUpdateUsageRecord,
  useDeleteUsageRecord,
} from "@/hooks/use-points-mutations";
import { useUserStore } from "@/stores/userStore";
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
  const [selectedTab, setSelectedTab] = useState<"welfare" | "activity">("welfare");
  const [isDeleting, setIsDeleting] = useState(false);

  // Zustand store에서 사용자 정보 가져오기
  const { userName, memberId, memberRole, setMemberInfo } = useUserStore();

  // userName으로 member_id 조회 (store에 없는 경우)
  const { data: memberLookup } = useMemberIdLookup(!memberId ? userName : null);

  // member_id가 lookup에서 확인되면 store에 저장
  useEffect(() => {
    if (memberLookup && !memberId) {
      setMemberInfo(memberLookup.id, memberLookup.member_role);
    }
  }, [memberLookup, memberId, setMemberInfo]);

  const currentMemberId = memberId || memberLookup?.id || null;
  const currentMemberRole = memberRole || memberLookup?.member_role || null;

  // 매니저 여부 (팀장/본부장만 활동비 탭 접근 가능)
  const isManager = currentMemberRole === "팀장" || currentMemberRole === "본부장";

  // Supabase 기반 데이터 조회
  const {
    data: welfareData,
    isLoading: isWelfareLoading,
    error: welfareError,
  } = usePointsWelfare(currentMemberId, selectedMonth);

  const {
    data: activityData,
    isLoading: isActivityLoading,
  } = usePointsActivity(isManager ? currentMemberId : null, selectedMonth);

  // Mutation hooks
  const addMutation = useAddUsageRecord();
  const updateMutation = useUpdateUsageRecord();
  const deleteMutation = useDeleteUsageRecord();

  // 복지포인트 금액 데이터
  const welfareTotalAmount = welfareData?.summary?.total_amount ?? 0;
  const welfareUsedAmount = welfareData?.summary?.used_amount ?? 0;
  const welfareRemainingAmount = welfareData?.summary?.remaining_amount ?? 0;

  // 활동비 금액 데이터
  const activityTotalAmount = activityData?.summary?.total_amount ?? 0;
  const activityUsedAmount = activityData?.summary?.used_amount ?? 0;
  const activityRemainingAmount = activityData?.summary?.remaining_amount ?? 0;

  // 현재 표시할 잔액 및 탭 이름
  const displayRemainingAmount = useMemo(() => {
    if (!isManager || selectedTab === "welfare") return welfareRemainingAmount;
    return activityRemainingAmount;
  }, [selectedTab, welfareRemainingAmount, activityRemainingAmount, isManager]);

  const displayTabName = useMemo(() => {
    if (!isManager || selectedTab === "welfare") return "복지포인트";
    return "활동비";
  }, [selectedTab, isManager]);

  // 현재 탭에 해당하는 records
  const currentRecords = useMemo(() => {
    if (!isManager || selectedTab === "welfare") {
      return welfareData?.records ?? [];
    }
    return activityData?.records ?? [];
  }, [selectedTab, welfareData, activityData, isManager]);

  // 정렬된 records
  const sortedRecords = useMemo(() => {
    const records = [...currentRecords];
    return records.sort((a, b) => {
      switch (sortOrder) {
        case "newest":
          return new Date(b.used_at).getTime() - new Date(a.used_at).getTime();
        case "oldest":
          return new Date(a.used_at).getTime() - new Date(b.used_at).getTime();
        case "amount-high":
          return b.amount - a.amount;
        case "amount-low":
          return a.amount - b.amount;
        default:
          return 0;
      }
    });
  }, [currentRecords, sortOrder]);

  // 하반기/상반기 월 목록
  const currentDate = dayjs();
  const currentYear = currentDate.year();
  const currentMonth = currentDate.month() + 1;
  const isSecondHalf = currentMonth >= 7;

  const months = Array.from({ length: 6 }, (_, i) => {
    const monthNum = isSecondHalf ? i + 7 : i + 1;
    const date = dayjs().year(currentYear).month(monthNum - 1).date(1);
    return {
      value: date.format("YYYY-MM"),
      label: `${monthNum}월`,
    };
  });

  const isLoading = isWelfareLoading || (isManager && isActivityLoading);

  // UsageRecord → WelfarePoint 변환 (EditPointDrawer 호환)
  const toEditablePoint = (record: UsageRecord): WelfarePoint => ({
    id: record.id,
    date: record.used_at,
    type: record.type === "활동비" ? "activity" : "welfare",
    vendor: record.description,
    amount: record.amount,
    used: true,
    confirmed: record.is_reviewed,
    notes: record.companions?.length ? `동반: ${record.companions.join(", ")}` : "",
  });

  const handleEditPoint = (record: UsageRecord) => {
    // 검토 완료된 내역은 수정 불가
    if (record.is_reviewed) return;
    setEditingPoint(toEditablePoint(record));
    setIsNewPoint(false);
    setIsEditDialogOpen(true);
  };

  const handleSavePoint = async () => {
    if (!editingPoint || !currentMemberId) return;

    try {
      const pointType = editingPoint.type === "welfare" ? "welfare" : "activity";

      if (isNewPoint) {
        // 새 내역 추가 - allocation_id 필요
        const allocId = pointType === "welfare"
          ? welfareData?.summary?.allocation_id
          : activityData?.summary?.allocation_id;

        if (!allocId) {
          console.error("할당 정보가 없습니다. 관리자에게 예산 할당을 요청하세요.");
          return;
        }

        await addMutation.mutateAsync({
          type: pointType,
          allocation_id: allocId,
          member_id: currentMemberId,
          amount: editingPoint.amount,
          description: editingPoint.vendor,
          used_at: editingPoint.date,
          companions: [],
        });
      } else {
        await updateMutation.mutateAsync({
          type: pointType,
          id: editingPoint.id,
          amount: editingPoint.amount,
          description: editingPoint.vendor,
          used_at: editingPoint.date,
        });
      }

      setEditingPoint(null);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("포인트 저장 오류:", error);
    }
  };

  const handleDeletePoint = async (point: WelfarePoint) => {
    if (!point.id || !currentMemberId) return;

    setIsDeleting(true);
    try {
      const pointType = point.type === "welfare" ? "welfare" : "activity";
      await deleteMutation.mutateAsync({
        type: pointType,
        id: point.id,
        member_id: currentMemberId,
      });

      setEditingPoint(null);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("포인트 삭제 오류:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddNewPoint = () => {
    const newPoint: WelfarePoint = {
      id: "",
      date: dayjs().format("YYYY-MM-DD"),
      type: selectedTab,
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
              {isLoading ? (
                <div className="animate-pulse bg-gray-200 rounded h-8 w-32"></div>
              ) : (
                <NumberTicker className={`text-2xl font-black ${displayRemainingAmount < 0 ? "text-red-600" : "text-gray-900"}`} value={displayRemainingAmount} />
              )}
              <span className="text-2xl font-black text-gray-900">원</span>
            </div>
            {welfareError && <p className="text-xs text-red-500">데이터 로딩 중 오류가 발생했습니다.</p>}
          </div>
          <div>
            <ActivityViewDialog memberId={currentMemberId} period={selectedMonth} />
          </div>
        </div>

        {/* Chart Section */}
        <div className="mb-4">
          {isManager ? (
            <Tabs defaultValue="welfare" className="w-full" onValueChange={(value: string) => setSelectedTab(value as "welfare" | "activity")}>
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
            <div className="mt-4">
              <ChartPieDonut availableAmount={welfareTotalAmount} totalUsed={welfareUsedAmount} className="relative" chartType="welfare" />
            </div>
          )}
        </div>
      </Card>

      {/* Points List */}
      <div>
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

          {isLoading ? (
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
          ) : sortedRecords.length === 0 ? (
            <Card className="border-0 shadow-none bg-white">
              <CardContent className="p-8 text-center">
                <Image src={NoDataIcon} alt="No Data" width={40} height={40} className="mx-auto mb-4" />
                <p className="text-gray-500 text-sm">{welfareError ? "포인트 내역을 불러올 수 없습니다." : "선택한 월에 포인트 내역이 없습니다."}</p>
              </CardContent>
            </Card>
          ) : (
            sortedRecords.map((record) => {
              const recordDate = dayjs(record.used_at);
              const dayOfWeekMap: Record<number, string> = { 0: "일", 1: "월", 2: "화", 3: "수", 4: "목", 5: "금", 6: "토" };
              const dayOfWeek = dayOfWeekMap[recordDate.day()] || "";

              return (
                <Card
                  key={record.id}
                  className={`border-0 shadow-none bg-white hover:shadow-md transition-shadow duration-200 ${record.is_reviewed ? "opacity-80" : "cursor-pointer"}`}
                  onClick={() => handleEditPoint(record)}
                >
                  <CardContent className="p-5">
                    <div className="space-y-3">
                      {/* Header Row */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-sm font-light text-gray-400">
                            {recordDate.year()}년 {recordDate.month() + 1}월 {recordDate.date()}일 ({dayOfWeek})
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-semibold">{record.amount.toLocaleString()} 원</p>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <p className="font-medium text-gray-900">{record.description}</p>
                        {record.companions?.length > 0 && (
                          <p className="text-gray-500 text-sm mt-1">동반: {record.companions.join(", ")}</p>
                        )}
                      </div>

                      {/* Bottom Info */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <Badge variant={record.type === "활동비" ? "secondary" : "outline"} className="text-xs">
                          {record.type}
                        </Badge>
                        <div className="flex items-center space-x-1">
                          {record.is_reviewed ? (
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
