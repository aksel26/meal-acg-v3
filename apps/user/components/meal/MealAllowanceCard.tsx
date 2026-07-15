"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { motion } from "motion/react";
import { Copy } from "@repo/ui/icons";
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
import { useCalculationData } from "@/hooks/use-calculation-data";
import { useMemberIdLookup, usePointsWelfare } from "@/hooks/use-points-data";
import { useAddUsageRecord } from "@/hooks/use-points-mutations";
import { useUserStore } from "@/stores/userStore";
import { CalculationData } from "@/components/dashboard/types";
import { SectionLabel } from "./SectionLabel";

const ACCOUNT_INFO = "국민 005701-04-142344 ㈜에이시지알";

interface MealAllowanceCardProps {
  userId: string;
  month: number;
  year: number;
  onDataChange?: (data: CalculationData | null) => void;
}

const formatCurrency = (amount: number) => Math.abs(amount).toLocaleString();

const copyAccount = () => {
  navigator.clipboard
    .writeText(ACCOUNT_INFO)
    .then(() => toast.success("계좌 정보가 복사되었습니다."))
    .catch(() => toast.error("복사에 실패했습니다."));
};

/** 조정 내역 한 줄 마커 (캘린더 마커와 시각적으로 통일) */
function AdjustmentMarker({ kind }: { kind: "individual" | "off" | "half" | "weekend" }) {
  if (kind === "off")
    return (
      <span className="text-[9px] font-semibold leading-none text-emerald-600">휴</span>
    );
  if (kind === "individual")
    return <span className="h-[7px] w-[7px] rounded-full border-[1.5px] border-blue-500" />;
  if (kind === "half") return <span className="h-[7px] w-[7px] rounded-full bg-amber-400" />;
  return <span className="h-[7px] w-[7px] rounded-full bg-emerald-500" />;
}

function AdjustmentRow({
  kind,
  label,
  amount,
  positive = false,
}: {
  kind: "individual" | "off" | "half" | "weekend";
  label: string;
  amount: number;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <AdjustmentMarker kind={kind} />
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <span
        className={`text-sm font-medium ${positive ? "text-blue-600" : "text-slate-500"}`}
      >
        {positive ? "+" : "-"}
        {formatCurrency(amount)}원
      </span>
    </div>
  );
}

