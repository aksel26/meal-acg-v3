"use client";

import {
  Clock3,
  MailCheck,
  MessageSquare,
  RotateCcw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
} from "@repo/ui/src/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Label } from "@repo/ui/src/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { toast } from "@repo/ui/src/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/src/table";
import { Textarea } from "@repo/ui/src/textarea";
import {
  careersApi,
  careersKeys,
  type ApplicationSummary,
  useCareersMutation,
} from "@/hooks/useCareersApi";
import { CareersStatusBadge } from "./CareersStatusBadge";
import { SeparatedStageRecordDialog } from "./SeparatedStageRecordDialog";

type SeparatedApplication = ApplicationSummary;

type Editor =
  | { type: "reason"; application: SeparatedApplication }
  | { type: "memo"; application: SeparatedApplication }
  | { type: "result"; application: SeparatedApplication }
  | null;
type ConfirmTarget = {
  type: "restore" | "delete";
  application: SeparatedApplication;
} | null;

function date(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function snapshotText(application: ApplicationSummary) {
  return (
    [application.stageName, application.statusName]
      .filter(Boolean)
      .join(" · ") || "미지정"
  );
}

function snapshotStageId(application: ApplicationSummary) {
  return application.stageId;
}

export function SeparatedApplicationsTable({
  applications,
}: {
  applications: SeparatedApplication[];
}) {
  const [editor, setEditor] = useState<Editor>(null);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);
  const [recordTarget, setRecordTarget] = useState<SeparatedApplication | null>(
    null,
  );
  const [value, setValue] = useState("");
  const [result, setResult] = useState<"unset" | "hired" | "rejected">("unset");
  const mutation = useCareersMutation(
    async (action: () => Promise<unknown>) => action(),
    [careersKeys.all],
  );

  function openEditor(next: NonNullable<Editor>) {
    setEditor(next);
    if (next.type === "reason")
      setValue(next.application.separatedReason || "");
    if (next.type === "memo") setValue(next.application.memo || "");
    if (next.type === "result") {
      setResult(next.application.finalResult?.result || "unset");
      setValue(next.application.finalResult?.reason || "");
    }
  }

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await mutation.mutateAsync(action);
      toast.success(success);
      setEditor(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "처리하지 못했습니다.",
      );
    }
  }

  async function saveEditor() {
    if (!editor) return;
    if (editor.type === "reason") {
      await run(
        () => careersApi.updateSeparationReason(editor.application.id, value),
        "별도 관리 사유를 수정했습니다.",
      );
      return;
    }
    if (editor.type === "memo") {
      await run(
        () =>
          careersApi.updateApplication(editor.application.id, { memo: value }),
        "메모를 저장했습니다.",
      );
      return;
    }
    if (result === "unset") {
      await run(
        () => careersApi.clearFinalResult(editor.application.id),
        "최종 결과를 미정으로 변경했습니다.",
      );
      return;
    }
    await run(
      () =>
        careersApi.finalResult(editor.application.id, {
          result,
          reason: value || undefined,
        }),
      "최종 결과를 저장했습니다.",
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl bg-white">
        <Table className="min-w-[1080px]">
          <TableHeader className="sticky top-0 z-10 bg-white">
            <TableRow className="border-b border-slate-100 bg-white hover:bg-white [&>th]:h-auto [&>th]:px-3 [&>th]:py-2 [&>th]:text-xs [&>th]:font-medium [&>th]:text-slate-400">
              <TableHead>지원자</TableHead>
              <TableHead>공고</TableHead>
              <TableHead>별도 관리 사유</TableHead>
              <TableHead>당시 진행 단계</TableHead>
              <TableHead className="text-center">최종 결과</TableHead>
              <TableHead className="text-center">지원일</TableHead>
              <TableHead className="text-center">이동일</TableHead>
              <TableHead className="text-center">메모</TableHead>
              <TableHead className="w-14 text-center">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((application) => (
              <TableRow
                key={application.id}
                className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 [&>td]:px-3 [&>td]:py-3"
              >
                <TableCell>
                  <Link
                    href={`/applicants/${application.id}`}
                    className="font-medium text-slate-800 hover:underline"
                  >
                    {application.applicantName}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {application.email} / {application.phone}
                  </p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-slate-700">
                    {application.postingTitle}
                  </p>
                  <p className="text-xs text-slate-400">
                    {application.field || application.department}
                  </p>
                </TableCell>
                <TableCell className="max-w-52">
                  <button
                    type="button"
                    className="block max-w-full truncate text-left text-sm text-slate-600 hover:underline"
                    title={application.separatedReason || "사유 없음"}
                    onClick={() => openEditor({ type: "reason", application })}
                  >
                    {application.separatedReason || "사유 없음"}
                  </button>
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span>{snapshotText(application)}</span>
                    {(() => {
                      const stageId = snapshotStageId(application);
                      const record = application.stageRecords?.find(
                        (item) => item.stageId === stageId,
                      );
                      const hasMeta = Boolean(
                        record?.meta &&
                          (record.meta.startDate ||
                            record.meta.endDate ||
                            record.meta.time ||
                            record.meta.note ||
                            record.meta.send),
                      );
                      if (!hasMeta) return null;
                      return (
                        <>
                          <button
                            type="button"
                            aria-label={`${application.applicantName} 당시 전형 기록 보기`}
                            className="text-slate-400 hover:text-slate-700"
                            onClick={() => setRecordTarget(application)}
                          >
                            <Clock3 className="size-3.5" />
                          </button>
                          {record?.meta?.send && (
                            <button
                              type="button"
                              aria-label={`${application.applicantName} 발송 기록 보기`}
                              title={`${record.meta.send.sentAt} · ${record.meta.send.channels.join(", ")}`}
                              className="text-emerald-500 hover:text-emerald-700"
                              onClick={() => setRecordTarget(application)}
                            >
                              <MailCheck className="size-3.5" />
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <button
                    type="button"
                    className="hover:opacity-70"
                    onClick={() => openEditor({ type: "result", application })}
                  >
                    {application.finalResult ? (
                      <CareersStatusBadge
                        value={application.finalResult.result}
                      />
                    ) : (
                      <span className="text-xs text-slate-400 underline">
                        미정
                      </span>
                    )}
                  </button>
                </TableCell>
                <TableCell className="text-center text-sm text-slate-500">
                  {date(application.appliedAt)}
                </TableCell>
                <TableCell className="text-center text-sm text-slate-500">
                  {date(application.separatedAt)}
                </TableCell>
                <TableCell className="text-center">
                  <button
                    type="button"
                    aria-label={`${application.applicantName} 메모 보기 또는 수정`}
                    className={
                      application.memo ? "text-slate-500" : "text-slate-300"
                    }
                    onClick={() => openEditor({ type: "memo", application })}
                  >
                    <MessageSquare className="size-4" />
                  </button>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/applicants/${application.id}`}>상세</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${application.applicantName} 지원자 목록으로 복귀`}
                      onClick={() =>
                        setConfirmTarget({ type: "restore", application })
                      }
                    >
                      <RotateCcw />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${application.applicantName} 삭제`}
                      className="text-red-600"
                      onClick={() =>
                        setConfirmTarget({ type: "delete", application })
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={Boolean(editor)}
        onOpenChange={(open) => !open && setEditor(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editor?.type === "reason"
                ? "별도 관리 사유"
                : editor?.type === "memo"
                  ? "지원자 메모"
                  : "최종 결과"}
            </DialogTitle>
            <DialogDescription>
              {editor?.application.applicantName}
              {editor?.type === "reason" && editor.application.separatedAt
                ? ` · ${date(editor.application.separatedAt)} 이동`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {editor?.type === "result" && (
            <div className="space-y-2">
              <Label>결과</Label>
              <Select
                value={result}
                onValueChange={(next) => setResult(next as typeof result)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">미정</SelectItem>
                  <SelectItem value="hired">합격</SelectItem>
                  <SelectItem value="rejected">불합격</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="separated-editor-value">
              {editor?.type === "reason"
                ? "사유"
                : editor?.type === "memo"
                  ? "메모"
                  : "결과 메모"}
            </Label>
            <Textarea
              id="separated-editor-value"
              rows={5}
              value={value}
              disabled={editor?.type === "result" && result === "unset"}
              onChange={(event) => setValue(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditor(null)}>
              취소
            </Button>
            <Button
              disabled={
                mutation.isPending ||
                (editor?.type === "reason" && !value.trim())
              }
              onClick={() => void saveEditor()}
            >
              {mutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SeparatedStageRecordDialog
        open={Boolean(recordTarget)}
        onOpenChange={(open) => !open && setRecordTarget(null)}
        applicantName={recordTarget?.applicantName || ""}
        stageName={
          recordTarget ? snapshotText(recordTarget).split(" · ")[0]! : ""
        }
        statusName={
          recordTarget ? snapshotText(recordTarget).split(" · ")[1] || "-" : ""
        }
        record={recordTarget?.stageRecords?.find(
          (item) => item.stageId === snapshotStageId(recordTarget),
        )}
      />

      <AlertDialog
        open={Boolean(confirmTarget)}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmTarget?.type === "restore"
                ? "지원자 목록으로 복귀할까요?"
                : "지원자를 삭제할까요?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget?.type === "restore"
                ? `${confirmTarget.application.applicantName} 지원자를 별도 관리에서 해제하고 일반 지원자 목록으로 되돌립니다.`
                : `${confirmTarget?.application.applicantName || ""} 지원자는 목록에서 숨겨지며 감사 이력은 유지됩니다.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirmTarget?.type === "delete"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : ""
              }
              disabled={mutation.isPending}
              onClick={() => {
                if (!confirmTarget) return;
                const target = confirmTarget;
                void run(
                  () =>
                    target.type === "restore"
                      ? careersApi.restore(target.application.id)
                      : careersApi.softDeleteApplication(target.application.id),
                  target.type === "restore"
                    ? "지원자 목록으로 복귀했습니다."
                    : "지원자를 삭제했습니다.",
                ).then(() => setConfirmTarget(null));
              }}
            >
              {mutation.isPending
                ? "처리 중..."
                : confirmTarget?.type === "restore"
                  ? "복귀"
                  : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
