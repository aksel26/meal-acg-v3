"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { BarChart3, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "@repo/ui/src/sonner";
import { cn } from "@repo/ui/lib/utils";
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
import { Badge } from "@repo/ui/src/badge";
import { Button } from "@repo/ui/src/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { Calendar } from "@repo/ui/src/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/src/popover";
import { CalendarIcon } from "lucide-react";
import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/src/table";
import { Textarea } from "@repo/ui/src/textarea";
import { QuestionSetManager } from "@/components/evaluations/QuestionSetManager";
import { queryKeys } from "@/lib/query-keys";

type RoundStatus = "draft" | "confirmed" | "closed";
type PageTab = "rounds" | "questionSets";

type EvaluationRound = {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: RoundStatus;
  is_deployed: boolean;
  question_set_id: string | null;
  question_set_applied_at: string | null;
  question_set: {
    id: string;
    name: string;
    is_active: boolean;
    is_default: boolean;
  } | null;
  config_version: number;
  created_at: string;
  updated_at: string;
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(payload?.error || "요청 처리에 실패했습니다.");
  }

  return payload as T;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function EvaluationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<PageTab>("rounds");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    startDate: today(),
    endDate: today(),
  });
  const [deleteTarget, setDeleteTarget] = useState<EvaluationRound | null>(null);

  const { data: rounds = [], isLoading } = useQuery<EvaluationRound[]>({
    queryKey: queryKeys.evaluations.rounds,
    queryFn: async () => requestJson<EvaluationRound[]>("/api/evaluations/rounds"),
  });

  const createRoundMutation = useMutation({
    mutationFn: async () =>
      requestJson<EvaluationRound>("/api/evaluations/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }),
    onSuccess: (round) => {
      toast.success("회차가 생성되었습니다.");
      queryClient.invalidateQueries({ queryKey: queryKeys.evaluations.rounds });
      setDialogOpen(false);
      router.push(`/evaluations/${round.id}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteRoundMutation = useMutation({
    mutationFn: async (roundId: string) =>
      requestJson<{ success: true }>(`/api/evaluations/rounds/${roundId}`, {
        method: "DELETE",
      }),
    onSuccess: (_result, roundId) => {
      toast.success("회차가 삭제되었습니다.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.evaluations.rounds });
      queryClient.removeQueries({ queryKey: queryKeys.evaluations.round(roundId) });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function openCreateDialog() {
    setForm({
      name: "",
      description: "",
      startDate: today(),
      endDate: today(),
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("회차명을 입력하세요.");
      return;
    }
    if (!form.startDate || !form.endDate) {
      toast.error("시작일과 종료일을 입력하세요.");
      return;
    }
    if (dayjs(form.endDate).isBefore(dayjs(form.startDate))) {
      toast.error("종료일은 시작일 이후여야 합니다.");
      return;
    }
    createRoundMutation.mutate();
  }

  function openDeleteDialog(round: EvaluationRound) {
    if (round.is_deployed) {
      toast.error("배포 ON 회차는 배포 OFF 후 삭제할 수 있습니다.");
      return;
    }
    setDeleteTarget(round);
  }

  return (
    <div className="evaluations-page space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setActiveTab("rounds")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "rounds"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
            )}
          >
            회차 관리
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("questionSets")}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "questionSets"
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
            )}
          >
            문항 SET 관리
          </button>
        </div>
        {activeTab === "rounds" && (
          <Button onClick={openCreateDialog}>
            <Plus className="mr-1 h-4 w-4" />
            신규 회차
          </Button>
        )}
      </div>

      {activeTab === "rounds" ? (
        <div className="rounded-xl bg-white">
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-16 text-xs text-slate-500">순번</TableHead>
                <TableHead className="text-xs text-slate-500">회차명</TableHead>
                <TableHead className="w-56 text-xs text-slate-500">기간</TableHead>
                <TableHead className="w-56 text-xs text-slate-500">적용 SET</TableHead>
                <TableHead className="w-24 text-xs text-slate-500">배포</TableHead>
                <TableHead className="w-20 text-xs text-slate-500">버전</TableHead>
                <TableHead className="w-44 text-xs text-slate-500">수정일</TableHead>
                <TableHead className="w-28 text-right text-xs text-slate-500">
                  관리
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-slate-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : rounds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-slate-400">
                    등록된 회차가 없습니다. 우측 상단의 &quot;신규 회차&quot;로 생성하세요.
                  </TableCell>
                </TableRow>
              ) : (
                rounds.map((round, index) => (
                  <TableRow
                    key={round.id}
                    className="cursor-pointer border-b last:border-0"
                    onClick={() => router.push(`/evaluations/${round.id}`)}
                  >
                    <TableCell className="py-3 text-sm text-slate-500">
                      {rounds.length - index}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="font-medium text-slate-900">{round.name}</div>
                      {round.description && (
                        <div className="mt-0.5 line-clamp-1 text-xs text-slate-400">
                          {round.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-slate-600">
                      {round.start_date} ~ {round.end_date}
                    </TableCell>
                    <TableCell className="py-3">
                      {round.question_set ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="line-clamp-1 text-sm font-medium text-slate-700">
                              {round.question_set.name}
                            </span>
                            {round.question_set.is_default && (
                              <Badge className="border-0 bg-amber-100 text-[10px] text-amber-700">
                                기본
                              </Badge>
                            )}
                          </div>
                          {round.question_set_applied_at && (
                            <div className="text-xs text-slate-400">
                              {dayjs(round.question_set_applied_at).format(
                                "YYYY-MM-DD HH:mm",
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">미적용</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge
                        className={cn(
                          "border-0 text-[11px]",
                          round.is_deployed
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {round.is_deployed ? "배포 ON" : "배포 OFF"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-sm text-slate-500">
                      v{round.config_version}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-slate-500">
                      {dayjs(round.updated_at).format("YYYY-MM-DD HH:mm")}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex flex-nowrap items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-slate-900"
                          aria-label={`${round.name} 통계`}
                          onClick={(event) => {
                            event.stopPropagation();
                            router.push(`/evaluations/${round.id}/stats`);
                          }}
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          aria-label={`${round.name} 삭제`}
                          onClick={(event) => {
                            event.stopPropagation();
                            openDeleteDialog(round);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <QuestionSetManager />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>신규 다면평가 회차</DialogTitle>
            <DialogDescription>
              회차 기본 정보를 입력합니다. 생성 후 상세 페이지에서 대상자·문항·평가자 배정을 설정하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="round-name">회차명</Label>
              <Input
                id="round-name"
                value={form.name}
                placeholder="2026 상반기 다면평가"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>평가 기간</Label>
              <Popover modal>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className={cn(
                      "w-full justify-start gap-2 text-left font-normal",
                      !form.startDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {form.startDate && form.endDate
                      ? `${format(parse(form.startDate, "yyyy-MM-dd", new Date()), "yyyy년 M월 d일", { locale: ko })} ~ ${format(parse(form.endDate, "yyyy-MM-dd", new Date()), "yyyy년 M월 d일", { locale: ko })}`
                      : "시작일 ~ 종료일"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-auto p-0"
                  sideOffset={6}
                >
                  <Calendar
                    mode="range"
                    locale={ko}
                    numberOfMonths={1}
                    defaultMonth={
                      form.startDate
                        ? parse(form.startDate, "yyyy-MM-dd", new Date())
                        : new Date()
                    }
                    selected={
                      form.startDate || form.endDate
                        ? ({
                            from: form.startDate
                              ? parse(form.startDate, "yyyy-MM-dd", new Date())
                              : undefined,
                            to: form.endDate
                              ? parse(form.endDate, "yyyy-MM-dd", new Date())
                              : undefined,
                          } as DateRange)
                        : undefined
                    }
                    onSelect={(range: DateRange | undefined) => {
                      setForm((prev) => ({
                        ...prev,
                        startDate: range?.from
                          ? format(range.from, "yyyy-MM-dd")
                          : "",
                        endDate: range?.to
                          ? format(range.to, "yyyy-MM-dd")
                          : "",
                      }));
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="round-desc">설명</Label>
              <Textarea
                id="round-desc"
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={createRoundMutation.isPending}
            >
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={createRoundMutation.isPending}>
              {createRoundMutation.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              회차 생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open && !deleteRoundMutation.isPending) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>회차 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <>
                  <span className="font-medium text-slate-900">
                    {deleteTarget.name}
                  </span>
                  을 삭제합니다. 회차에 연결된 대상자, 문항, 평가자 배정 정보도 함께
                  삭제됩니다.
                </>
              ) : (
                "회차를 삭제합니다."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRoundMutation.isPending}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleteRoundMutation.isPending || !deleteTarget}
              onClick={(event) => {
                event.preventDefault();
                if (!deleteTarget) return;
                deleteRoundMutation.mutate(deleteTarget.id);
              }}
            >
              {deleteRoundMutation.isPending && (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              )}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