export default function MealAllowanceCard({
  userId,
  month,
  year,
  onDataChange,
}: MealAllowanceCardProps) {
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

  useEffect(() => {
    onDataChange?.(data || null);
  }, [data, onDataChange]);

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

  // ── 로딩 / 에러 ──
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-5">
        <div className="space-y-4">
          <div className="flex justify-between">
            <div className="skeleton h-4 w-28 rounded" />
            <div className="skeleton h-6 w-20 rounded" />
          </div>
          <div className="skeleton h-9 w-40 rounded" />
          <div className="skeleton h-2.5 w-full rounded-full" />
          <div className="flex justify-between">
            <div className="skeleton h-10 w-24 rounded" />
            <div className="skeleton h-10 w-24 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center">
        <p className="mb-3 text-sm text-slate-500">{error.message}</p>
        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          className="rounded-lg px-4 text-xs"
        >
          다시 시도
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-100 bg-white py-12">
        <div className="flex items-center gap-2 text-slate-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-gray-500" />
          <span className="text-sm">불러오는 중...</span>
        </div>
      </div>
    );
  }

  const grossAllowance = data.originalAllowance ?? data.allowanceAmount;
  const usagePercent =
    grossAllowance > 0
      ? Math.min(100, Math.round((data.totalUsed / grossAllowance) * 100))
      : 0;
  const isLowBalance =
    data.balance >= 0 && data.balance < grossAllowance * 0.2;

  const balanceColor = isOverBudget
    ? "text-red-500"
    : isLowBalance
      ? "text-amber-600"
      : "text-slate-900";

  const hasAdjustments =
    (data.weekendWorkCount ?? 0) > 0 ||
    (data.individualMealCount ?? 0) > 0 ||
    (data.noMealFullDayCount ?? 0) > 0 ||
    (data.halfDayOffCount ?? 0) > 0;

  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white">
      {/* ── 잔액 + 프로그레스 ── */}
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <SectionLabel>Meal Allowance</SectionLabel>
          <button
            type="button"
            onClick={copyAccount}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <Copy className="h-3 w-3" />
            계좌번호 복사
          </button>
        </div>

        <p className="mb-1 text-xs text-slate-400">{month}월 식대 잔액</p>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            {isOverBudget && (
              <span className={`text-3xl font-bold ${balanceColor}`}>-</span>
            )}
            <NumberTicker
              value={Math.abs(data.balance)}
              className={`text-3xl font-bold tracking-tight ${balanceColor}`}
            />
            <span className="text-sm font-medium text-slate-400">원</span>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
              isOverBudget
                ? "bg-red-50 text-red-600"
                : isLowBalance
                  ? "bg-amber-50 text-amber-600"
                  : "bg-emerald-50 text-emerald-600"
            }`}
          >
            {isOverBudget ? "초과" : isLowBalance ? "주의" : "양호"}
          </span>
        </div>

        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${usagePercent}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className={`h-full rounded-full ${
              isOverBudget
                ? "bg-red-500"
                : isLowBalance
                  ? "bg-amber-500"
                  : "bg-slate-900"
            }`}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-slate-400">
          <span>{usagePercent}% 사용</span>
          <span>{formatCurrency(grossAllowance)}원 중</span>
        </div>
      </div>

      {/* ── 지급 총액 / 사용금액 ── */}
      <div className="grid grid-cols-2">
        <div className="border-r border-slate-100 px-5 py-4">
          <p className="mb-1 text-[11px] text-slate-400">지급 총액</p>
          <p className="text-base font-semibold text-slate-800">
            {formatCurrency(grossAllowance)}
            <span className="ml-0.5 text-xs font-normal text-slate-400">원</span>
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="mb-1 text-[11px] text-slate-400">사용금액</p>
          <p className="text-base font-semibold text-slate-800">
            {formatCurrency(data.totalUsed)}
            <span className="ml-0.5 text-xs font-normal text-slate-400">원</span>
          </p>
        </div>
      </div>

      {/* ── 복지포인트 정산 버튼 (초과 시) ── */}
      {isOverBudget && (
        <div className="p-5">
          <button
            type="button"
            onClick={handleOpenDialog}
            className="w-full cursor-pointer rounded-full bg-slate-900 py-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 active:scale-[0.99]"
          >
            복지포인트로 초과분 정산하기
          </button>
        </div>
      )}

      {/* ── 조정 내역 ── */}
      <div className="p-5">
        <SectionLabel className="mb-4">Adjustments</SectionLabel>
        {hasAdjustments ? (
          <div className="space-y-3">
            {(data.weekendWorkCount ?? 0) > 0 && (
              <AdjustmentRow
                kind="weekend"
                label={`주말근무 ${data.weekendWorkCount}일`}
                amount={data.weekendWorkAddition || 0}
                positive
              />
            )}
            {(data.individualMealCount ?? 0) > 0 && (
              <AdjustmentRow
                kind="individual"
                label={`개별식사 ${data.individualMealCount}회`}
                amount={data.individualMealDeduction || 0}
              />
            )}
            {(data.noMealFullDayCount ?? 0) > 0 && (
              <AdjustmentRow
                kind="off"
                label={`연차/재택/휴무 ${data.noMealFullDayCount}일`}
                amount={data.noMealDeduction || 0}
              />
            )}
            {(data.halfDayOffCount ?? 0) > 0 && (
              <AdjustmentRow
                kind="half"
                label={`반차 ${data.halfDayOffCount}일`}
                amount={data.halfDayDeduction || 0}
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">조정 내역이 없습니다.</p>
        )}
      </div>

      {/* ── 최근 식대 입력 (빈 UI) ── */}
      <div className="p-5">
        <p className="mb-3 text-xs font-medium text-slate-400">최근 식대 입력</p>
        <div className="flex flex-col items-center justify-center gap-1 rounded-xl bg-slate-50/60 py-8 text-center">
          <p className="text-sm text-slate-400">최근 입력 내역이 없습니다.</p>
          <p className="text-[11px] text-slate-300">
            식대를 입력하면 여기에 표시됩니다.
          </p>
        </div>
      </div>

      {/* ── 복지포인트 정산 Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>복지포인트로 정산하시겠습니까?</DialogTitle>
            <DialogDescription>{month}월 점심식대 초과분</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">정산금액</label>
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
              <div className="space-y-1.5 rounded-xl border border-amber-100 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-700">
                  잔금 입금 안내
                </p>
                <p className="text-[11px] text-amber-600">
                  정산금액({totalOverage.toLocaleString()}원) 중 나머지{" "}
                  <span className="font-bold">
                    {depositAmount.toLocaleString()}원
                  </span>
                  을 아래 계좌로 입금해주세요.
                </p>
                <button
                  type="button"
                  onClick={copyAccount}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-1.5 text-[11px] font-medium text-amber-800 transition-colors active:bg-amber-200"
                >
                  <span>{ACCOUNT_INFO}</span>
                  <Copy className="h-3 w-3 shrink-0" />
                </button>
              </div>
            );
          })()}

          <p className="text-sm text-slate-500">
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
