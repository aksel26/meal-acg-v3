"use client";

import { ChevronDown, Clock3, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@repo/ui/src/button";
import { toast } from "@repo/ui/src/sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/src/tooltip";
import { STATUS_COLORS } from "@/components/postingProcess";
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
  MemoDialog,
  SendRecordIndicator,
  StageRecordDialog,
  type StageRecordMetaInput,
} from "./ApplicantDialogs";

const FINAL_RESULT_LOCK_MESSAGE =
  "최종 결과가 지정되어 전형이 종료된 지원자입니다.";

type Section = {
  posting: JobPosting;
  applications: ApplicationSummary[];
  pendingCount: number;
};

type RecordTarget = {
  application: ApplicationSummary;
  stage: PostingStage;
  status: StageStatus;
  record?: StageRecord;
};

function statusColor(id: string) {
  return STATUS_COLORS.find((color) => color.id === id)?.hex ?? "#71717a";
}

function sortedStages(application: ApplicationSummary) {
  return [...(application.posting?.stages || [])].sort(
    (left, right) => left.displayOrder - right.displayOrder,
  );
}

function statusFor(application: ApplicationSummary, stage: PostingStage) {
  const record = application.stageRecords?.find(
    (candidate) => candidate.stageId === stage.id,
  );
  return (
    stage.statuses.find((candidate) => candidate.id === record?.statusId) ||
    stage.statuses.find((candidate) => candidate.isDefault) ||
    stage.statuses[0]
  );
}

function currentStage(application: ApplicationSummary) {
  const stages = sortedStages(application);
  let current = stages[0];
  for (const stage of stages) {
    if (statusFor(application, stage)?.isDefault === false) current = stage;
  }
  return current;
}

function hasMeta(record?: StageRecord) {
  return Boolean(
    record?.meta &&
      (record.meta.startDate ||
        record.meta.endDate ||
        record.meta.time ||
        record.meta.note ||
        record.meta.send),
  );
}

function needsNotice(application: ApplicationSummary) {
  const stage = currentStage(application);
  if (!stage) return false;
  const status = statusFor(application, stage);
  const record = application.stageRecords?.find(
    (candidate) => candidate.stageId === stage.id,
  );
  return Boolean(status?.hasDateInput && !hasMeta(record));
}

function sortApplications(applications: ApplicationSummary[]) {
  const rank = (application: ApplicationSummary) => {
    if (application.finalResult) return 2;
    return needsNotice(application) ? 0 : 1;
  };
  return [...applications].sort(
    (left, right) =>
      rank(left) - rank(right) || right.appliedAt.localeCompare(left.appliedAt),
  );
}

