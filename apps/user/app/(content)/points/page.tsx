"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { NumberTicker } from "@repo/ui/src/number-ticker";
import { Check, ChevronRight, Eye, ListFilter, Plus } from "@repo/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
import { Tooltip, TooltipTrigger, TooltipContent } from "@repo/ui/src/tooltip";
import { motion } from "motion/react";
import React, { useState, useEffect, useMemo } from "react";
import NoDataIcon from "@/public/icons/noData.png";
import Image from "next/image";
import { EditPointDialog } from "@/components/points/EditPointDialog";
import { ActivityViewDialog } from "../../../components/points/ActivityViewDialog";
import { PointsGuideDialog } from "@/components/points/PointsGuideDialog";
import { AllUsageRecordsDialog } from "@/components/points/AllUsageRecordsDialog";
import {
  useMemberIdLookup,
  usePointsWelfare,
  usePointsActivity,
  usePointsMembers,
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
  delay_reason?: string;
  proxy_payer?: string;         // 대표 결제자 이름 (단일). undefined = 본인
  companion_names?: string[];   // 동반 결제자 이름들 (UI 전용, DB 저장 안함)
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
                  : "bg-gradient-to-r from-[oklch(0.55_0.18_250)] to-[oklch(0.48_0.20_270)]"
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
  const [isActivityViewOpen, setIsActivityViewOpen] = useState(false);
  const [isAllRecordsOpen, setIsAllRecordsOpen] = useState(false);

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

  const { data: membersData } = usePointsMembers(currentMemberId);

  // Mutation hooks
  const addMutation = useAddUsageRecord();
  const updateMutation = useUpdateUsageRecord();
  const deleteMutation = useDeleteUsageRecord();
  const isSaving = addMutation.isPending || updateMutation.isPending;

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
    confirmed: (record.review_status ?? 0) >= 1,
    delay_reason: record.delay_reason || "",
    proxy_payer: record.companions?.[0]
      ? membersData?.find((m) => m.id === record.companions[0])?.full_name || record.companions[0]
      : undefined,
    companion_names: (record.co_payers || []).map(
      (id) => membersData?.find((m) => m.id === id)?.full_name || id
    ),
  });

  const handleEditPoint = (record: UsageRecord) => {
    if ((record.review_status ?? 0) >= 1) return;
    setEditingPoint(toEditablePoint(record));
    setIsNewPoint(false);
    setIsEditDialogOpen(true);
  };

  const handleSavePoint = async () => {
    if (!editingPoint || !currentMemberId) return;
    if (isSaving) return;

    const pointType = editingPoint.type === "welfare" ? "welfare" : "activity";

    // 대표 결제자: 이름 → UUID (본인이면 빈 배열)
    const proxyPayerName = editingPoint.proxy_payer;
    const proxyPayerId = proxyPayerName
      ? membersData?.find((m) => m.full_name === proxyPayerName)?.id
      : undefined;
    const companionIds = proxyPayerId ? [proxyPayerId] : [];

    // 동반 결제자: DB 저장 + 알림
    const coPayerIds = (editingPoint.companion_names || [])
      .map((name) => membersData?.find((m) => m.full_name === name)?.id)
      .filter(Boolean) as string[];

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
        companions: companionIds,
        co_payers: coPayerIds,
        delay_reason: editingPoint.delay_reason || "",
      });
    } else {
      await updateMutation.mutateAsync({
        type: pointType,
        id: editingPoint.id,
        member_id: currentMemberId,
        amount: editingPoint.amount,
        description: editingPoint.vendor,
        used_at: editingPoint.date,
        delay_reason: editingPoint.delay_reason || "",
        companions: companionIds,
        co_payers: coPayerIds,
      });
    }

    // Fire-and-forget: 동반 결제자 푸시 알림
    if (coPayerIds.length > 0 && currentMemberId) {
      const payer = editingPoint.proxy_payer ?? userName ?? "누군가";
      const vendor = editingPoint.vendor || "어딘가";
      fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentMemberId,
          memberIds: coPayerIds,
          title: "복지포인트 동반결제 알림",
          body: `${payer}님이 ${vendor}에서 결제했습니다. 본인 사용분을 입력해주세요.`,
          url: "/points",
          tag: `proxy-payment-${Date.now()}`,
        }),
      }).catch(console.error);
    }

    toast.success(
      isNewPoint ? "내역이 추가되었습니다." : "내역이 수정되었습니다.",
    );
    setEditingPoint(null);
    setIsEditDialogOpen(false);
  };

  const handleDeletePoint = async (point: WelfarePoint) => {
    if (!point.id || !currentMemberId) return;
    if (deleteMutation.isPending) return;

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
      notes: userName || "",
      proxy_payer: undefined,
      companion_names: [],
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
          <div
            className="card-premium relative overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
            onClick={() => setIsActivityViewOpen(true)}
          >
            <div className="relative px-4 pt-4 pb-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-semibold text-gray-900">
                    복지포인트{isManager ? " · 활동비" : ""}
                  </h1>
                  <span onClick={(e) => e.stopPropagation()}>
                    <PointsGuideDialog />
                  </span>
                </div>
                <span className="flex items-center gap-0.5 text-sm text-blue-500/100">
                  팀별 활동비 내역
                  <ChevronRight className="w-4 h-4" />
                </span>
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
          <ActivityViewDialog
            memberId={currentMemberId}
            period={selectedMonth}
            open={isActivityViewOpen}
            onOpenChange={setIsActivityViewOpen}
          />
        </motion.div>
      )}

      {/* Points List */}
      <div>
        <div className="mb-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-md font-semibold text-gray-900">사용 내역</h2>
            <button
              onClick={() => setIsAllRecordsOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50 hover:text-blue-700 active:scale-95 transition-all duration-200 text-xs text-gray-600"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>전체 내역</span>
            </button>
          </div>
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
          {/* Add New Point */}
          <button
            className="w-full py-3 bg-white rounded-xl text-sm font-medium text-blue-600 flex items-center justify-center gap-2 border border-dashed border-blue-200 hover:border-blue-300 hover:bg-blue-50/30 active:bg-blue-50 transition-colors"
            onClick={handleAddNewPoint}
          >
            <Plus className="w-4 h-4" />새 내역 추가
          </button>

          {isLoading ? (
            <div className="bg-white rounded-xl divide-y divide-gray-50">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-4 py-4">
                  <div className="animate-pulse">
                    <div className="flex justify-between mb-2">
                      <div className="bg-gray-100 rounded h-[15px] w-32" />
                      <div className="bg-gray-100 rounded h-[15px] w-16" />
                    </div>
                    <div className="flex justify-between">
                      <div className="bg-gray-50 rounded h-3 w-24" />
                      <div className="bg-gray-50 rounded h-3 w-10" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : sortedRecords.length === 0 ? (
            <div className="bg-white rounded-xl py-12 text-center">
              <Image
                src={NoDataIcon}
                alt="No Data"
                width={40}
                height={40}
                className="mx-auto mb-3 opacity-40"
              />
              <p className="text-sm text-gray-400">
                {welfareError
                  ? "내역을 불러올 수 없습니다."
                  : "이 달에 내역이 없습니다."}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl divide-y divide-gray-100 overflow-hidden">
              {sortedRecords.map((record) => {
                const d = dayjs(record.used_at);
                const dow = ["일", "월", "화", "수", "목", "금", "토"][d.day()];
                const isActivity = record.type === "활동비";

                const reviewStatus = record.review_status ?? 0;
                const isLocked = reviewStatus >= 1;

                const recordContent = (
                  <div
                    className={`px-4 py-3.5 ${
                      reviewStatus === 2
                        ? "opacity-55"
                        : isLocked
                          ? "opacity-75"
                          : "cursor-pointer active:bg-gray-50"
                    } transition-colors`}
                    onClick={() => handleEditPoint(record)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-[15px] font-medium text-gray-900 flex-1 min-w-0 truncate">
                        {record.description}
                      </p>
                      <p className="text-[15px] font-semibold text-gray-900 tabular-nums shrink-0">
                        {record.amount.toLocaleString()}원
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>
                          {d.month() + 1}.{String(d.date()).padStart(2, "0")} (
                          {dow})
                        </span>
                        <span
                          className={`px-1.5 py-px rounded text-[10px] font-medium ${
                            isActivity
                              ? "bg-amber-50 text-amber-500"
                              : "bg-blue-50/60 text-blue-600"
                          }`}
                        >
                          {record.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`flex items-center gap-1 ${
                          reviewStatus >= 1 ? "text-blue-500" : "text-gray-300"
                        }`}>
                          <span className={`inline-block w-[7px] h-[7px] rounded-full border ${
                            reviewStatus >= 1
                              ? "bg-blue-500 border-blue-500"
                              : "bg-transparent border-gray-300"
                          }`} />
                          <span className="text-[10px]">P&C</span>
                        </span>
                        <span className={`flex items-center gap-1 ${
                          reviewStatus >= 2 ? "text-emerald-500" : "text-gray-300"
                        }`}>
                          <span className={`inline-block w-[7px] h-[7px] rounded-full border ${
                            reviewStatus >= 2
                              ? "bg-emerald-500 border-emerald-500"
                              : "bg-transparent border-gray-300"
                          }`} />
                          <span className="text-[10px]">최종</span>
                        </span>
                      </div>
                    </div>
                    {record.companions?.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        카드: {record.companions.map((id: string) => membersData?.find((m) => m.id === id)?.full_name || id).join(", ")}
                      </p>
                    )}
                    {record.co_payers?.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        동반: {record.co_payers.map((id: string) => membersData?.find((m) => m.id === id)?.full_name || id).join(", ")}
                      </p>
                    )}
                  </div>
                );

                return isLocked ? (
                  <Tooltip key={record.id}>
                    <TooltipTrigger asChild>
                      <div>{recordContent}</div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="bg-gray-800 text-gray-100 max-w-60"
                    >
                      {reviewStatus === 2
                        ? "최종확인 완료 항목입니다. 수정하려면 P&C에 문의 바랍니다."
                        : "P&C 확인완료 항목입니다. 수정하려면 P&C에 문의 바랍니다."}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <div key={record.id}>{recordContent}</div>
                );
              })}
            </div>
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
        isDeleting={deleteMutation.isPending}
        isSaving={isSaving}
        isManager={isManager}
      />

      {/* All Usage Records Dialog */}
      <AllUsageRecordsDialog
        open={isAllRecordsOpen}
        onOpenChange={setIsAllRecordsOpen}
        memberId={currentMemberId}
      />

    </React.Fragment>
  );
}
