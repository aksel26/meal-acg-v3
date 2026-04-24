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
import { Copy } from "@repo/ui/icons";
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);

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

  const copyAccount = () => {
    navigator.clipboard
      .writeText("국민 005701-04-142344 ㈜에이시지알")
      .then(() => toast.success("계좌 정보가 복사되었습니다."))
      .catch(() => toast.error("복사에 실패했습니다."));
  };

  if (isLoading) {
    return (
      <div className="card-premium overflow-hidden p-6">
        <div className="space-y-4">
          <div className="skeleton h-4 w-24 rounded-full" />
          <div className="skeleton h-12 w-48 rounded-full" />
          <div className="skeleton h-3 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-3">
            <div className="skeleton h-20 rounded-[18px]" />
            <div className="skeleton h-20 rounded-[18px]" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-premium overflow-hidden p-6 text-center">
        <p className="text-sm text-[var(--granite)]">{error.message}</p>
        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          className="btn-secondary mt-4 px-4 py-2 text-xs"
        >
          다시 시도
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-2 text-[var(--slate-gray)]">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--whisper-cream)] border-t-[var(--signal-orange)]" />
          <span className="text-sm">불러오는 중...</span>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => Math.abs(amount).toLocaleString();
  const usagePercent =
    data.allowanceAmount > 0
      ? Math.min(100, Math.round((data.totalUsed / data.allowanceAmount) * 100))
      : 0;
  const isLowBalance =
    data.balance >= 0 && data.balance < data.allowanceAmount * 0.2;
  const statusLabel = isOverBudget ? "초과" : isLowBalance ? "주의" : "양호";
  const statusTone = isOverBudget
    ? "bg-[rgba(207,69,0,0.12)] text-[var(--clay-brown)]"
    : isLowBalance
      ? "bg-[rgba(243,115,56,0.14)] text-[var(--clay-brown)]"
      : "bg-[var(--whisper-cream)] text-[var(--ink-black)]";
  const progressTone = isOverBudget
    ? "bg-[var(--signal-orange)]"
    : isLowBalance
      ? "bg-[var(--light-signal-orange)]"
      : "bg-[var(--ink-black)]";

  return (
    <div className="card-premium relative overflow-hidden">
      <div className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-[var(--whisper-cream)]" />
      <div className="orbit-line -left-12 top-20 h-56 w-56 opacity-65" />

      <div className="relative px-6 pt-6 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="eyebrow-label">Monthly Balance</p>
              <p className="text-sm text-[var(--granite)]">{month}월 잔액</p>
              <div className="flex items-end gap-1">
                {isOverBudget && (
                  <span className="text-3xl font-medium text-[var(--signal-orange)]">-</span>
                )}
                <NumberTicker
                  value={Math.abs(data.balance)}
                  className={`text-[2.5rem] font-medium tracking-[-0.03em] ${
                    isOverBudget
                      ? "text-[var(--signal-orange)]"
                      : isLowBalance
                        ? "text-[var(--clay-brown)]"
                        : "text-[var(--ink-black)]"
                  }`}
                />
                <span className="pb-1 text-sm font-medium text-[var(--slate-gray)]">
                  원
                </span>
              </div>
            </div>

            <div className={`inline-flex rounded-[16px] px-3 py-1.5 text-xs font-medium ${statusTone}`}>
              {statusLabel}
            </div>
          </div>

          <div className="relative mt-1 hidden h-28 w-28 shrink-0 sm:block">
            <div className="absolute inset-0 rounded-full bg-white/70" />
            <div className="absolute inset-[10px] rounded-full border border-[rgba(243,115,56,0.34)]" />
            <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-[var(--ink-black)]">
              {usagePercent}%
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[var(--ink-black)] shadow-[var(--shadow-sm)]">
              ↗
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="h-3 overflow-hidden rounded-full bg-white/75">
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: `${Math.min(usagePercent, 100)}%`, opacity: 1 }}
              transition={{
                width: { duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 },
                opacity: { duration: 0.3 },
              }}
              className={`h-full rounded-full ${progressTone}`}
            />
          </div>
          <div className="flex justify-between text-xs text-[var(--slate-gray)]">
            <span>{usagePercent}% 사용</span>
            <span>{formatCurrency(data.allowanceAmount)}원 중</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[16px] bg-white/72 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--slate-gray)]">
              사용가능액
            </p>
            <p className="mt-2 text-base font-medium text-[var(--ink-black)]">
              {formatCurrency(data.allowanceAmount)}
              <span className="ml-1 text-xs font-normal text-[var(--slate-gray)]">원</span>
            </p>
          </div>
          <div className="rounded-[16px] bg-white/72 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--slate-gray)]">
              사용금액
            </p>
            <p className="mt-2 text-base font-medium text-[var(--ink-black)]">
              {formatCurrency(data.totalUsed)}
              <span className="ml-1 text-xs font-normal text-[var(--slate-gray)]">원</span>
            </p>
          </div>
        </div>

        {isOverBudget && (
          <button
            type="button"
            onClick={handleOpenDialog}
            className="btn-secondary mt-4 w-full py-2 text-sm"
          >
            복지포인트로 초과분 정산하기
          </button>
        )}
      </div>

      {((data.totalDeduction ?? 0) > 0 || (data.weekendWorkCount ?? 0) > 0) && (
        <div className="relative border-t border-[rgba(20,20,19,0.08)] bg-white/50 px-6 py-4">
          <p className="eyebrow-label text-[11px]">Adjustments</p>
          <div className="mt-3 space-y-2">
            {(data.weekendWorkCount ?? 0) > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--granite)]">주말근무 {data.weekendWorkCount}일</span>
                <span className="font-medium text-[var(--link-blue)]">
                  +{formatCurrency(data.weekendWorkAddition || 0)}원
                </span>
              </div>
            )}
            {(data.individualMealCount ?? 0) > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--granite)]">개별식사 {data.individualMealCount}회</span>
                <span className="font-medium text-[var(--granite)]">
                  -{formatCurrency(data.individualMealDeduction || 0)}원
                </span>
              </div>
            )}
            {(data.noMealFullDayCount ?? 0) > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--granite)]">연차/재택/휴무 {data.noMealFullDayCount}일</span>
                <span className="font-medium text-[var(--granite)]">
                  -{formatCurrency(data.noMealDeduction || 0)}원
                </span>
              </div>
            )}
            {(data.halfDayOffCount ?? 0) > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--granite)]">반차 {data.halfDayOffCount}일</span>
                <span className="font-medium text-[var(--granite)]">
                  -{formatCurrency(data.halfDayDeduction || 0)}원
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="relative border-t border-[rgba(20,20,19,0.08)] px-6 py-4">
        <button
          type="button"
          onClick={copyAccount}
          className="flex w-full items-center justify-between rounded-[16px] bg-white/70 px-4 py-3 text-xs transition-opacity active:opacity-70"
        >
          <div className="flex items-center gap-2">
            <span className="text-[var(--slate-gray)]">입금계좌</span>
            <span className="font-medium text-[var(--granite)]">국민 005701-04-142344 ㈜에이시지알</span>
          </div>
          <Copy className="h-3.5 w-3.5 text-[var(--slate-gray)]" />
        </button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>복지포인트로 정산하시겠습니까?</DialogTitle>
            <DialogDescription>{month}월 점심식대 초과분</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label className="text-sm font-medium text-[var(--granite)]">
              정산금액
            </label>
            <Input
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
            />
          </div>

          {(() => {
            const totalOverage = Math.abs(data?.balance ?? 0);
            const depositAmount = totalOverage - paymentAmount;
            if (depositAmount <= 0) return null;
            return (
              <div className="space-y-1.5 rounded-[16px] border border-[rgba(243,115,56,0.16)] bg-[rgba(243,115,56,0.08)] p-4">
                <p className="text-xs font-semibold text-[var(--clay-brown)]">
                  잔금 입금 안내
                </p>
                <p className="text-[11px] text-[var(--clay-brown)]">
                  정산금액({totalOverage.toLocaleString()}원) 중 나머지{" "}
                  <span className="font-bold">
                    {depositAmount.toLocaleString()}원
                  </span>
                  을 아래 계좌로 입금해주세요.
                </p>
                <button
                  type="button"
                  onClick={copyAccount}
                  className="flex items-center gap-1.5 rounded-[14px] bg-white px-3 py-2 text-[11px] font-medium text-[var(--clay-brown)]"
                >
                  <span>국민 005701-04-142344 ㈜에이시지알</span>
                  <Copy className="h-3 w-3 shrink-0" />
                </button>
              </div>
            );
          })()}

          <p className="text-sm text-[var(--slate-gray)]">
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
      transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
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
