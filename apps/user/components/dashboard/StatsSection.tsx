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
import Image from "next/image";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useCalculationData } from "@/hooks/use-calculation-data";
import { useMemberIdLookup, usePointsWelfare } from "@/hooks/use-points-data";
import { useAddUsageRecord } from "@/hooks/use-points-mutations";
import {
  RecentMealActivity,
  useRecentMealActivity,
} from "@/hooks/use-recent-meal-activity";
import { useUserStore } from "@/stores/userStore";
import { CalculationData } from "./types";

interface StatsSectionProps {
  userId: string;
  month: number;
  year: number;
  onDataChange?: (data: CalculationData | null) => void;
}

function AdjustmentMarker({
  type,
}: {
  type: "individual" | "holiday" | "halfDay";
}) {
  if (type === "individual") {
    return (
      <span
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center"
        aria-hidden="true"
      >
        <span className="h-3 w-3 rounded-full border border-[var(--signal-orange)] bg-transparent" />
      </span>
    );
  }

  const icon =
    type === "halfDay"
      ? { src: "/icons/clock.png", alt: "반차" }
      : { src: "/icons/holiday.png", alt: "휴가" };

  return (
    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
      <Image
        src={icon.src}
        alt={icon.alt}
        width={18}
        height={18}
        className="h-[18px] w-[18px]"
      />
    </span>
  );
}

