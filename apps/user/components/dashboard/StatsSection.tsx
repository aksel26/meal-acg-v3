"use client";

import { Button } from "@repo/ui/src/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Input } from "@repo/ui/src/input";
import { NumberTicker } from "@repo/ui/src/number-ticker";
import { toast } from "@repo/ui/src/sonner";
import dayjs from "dayjs";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useCalculationData } from "@/hooks/use-calculation-data";
import { useMemberIdLookup, usePointsWelfare } from "@/hooks/use-points-data";
import { useAddUsageRecord } from "@/hooks/use-points-mutations";
import { useUserStore } from "@/stores/userStore";
import { CalculationData } from "./types";

interface StatsSectionProps {
  userId: string;
  month: number;
  year: number;
  onDataChange?: (data: CalculationData | null) => void;
}

function CalculationResult({
  userId,
  month,
  year,
  onDataChange,
}: StatsSectionProps) {
  const { data, isLoading, error, refetch } = useCalculationData(
    userId,
    month,
    year,
  );

  // 복지포인트 정산 Dialog 상태
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);

  // 복지포인트 관련 hooks (잔액 초과 시에만 조회)
  const isOverBudget = data ? data.balance < 0 : false;
  const { userName, memberId } = useUserStore();
  const { data: memberLookup } = useMemberIdLookup(
    isOverBudget ? userName : null,
  );
  const currentMemberId = memberId || memberLookup?.id || null;
  const period = `${year}-${String(month).padStart(2, "0")}`;
  const { data: welfareData } = usePointsWelfare(
    isOverBudget ? currentMemberId : null,
    period,
  );
  const addMutation = useAddUsageRecord();

  const handleOpenDialog = () => {
    if (data) {
      setPaymentAmount(Math.abs(data.balance));
      setDialogOpen(true);
    }
  };

  const handleConfirmPayment = async () => {
    if (!currentMemberId) {
      toast.error("사용자 정보를 불러올 수 없습니다.");
      return;
    }
    const allocId = welfareData?.summary?.allocation_id;
    if (!allocId) {
      toast.error("복지포인트 할당 정보가 없습니다.");
      return;
    }

    try {
      await addMutation.mutateAsync({
        type: "welfare",
        allocation_id: allocId,
        member_id: currentMemberId,
        amount: paymentAmount,
        description: `${month}월 점심식대 초과분`,
        used_at: dayjs().format("YYYY-MM-DD"),
      });
      toast.success("복지포인트 정산이 완료되었습니다.");
      setDialogOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "알 수 없는 오류";
      toast.error(`정산 실패: ${msg}`);
    }
  };

  useEffect(() => {
    onDataChange?.(data || null);
  }, [data, onDataChange]);

  if (isLoading) {
    return (
      <div className="card-premium p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[oklch(0.92_0.06_200/0.25)] rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="space-y-4 relative">
          <div className="flex justify-between items-center">
            <div className="skeleton h-4 w-16 rounded" />
            <div className="skeleton h-6 w-24 rounded" />
          </div>
          <div className="skeleton h-2 w-full rounded-full" />
          <div className="flex justify-between">
            <div className="skeleton h-4 w-20 rounded" />
            <div className="skeleton h-4 w-20 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-premium p-6 text-center relative overflow-hidden">
        <p className="text-sm text-gray-500 mb-3">{error.message}</p>
        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          className="text-xs rounded-lg px-4"
        >
          다시 시도
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
          <span className="text-sm">불러오는 중...</span>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return Math.abs(amount).toLocaleString();
  };

  // 사용 비율 계산 (0~100)
  const usagePercent =
    data.allowanceAmount > 0
      ? Math.min(100, Math.round((data.totalUsed / data.allowanceAmount) * 100))
      : 0;

  // 잔액 상태 판단
  const isLowBalance =
    data.balance >= 0 && data.balance < data.allowanceAmount * 0.2;

  return (
    <div className="card-premium relative">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[oklch(0.92_0.06_200/0.25)] rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-[oklch(0.90_0.08_250/0.2)] rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

      {/* 메인 잔액 표시 */}
      <div className="relative px-5 pt-5 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">이번 달 잔액</p>
            <div className="flex items-baseline gap-1 relative">
              {isOverBudget && (
                <span className="text-2xl font-bold text-red-500">-</span>
              )}
              <NumberTicker
                value={Math.abs(data.balance)}
                className={`text-2xl font-bold tracking-tight ${
                  isOverBudget
                    ? "text-red-500"
                    : isLowBalance
                      ? "text-amber-600"
                      : "text-gray-900"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  isOverBudget
                    ? "text-red-400"
                    : isLowBalance
                      ? "text-amber-500"
                      : "text-gray-400"
                }`}
              >
                원
              </span>

            
            </div>
          </div>

          {/* 상태 뱃지 */}
          <div
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
              isOverBudget
                ? "bg-red-50 text-red-600"
                : isLowBalance
                  ? "bg-amber-50 text-amber-600"
                  : "bg-emerald-50 text-emerald-600"
            }`}
          >
            {isOverBudget ? "초과" : isLowBalance ? "주의" : "양호"}
          </div>
        </div>

        {/* 사용량 프로그레스 바 */}
        <div className="space-y-2">
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: `${Math.min(usagePercent, 100)}%`, opacity: 1 }}
              transition={{
                width: { duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 },
                opacity: { duration: 0.3 }
              }}
              className={`h-full rounded-full relative ${
                isOverBudget
                  ? "bg-gradient-to-r from-red-400 to-red-500"
                  : isLowBalance
                    ? "bg-gradient-to-r from-amber-400 to-amber-500"
                    : "bg-gradient-to-r from-gray-600 to-gray-800"
              }`}
            >
              {/* 글로우 효과 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
              />
            </motion.div>
          </div>
          <div className="flex justify-between text-[11px] text-gray-400">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {usagePercent}% 사용
            </motion.span>
            <span>{formatCurrency(data.allowanceAmount)}원 중</span>
          </div>
        </div>

          {/* 잔액 초과 시 둥실둥실 떠다니는 복지포인트 풍선 */}
          {isOverBudget && (
                <button
                  type="button"
                  onClick={handleOpenDialog}
                  className="absolute left-42 top-1/2 -translate-y-[25px] ml-2.5 z-10"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: [0, -4, 0, 3, 0],
                    }}
                    transition={{
                      opacity: { duration: 0.3, delay: 0.8 },
                      scale: {
                        type: "spring",
                        stiffness: 500,
                        damping: 15,
                        delay: 0.8,
                      },
                      y: {
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1.2,
                      },
                    }}
                    className="relative whitespace-nowrap"
                  >
                    {/* 말풍선 본체 */}
                    <div className="bg-gradient-to-r from-[oklch(0.55_0.15_270)] to-[oklch(0.55_0.15_300)] text-white rounded-xl px-3 py-1.5 text-[11px] font-semibold shadow-lg shadow-violet-500/25 active:scale-95 transition-transform">
                      복지포인트로 지불하기
                    </div>
                    {/* 왼쪽 삼각형 포인터 */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -left-[4px]"
                      style={{
                        width: 0,
                        height: 0,
                        borderTop: "5px solid transparent",
                        borderBottom: "5px solid transparent",
                        borderRight: "6px solid oklch(0.55 0.15 270)",
                      }}
                    />
                  </motion.div>
                </button>
              )}

      {/* 복지포인트 정산 확인 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>복지포인트로 정산하시겠습니까?</DialogTitle>
            <DialogDescription>{month}월 점심식대 초과분</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              정산금액
            </label>
            <Input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
            />
          </div>

          <p className="text-sm text-gray-500">
            {month}월 점심식대 초과분을 복지포인트에서 차감합니다.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={addMutation.isPending}
            >
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>

      {/* 상세 내역 */}
      <div className="relative grid grid-cols-2 border-t border-white/40">
        <div className="px-5 py-4 border-r border-white/40">
          <p className="text-[11px] text-gray-400 mb-1">사용가능액</p>
          <p className="text-base font-semibold text-gray-700">
            {formatCurrency(data.allowanceAmount)}
            <span className="text-xs font-normal text-gray-400 ml-0.5">원</span>
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[11px] text-gray-400 mb-1">사용금액</p>
          <p className="text-base font-semibold text-gray-700">
            {formatCurrency(data.totalUsed)}
            <span className="text-xs font-normal text-gray-400 ml-0.5">원</span>
          </p>
        </div>
      </div>

      {/* 차감 정보 (있을 경우) */}
      {(data.totalDeduction ?? 0) > 0 && (
        <div className="relative px-5 py-3 bg-white/30 border-t border-white/40 space-y-1.5">
          {/* 개별식사 차감 */}
          {(data.individualMealCount ?? 0) > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">
                개별식사 {data.individualMealCount}회
              </span>
              <span className="font-medium text-gray-600">
                -{formatCurrency(data.individualMealDeduction || 0)}원
              </span>
            </div>
          )}
          {/* 연차/재택/휴무 차감 */}
          {(data.noMealFullDayCount ?? 0) > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">
                연차/재택/휴무 {data.noMealFullDayCount}일
              </span>
              <span className="font-medium text-gray-600">
                -{formatCurrency(data.noMealDeduction || 0)}원
              </span>
            </div>
          )}
          {/* 반차 차감 */}
          {(data.halfDayOffCount ?? 0) > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">
                반차 {data.halfDayOffCount}일
              </span>
              <span className="font-medium text-gray-600">
                -{formatCurrency(data.halfDayDeduction || 0)}원
              </span>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default function StatsSection({
  userId,
  month,
  year,
  onDataChange,
}: StatsSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mb-6"
    >
      <CalculationResult
        userId={userId}
        month={month}
        year={year}
        onDataChange={onDataChange}
      />
    </motion.div>
  );
}
