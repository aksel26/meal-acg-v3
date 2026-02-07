"use client";

import { BottomNavigation } from "@/components/BottomNavigation";
import { Badge } from "@repo/ui/src/badge";
import { Card, CardContent } from "@repo/ui/src/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { NumberTicker } from "@repo/ui/src/number-ticker";
import { Check, ListFilter, Plus, SquircleDashed } from "@repo/ui/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/src/popover";
import { motion } from "motion/react";
import React, { useState, useEffect, useMemo } from "react";
import NoDataIcon from "@/public/icons/noData.png";
import Image from "next/image";
import { EditPointDialog } from "@/components/points/EditPointDialog";
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
import { toast } from "@repo/ui/src/sonner";
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

function BudgetRow({
  label,
  remaining,
  used,
  total,
  showProgressBar = false,
}: {
  label: string;
  remaining: number;
  used: number;
  total: number;
  showProgressBar?: boolean;
}) {
  const isOver = remaining < 0;
  const isLow = remaining >= 0 && total > 0 && remaining < total * 0.2;
  const percent =
    total === 0 ? 0 : Math.min(100, Math.round((used / total) * 100));

  return (
    <div>
      <div className="flex items-end justify-between mb-1.5">
        <div>
          <p className="text-[11px] text-gray-400 mb-0.5">{label} 잔액</p>
          <div className="flex items-baseline gap-1">
            {isOver && (
              <span className="text-xl font-bold text-red-500">-</span>
            )}
            <NumberTicker
              value={Math.abs(remaining)}
              className={`text-xl font-bold tracking-tight ${
                isOver
                  ? "text-red-500"
                  : isLow
                    ? "text-amber-600"
                    : "text-gray-900"
              }`}
            />
            <span
              className={`text-xs font-medium ${
                isOver
                  ? "text-red-400"
                  : isLow
                    ? "text-amber-500"
                    : "text-gray-400"
              }`}
            >
              원
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <span>
            {used.toLocaleString()} / {total.toLocaleString()}원
          </span>
          <div
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
              isOver
                ? "bg-red-50 text-red-600"
                : isLow
                  ? "bg-amber-50 text-amber-600"
                  : "bg-emerald-50 text-emerald-600"
            }`}
          >
            {isOver ? "초과" : isLow ? "주의" : "양호"}
          </div>
        </div>
      </div>
      {showProgressBar && (
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: `${percent}%`, opacity: 1 }}
            transition={{
              width: { duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 },
              opacity: { duration: 0.3 },
            }}
            className={`h-full rounded-full ${
              isOver
                ? "bg-gradient-to-r from-red-400 to-red-500"
                : isLow
                  ? "bg-gradient-to-r from-amber-400 to-amber-500"
                  : "bg-gradient-to-r from-gray-600 to-gray-800"
            }`}
          />
        </div>
      )}
    </div>
  );
}

export default function Points() {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    dayjs().format("YYYY-MM"),
  );
  const [editingPoint, setEditingPoint] = useState<WelfarePoint | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewPoint, setIsNewPoint] = useState(false);
  const [sortOrder, setSortOrder] = useState<
    "newest" | "oldest" | "amount-high" | "amount-low"
  >("newest");
  const [typeFilter, setTypeFilter] = useState<"all" | "welfare" | "activity">(
    "all",
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // Zustand store에서 사용자 정보 가져오기
  const { userName, memberId, memberRole, setMemberInfo } = useUserStore();

  // 항상 lookup 호출 — DB에서 최신 member_role을 반영
  const { data: memberLookup } = useMemberIdLookup(userName);

  // member_id와 member_role을 최신 값으로 store에 저장
  useEffect(() => {
    if (memberLookup) {
      setMemberInfo(memberLookup.id, memberLookup.member_role);
    }
  }, [memberLookup, setMemberInfo]);

  const currentMemberId = memberId || memberLookup?.id || null;
  const currentMemberRole = memberRole || memberLookup?.member_role || null;

  // 매니저 여부 (팀장/본부장만 활동비 탭 접근 가능)
  const isManager =
    currentMemberRole === "팀장" || currentMemberRole === "본부장";

  // Supabase 기반 데이터 조회
  const {
    data: welfareData,
    isLoading: isWelfareLoading,
    error: welfareError,
  } = usePointsWelfare(currentMemberId, selectedMonth);

  const { data: activityData, isLoading: isActivityLoading } =
    usePointsActivity(isManager ? currentMemberId : null, selectedMonth);

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

  // 필터에 따른 records (복지포인트 + 활동비 통합)
  const currentRecords = useMemo(() => {
    const welfareRecords = welfareData?.records ?? [];
    const activityRecords = isManager ? (activityData?.records ?? []) : [];

    if (typeFilter === "welfare") return welfareRecords;
    if (typeFilter === "activity") return activityRecords;
    return [...welfareRecords, ...activityRecords];
  }, [typeFilter, welfareData, activityData, isManager]);

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
    const date = dayjs()
      .year(currentYear)
      .month(monthNum - 1)
      .date(1);
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
    notes: record.notes || "",
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

    const pointType = editingPoint.type === "welfare" ? "welfare" : "activity";

    if (isNewPoint) {
      const allocId =
        pointType === "welfare"
          ? welfareData?.summary?.allocation_id
          : activityData?.summary?.allocation_id;

      if (!allocId) {
        toast.error("할당 정보가 없습니다. 관리자에게 예산 할당을 요청하세요.");
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
        notes: editingPoint.notes || "",
      });
    } else {
      await updateMutation.mutateAsync({
        type: pointType,
        id: editingPoint.id,
        member_id: currentMemberId,
        amount: editingPoint.amount,
        description: editingPoint.vendor,
        used_at: editingPoint.date,
        notes: editingPoint.notes || "",
      });
    }

    toast.success(
      isNewPoint ? "내역이 추가되었습니다." : "내역이 수정되었습니다.",
    );
    setEditingPoint(null);
    setIsEditDialogOpen(false);
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

      toast.success("내역이 삭제되었습니다.");
      setEditingPoint(null);
      setIsEditDialogOpen(false);
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.";
      toast.error(`삭제에 실패했습니다: ${msg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddNewPoint = () => {
    const newPoint: WelfarePoint = {
      id: "",
      date: dayjs().format("YYYY-MM-DD"),
      type: typeFilter === "activity" ? "activity" : "welfare",
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
      {/* Stats Section */}
      {isLoading ? (
        <div className="card-premium relative overflow-hidden mb-6">
          <div className="px-4 pt-4 pb-3 space-y-3">
            <div className="flex justify-between items-start">
              <div className="space-y-1.5">
                <div className="animate-pulse bg-gray-200 rounded h-3 w-20" />
                <div className="animate-pulse bg-gray-200 rounded h-6 w-32" />
              </div>
              <div className="animate-pulse bg-gray-200 rounded h-3 w-28" />
            </div>
            <div className="animate-pulse bg-gray-100 rounded-full h-2 w-full" />
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6"
        >
          <div className="card-premium relative overflow-hidden">
            <div className="relative px-4 pt-4 pb-3">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-semibold text-gray-900">
                    복지포인트{isManager ? " · 활동비" : ""}
                  </h1>
                  <PointsGuideDialog />
                </div>
                <ActivityViewDialog
                  memberId={currentMemberId}
                  period={selectedMonth}
                />
              </div>

              {welfareError && (
                <p className="text-xs text-red-500 mb-2">
                  데이터 로딩 중 오류가 발생했습니다.
                </p>
              )}

              {/* 매니저: 활동비 + 복지포인트 동시 표시 */}
              {isManager ? (
                <div className="space-y-3">
                  <BudgetRow
                    label="활동비"
                    remaining={activityRemainingAmount}
                    used={activityUsedAmount}
                    total={activityTotalAmount}
                  />
                  <BudgetRow
                    label="복지포인트"
                    remaining={welfareRemainingAmount}
                    used={welfareUsedAmount}
                    total={welfareTotalAmount}
                  />
                </div>
              ) : (
                <BudgetRow
                  label="복지포인트"
                  remaining={welfareRemainingAmount}
                  used={welfareUsedAmount}
                  total={welfareTotalAmount}
                  showProgressBar
                />
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Points List */}
      <div>
        <div className="mb-3 flex justify-between items-center">
          <h2 className="text-md font-semibold text-gray-900">사용 내역</h2>
          <div className="flex gap-2">
            <Select
              value={sortOrder}
              onValueChange={(
                value: "newest" | "oldest" | "amount-high" | "amount-low",
              ) => setSortOrder(value)}
            >
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
            {isManager && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="relative h-8.5 w-8.5 flex items-center justify-center rounded-md bg-white shadow-xs border border-input">
                    <ListFilter className="w-4 h-4 text-gray-600" />
                    {typeFilter !== "all" && (
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-40 p-1">
                  {(
                    [
                      { value: "all", label: "전체" },
                      { value: "welfare", label: "복지포인트" },
                      { value: "activity", label: "활동비" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTypeFilter(option.value)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                        typeFilter === option.value
                          ? "bg-gray-100 font-medium text-gray-900"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {/* Add New Point Button */}
          <Card
            className="border border-blue-200 shadow-none bg-blue-50 hover:bg-blue-100 transition-colors duration-200 cursor-pointer"
            onClick={handleAddNewPoint}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-center space-x-3">
                <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-blue-900">
                    새 포인트 내역 추가
                  </p>
                  <p className="text-xs text-blue-600">
                    클릭하여 새로운 내역을 등록하세요
                  </p>
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
                <Image
                  src={NoDataIcon}
                  alt="No Data"
                  width={40}
                  height={40}
                  className="mx-auto mb-4"
                />
                <p className="text-gray-500 text-sm">
                  {welfareError
                    ? "포인트 내역을 불러올 수 없습니다."
                    : "선택한 월에 포인트 내역이 없습니다."}
                </p>
              </CardContent>
            </Card>
          ) : (
            sortedRecords.map((record) => {
              const recordDate = dayjs(record.used_at);
              const dayOfWeekMap: Record<number, string> = {
                0: "일",
                1: "월",
                2: "화",
                3: "수",
                4: "목",
                5: "금",
                6: "토",
              };
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
                            {recordDate.year()}년 {recordDate.month() + 1}월{" "}
                            {recordDate.date()}일 ({dayOfWeek})
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-semibold">
                            {record.amount.toLocaleString()} 원
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <p className="font-medium text-gray-900">
                          {record.description}
                        </p>
                        {record.notes && (
                          <p className="text-gray-500 text-sm mt-1">
                            {record.notes}
                          </p>
                        )}
                      </div>

                      {/* Bottom Info */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <Badge
                          variant={
                            record.type === "활동비" ? "secondary" : "outline"
                          }
                          className="text-xs"
                        >
                          {record.type}
                        </Badge>
                        <div className="flex items-center space-x-1">
                          {record.is_reviewed ? (
                            <Badge className="bg-lime-50 flex items-center space-x-1">
                              <Check className="w-3 h-3 text-lime-500" />
                              <span className="text-xs text-lime-500">
                                P&C 확인
                              </span>
                            </Badge>
                          ) : (
                            <>
                              <SquircleDashed className="w-4 h-4 text-gray-400" />
                              <span className="text-xs font-light text-gray-400">
                                P&C 확인 전
                              </span>
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
      <EditPointDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        editingPoint={editingPoint}
        onSave={handleSavePoint}
        onDelete={handleDeletePoint}
        onPointChange={setEditingPoint}
        isNewPoint={isNewPoint}
        isDeleting={isDeleting}
        isManager={isManager}
      />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </React.Fragment>
  );
}