function RecentMealTicker({ excludeUserId }: { excludeUserId: string }) {
  const { data = [], isLoading } = useRecentMealActivity(excludeUserId);
  const tickerItems = data.length > 0 ? [...data, ...data] : [];

  const formatActivityDate = (date: string) => dayjs(date).format("M.D");
  const getActivityMeals = (activity: RecentMealActivity) => {
    if (activity.mealDetails?.length) {
      return activity.mealDetails;
    }

    const mealLabel = activity.mealTypes.join("/");
    return [{ type: mealLabel, store: activity.store }];
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--slate-gray)]">
          최근 식대 입력
        </p>
        <span className="text-[10px] text-[var(--slate-gray)]">LIVE</span>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden px-1 py-2 [mask-image:linear-gradient(to_bottom,transparent_0,black_1.1rem,black_calc(100%-2rem),transparent_100%)]">
        {isLoading ? (
          <div className="space-y-2">
            <div className="skeleton h-5 rounded-full" />
            <div className="skeleton h-5 rounded-full" />
          </div>
        ) : data.length > 0 ? (
          <motion.div
            className="space-y-2"
            animate={data.length > 1 ? { y: ["0%", "-50%"] } : undefined}
            transition={
              data.length > 1
                ? {
                    duration: Math.max(5.6, data.length * 1.35),
                    repeat: Infinity,
                    ease: "linear",
                  }
                : undefined
            }
          >
            {tickerItems.map((activity, index) => (
              <div
                key={`${activity.id}-${index}`}
                className="flex h-6 items-center justify-between gap-3 text-sm lg:text-xs"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="max-w-[4.5rem] truncate text-[var(--ink-black)]">
                    {activity.userName}
                  </span>
                  <span className="min-w-0 truncate text-[var(--granite)]">
                    {getActivityMeals(activity).map((meal, mealIndex) => (
                      <span key={`${activity.id}-${meal.type}-${mealIndex}`}>
                        {mealIndex > 0 && (
                          <span className="px-1 text-[rgba(92,96,100,0.42)]">
                            /
                          </span>
                        )}
                        <span className="text-[rgba(92,96,100,0.42)]">
                          {meal.type}
                        </span>
                        {meal.store && (
                          <span className="text-[var(--granite)]">
                            {" "}
                            {meal.store}
                          </span>
                        )}
                      </span>
                    ))}
                  </span>
                </div>
                <span className="shrink-0 text-xs text-[var(--slate-gray)] lg:text-[11px]">
                  {formatActivityDate(activity.date)}
                </span>
              </div>
            ))}
          </motion.div>
        ) : (
          <div className="flex h-full items-center text-xs text-[var(--slate-gray)]">
            다른 사람의 최근 입력 내역이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
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
            <div className="skeleton h-24 rounded-[20px]" />
            <div className="skeleton h-24 rounded-[20px]" />
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
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--whisper-cream)] border-t-[var(--ink-black)]" />
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
    ? "bg-[rgba(226,59,74,0.12)] text-[var(--danger)]"
    : isLowBalance
      ? "bg-[rgba(236,126,0,0.12)] text-[var(--warning)]"
      : "bg-[var(--whisper-cream)] text-[var(--ink-black)]";
  const progressTone = isOverBudget
    ? "bg-[var(--danger)]"
    : isLowBalance
      ? "bg-[var(--warning)]"
      : "bg-[var(--ink-black)]";

  return (
    <div className="card-premium overflow-hidden lg:flex lg:h-full lg:min-h-0 lg:flex-col">
      <div className="bg-white px-5 py-5 text-[var(--ink-black)] lg:px-4 lg:py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="eyebrow-label text-[var(--slate-gray)]">
                Meal Allowance
              </p>
              <p className="text-xs text-[var(--granite)] lg:text-[11px]">
                {month}월 식대 잔액
              </p>
              <div className="flex items-end gap-1">
                {isOverBudget && (
                  <span className="text-2xl font-medium text-[var(--danger)] lg:text-xl">
                    -
                  </span>
                )}
                <NumberTicker
                  value={Math.abs(data.balance)}
                  className={`font-display text-[2.35rem] font-medium lg:text-[1.75rem] ${
                    isOverBudget
                      ? "text-[var(--danger)]"
                      : isLowBalance
                        ? "text-[var(--warning)]"
                        : "text-[var(--ink-black)]"
                  }`}
                />
                <span
                  className={`pb-1 text-xs font-medium lg:text-[11px] ${
                    isOverBudget
                      ? "text-[var(--danger)]"
                      : "text-[var(--slate-gray)]"
                  }`}
                >
                  원
                </span>
              </div>
            </div>

            <div
              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${statusTone}`}
            >
              {statusLabel}
            </div>
          </div>

          <div className="hidden rounded-[22px] bg-[var(--whisper-cream)] px-4 py-4 text-right sm:block lg:px-3 lg:py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--slate-gray)]">
              Usage
            </p>
            <p className="mt-2 font-display text-[1.65rem] text-[var(--ink-black)] lg:text-[1.25rem]">
              {usagePercent}%
            </p>
            <p className="mt-1 text-[11px] text-[var(--granite)]">
              이번 달 사용률
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          <div className="h-3 overflow-hidden rounded-full bg-[var(--whisper-cream)]">
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
          <div className="flex justify-between text-[11px] text-[var(--granite)]">
            <span>{usagePercent}% 사용</span>
            <span>{formatCurrency(data.allowanceAmount)}원 중</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 border-t border-[rgba(25,28,31,0.08)] px-5 py-4 lg:px-4 lg:py-3">
        <div className="px-1 py-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--slate-gray)]">
            지급 총액
          </p>
          <p className="mt-2 whitespace-nowrap font-display text-[1.35rem] text-[var(--ink-black)] sm:text-[1.6rem] lg:text-[1.35rem]">
            {formatCurrency(data.allowanceAmount)}
            <span className="ml-1 text-sm text-[var(--slate-gray)] lg:text-xs">
              원
            </span>
          </p>
        </div>
        <div className="px-1 py-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--slate-gray)]">
            사용금액
          </p>
          <p className="mt-2 whitespace-nowrap font-display text-[1.35rem] text-[var(--ink-black)] sm:text-[1.6rem] lg:text-[1.35rem]">
            {formatCurrency(data.totalUsed)}
            <span className="ml-1 text-sm text-[var(--slate-gray)] lg:text-xs">
              원
            </span>
          </p>
        </div>
      </div>

      {isOverBudget && (
        <div className="border-t border-[rgba(25,28,31,0.08)] px-6 py-5 lg:px-5 lg:py-3">
          <button
            type="button"
            onClick={handleOpenDialog}
            className="btn-primary w-full py-2.5 text-xs"
          >
            복지포인트로 초과분 정산하기
          </button>
        </div>
      )}

      {((data.totalDeduction ?? 0) > 0 || (data.weekendWorkCount ?? 0) > 0) && (
        <div className="border-t border-[rgba(25,28,31,0.08)] px-6 py-5 lg:px-5 lg:py-3">
          <p className="eyebrow-label text-[11px]">Adjustments</p>
          <div className="mt-4 space-y-3">
            {(data.weekendWorkCount ?? 0) > 0 && (
              <div className="flex items-center justify-between text-sm lg:text-sm">
                <span className="text-[var(--granite)]">
                  주말근무 {data.weekendWorkCount}일
                </span>
                <span className="font-medium text-[var(--ink-black)]">
                  +{formatCurrency(data.weekendWorkAddition || 0)}원
                </span>
              </div>
            )}
            {(data.individualMealCount ?? 0) > 0 && (
              <div className="flex items-center justify-between text-sm lg:text-sm">
                <span className="flex items-center gap-2 text-[var(--granite)]">
                  <AdjustmentMarker type="individual" />
                  <span>개별식사 {data.individualMealCount}회</span>
                </span>
                <span className="font-medium text-[var(--granite)]">
                  -{formatCurrency(data.individualMealDeduction || 0)}원
                </span>
              </div>
            )}
            {(data.noMealFullDayCount ?? 0) > 0 && (
              <div className="flex items-center justify-between text-sm lg:text-sm">
                <span className="flex items-center gap-2 text-[var(--granite)]">
                  <AdjustmentMarker type="holiday" />
                  <span>연차/재택/휴무 {data.noMealFullDayCount}일</span>
                </span>
                <span className="font-medium text-[var(--granite)]">
                  -{formatCurrency(data.noMealDeduction || 0)}원
                </span>
              </div>
            )}
            {(data.halfDayOffCount ?? 0) > 0 && (
              <div className="flex items-center justify-between text-sm lg:text-sm">
                <span className="flex items-center gap-2 text-[var(--granite)]">
                  <AdjustmentMarker type="halfDay" />
                  <span>반차 {data.halfDayOffCount}일</span>
                </span>
                <span className="font-medium text-[var(--granite)]">
                  -{formatCurrency(data.halfDayDeduction || 0)}원
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-[rgba(25,28,31,0.08)] px-6 py-5 lg:px-5 lg:py-3">
        <button
          type="button"
          onClick={copyAccount}
          className="flex w-full items-center justify-between text-left transition-opacity active:opacity-80"
        >
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--slate-gray)]">
              입금계좌
            </p>
            <p className="mt-2 text-sm font-medium text-[var(--ink-black)] lg:text-sm">
              국민 005701-04-142344 ㈜에이시지알
            </p>
          </div>
          <Copy className="h-4 w-4 text-[var(--slate-gray)]" />
        </button>
      </div>

      <div className="h-[200px] border-t border-[rgba(25,28,31,0.08)] px-6 pb-7 pt-4 lg:min-h-0 lg:flex-1 lg:px-5 lg:pb-6 lg:pt-3">
        <RecentMealTicker excludeUserId={userId} />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-[24px] border border-[rgba(25,28,31,0.1)] bg-white p-6">
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
              className="input-premium"
            />
          </div>

          {(() => {
            const totalOverage = Math.abs(data?.balance ?? 0);
            const depositAmount = totalOverage - paymentAmount;
            if (depositAmount <= 0) return null;
            return (
              <div className="space-y-2 rounded-[20px] border border-[rgba(236,126,0,0.16)] bg-[rgba(236,126,0,0.08)] p-4">
                <p className="text-xs font-semibold text-[var(--warning)]">
                  잔금 입금 안내
                </p>
                <p className="text-[11px] text-[var(--warning)]">
                  남은{" "}
                  <span className="font-bold">
                    {depositAmount.toLocaleString()}원
                  </span>
                  은 아래 계좌로 입금해주세요.
                </p>
                <button
                  type="button"
                  onClick={copyAccount}
                  className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[11px] font-medium text-[var(--warning)]"
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
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="btn-secondary"
            >
              취소
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={addMutation.isPending}
              className="btn-primary"
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
