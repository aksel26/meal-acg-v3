"use client";

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
import { Button } from "@repo/ui/src/button";

interface DeleteConfirmDialogProps {
  selectedDate?: Date;
  isDeleting: boolean;
  onConfirm: () => Promise<void>;
  children: React.ReactNode;
}

export function DeleteConfirmDialog({ selectedDate, isDeleting, onConfirm, children }: DeleteConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md max-w-md">
        <AlertDialogHeader className="text-center sm:text-left">
          <AlertDialogTitle className="text-lg font-semibold flex items-center gap-2">식사 기록 삭제</AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-3 pt-2">
            <div className="text-base">
              <span className="font-medium text-foreground">
                {selectedDate?.toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                })}
              </span>
              의 식대 기록을 삭제하시겠습니까?
            </div>

            <div className="text-center text-sm text-muted-foreground bg-gray-50 rounded-lg p-2">⚠️ 이 작업은 되돌릴 수 없습니다</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 sm:gap-2">
          <AlertDialogCancel disabled={isDeleting} className="flex-1 sm:flex-none">
            취소
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isDeleting} className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 focus-visible:ring-red-600">
            {isDeleting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                삭제 중...
              </div>
            ) : (
              "삭제하기"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
