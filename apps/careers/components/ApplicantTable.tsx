"use client";

import {
  Clock3,
  MessageSquare,
  MoreHorizontal,
  Trash2,
  UserRoundCog,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
import {
  careersApi,
  careersKeys,
  type ApplicationSummary,
  type JobPosting,
  type PostingStage,
  type StageRecord,
  type StageStatus,
  useCareersMutation,
} from "@/hooks/useCareersApi";
import {
  FinalResultDialog,
  MemoDialog,
  SendRecordIndicator,
  SeparationDialog,
  StageRecordDialog,
  type StageRecordMetaInput,
} from "./ApplicantDialogs";

const FINAL_RESULT_LOCK_MESSAGE =
  "최종 결과가 지정되어 전형이 종료된 지원자입니다.";

function date(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

type StageTarget = {
  application: ApplicationSummary;
  stage: PostingStage;
  status: StageStatus;
  record?: StageRecord;
  autoSendOnSubmit: boolean;
};

export function ApplicantTable({
  applications,
  postings = [],
  separated = false,
}: {
  applications: ApplicationSummary[];
  postings?: JobPosting[];
  separated?: boolean;
}) {
  const [activeStage, setActiveStage] = useState<Record<string, string>>({});
  const [recordTarget, setRecordTarget] = useState<StageTarget | null>(null);
  const [memoTarget, setMemoTarget] = useState<ApplicationSummary | null>(null);
  const [resultTarget, setResultTarget] = useState<ApplicationSummary | null>(
    null,
  );
  const [separationTarget, setSeparationTarget] =
    useState<ApplicationSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApplicationSummary | null>(
    null,
  );
  const mutation = useCareersMutation(
    (action: () => Promise<unknown>) => action(),
    [careersKeys.all],
  );

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

  function postingOf(application: ApplicationSummary) {
    return (
      application.posting ||
      postings.find((posting) => posting.id === application.postingId)
    );
  }

  function selectedStage(application: ApplicationSummary) {
    const stages = postingOf(application)?.stages || [];
    return (
      stages.find(
        (stage) =>
          stage.id === (activeStage[application.id] || application.stageId),
      ) || stages[0]
    );
  }

  function recordOf(application: ApplicationSummary, stageId: string) {
    return application.stageRecords?.find(
      (record) => record.stageId === stageId,
    );
  }

  function changeStatus(
    application: ApplicationSummary,
    stage: PostingStage,
    status: StageStatus,
  ) {
    const record = recordOf(application, stage.id);
    if (status.hasDateInput) {
      setRecordTarget({
        application,
        stage,
        status,
        record,
        autoSendOnSubmit: true,
      });
      return;
    }
    void run(
      () =>
        careersApi.transition(application.id, {
          stageId: stage.id,
          statusId: status.id,
        }),
      "전형 상태를 변경했습니다.",
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl bg-white">
        <Table className="min-w-[1080px]">
          <TableHeader className="sticky top-0 z-10 bg-white">
            <TableRow className="border-b border-slate-100 bg-white hover:bg-white [&>th]:h-auto [&>th]:px-3 [&>th]:py-2 [&>th]:text-xs [&>th]:font-medium [&>th]:text-slate-400">
              <TableHead className="w-16 text-center">번호</TableHead>
              <TableHead className="text-left">지원자</TableHead>
              <TableHead className="text-left">공고</TableHead>
              {separated ? (
                <>
                  <TableHead className="w-56 text-left">
                    별도 관리 사유
                  </TableHead>
                  <TableHead className="w-40 text-left">당시 전형</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="w-40 text-left">전형</TableHead>
                  <TableHead className="w-56 text-left">상태·기록</TableHead>
                </>
              )}
              <TableHead className="w-24 text-center">최종 결과</TableHead>
              <TableHead className="w-28 text-center">
                {separated ? "이동일" : "지원일"}
              </TableHead>
              <TableHead className="w-24 text-center">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((application) => {
              const posting = postingOf(application);
              const stages = posting?.stages || [];
              const stage = selectedStage(application);
              const record = stage
                ? recordOf(application, stage.id)
                : undefined;
              const status =
                stage?.statuses.find(
                  (candidate) =>
                    candidate.id ===
                    (record?.statusId ||
                      (stage.id === application.stageId
                        ? application.statusId
                        : undefined)),
                ) || stage?.statuses[0];
              const locked = Boolean(application.finalResult);
              const hasMeta = Boolean(
                record?.meta &&
                  (record.meta.startDate ||
                    record.meta.endDate ||
                    record.meta.time ||
                    record.meta.note ||
                    record.meta.send),
              );

              return (
                <TableRow
                  key={application.id}
                  className="border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50 [&>td]:px-3 [&>td]:py-3"
                >
                  <TableCell className="text-center text-xs text-slate-400">
                    {application.no || "-"}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/applicants/${application.id}`}
                      className="font-medium text-slate-800 hover:text-slate-900 hover:underline"
                    >
                      {application.applicantName}
                    </Link>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {application.email || "-"} / {application.phone || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    <div className="font-medium text-slate-700">
                      {application.postingTitle}
                    </div>
                    <div className="text-xs text-slate-400">
                      {application.field || application.department}
                    </div>
                  </TableCell>
                  {separated ? (
                    <>
                      <TableCell className="text-sm text-slate-600">
                        <button
                          type="button"
                          className="text-left hover:underline"
                          onClick={() => setSeparationTarget(application)}
                        >
                          {application.separatedReason || "사유 없음"}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {application.stageName || "미지정"}
                        {application.statusName && (
                          <div className="text-xs text-slate-400">
                            {application.statusName}
                          </div>
                        )}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <Select
                          value={stage?.id || ""}
                          disabled={locked || stages.length === 0}
                          onValueChange={(value) =>
                            setActiveStage((current) => ({
                              ...current,
                              [application.id]: value,
                            }))
                          }
                        >
                          <SelectTrigger
                            className="h-8 w-full"
                            title={
                              locked ? FINAL_RESULT_LOCK_MESSAGE : undefined
                            }
                          >
                            <SelectValue placeholder="단계 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {stages.map((candidate) => (
                              <SelectItem
                                key={candidate.id}
                                value={candidate.id}
                              >
                                {candidate.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Select
                            value={status?.id || ""}
                            disabled={locked || !stage}
                            onValueChange={(value) => {
                              const next = stage?.statuses.find(
                                (candidate) => candidate.id === value,
                              );
                              if (stage && next)
                                changeStatus(application, stage, next);
                            }}
                          >
                            <SelectTrigger
                              className="h-8 min-w-32 flex-1"
                              title={
                                locked ? FINAL_RESULT_LOCK_MESSAGE : undefined
                              }
                            >
                              <SelectValue placeholder="상태 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {(stage?.statuses || []).map((candidate) => (
                                <SelectItem
                                  key={candidate.id}
                                  value={candidate.id}
                                >
                                  {candidate.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {(status?.hasDateInput || hasMeta) &&
                            stage &&
                            status && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={hasMeta ? "" : "text-slate-300"}
                                disabled={locked && !hasMeta}
                                title={
                                  locked && !hasMeta
                                    ? FINAL_RESULT_LOCK_MESSAGE
                                    : "날짜·시간·메모"
                                }
                                onClick={() =>
                                  setRecordTarget({
                                    application,
                                    stage,
                                    status,
                                    record,
                                    autoSendOnSubmit: false,
                                  })
                                }
                              >
                                <Clock3 className="size-4" />
                              </Button>
                            )}
                          {record?.meta?.send && (
                            <SendRecordIndicator send={record.meta.send} />
                          )}
                        </div>
                      </TableCell>
                    </>
                  )}
                  <TableCell className="text-center">
                    <button
                      type="button"
                      className={
                        application.finalResult
                          ? application.finalResult.result === "hired"
                            ? "text-xs font-semibold text-emerald-700"
                            : "text-xs font-semibold text-red-700"
                          : "text-xs text-slate-400 underline"
                      }
                      onClick={() => setResultTarget(application)}
                    >
                      {application.finalResult
                        ? application.finalResult.result === "hired"
                          ? "합격"
                          : "불합격"
                        : "미정"}
                    </button>
                  </TableCell>
                  <TableCell className="text-center text-sm text-slate-500">
                    {date(
                      separated
                        ? application.separatedAt
                        : application.appliedAt,
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="메모"
                        onClick={() => setMemoTarget(application)}
                      >
                        <MessageSquare
                          className={
                            application.memo
                              ? "size-4 text-slate-600"
                              : "size-4 text-slate-300"
                          }
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title={separated ? "복원" : "별도 관리"}
                        onClick={() => {
                          if (separated) {
                            void run(
                              () => careersApi.restore(application.id),
                              "지원자 목록으로 복원했습니다.",
                            );
                          } else {
                            setSeparationTarget(application);
                          }
                        }}
                      >
                        <UserRoundCog className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="삭제"
                        onClick={() => setDeleteTarget(application)}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {recordTarget && (
        <StageRecordDialog
          key={`${recordTarget.application.id}-${recordTarget.stage.id}-${recordTarget.status.id}`}
          open
          onOpenChange={(open) => !open && setRecordTarget(null)}
          stageName={recordTarget.stage.name}
          initialValue={recordTarget.record?.meta}
          readOnly={Boolean(recordTarget.application.finalResult)}
          pending={mutation.isPending}
          sendContext={{
            autoSend: recordTarget.stage.autoSend,
            applicantName: recordTarget.application.applicantName,
            stageName: recordTarget.stage.name,
            positionName:
              recordTarget.application.field ||
              recordTarget.application.postingTitle,
            existingSend: recordTarget.record?.meta?.send,
            autoSendOnSubmit: recordTarget.autoSendOnSubmit,
          }}
          onSave={(meta: StageRecordMetaInput, sendIntent) => {
            void run(
              () =>
                careersApi.transition(recordTarget.application.id, {
                  stageId: recordTarget.stage.id,
                  statusId: recordTarget.status.id,
                  meta: {
                    ...recordTarget.record?.meta,
                    ...meta,
                  },
                  sendIntent,
                }),
              "전형 기록을 저장했습니다.",
            ).then((saved) => saved && setRecordTarget(null));
          }}
        />
      )}
      {memoTarget && (
        <MemoDialog
          key={memoTarget.id}
          open
          onOpenChange={(open) => !open && setMemoTarget(null)}
          applicantName={memoTarget.applicantName}
          initialValue={memoTarget.memo || ""}
          pending={mutation.isPending}
          onSave={(memo) => {
            void run(
              () => careersApi.updateApplication(memoTarget.id, { memo }),
              "메모를 저장했습니다.",
            ).then((saved) => saved && setMemoTarget(null));
          }}
        />
      )}
      {resultTarget && (
        <FinalResultDialog
          key={resultTarget.id}
          open
          onOpenChange={(open) => !open && setResultTarget(null)}
          applicantName={resultTarget.applicantName}
          initialValue={
            resultTarget.finalResult
              ? {
                  result: resultTarget.finalResult.result,
                  reason: resultTarget.finalResult.reason || undefined,
                }
              : null
          }
          pending={mutation.isPending}
          onSave={(value) => {
            void run(
              () => careersApi.finalResult(resultTarget.id, value),
              "최종 결과를 저장했습니다.",
            ).then((saved) => saved && setResultTarget(null));
          }}
          onClear={() => {
            void run(
              () => careersApi.clearFinalResult(resultTarget.id),
              "최종 결과 판정을 해제했습니다.",
            ).then((saved) => saved && setResultTarget(null));
          }}
        />
      )}
      {separationTarget && (
        <SeparationDialog
          key={separationTarget.id}
          open
          onOpenChange={(open) => !open && setSeparationTarget(null)}
          applicantName={separationTarget.applicantName}
          initialValue={separationTarget.separatedReason || ""}
          edit={separated}
          pending={mutation.isPending}
          onSave={(reason) => {
            const action = separated
              ? careersApi.updateSeparationReason(separationTarget.id, reason)
              : careersApi.separate(separationTarget.id, reason);
            void run(
              () => action,
              separated
                ? "별도 관리 사유를 수정했습니다."
                : "별도 관리로 이동했습니다.",
            ).then((saved) => saved && setSeparationTarget(null));
          }}
        />
      )}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
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
              onClick={() => {
                if (!deleteTarget) return;
                void run(
                  () => careersApi.softDeleteApplication(deleteTarget.id),
                  "지원자를 삭제했습니다.",
                ).then((saved) => saved && setDeleteTarget(null));
              }}
            >
              <Trash2 className="size-4" /> 삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
