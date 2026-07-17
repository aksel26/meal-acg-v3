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
import { Settings2 } from "lucide-react";
import {
  useLeaveBalances,
  useGenerateLeave,
  useAdjustLeaveBalance,
  useLeaveUsageStats,
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

export function LeaveBalancesPanel({ year }: { year: number }) {
  const [generateOpen, setGenerateOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<AdjustTarget | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const { data: balances, isLoading: balancesLoading } = useLeaveBalances(year);
  const { data: usageData, isLoading: usageLoading } = useLeaveUsageStats(year);
  const generateMutation = useGenerateLeave();
  const adjustMutation = useAdjustLeaveBalance();

  const isLoading = balancesLoading || usageLoading;

  // Group balances by member
  const balanceMap = useMemo(() => {
    const map = new Map<string, LeaveBalance[]>();
    for (const b of balances || []) {
      if (!map.has(b.member_id)) map.set(b.member_id, []);
      map.get(b.member_id)!.push(b);
    }
    return map;
  }, [balances]);

  // Filter leave types that have at least 1 usage
  const activeLeaveTypes = useMemo(() => {
    if (!usageData) return [];
    const usedTypeIds = new Set<number>();
    for (const s of usageData.stats) {
      for (const [id, count] of Object.entries(s.counts)) {
        if (count > 0) usedTypeIds.add(Number(id));
      }
    }
    return usageData.leaveTypes.filter((t) => usedTypeIds.has(t.id));
  }, [usageData]);

  // All leave types for full display
  const allLeaveTypes = usageData?.leaveTypes || [];

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
      { onSuccess: () => setAdjustTarget(null) },
    );
  };

  const colCount = 2 + allLeaveTypes.length + 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button variant="outline" onClick={() => setGenerateOpen(true)}>
          <Settings2 className="mr-2 h-4 w-4" />
          연차 일괄 부여
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-medium text-slate-400">
              <th className="px-3 py-2 text-left font-medium w-20">
                이름
              </th>
              <th className="px-2 py-2 text-left font-medium w-14">
                직급
              </th>
              {allLeaveTypes.map((t) => (
                <th
                  key={t.id}
                  className="px-1.5 py-2 text-center font-medium min-w-[40px] border-l border-slate-100"
                >
                  {t.name}
                </th>
              ))}
              <th className="px-2 py-2 text-center font-medium text-slate-500 bg-slate-50 border-l border-slate-100">
                합계
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-3 py-10 text-center text-sm text-slate-500"
                >
                  로딩 중...
                </td>
              </tr>
            ) : usageData && usageData.stats.length > 0 ? (
              usageData.stats.map((member) => {
                const memberBalances = balanceMap.get(member.member_id) || [];
                return (
                  <tr
                    key={member.member_id}
                    className="border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50"
                  >
                    <td className="px-3 py-2 font-medium text-slate-800 text-xs">
                      {member.full_name}
                    </td>
                    <td className="px-2 py-2 text-slate-600 text-[11px]">
                      {member.position_name || "-"}
                    </td>
                    {allLeaveTypes.map((t) => {
                      const count = member.counts[t.id] || 0;
                      return (
                        <td
                          key={t.id}
                          className="px-1.5 py-2 text-center text-xs border-l border-slate-100"
                        >
                          {count > 0 ? (
                            <span className="font-medium text-slate-800">
                              {count}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-center text-xs font-semibold text-slate-800 bg-slate-50 border-l border-slate-100">
                      {member.total}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-3 py-10 text-center text-sm text-slate-500"
                >
                  해당 연도의 데이터가 없습니다. &apos;연차 일괄 부여&apos;
                  버튼으로 부여해주세요.
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
              {year}년 연차를 일괄 부여하시겠습니까? 직급 기반으로
              연차/월차/하계휴가가 자동 계산됩니다.
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
      <Dialog
        open={!!adjustTarget}
        onOpenChange={(open) => !open && setAdjustTarget(null)}
      >
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
              <Label htmlFor="adjust-reason">
                사유 <span className="text-slate-500">*</span>
              </Label>
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
