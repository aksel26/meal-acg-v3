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
  AlertDialogTrigger 
} from "@repo/ui/src/alert-dialog";
import { Button } from "@repo/ui/src/button";

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
  children 
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="text-center sm:text-left">
          <AlertDialogTitle className="text-xl font-semibold flex items-center gap-2">
            <span className="text-red-500">🗑️</span>
            식사 기록 삭제
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-3 pt-2">
            <div className="text-base">
              <span className="font-medium text-foreground">
                {selectedDate?.toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long", 
                  day: "numeric",
                  weekday: "short"
                })}
              </span>
              의 모든 식사 기록을 삭제하시겠습니까?
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-red-800 font-medium text-sm mb-1">
                ⚠️ 다음 데이터가 모두 삭제됩니다:
              </div>
              <ul className="text-red-700 text-sm space-y-1">
                <li>• 조식, 중식, 석식 정보</li>
                <li>• 결제자 및 사용처</li>
                <li>• 금액 정보</li>
                <li>• 근태 정보</li>
              </ul>
            </div>
            
            <div className="text-center text-sm text-muted-foreground bg-gray-50 rounded-lg p-2">
              ⚠️ 이 작업은 되돌릴 수 없습니다
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 sm:gap-2">
          <AlertDialogCancel 
            disabled={isDeleting}
            className="flex-1 sm:flex-none"
          >
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 focus-visible:ring-red-600"
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