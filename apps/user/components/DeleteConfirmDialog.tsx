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

interface DeleteConfirmDialogProps {
  selectedDate?: Date;
  mealType?: "breakfast" | "lunch" | "dinner";
  isDeleting: boolean;
  onConfirm: () => Promise<void>;
  children: React.ReactNode;
}

const mealTypeLabels = {
  breakfast: "조식",
  lunch: "중식",
  dinner: "석식",
} as const;

export function DeleteConfirmDialog({ selectedDate, mealType, isDeleting, onConfirm, children }: DeleteConfirmDialogProps) {
  const deleteTarget = mealType ? `${mealTypeLabels[mealType]} 기록` : "식대 기록";

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md max-w-xs! rounded-[24px] border-0 bg-white">
        <AlertDialogHeader className="text-center sm:text-left">
          <AlertDialogTitle className="text-sm sm:text-lg font-medium flex items-center gap-2 text-[var(--ink-black)]">{deleteTarget} 삭제</AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-3 pt-2">
            <span className="text-xs sm:text-sm text-[var(--granite)]">
              <span className="font-medium text-[var(--ink-black)]">
                {selectedDate?.toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                })}
              </span>
              의 {deleteTarget}을 삭제하시겠습니까?
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 sm:gap-2">
          <AlertDialogCancel disabled={isDeleting} className="flex-1 sm:flex-none rounded-full border-0 bg-[var(--whisper-cream)] text-xs text-[var(--ink-black)] hover:bg-[var(--soft-bone)] sm:text-sm">
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 sm:flex-none rounded-full bg-[var(--danger)] text-xs text-white hover:bg-[var(--danger)]/90 focus-visible:ring-[var(--danger)] sm:text-sm"
          >
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
