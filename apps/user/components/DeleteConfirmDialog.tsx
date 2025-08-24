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
  isDeleting: boolean;
  onConfirm: () => Promise<void>;
  children: React.ReactNode;
}

export function DeleteConfirmDialog({
  selectedDate,
  isDeleting,
  onConfirm,
  children,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md max-w-xs!">
        <AlertDialogHeader className="text-center sm:text-left">
          <AlertDialogTitle className="text-sm sm:text-lg font-semibold flex items-center gap-2">
            식사 기록 삭제
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-3 pt-2">
            <span className="text-xs sm:text-sm">
              <span className="font-medium text-foreground">
                {selectedDate?.toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                })}
              </span>
              의 식대 기록을 삭제하시겠습니까?
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 sm:gap-2">
          <AlertDialogCancel
            disabled={isDeleting}
            className="flex-1 sm:flex-none text-xs sm:text-sm"
          >
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 sm:flex-none bg-red-100 text-red-500 hover:bg-red-700 focus-visible:ring-red-600 text-xs sm:text-sm"
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