export function ApplicantGroupedView({
  applications,
  postings,
}: {
  applications: ApplicationSummary[];
  postings: JobPosting[];
}) {
  const router = useRouter();
  const [recordTarget, setRecordTarget] = useState<RecordTarget | null>(null);
  const [memoTarget, setMemoTarget] = useState<ApplicationSummary | null>(null);
  const mutation = useCareersMutation(
    (action: () => Promise<unknown>) => action(),
    [careersKeys.all],
  );
  const sections = useMemo(() => {
    return postings
      .map((posting) => {
        const items = applications.filter(
          (application) => application.postingId === posting.id,
        );
        const detailedPosting = items.find(
          (application) => application.posting,
        )?.posting;
        return {
          posting: detailedPosting || posting,
          applications: sortApplications(items),
          pendingCount: items.filter((item) => !item.finalResult).length,
        };
      })
      .filter((section) => section.applications.length > 0);
  }, [applications, postings]);
  const activeSections = sections
    .filter((section) => section.posting.derivedStatus === "진행중")
    .sort((left, right) =>
      (left.posting.endDate || "9999-12-31").localeCompare(
        right.posting.endDate || "9999-12-31",
      ),
    );
  const endedSections = sections
    .filter((section) => section.posting.derivedStatus === "종료")
    .sort((left, right) =>
      (left.posting.endDate || "9999-12-31").localeCompare(
        right.posting.endDate || "9999-12-31",
      ),
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

  if (sections.length === 0) return null;

  return (
    <>
      <div className="space-y-5">
        {activeSections.map((section) => (
          <SectionBlock
            key={section.posting.id}
            section={section}
            onOpen={(application) =>
              router.push(`/applicants/${application.id}`)
            }
            onRecord={setRecordTarget}
            onMemo={setMemoTarget}
          />
        ))}
        {endedSections.length > 0 && (
          <details className="group overflow-hidden rounded-xl bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm text-slate-500">
              종료된 공고 ({endedSections.length})
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-5 border-t border-slate-100 pt-5">
              {endedSections.map((section) => (
                <SectionBlock
                  key={section.posting.id}
                  section={section}
                  onOpen={(application) =>
                    router.push(`/applicants/${application.id}`)
                  }
                  onRecord={setRecordTarget}
                  onMemo={setMemoTarget}
                />
              ))}
            </div>
          </details>
        )}
      </div>

      {recordTarget && (
        <StageRecordDialog
          key={`${recordTarget.application.id}-${recordTarget.stage.id}`}
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
            autoSendOnSubmit: false,
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
    </>
  );
}

function SectionBlock({
  section,
  onOpen,
  onRecord,
  onMemo,
}: {
  section: Section;
  onOpen: (application: ApplicationSummary) => void;
  onRecord: (target: RecordTarget) => void;
  onMemo: (application: ApplicationSummary) => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={
              section.posting.derivedStatus === "진행중"
                ? "rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                : "rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500"
            }
          >
            {section.posting.derivedStatus}
          </span>
          <h2 className="truncate text-sm font-semibold text-slate-800">
            {section.posting.title}
          </h2>
          <span className="text-xs text-slate-400">
            {section.posting.field}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>지원자 {section.applications.length}명</span>
          {section.pendingCount > 0 && (
            <span className="rounded bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
              처리 필요 {section.pendingCount}
            </span>
          )}
        </div>
      </header>
      <div className="divide-y divide-slate-100">
        {section.applications.map((application) => (
          <ApplicantCard
            key={application.id}
            application={application}
            onOpen={onOpen}
            onRecord={onRecord}
            onMemo={onMemo}
          />
        ))}
      </div>
    </section>
  );
}

function ApplicantCard({
  application,
  onOpen,
  onRecord,
  onMemo,
}: {
  application: ApplicationSummary;
  onOpen: (application: ApplicationSummary) => void;
  onRecord: (target: RecordTarget) => void;
  onMemo: (application: ApplicationSummary) => void;
}) {
  const locked = Boolean(application.finalResult);
  const stage = currentStage(application);
  const status = stage ? statusFor(application, stage) : undefined;
  const record = stage
    ? application.stageRecords?.find(
        (candidate) => candidate.stageId === stage.id,
      )
    : undefined;
  const metaExists = hasMeta(record);
  const showClock = Boolean(status?.hasDateInput || metaExists);
  const clockDisabled = locked && !metaExists;

  return (
    <div
      role="link"
      tabIndex={0}
      className={
        locked
          ? "flex cursor-pointer items-center gap-3 px-4 py-3 opacity-60 hover:bg-slate-50"
          : "flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50"
      }
      onClick={() => onOpen(application)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(application);
        }
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-blue-700">
            {application.applicantName}
          </span>
          {application.finalResult && (
            <span
              className={
                application.finalResult.result === "hired"
                  ? "text-[11px] font-semibold text-emerald-700"
                  : "text-[11px] font-semibold text-red-700"
              }
            >
              {application.finalResult.result === "hired" ? "합격" : "불합격"}
            </span>
          )}
        </div>
        <span className="block truncate text-xs text-slate-400">
          {application.email || application.phone || "-"}
        </span>
      </div>

      {stage && status && (
        <span
          className="shrink-0 rounded-full px-2 py-1 text-[11px] font-medium text-white"
          style={{ backgroundColor: statusColor(status.color) }}
        >
          {stage.name} · {status.name}
        </span>
      )}

      <div
        className="flex shrink-0 items-center gap-1"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {showClock && stage && status && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={clockDisabled}
                className={metaExists ? "" : "text-slate-300"}
                onClick={() => onRecord({ application, stage, status, record })}
              >
                <Clock3 className="size-4" />
                <span className="sr-only">날짜·시간·메모 기록</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs space-y-1">
              {metaExists ? (
                <>
                  {record?.meta?.startDate && record.meta.endDate && (
                    <p>
                      기간: {record.meta.startDate} ~ {record.meta.endDate}
                    </p>
                  )}
                  {record?.meta?.time && <p>시간: {record.meta.time}</p>}
                  {record?.meta?.note && <p>메모: {record.meta.note}</p>}
                  <p>
                    {locked ? "클릭해서 확인 (열람만 가능)" : "클릭해서 수정"}
                  </p>
                </>
              ) : (
                <p>
                  {clockDisabled
                    ? FINAL_RESULT_LOCK_MESSAGE
                    : "클릭해서 날짜·시간·메모 입력"}
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        )}
        {record?.meta?.send && <SendRecordIndicator send={record.meta.send} />}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={application.memo ? "" : "text-slate-300"}
          onClick={() => onMemo(application)}
        >
          <MessageSquare className="size-4" />
          <span className="sr-only">메모 보기 또는 작성</span>
        </Button>
      </div>
    </div>
  );
}
