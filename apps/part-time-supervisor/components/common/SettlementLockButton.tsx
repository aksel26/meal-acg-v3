"use client";

import { useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { useSettlementLock, useLockSettlement, useUnlockSettlement } from "@/hooks/use-settlement-lock";
import { toast } from "@repo/ui/src/sonner";

type Props = {
  type: "supervisor" | "interview";
  year: number;
  month: number;
};

export function SettlementLockButton({ type, year, month }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"lock" | "unlock">("lock");

  const { data: lock, isLoading } = useSettlementLock(type, year, month);
  const lockMutation = useLockSettlement(type, year, month);
  const unlockMutation = useUnlockSettlement(type, year, month);

  const isLocked = lock != null;

  const handleLockClick = () => {
    setConfirmAction("lock");
    setShowConfirm(true);
  };

  const handleUnlockClick = () => {
    setConfirmAction("unlock");
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    try {
      if (confirmAction === "lock") {
        await lockMutation.mutateAsync(undefined);
        toast.success("정산이 확정되었습니다");
      } else {
        if (!lock) return;
        await unlockMutation.mutateAsync(lock.id);
        toast.success("정산 확정이 해제되었습니다");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "오류가 발생했습니다");
    }
  };

  if (isLoading) return null;

  return (
    <>
      {isLocked ? (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
            <Lock size={14} />
            확정됨 ({lock.locked_by})
          </span>
          <button
            onClick={handleUnlockClick}
            disabled={unlockMutation.isPending}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <Unlock size={14} />
            확정 해제
          </button>
        </div>
      ) : (
        <button
          onClick={handleLockClick}
          disabled={lockMutation.isPending}
          className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          <Lock size={14} />
          정산 확정
        </button>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">
              {confirmAction === "lock" ? "정산 확정" : "정산 확정 해제"}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {confirmAction === "lock"
                ? `${year}년 ${month}월 정산을 확정하면 근무 기록을 수정할 수 없습니다. 계속하시겠습니까?`
                : `${year}년 ${month}월 정산 확정을 해제하면 근무 기록 수정이 가능해집니다. 계속하시겠습니까?`}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
                  confirmAction === "lock"
                    ? "bg-slate-900 hover:bg-slate-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {confirmAction === "lock" ? "확정" : "해제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
