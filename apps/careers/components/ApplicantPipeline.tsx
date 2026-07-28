"use client";

import { GripVertical, LockKeyhole, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { toast } from "@repo/ui/src/sonner";
import {
  careersApi,
  careersKeys,
  type ApplicationSummary,
  type JobPosting,
  type PostingStage,
  type StageStatus,
  useCareersMutation,
} from "@/hooks/useCareersApi";
import {
  SendRecordIndicator,
  StageRecordDialog,
  type StageRecordMetaInput,
} from "./ApplicantDialogs";

const FINAL_RESULT_LOCK_MESSAGE =
  "최종 결과가 지정되어 전형이 종료된 지원자입니다.";

type MoveTarget = {
  application: ApplicationSummary;
  stage: PostingStage;
  status: StageStatus;
};

export function ApplicantPipeline({
  posting,
  columns,
}: {
  posting: JobPosting;
  columns: Array<{
    stage: PostingStage;
    applications: ApplicationSummary[];
  }>;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);
  const mutation = useCareersMutation(
    ({
      applicationId,
      stageId,
      statusId,
      meta,
      sendIntent,
    }: {
      applicationId: string;
      stageId: string;
      statusId: string;
      meta?: StageRecordMetaInput;
      sendIntent?: "auto" | "manual" | "preserve";
    }) =>
      careersApi.transition(applicationId, {
        stageId,
        statusId,
        meta,
        sendIntent,
      }),
    [careersKeys.pipeline(posting.id), careersKeys.applications()],
  );

  const applications = columns.flatMap((column) => column.applications);

  async function commitMove(
    application: ApplicationSummary,
    stage: PostingStage,
    status: StageStatus,
    meta?: StageRecordMetaInput,
    sendIntent: "auto" | "manual" | "preserve" = "preserve",
  ) {
    try {
      await mutation.mutateAsync({
        applicationId: application.id,
        stageId: stage.id,
        statusId: status.id,
        meta,
        sendIntent,
      });
      toast.success(`${stage.name} 단계로 이동했습니다.`);
      setMoveTarget(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "이동하지 못했습니다.",
      );
    }
  }

  function requestMove(application: ApplicationSummary, stage: PostingStage) {
    if (application.finalResult) {
      toast.error(FINAL_RESULT_LOCK_MESSAGE);
      return;
    }
    const orderedStatuses = [...stage.statuses].sort(
      (left, right) => left.displayOrder - right.displayOrder,
    );
    const status =
      orderedStatuses.find((candidate) => !candidate.isDefault) ||
      orderedStatuses[0];
    if (!status) {
      toast.error("이 단계에 시작 상태가 없습니다.");
      return;
    }
    if (status.hasDateInput) {
      setMoveTarget({ application, stage, status });
      return;
    }
    void commitMove(application, stage, status);
  }

  return (
    <>
      <div className="grid snap-x grid-flow-col auto-cols-[minmax(280px,1fr)] gap-3 overflow-x-auto pb-3 xl:grid-flow-row xl:grid-cols-4">
        {columns.map((column) => (
          <section
            key={column.stage.id}
            className={
              overStageId === column.stage.id
                ? "min-h-64 snap-start rounded-xl bg-blue-50 ring-2 ring-blue-200"
                : "min-h-64 snap-start rounded-xl bg-white"
            }
            onDragOver={(event) => {
              event.preventDefault();
              setOverStageId(column.stage.id);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setOverStageId(null);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              const droppedId =
                event.dataTransfer.getData("text/plain") || draggingId;
              const application = applications.find(
                (candidate) => candidate.id === droppedId,
              );
              setDraggingId(null);
              setOverStageId(null);
              if (application && application.stageId !== column.stage.id) {
                requestMove(application, column.stage);
              }
            }}
          >
            <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-800">
                {column.stage.name}
              </h2>
              <span className="text-xs text-slate-400">
                {column.applications.length}명
              </span>
            </header>
            <div className="space-y-2 p-3">
              {column.applications.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  지원자 없음
                </p>
              ) : (
                column.applications.map((application) => {
                  const locked = Boolean(application.finalResult);
                  const record = application.stageRecords?.find(
                    (candidate) => candidate.stageId === column.stage.id,
                  );
                  return (
                    <article
                      key={application.id}
                      draggable={!locked && !mutation.isPending}
                      className={
                        draggingId === application.id
                          ? "rounded-lg bg-slate-50 p-3 opacity-40"
                          : locked
                            ? "rounded-lg bg-slate-50 p-3 opacity-60"
                            : "cursor-grab rounded-lg bg-slate-50 p-3 active:cursor-grabbing"
                      }
                      title={locked ? FINAL_RESULT_LOCK_MESSAGE : undefined}
                      onDragStart={(event) => {
                        setDraggingId(application.id);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData(
                          "text/plain",
                          application.id,
                        );
                      }}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setOverStageId(null);
                      }}
                    >
                      <div className="flex items-start gap-2">
                        {locked ? (
                          <LockKeyhole className="mt-0.5 size-4 shrink-0 text-slate-400" />
                        ) : (
                          <GripVertical className="mt-0.5 size-4 shrink-0 text-slate-300" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/applicants/${application.id}`}
                              className="truncate text-sm font-medium text-slate-800 hover:underline"
                            >
                              {application.applicantName}
                            </Link>
                            {application.finalResult && (
                              <span
                                className={
                                  application.finalResult.result === "hired"
                                    ? "text-[11px] font-semibold text-emerald-700"
                                    : "text-[11px] font-semibold text-red-700"
                                }
                              >
                                {application.finalResult.result === "hired"
                                  ? "합격"
                                  : "불합격"}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-400">
                            {application.email || application.phone || "-"}
                          </p>
                        </div>
                        {application.memo && (
                          <MessageSquare
                            className="size-3.5 shrink-0 text-slate-400"
                            aria-label="메모 있음"
                          />
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-xs text-slate-500">
                          {application.statusName || "상태 미지정"}
                        </span>
                        {record?.meta?.send && (
                          <SendRecordIndicator send={record.meta.send} />
                        )}
                        <Select
                          value={column.stage.id}
                          disabled={locked || mutation.isPending}
                          onValueChange={(stageId) => {
                            const stage = columns.find(
                              (candidate) => candidate.stage.id === stageId,
                            )?.stage;
                            if (stage) requestMove(application, stage);
                          }}
                        >
                          <SelectTrigger
                            className="h-7 w-24 text-xs"
                            aria-label={`${application.applicantName} 단계 이동`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {columns.map((candidate) => (
                              <SelectItem
                                key={candidate.stage.id}
                                value={candidate.stage.id}
                              >
                                {candidate.stage.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        ))}
      </div>
      {moveTarget && (
        <StageRecordDialog
          key={`${moveTarget.application.id}-${moveTarget.stage.id}`}
          open
          onOpenChange={(open) => !open && setMoveTarget(null)}
          stageName={moveTarget.stage.name}
          pending={mutation.isPending}
          sendContext={{
            autoSend: moveTarget.stage.autoSend,
            applicantName: moveTarget.application.applicantName,
            stageName: moveTarget.stage.name,
            positionName:
              moveTarget.application.field ||
              moveTarget.application.postingTitle,
            existingSend: moveTarget.application.stageRecords?.find(
              (record) => record.stageId === moveTarget.stage.id,
            )?.meta?.send,
            autoSendOnSubmit: true,
          }}
          onSave={(meta, sendIntent) =>
            void commitMove(
              moveTarget.application,
              moveTarget.stage,
              moveTarget.status,
              meta,
              sendIntent,
            )
          }
        />
      )}
    </>
  );
}
