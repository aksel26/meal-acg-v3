"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, AlertCircle, Check, X, Loader2, User } from "lucide-react";
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
import { Input } from "@repo/ui/src/input";
import { queryKeys } from "@/lib/query-keys";

interface MemberInfo {
  id: string;
  full_name: string;
}

interface MemberResult {
  memberId: string;
  fullName: string;
  success: boolean;
  sent: number;
  failed: number;
  error?: string;
}

interface SendResponse {
  success: boolean;
  summary: {
    total: number;
    success: number;
    failed: number;
    cleaned: number;
  };
  results: MemberResult[];
}

type NotificationType = "incomplete" | "settlement" | "general";

const NOTIFICATION_PRESETS: Record<
  NotificationType,
  { title: string; body: string; tag: string }
> = {
  incomplete: {
    title: "식대 입력 미완료 안내",
    body: "아직 식대 입력이 완료되지 않았습니다. 마감 전에 입력을 완료해주세요.",
    tag: "incomplete-reminder",
  },
  settlement: {
    title: "식대 정산요청",
    body: "이번 달 식대 정산이 완료되었습니다. 앱에서 정산 내역을 확인하고 정산을 진행해주세요.",
    tag: "settlement-result",
  },
  general: {
    title: "공지사항",
    body: "",
    tag: "general",
  },
};

interface PushNotifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMembers: MemberInfo[];
  sendToAll?: boolean;
}

export function PushNotifyDialog({
  open,
  onOpenChange,
  selectedMembers,
  sendToAll = false,
}: PushNotifyDialogProps) {
  const queryClient = useQueryClient();
  const [notificationType, setNotificationType] =
    useState<NotificationType>("incomplete");
  const [title, setTitle] = useState(NOTIFICATION_PRESETS.incomplete.title);
  const [body, setBody] = useState(NOTIFICATION_PRESETS.incomplete.body);
  const [results, setResults] = useState<MemberResult[] | null>(null);

  const handleTypeChange = (type: NotificationType) => {
    setNotificationType(type);
    const preset = NOTIFICATION_PRESETS[type];
    setTitle(preset.title);
    setBody(preset.body);
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberIds: sendToAll ? undefined : selectedMembers.map((m) => m.id),
          sendToAll,
          title,
          body,
          url: "/",
          tag: NOTIFICATION_PRESETS[notificationType].tag,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send notifications");
      }

      return response.json() as Promise<SendResponse>;
    },
    onSuccess: (data) => {
      setResults(data.results);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.subscriptions });
      if (data.summary.total === 0) {
        toast.warning("푸시 구독이 등록된 사용자가 없습니다.");
      } else if (data.summary.success === data.summary.total) {
        toast.success(`${data.summary.success}명에게 알림을 발송했습니다.`);
      } else if (data.summary.success > 0) {
        toast.warning(
          `${data.summary.success}명 성공, ${data.summary.failed}명 실패`
        );
      } else {
        toast.error("알림 발송에 실패했습니다.");
      }
      if (data.summary.cleaned > 0) {
        toast.info(`만료된 구독 ${data.summary.cleaned}건이 정리되었습니다.`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "알림 발송에 실패했습니다.");
    },
  });

  const handleSend = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("제목과 내용을 입력해주세요.");
      return;
    }
    sendMutation.mutate();
  };

  const handleClose = () => {
    setResults(null);
    setNotificationType("incomplete");
    setTitle(NOTIFICATION_PRESETS.incomplete.title);
    setBody(NOTIFICATION_PRESETS.incomplete.body);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            푸시 알림 발송
          </DialogTitle>
          <DialogDescription>
            {sendToAll
              ? "전체 사용자에게 푸시 알림을 발송합니다."
              : `선택한 ${selectedMembers.length}명에게 푸시 알림을 발송합니다.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Notification Type */}
          {!results && (
            <>
              <div className="flex gap-2">
                {(
                  [
                    ["incomplete", "미입력"],
                    ["settlement", "정산"],
                    ["general", "일반"],
                  ] as const
                ).map(([type, label]) => (
                  <button
                    key={type}
                    onClick={() => handleTypeChange(type)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                      notificationType === type
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Title */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  제목
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="알림 제목"
                />
              </div>

              {/* Body */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  내용
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="알림 내용"
                  rows={3}
                  className="flex w-full rounded border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </>
          )}

          {/* Summary */}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <User className="h-4 w-4" />
            <span>대상 인원: </span>
            <span className="font-medium text-slate-900">
              {sendToAll ? "전체" : `${selectedMembers.length}명`}
            </span>
          </div>

          {/* No subscription warning */}
          {results && results.length === 0 && (
            <div className="rounded-md bg-slate-50 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 text-slate-600" />
                <p className="text-sm text-slate-800">
                  푸시 알림 구독이 등록된 사용자가 없습니다.
                </p>
              </div>
            </div>
          )}

          {/* Results */}
          {results && results.length > 0 && (
            <div className="max-h-60 overflow-y-auto rounded-md">
              <div className="divide-y divide-slate-100">
                {results.map((result) => (
                  <div
                    key={result.memberId}
                    className="flex items-center justify-between p-3"
                  >
                    <span className="text-sm font-medium text-slate-700">
                      {result.fullName}
                    </span>
                    {result.success ? (
                      <span className="flex items-center gap-1 text-xs text-slate-600">
                        <Check className="h-3.5 w-3.5" />
                        발송 완료
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-slate-600">
                        <X className="h-3.5 w-3.5" />
                        {result.error || "발송 실패"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Member list (pre-send) */}
          {!results && !sendToAll && selectedMembers.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-md">
              <div className="divide-y divide-slate-100">
                {selectedMembers.map((member) => (
                  <div key={member.id} className="p-3">
                    <span className="text-sm font-medium text-slate-700">
                      {member.full_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            {results ? "닫기" : "취소"}
          </Button>
          {!results && (
            <Button
              onClick={handleSend}
              disabled={sendMutation.isPending || !title.trim() || !body.trim()}
              className="gap-2"
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  발송 중...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4" />
                  발송하기
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
