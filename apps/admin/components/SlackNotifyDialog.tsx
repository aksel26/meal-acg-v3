"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send, AlertCircle, Check, X, Loader2, Mail, User } from "lucide-react";
import { toast } from "@repo/ui/src/sonner";
import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/src/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";

interface UserInfo {
  user_id: string;
  full_name: string;
  email: string | null;
}

interface NotifyResult {
  userId: string;
  fullName: string;
  success: boolean;
  error?: string;
}

interface NotifyResponse {
  success: boolean;
  summary: {
    total: number;
    success: number;
    failed: number;
  };
  results: NotifyResult[];
}

interface SlackNotifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUsers: UserInfo[];
  year: number;
  month: number;
}

export function SlackNotifyDialog({
  open,
  onOpenChange,
  selectedUsers,
  year,
  month,
}: SlackNotifyDialogProps) {
  const [results, setResults] = useState<NotifyResult[] | null>(null);

  const usersWithEmail = selectedUsers.filter((u) => u.email);
  const usersWithoutEmail = selectedUsers.filter((u) => !u.email);

  const notifyMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const response = await fetch("/api/slack/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds, year, month }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send notifications");
      }

      return response.json() as Promise<NotifyResponse>;
    },
    onSuccess: (data) => {
      setResults(data.results);
      if (data.summary.success === data.summary.total) {
        toast.success(`${data.summary.success}명에게 알림을 발송했습니다.`);
      } else if (data.summary.success > 0) {
        toast.warning(
          `${data.summary.success}명 성공, ${data.summary.failed}명 실패`
        );
      } else {
        toast.error("알림 발송에 실패했습니다.");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "알림 발송에 실패했습니다.");
    },
  });

  const handleSend = () => {
    if (usersWithEmail.length === 0) {
      toast.error("발송 가능한 사용자가 없습니다.");
      return;
    }

    notifyMutation.mutate(usersWithEmail.map((u) => u.user_id));
  };

  const handleClose = () => {
    setResults(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-amber-600" />
            Slack 정산 알림 발송
          </DialogTitle>
          <DialogDescription>
            {year}년 {month}월 정산 내역을 선택한 사용자에게 DM으로 발송합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Summary */}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <User className="h-4 w-4" />
            <span>대상 인원: </span>
            <span className="font-medium text-slate-900">
              {selectedUsers.length}명
            </span>
          </div>

          {/* Warning for users without email */}
          {usersWithoutEmail.length > 0 && (
            <div className="rounded-md bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 text-amber-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">
                    이메일 미등록 ({usersWithoutEmail.length}명)
                  </p>
                  <p className="mt-0.5 text-xs text-amber-700">
                    {usersWithoutEmail.map((u) => u.full_name).join(", ")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* User list or results */}
          <div className="max-h-60 overflow-y-auto rounded-md border border-slate-200">
            {results ? (
              // Results view
              <div className="divide-y divide-slate-100">
                {results.map((result) => (
                  <div
                    key={result.userId}
                    className="flex items-center justify-between p-3"
                  >
                    <span className="text-sm font-medium text-slate-700">
                      {result.fullName}
                    </span>
                    {result.success ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <Check className="h-3.5 w-3.5" />
                        발송 완료
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-rose-600">
                        <X className="h-3.5 w-3.5" />
                        {result.error}
                      </span>
                    )}
                  </div>
                ))}
                {/* Add users without email to results */}
                {usersWithoutEmail.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-3"
                  >
                    <span className="text-sm font-medium text-slate-700">
                      {user.full_name}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <X className="h-3.5 w-3.5" />
                      이메일 없음
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              // User list view
              <div className="divide-y divide-slate-100">
                {selectedUsers.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-3"
                  >
                    <span className="text-sm font-medium text-slate-700">
                      {user.full_name}
                    </span>
                    {user.email ? (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">이메일 없음</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            {results ? "닫기" : "취소"}
          </Button>
          {!results && (
            <Button
              onClick={handleSend}
              disabled={notifyMutation.isPending || usersWithEmail.length === 0}
              className={cn(
                "gap-2",
                usersWithEmail.length === 0 && "opacity-50"
              )}
            >
              {notifyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  발송 중...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  발송하기 ({usersWithEmail.length}명)
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
