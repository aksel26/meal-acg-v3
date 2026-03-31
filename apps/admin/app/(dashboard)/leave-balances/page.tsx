"use client";

import { useState, useMemo } from "react";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/src/alert-dialog";
import { ChevronLeft, ChevronRight, Settings2 } from "lucide-react";
import {
  useLeaveBalances,
  useGenerateLeave,
  useAdjustLeaveBalance,
  type LeaveBalance,
} from "@/hooks/useLeaveBalances";

const TYPE_LABEL: Record<string, string> = {
  monthly: "월차",
  annual: "연차",
  summer: "하계휴가",
};

interface AdjustTarget {
  id: string;
  memberName: string;
  type: string;
}

export default function LeaveBalancesPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<AdjustTarget | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const { data: balances, isLoading } = useLeaveBalances(year);
  const generateMutation = useGenerateLeave();
  const adjustMutation = useAdjustLeaveBalance();

  // Group by member_id, preserving order of first appearance
  const grouped = useMemo(() => {
    if (!balances) return [];
    const map = new Map<string, LeaveBalance[]>();
    const order: string[] = [];
    for (const b of balances) {
      if (!map.has(b.member_id)) {
        map.set(b.member_id, []);
        order.push(b.member_id);
      }
      map.get(b.member_id)!.push(b);
    }
    return order.map((id) => map.get(id)!);
  }, [balances]);

  const handleGenerate = () => {
    generateMutation.mutate(year, {
      onSuccess: () => setGenerateOpen(false),
    });
  };

  const handleOpenAdjust = (balance: LeaveBalance) => {
    setAdjustTarget({
      id: balance.id,
      memberName: balance.member.full_name,
      type: TYPE_LABEL[balance.type] ?? balance.type,
    });
    setAdjustAmount("");
    setAdjustReason("");
  };

  const handleAdjust = () => {
    if (!adjustTarget || !adjustReason.trim()) return;
    adjustMutation.mutate(
      {
        id: adjustTarget.id,
        adjustment: Number(adjustAmount),
        reason: adjustReason,
      },
      {
        onSuccess: () => setAdjustTarget(null),
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">연차 현황</h1>
          <div className="flex items-center gap-1">
            <button
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border bg-white hover:bg-slate-50 transition-colors"
              onClick={() => setYear((y) => y - 1)}
            >
              <ChevronLeft className="h-4 w-4 text-slate-600" />
            </button>
            <span className="min-w-[60px] text-center text-sm font-medium text-slate-700">
              {year}년
            </span>
            <button
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border bg-white hover:bg-slate-50 transition-colors"
              onClick={() => setYear((y) => y + 1)}
            >
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </button>
          </div>
        </div>
        <Button variant="outline" onClick={() => setGenerateOpen(true)}>
          <Settings2 className="mr-2 h-4 w-4" />
          연차 일괄 부여
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">이름</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">직급</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">입사일</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">유형</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">부여</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">사용</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">조정</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">잔여</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">관리</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-sm text-slate-400">
                  로딩 중...
                </td>
              </tr>
            ) : grouped.length > 0 ? (
              grouped.map((rows, groupIdx) => {
                const first = rows[0]!;
                return rows.map((balance, rowIdx) => {
                  const remaining = balance.granted + balance.adjusted - balance.used;
                  const isFirstRow = rowIdx === 0;
                  const isFirstGroup = groupIdx === 0;
                  const rowClass = isFirstRow && !isFirstGroup ? "border-t border-slate-200" : "";

                  return (
                    <tr key={balance.id} className={`${rowClass} hover:bg-slate-50 transition-colors`}>
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {isFirstRow ? first.member.full_name : ""}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {isFirstRow ? (first.member.position?.name ?? "-") : ""}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {isFirstRow ? (first.member.hire_date ?? "-") : ""}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {TYPE_LABEL[balance.type] ?? balance.type}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{balance.granted}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{balance.used}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{balance.adjusted}</td>
                      <td
                        className={`px-4 py-2.5 text-right font-semibold ${
                          remaining > 0
                            ? "text-slate-900"
                            : remaining === 0
                              ? "text-slate-400"
                              : "text-rose-600"
                        }`}
                      >
                        {remaining}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          className="inline-flex items-center justify-center h-7 w-7 rounded hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
                          onClick={() => handleOpenAdjust(balance)}
                          title="조정"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                });
              })
            ) : (
              <tr>
                <td colSpan={9} className="py-12 text-center text-sm text-slate-400">
                  해당 연도의 연차 데이터가 없습니다. &apos;연차 일괄 부여&apos; 버튼으로 부여해주세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Generate AlertDialog */}
      <AlertDialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>연차 일괄 부여</AlertDialogTitle>
            <AlertDialogDescription>
              {year}년 연차를 일괄 부여하시겠습니까? 직급 기반으로 연차/월차/하계휴가가 자동 계산됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? "처리 중..." : "확인"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Adjust Dialog */}
      <Dialog open={!!adjustTarget} onOpenChange={(open) => !open && setAdjustTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {adjustTarget
                ? `${adjustTarget.memberName}의 ${adjustTarget.type} 조정`
                : "조정"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="adjust-amount">조정량</Label>
              <Input
                id="adjust-amount"
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="양수=추가, 음수=차감"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjust-reason">사유 <span className="text-rose-500">*</span></Label>
              <Input
                id="adjust-reason"
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="사유를 입력하세요"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustTarget(null)}>
              취소
            </Button>
            <Button
              onClick={handleAdjust}
              disabled={!adjustReason.trim() || adjustMutation.isPending}
            >
              {adjustMutation.isPending ? "처리 중..." : "확인"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
