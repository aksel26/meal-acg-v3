"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Send,
  Smartphone,
  Monitor,
  BellOff,
  Trash2,
  Clock,
  Check,
  X,
  FileText,
  History,
  ChevronLeft,
} from "lucide-react";
import { toast } from "@repo/ui/src/sonner";
import { Button } from "@repo/ui/src/button";
import {
  Dialog,
  DialogContent,
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
import { PushNotifyDialog } from "@/components/PushNotifyDialog";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@repo/ui/lib/utils";

// ─── Types ───────────────────────────────────────────────

interface MemberSubscription {
  id: string;
  full_name: string;
  member_role: string | null;
  team_name: string | null;
  subscribed: boolean;
  deviceCount: number;
  devices: ("pc" | "mobile")[];
  lastUpdated: string | null;
}

interface SubscriptionsResponse {
  members: MemberSubscription[];
  summary: {
    total: number;
    subscribed: number;
    unsubscribed: number;
  };
}

interface NotificationLog {
  id: string;
  title: string;
  body: string;
  tag: string | null;
  send_to_all: boolean;
  total_recipients: number;
  success_count: number;
  failed_count: number;
  cleaned_count: number;
  sent_by: string;
  created_at: string;
}

interface MemberResult {
  memberId: string;
  fullName: string;
  success: boolean;
  sent: number;
  failed: number;
  error?: string;
}

interface LogDetailResponse {
  log: NotificationLog & { results: string | MemberResult[] };
}

// ─── Helpers ─────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ─── Page ────────────────────────────────────────────────

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sendToAll, setSendToAll] = useState(false);
  const [targetMember, setTargetMember] = useState<{
    id: string;
    full_name: string;
  } | null>(null);

  // 구독 해제 확인 Dialog
  const [unsubTarget, setUnsubTarget] = useState<MemberSubscription | null>(null);

  // 발송 이력 Dialog
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  // 발송 이력 상세 Dialog
  const [detailLogId, setDetailLogId] = useState<string | null>(null);

  // ─── Subscriptions ──────────────────────────────────────

  const { data: subsData, isLoading } = useQuery<SubscriptionsResponse>({
    queryKey: queryKeys.notifications.subscriptions,
    queryFn: async () => {
      const res = await fetch("/api/notifications/subscriptions");
      if (!res.ok) throw new Error("Failed to fetch subscriptions");
      return res.json();
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch("/api/notifications/subscriptions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      if (!res.ok) throw new Error("Failed to unsubscribe");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.subscriptions,
      });
      toast.success("구독이 해제되었습니다.");
    },
    onError: () => {
      toast.error("구독 해제에 실패했습니다.");
    },
  });

  // ─── Logs ───────────────────────────────────────────────

  const { data: logsData, isLoading: logsLoading } = useQuery<{
    logs: NotificationLog[];
  }>({
    queryKey: queryKeys.notifications.logs,
    queryFn: async () => {
      const res = await fetch("/api/notifications/logs");
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json();
    },
    enabled: logsDialogOpen,
  });

  const { data: logDetail, isLoading: detailLoading } =
    useQuery<LogDetailResponse>({
      queryKey: ["notifications", "logs", detailLogId],
      queryFn: async () => {
        const res = await fetch(`/api/notifications/logs/${detailLogId}`);
        if (!res.ok) throw new Error("Failed to fetch log detail");
        return res.json();
      },
      enabled: !!detailLogId,
    });

  // ─── Derived ────────────────────────────────────────────

  const members = subsData?.members ?? [];
  const summary = subsData?.summary ?? {
    total: 0,
    subscribed: 0,
    unsubscribed: 0,
  };
  const logs = logsData?.logs ?? [];

  const subscriptionRate =
    summary.total > 0
      ? Math.round((summary.subscribed / summary.total) * 100)
      : 0;

  const detailResults: MemberResult[] = (() => {
    if (!logDetail?.log?.results) return [];
    const raw = logDetail.log.results;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw) as MemberResult[];
      } catch {
        return [];
      }
    }
    return raw;
  })();

  // ─── Handlers ───────────────────────────────────────────

  const handleSendToAll = () => {
    setTargetMember(null);
    setSendToAll(true);
    setDialogOpen(true);
  };

  const handleSendToMember = (member: MemberSubscription) => {
    setTargetMember({ id: member.id, full_name: member.full_name });
    setSendToAll(false);
    setDialogOpen(true);
  };

  const handleUnsubscribe = (member: MemberSubscription) => {
    setUnsubTarget(member);
  };

  const handleUnsubscribeConfirm = () => {
    if (!unsubTarget) return;
    unsubscribeMutation.mutate(unsubTarget.id);
    setUnsubTarget(null);
  };

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Stats bar + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5 text-[13px]">
            <span className="text-slate-400">전체</span>
            <span className="font-semibold tabular-nums text-slate-700">
              {summary.total}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-slate-400">구독</span>
            <span className="font-semibold tabular-nums text-emerald-600">
              {summary.subscribed}
            </span>
            <span className="text-[11px] text-emerald-500">
              ({subscriptionRate}%)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px]">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
            <span className="text-slate-400">미구독</span>
            <span className="font-semibold tabular-nums text-slate-500">
              {summary.unsubscribed}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-md text-xs"
            onClick={() => setLogsDialogOpen(true)}
          >
            <History className="h-3.5 w-3.5" />
            발송 이력
          </Button>
          <Button
            size="sm"
            className="btn-glow gap-1.5 rounded-md text-xs"
            onClick={handleSendToAll}
          >
            <Send className="h-3.5 w-3.5" />
            전체 발송
          </Button>
        </div>
      </div>

      {/* Subscription Table */}
      <div className="glass-card overflow-hidden rounded-xl">
        {isLoading ? (
          <div className="space-y-1 p-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton-shimmer h-8 rounded-md" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <BellOff className="mb-2 h-6 w-6" />
            <p className="text-xs">멤버가 없습니다.</p>
          </div>
        ) : (
          <div className="relative max-h-[calc(100vh-240px)] w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 [&>th]:h-9 [&>th]:px-2 [&>th]:py-0">
                  <th className="w-[72px] pl-4 text-left align-middle text-xs font-semibold text-slate-600">
                    이름
                  </th>
                  <th className="text-left align-middle text-xs font-semibold text-slate-600">
                    팀
                  </th>
                  <th className="text-center align-middle text-xs font-semibold text-slate-600">
                    상태
                  </th>
                  <th className="text-center align-middle text-xs font-semibold text-slate-600">
                    기기
                  </th>
                  <th className="text-right align-middle text-xs font-semibold text-slate-600">
                    구독일
                  </th>
                  <th className="w-[72px] pr-4 text-center align-middle text-xs font-semibold text-slate-600">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="transition-all [&>td]:py-1.5"
                  >
                    <td className="w-[72px] pl-4 px-2 align-middle text-[13px] font-medium text-slate-800">
                      {member.full_name}
                    </td>
                    <td className="px-2 align-middle text-[13px] text-slate-500">
                      {member.team_name || "-"}
                    </td>
                    <td className="px-2 text-center align-middle">
                      {member.subscribed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-px text-[10px] font-medium text-emerald-600">
                          <span className="h-1 w-1 rounded-full bg-emerald-500" />
                          구독
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-medium text-slate-400">
                          <span className="h-1 w-1 rounded-full bg-slate-300" />
                          미구독
                        </span>
                      )}
                    </td>
                    <td className="px-2 text-center align-middle">
                      {member.deviceCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-[13px] tabular-nums text-slate-600">
                          {member.devices.filter((d) => d === "pc").length >
                            0 && (
                            <span className="inline-flex items-center gap-0.5">
                              <Monitor className="h-3 w-3 text-slate-400" />
                              {
                                member.devices.filter((d) => d === "pc")
                                  .length
                              }
                            </span>
                          )}
                          {member.devices.filter((d) => d === "mobile")
                            .length > 0 && (
                            <span className="inline-flex items-center gap-0.5">
                              <Smartphone className="h-3 w-3 text-slate-400" />
                              {
                                member.devices.filter((d) => d === "mobile")
                                  .length
                              }
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[13px] text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-2 text-right align-middle text-[11px] tabular-nums text-slate-400">
                      {formatDate(member.lastUpdated)}
                    </td>
                    <td className="w-[72px] pr-4 text-center align-middle">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleSendToMember(member)}
                          disabled={!member.subscribed}
                          className={cn(
                            "rounded p-1 transition-colors",
                            member.subscribed
                              ? "text-blue-500 hover:bg-blue-50 hover:text-blue-600"
                              : "cursor-not-allowed text-slate-200"
                          )}
                          title="알림 발송"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleUnsubscribe(member)}
                          disabled={
                            !member.subscribed ||
                            unsubscribeMutation.isPending
                          }
                          className={cn(
                            "rounded p-1 transition-colors",
                            member.subscribed
                              ? "text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                              : "cursor-not-allowed text-slate-200"
                          )}
                          title="구독 해제"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Send Dialog */}
      <PushNotifyDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.notifications.logs,
            });
          }
        }}
        selectedMembers={targetMember ? [targetMember] : []}
        sendToAll={sendToAll}
      />

      {/* Logs Dialog (목록 + 상세를 하나의 Dialog에서 전환) */}
      <Dialog
        open={logsDialogOpen}
        onOpenChange={(open) => {
          setLogsDialogOpen(open);
          if (!open) setDetailLogId(null);
        }}
      >
        <DialogContent className="max-w-lg">
          {detailLogId ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => setDetailLogId(null)}
                    className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  발송 상세
                </DialogTitle>
              </DialogHeader>

              {detailLoading ? (
                <div className="space-y-2 py-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="skeleton-shimmer h-6 rounded-md"
                    />
                  ))}
                </div>
              ) : logDetail?.log ? (
                <div className="space-y-3 py-2">
                  <div className="space-y-1 text-[13px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">제목</span>
                      <span className="font-medium text-slate-700">
                        {logDetail.log.title}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">내용</span>
                      <span className="max-w-[240px] text-right text-slate-600">
                        {logDetail.log.body}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">발송일시</span>
                      <span className="tabular-nums text-slate-600">
                        {formatDateTime(logDetail.log.created_at)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">발송자</span>
                      <span className="text-slate-600">
                        {logDetail.log.sent_by}
                      </span>
                    </div>
                    {logDetail.log.cleaned_count > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">만료 정리</span>
                        <span className="text-amber-600">
                          {logDetail.log.cleaned_count}건
                        </span>
                      </div>
                    )}
                  </div>

                  {detailResults.length > 0 && (
                    <div className="max-h-60 overflow-y-auto rounded-md">
                      <div>
                        {detailResults.map((result) => (
                          <div
                            key={result.memberId}
                            className="flex items-center justify-between px-3 py-2"
                          >
                            <span className="text-[13px] font-medium text-slate-700">
                              {result.fullName}
                            </span>
                            {result.success ? (
                              <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                                <Check className="h-3 w-3" />
                                성공
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] text-rose-600">
                                <X className="h-3 w-3" />
                                실패
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-sm">
                  <History className="h-4 w-4" />
                  발송 이력
                </DialogTitle>
              </DialogHeader>

              {logsLoading ? (
                <div className="space-y-1 py-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="skeleton-shimmer h-8 rounded-md"
                    />
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <FileText className="mb-2 h-6 w-6" />
                  <p className="text-xs">발송 이력이 없습니다.</p>
                </div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto">
                  <div>
                    {logs.map((log) => (
                      <button
                        key={log.id}
                        onClick={() => setDetailLogId(log.id)}
                        className="flex w-full items-center gap-3 rounded-md px-1 py-2.5 text-left transition-colors hover:bg-slate-50"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-medium text-slate-800">
                              {log.title}
                            </span>
                            {log.send_to_all ? (
                              <span className="shrink-0 inline-flex items-center rounded-full bg-blue-500/10 px-1.5 py-px text-[10px] font-medium text-blue-600">
                                전체
                              </span>
                            ) : (
                              <span className="shrink-0 text-[10px] tabular-nums text-slate-400">
                                {log.total_recipients}명
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Clock className="h-3 w-3" />
                              {formatDateTime(log.created_at)}
                            </span>
                            <span className="text-slate-200">|</span>
                            <span>{log.sent_by}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] tabular-nums">
                            <span className="text-emerald-600">
                              {log.success_count}
                            </span>
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-500">
                              {log.total_recipients}
                            </span>
                          </span>
                          {log.failed_count > 0 && (
                            <div className="text-[10px] text-rose-500">
                              {log.failed_count} failed
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 구독 해제 확인 */}
      <AlertDialog open={!!unsubTarget} onOpenChange={(open) => !open && setUnsubTarget(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>푸시 구독 해제</AlertDialogTitle>
            <AlertDialogDescription>
              {unsubTarget?.full_name}님의 푸시 구독을 해제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnsubscribeConfirm}>
              해제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
