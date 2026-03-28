"use client";

import { Lock, Unlock } from "lucide-react";
import { useSettlementLock, useLockSettlement, useUnlockSettlement } from "@/hooks/use-settlement-lock";
import { toast } from "@repo/ui/src/sonner";
import { Button } from "@repo/ui/src/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/src/alert-dialog";

type Props = {
  type: "supervisor" | "interview";
  year: number;
  month: number;
};

export function SettlementLockButton({ type, year, month }: Props) {
  const { data: lock, isLoading } = useSettlementLock(type, year, month);
  const lockMutation = useLockSettlement(type, year, month);
  const unlockMutation = useUnlockSettlement(type, year, month);

  const isLocked = lock != null;

  const handleLock = async () => {
    try {
      await lockMutation.mutateAsync(undefined);
      toast.success("정산이 확정되었습니다");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "오류가 발생했습니다");
    }
  };

  const handleUnlock = async () => {
    if (!lock) return;
    try {
      await unlockMutation.mutateAsync(lock.id);
      toast.success("정산 확정이 해제되었습니다");
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={unlockMutation.isPending}
              >
                <Unlock size={14} />
                확정 해제
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="!max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle>정산 확정 해제</AlertDialogTitle>
                <AlertDialogDescription>
                  {year}년 {month}월 정산 확정을 해제하면 근무 기록 수정이 가능해집니다. 계속하시겠습니까?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleUnlock}
                  className="bg-red-600 hover:bg-red-700"
                >
                  해제
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={lockMutation.isPending}>
              <Lock size={14} />
              정산 확정
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="!max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle>정산 확정</AlertDialogTitle>
              <AlertDialogDescription>
                {year}년 {month}월 정산을 확정하면 근무 기록을 수정할 수 없습니다. 계속하시겠습니까?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleLock}>확정</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
