"use client";

import {
  Clock3,
  FileText,
  LockKeyhole,
  MailPlus,
  MessageSquare,
  RotateCcw,
  Trash2,
  Upload,
  UserX,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { Textarea } from "@repo/ui/src/textarea";
import { toast } from "@repo/ui/src/sonner";
import {
  careersApi,
  careersKeys,
  type ApplicationDetail,
  useCareersMutation,
} from "@/hooks/useCareersApi";
import {
  FinalResultDialog,
  MemoDialog,
  SendRecordIndicator,
  SeparationDialog,
  StageRecordDialog,
  type StageRecordMetaInput,
  type StageRecordSendIntent,
} from "./ApplicantDialogs";

const FINAL_RESULT_LOCK_MESSAGE =
  "최종 결과가 지정되어 전형이 종료된 지원자입니다.";

export function ApplicationActions({
  application,
}: {
  application: ApplicationDetail;
}) {
  const router = useRouter();
  const [stageId, setStageId] = useState(application.stageId || "");
  const stage = application.posting?.stages?.find(
    (item) => item.id === stageId,
  );
  const [statusId, setStatusId] = useState(application.statusId || "");
  const status = stage?.statuses.find((item) => item.id === statusId);
  const record = application.stageRecords.find(
    (item) => item.stageId === stageId,
  );
  const [transitionReason, setTransitionReason] = useState("");
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordAutoSend, setRecordAutoSend] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const [separationOpen, setSeparationOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const detailKey = careersKeys.application(application.id);
  const mutation = useCareersMutation(
    async (action: () => Promise<unknown>) => action(),
    [detailKey, careersKeys.all],
  );
  const locked = Boolean(application.finalResult);

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await mutation.mutateAsync(action);
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "처리하지 못했습니다.",
      );
      return false;
    }
  }

  async function saveTransition(
    meta?: StageRecordMetaInput,
    sendIntent: StageRecordSendIntent = "preserve",
  ) {
    if (!stageId || !statusId || locked) return;
    const saved = await run(
      () =>
        careersApi.transition(application.id, {
          stageId,
          statusId,
          reason: transitionReason || undefined,
          meta: meta ? { ...record?.meta, ...meta } : undefined,
          sendIntent,
        }),
      "전형 상태를 변경했습니다.",
    );
    if (saved) {
      setTransitionReason("");
      setRecordOpen(false);
    }
  }

  return (
    <>
      {locked && (
        <div className="mb-5 flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <LockKeyhole className="size-4 shrink-0" />
          {FINAL_RESULT_LOCK_MESSAGE} 기록은 계속 열람할 수 있습니다.
        </div>
      )}
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="careers-panel p-5">
          <h2 className="font-semibold">전형 상태 변경</h2>
          <p className="mt-1 text-sm text-zinc-600">
            원하는 단계와 상태를 직접 선택합니다.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>전형 단계</Label>
              <Select
                value={stageId}
                disabled={locked}
                onValueChange={(value) => {
                  setStageId(value);
                  const nextStage = application.posting?.stages?.find(
                    (item) => item.id === value,
                  );
                  setStatusId(
                    nextStage?.statuses.find((item) => item.isDefault)?.id ||
                      nextStage?.statuses[0]?.id ||
                      "",
                  );
                }}
              >
                <SelectTrigger
                  className="w-full"
                  title={locked ? FINAL_RESULT_LOCK_MESSAGE : undefined}
                >
                  <SelectValue placeholder="단계 선택" />
                </SelectTrigger>
                <SelectContent>
                  {(application.posting?.stages || []).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>단계 상태</Label>
              <Select
                value={statusId}
                disabled={locked || !stage}
                onValueChange={setStatusId}
              >
                <SelectTrigger
                  className="w-full"
                  title={locked ? FINAL_RESULT_LOCK_MESSAGE : undefined}
                >
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  {(stage?.statuses || []).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <Label htmlFor="transition-reason">변경 사유</Label>
            <Input
              id="transition-reason"
              disabled={locked}
              value={transitionReason}
              onChange={(event) => setTransitionReason(event.target.value)}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              disabled={locked || !stageId || !statusId || mutation.isPending}
              onClick={() => {
                if (status?.hasDateInput) {
                  setRecordAutoSend(true);
                  setRecordOpen(true);
                } else {
                  void saveTransition();
                }
              }}
            >
              상태 변경
            </Button>
            {(status?.hasDateInput || record?.meta) && (
              <Button
                variant="outline"
                disabled={locked && !record?.meta}
                onClick={() => {
                  setRecordAutoSend(false);
                  setRecordOpen(true);
                }}
              >
                <Clock3 /> 기록 {record?.meta ? "확인·수정" : "입력"}
              </Button>
            )}
            {record?.meta?.send && (
              <SendRecordIndicator send={record.meta.send} />
            )}
          </div>
        </section>

        <section className="careers-panel p-5">
          <h2 className="font-semibold">최종 결과</h2>
          <p className="mt-1 text-sm text-zinc-600">
            전형 이력과 분리된 최종 합격·불합격 판정입니다.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span
              className={
                application.finalResult?.result === "hired"
                  ? "font-semibold text-emerald-700"
                  : application.finalResult?.result === "rejected"
                    ? "font-semibold text-red-700"
                    : "text-sm text-slate-500"
              }
            >
              {application.finalResult?.result === "hired"
                ? "합격"
                : application.finalResult?.result === "rejected"
                  ? "불합격"
                  : "미정"}
            </span>
            <Button variant="outline" onClick={() => setResultOpen(true)}>
              결과 {application.finalResult ? "수정" : "지정"}
            </Button>
          </div>
        </section>

        <section className="careers-panel p-5">
          <h2 className="font-semibold">메모·별도 관리</h2>
          <p className="mt-1 text-sm text-zinc-600">
            지원자 메모와 일반 전형에서 분리할 사유를 관리합니다.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setMemoOpen(true)}>
              <MessageSquare /> 메모
            </Button>
            {application.applicationStatus === "separated" ? (
              <Button
                variant="outline"
                disabled={mutation.isPending}
                onClick={() =>
                  void run(
                    () => careersApi.restore(application.id),
                    "진행 전형으로 복원했습니다.",
                  )
                }
              >
                <RotateCcw /> 복원
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setSeparationOpen(true)}>
                <UserX /> 별도 관리로 이동
              </Button>
            )}
          </div>
        </section>

        <section className="careers-panel p-5">
          <h2 className="font-semibold">메시지 기록</h2>
          <p className="mt-1 text-sm text-zinc-600">
            외부 발송 없이 실제 작성한 제목과 본문을 보존합니다.
          </p>
          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="message-subject">제목</Label>
              <Input
                id="message-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message-body">본문</Label>
              <Textarea
                id="message-body"
                rows={4}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </div>
          </div>
          <Button
            variant="outline"
            className="mt-4"
            disabled={!subject.trim() || !message.trim() || mutation.isPending}
            onClick={() =>
              void run(
                () =>
                  careersApi.recordMessage(application.id, {
                    subject,
                    body: message,
                  }),
                "메시지 기록을 저장했습니다.",
              ).then((saved) => {
                if (saved) {
                  setSubject("");
                  setMessage("");
                }
              })
            }
          >
            <MailPlus /> 기록 저장
          </Button>
        </section>

        <section className="careers-panel p-5 xl:col-span-2">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-semibold">첨부파일</h2>
              <p className="mt-1 text-sm text-zinc-600">
                PDF, 문서, 일반 이미지를 파일당 20 MiB까지 업로드할 수 있습니다.
              </p>
            </div>
            <input
              ref={fileRef}
              className="sr-only"
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void run(
                  () => careersApi.uploadFile(application.id, file),
                  "파일을 업로드했습니다.",
                );
                event.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload /> 파일 업로드
            </Button>
          </div>
          {application.files.length === 0 ? (
            <p className="mt-5 rounded-md bg-zinc-50 py-8 text-center text-sm text-zinc-500">
              등록된 첨부파일이 없습니다.
            </p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {application.files.map((file) => (
                <div key={file.id} className="flex items-center gap-3 py-3">
                  <FileText className="size-4 text-zinc-500" aria-hidden />
                  <a
                    href={`/api/files/${file.id}`}
                    className="min-w-0 flex-1 truncate font-medium hover:underline"
                  >
                    {file.originalName}
                  </a>
                  <span className="text-xs text-zinc-500">
                    {(file.sizeBytes / 1024).toFixed(0)} KiB
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={mutation.isPending}
                    onClick={() =>
                      void run(
                        () => careersApi.deleteFile(file.id),
                        "파일을 삭제했습니다.",
                      )
                    }
                  >
                    삭제
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="careers-panel p-5 xl:col-span-2">
          <h2 className="font-semibold text-red-800">지원자 삭제</h2>
          <p className="mt-1 text-sm text-zinc-600">
            목록에서는 숨겨지지만 감사 이력은 유지됩니다.
          </p>
          <Button
            variant="destructive"
            className="mt-4"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 /> 지원자 삭제
          </Button>
        </section>
      </div>

      {recordOpen && stage && status && (
        <StageRecordDialog
          key={`${stage.id}-${status.id}`}
          open
          onOpenChange={setRecordOpen}
          stageName={stage.name}
          initialValue={record?.meta}
          readOnly={locked}
          pending={mutation.isPending}
          sendContext={{
            autoSend: stage.autoSend,
            applicantName: application.applicantName,
            stageName: stage.name,
            positionName: application.field || application.postingTitle,
            existingSend: record?.meta?.send,
            autoSendOnSubmit: recordAutoSend,
          }}
          onSave={(meta, sendIntent) => void saveTransition(meta, sendIntent)}
        />
      )}
      {resultOpen && (
        <FinalResultDialog
          open
          onOpenChange={setResultOpen}
          applicantName={application.applicantName}
          initialValue={
            application.finalResult
              ? {
                  result: application.finalResult.result,
                  reason: application.finalResult.reason || undefined,
                }
              : null
          }
          pending={mutation.isPending}
          onSave={(value) =>
            void run(
              () => careersApi.finalResult(application.id, value),
              "최종 결과를 저장했습니다.",
            ).then((saved) => saved && setResultOpen(false))
          }
          onClear={() =>
            void run(
              () => careersApi.clearFinalResult(application.id),
              "최종 결과 판정을 해제했습니다.",
            ).then((saved) => saved && setResultOpen(false))
          }
        />
      )}
      {memoOpen && (
        <MemoDialog
          open
          onOpenChange={setMemoOpen}
          applicantName={application.applicantName}
          initialValue={application.applicantMemo || ""}
          pending={mutation.isPending}
          onSave={(memo) =>
            void run(
              () => careersApi.updateApplication(application.id, { memo }),
              "메모를 저장했습니다.",
            ).then((saved) => saved && setMemoOpen(false))
          }
        />
      )}
      {separationOpen && (
        <SeparationDialog
          open
          onOpenChange={setSeparationOpen}
          applicantName={application.applicantName}
          pending={mutation.isPending}
          onSave={(reason) =>
            void run(
              () => careersApi.separate(application.id, reason),
              "별도 관리로 이동했습니다.",
            ).then((saved) => saved && setSeparationOpen(false))
          }
        />
      )}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>지원자를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              일반 목록에서는 숨겨지지만 감사 이력은 유지됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() =>
                void run(
                  () => careersApi.softDeleteApplication(application.id),
                  "지원자를 삭제했습니다.",
                ).then((deleted) => {
                  if (deleted) router.push("/applicants");
                })
              }
            >
              <Trash2 className="size-4" /> 삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
