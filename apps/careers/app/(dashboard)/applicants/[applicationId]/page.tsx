"use client";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  FileText,
  MailCheck,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@repo/ui/src/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/src/tabs";
import { ApplicationActions } from "@/components/ApplicationActions";
import { ApplicationFormDialog } from "@/components/ApplicationFormDialog";
import { SendRecordIndicator } from "@/components/ApplicantDialogs";
import { CareersStatusBadge } from "@/components/CareersStatusBadge";
import { PageError, PageLoading } from "@/components/PageStates";
import { getCurrentStage } from "@/lib/careers/parity";
import {
  type ApplicationDetail,
  type PostingStage,
  type StageRecord,
  useApplication,
} from "@/hooks/useCareersApi";

function dateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function ApplicantDetailPage() {
  const params = useParams<{ applicationId: string }>();
  const [editOpen, setEditOpen] = useState(false);
  const query = useApplication(params.applicationId);

  if (query.isLoading)
    return (
      <div className="careers-page">
        <PageLoading />
      </div>
    );
  if (query.isError || !query.data) {
    return (
      <div className="careers-page">
        <PageError
          message={query.error?.message}
          onRetry={() => query.refetch()}
        />
      </div>
    );
  }

  const application = query.data;
  const stages = [...(application.posting?.stages || [])].sort(
    (left, right) => left.displayOrder - right.displayOrder,
  );

  return (
    <div className="careers-page">
      <Link
        href="/applicants"
        className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:underline"
      >
        <ArrowLeft className="size-4" /> 지원자 목록
      </Link>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CareersStatusBadge value={application.applicationStatus} />
            {application.finalResult && (
              <CareersStatusBadge value={application.finalResult.result} />
            )}
            <span className="text-xs text-slate-400">
              #{application.no || "-"} · {application.submissionStatus}
            </span>
          </div>
          <h1 className="mt-2 text-xl font-semibold">
            {application.applicantName}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {application.postingTitle} /{" "}
            {application.field || application.department}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <p className="text-sm text-zinc-500">
            지원일 {dateTime(application.appliedAt)}
          </p>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil /> 지원자 정보 수정
          </Button>
        </div>
      </div>

      <ProgressStepper stages={stages} records={application.stageRecords} />

      <Tabs defaultValue="profile" className="mt-5">
        <TabsList className="bg-slate-50">
          <TabsTrigger value="profile">기본 정보</TabsTrigger>
          <TabsTrigger value="resume">이력서</TabsTrigger>
          <TabsTrigger value="cover-letter">자기소개서</TabsTrigger>
          <TabsTrigger value="records">기록</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <section className="careers-panel grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="지원 플랫폼" value={application.platform || "-"} />
            <Detail label="성별" value={application.gender || "-"} />
            <Detail label="생년월일" value={application.birthDate || "-"} />
            <Detail label="지역" value={application.region || "-"} />
            <Detail
              label="이메일"
              value={application.email || "-"}
              href={
                application.email ? `mailto:${application.email}` : undefined
              }
            />
            <Detail
              label="연락처"
              value={application.phone || "-"}
              href={application.phone ? `tel:${application.phone}` : undefined}
            />
            <Detail label="세부 지역" value={application.regionDetail || "-"} />
            <Detail label="주소" value={application.address || "-"} />
            <div className="sm:col-span-2 lg:col-span-4">
              <p className="text-xs text-zinc-500">메모</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">
                {application.applicantMemo || "등록된 메모가 없습니다."}
              </p>
            </div>
          </section>
        </TabsContent>
        <TabsContent value="resume">
          <Resume application={application} />
        </TabsContent>
        <TabsContent value="cover-letter">
          <CoverLetter application={application} />
        </TabsContent>
        <TabsContent value="records">
          <RecordPanels application={application} />
        </TabsContent>
      </Tabs>

      {application.separation && (
        <section className="careers-panel mt-5 p-5">
          <h2 className="font-semibold">별도 관리 이동 당시 상태</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailTerm
              label="이동 사유"
              value={application.separation.reason}
            />
            <DetailTerm
              label="이동 시각"
              value={dateTime(application.separation.separatedAt)}
            />
            <DetailTerm
              label="당시 전형 단계"
              value={application.separation.snapshot.stage?.name || "미지정"}
            />
            <DetailTerm
              label="당시 단계 상태"
              value={
                application.separation.snapshot.stageStatus?.name || "미지정"
              }
            />
          </dl>
        </section>
      )}

      <div className="mt-5">
        <ApplicationActions application={application} />
      </div>
      <ApplicationFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        application={application}
      />
    </div>
  );
}

function ProgressStepper({
  stages,
  records,
}: {
  stages: PostingStage[];
  records: StageRecord[];
}) {
  if (stages.length === 0) return null;

  const orderedStages = [...stages].sort(
    (left, right) => left.displayOrder - right.displayOrder,
  );
  const currentStage = getCurrentStage(
    records,
    orderedStages.map((stage) => ({
      ...stage,
      order: stage.displayOrder,
    })),
  );
  const currentIndex = orderedStages.findIndex(
    (stage) => stage.id === currentStage?.id,
  );

  return (
    <section className="careers-panel mt-5 overflow-x-auto p-5">
      <div className="flex min-w-max items-start">
        {orderedStages.map((stage, index) => {
          const record = records.find((item) => item.stageId === stage.id);
          const status =
            stage.statuses.find((item) => item.id === record?.statusId) ||
            stage.statuses.find((item) => item.isDefault) ||
            stage.statuses[0];
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <div
              key={stage.id}
              className="relative flex w-44 flex-col items-center px-3 text-center"
            >
              {index < stages.length - 1 && (
                <span
                  className={
                    index < currentIndex
                      ? "absolute left-1/2 top-3 h-0.5 w-full bg-blue-300"
                      : "absolute left-1/2 top-3 h-0.5 w-full bg-slate-100"
                  }
                />
              )}
              <span
                className={
                  isCurrent
                    ? "relative z-10 flex size-6 items-center justify-center rounded-full bg-blue-600 ring-4 ring-white"
                    : isPast
                      ? "relative z-10 flex size-6 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white"
                      : "relative z-10 size-6 rounded-full border border-slate-200 bg-white ring-4 ring-white"
                }
              >
                {isPast && <Check className="size-4 text-white" />}
                {isCurrent && <span className="size-2 rounded-full bg-white" />}
              </span>
              <p
                className={
                  isCurrent
                    ? "mt-2 text-sm font-semibold text-blue-700"
                    : isPast
                      ? "mt-2 text-sm font-medium text-slate-700"
                      : "mt-2 text-sm font-medium text-slate-300"
                }
              >
                {stage.name}
              </p>
              {isCurrent && (
                <p className="mt-0.5 text-xs font-medium text-blue-600">
                  {status?.name || "미지정"}
                </p>
              )}
              <div className="mt-1 flex items-center gap-1 text-slate-400">
                {record?.meta &&
                  (record.meta.startDate ||
                    record.meta.endDate ||
                    record.meta.time ||
                    record.meta.note) && (
                    <Clock3 className="size-3.5" aria-label="일정 기록 있음" />
                  )}
                {record?.meta?.send && (
                  <SendRecordIndicator
                    send={record.meta.send}
                    className="size-3.5 text-slate-400"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Resume({ application }: { application: ApplicationDetail }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <ResumeSection title="학력" empty={application.educations.length === 0}>
        {application.educations.map((item, index) => (
          <ResumeItem
            key={`${item.schoolName}-${index}`}
            title={`${item.schoolName} · ${item.major}`}
            detail={[
              item.degree,
              item.period,
              item.majorField,
              item.minor ? `부전공 ${item.minor}` : "",
              item.gpa ? `${item.gpa}/${item.gpaMax}` : "",
            ]
              .filter(Boolean)
              .join(" / ")}
          />
        ))}
      </ResumeSection>
      <ResumeSection
        title="자격증"
        empty={application.certificates.length === 0}
      >
        {application.certificates.map((item, index) => (
          <ResumeItem
            key={`${item.name}-${index}`}
            title={item.name}
            detail={[item.issuer, item.acquiredDate]
              .filter(Boolean)
              .join(" / ")}
          />
        ))}
      </ResumeSection>
      <ResumeSection title="경력" empty={application.careers.length === 0}>
        {application.careers.map((item, index) => (
          <ResumeItem
            key={`${item.company}-${index}`}
            title={`${item.company} · ${item.role}`}
            detail={[item.period, item.description].filter(Boolean).join(" / ")}
          />
        ))}
      </ResumeSection>
      <ResumeSection
        title="대외 활동"
        empty={application.activities.length === 0}
      >
        {application.activities.map((item, index) => (
          <ResumeItem
            key={`${item.name}-${index}`}
            title={`${item.name} · ${item.role}`}
            detail={[item.organization, item.period, item.description]
              .filter(Boolean)
              .join(" / ")}
          />
        ))}
      </ResumeSection>
      <ResumeSection
        title="통계 패키지"
        empty={application.statisticsPackages.length === 0}
      >
        {application.statisticsPackages.map((item, index) => (
          <ResumeItem
            key={`${item.name}-${index}`}
            title={`${item.name} · ${item.level}`}
            detail={item.detail}
          />
        ))}
      </ResumeSection>
      <ResumeSection title="논문" empty={!application.thesis}>
        {application.thesis && (
          <ResumeItem
            title={application.thesis.title}
            detail={[application.thesis.keyword, application.thesis.summary]
              .filter(Boolean)
              .join(" / ")}
          />
        )}
      </ResumeSection>
    </div>
  );
}

function CoverLetter({ application }: { application: ApplicationDetail }) {
  if (application.coverLetter.length === 0) {
    return (
      <section className="careers-panel p-8 text-center text-sm text-slate-400">
        등록된 자기소개서 답변이 없습니다.
      </section>
    );
  }
  return (
    <section className="careers-panel divide-y divide-slate-100 p-5">
      {application.coverLetter.map((answer, index) => {
        const question = application.posting?.coverLetterQuestions.find(
          (candidate) => candidate.id === answer.questionId,
        );
        return (
          <article
            key={`${answer.questionId}-${index}`}
            className="py-5 first:pt-0 last:pb-0"
          >
            <p className="text-sm font-semibold text-slate-800">
              {question?.question || "삭제된 문항"}
            </p>
            {!question && (
              <p className="mt-1 text-xs text-amber-600">
                공고에서 삭제된 문항의 기존 답변입니다.
              </p>
            )}
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {answer.answer || "작성된 답변이 없습니다."}
            </p>
          </article>
        );
      })}
    </section>
  );
}

function RecordPanels({ application }: { application: ApplicationDetail }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="careers-panel p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <Clock3 className="size-4" /> 전형 이력
        </h2>
        {application.stageHistory.length === 0 ? (
          <p className="mt-5 text-sm text-zinc-500">
            전형 변경 이력이 없습니다.
          </p>
        ) : (
          <ol className="mt-4 space-y-4">
            {application.stageHistory.map((item) => (
              <li key={item.id} className="border-l-2 border-zinc-200 pl-4">
                <p className="text-sm font-medium">
                  {item.toStageName || "단계 미지정"} /{" "}
                  {item.toStatusName || "상태 미지정"}
                </p>
                {item.reason && (
                  <p className="mt-1 text-sm text-zinc-600">{item.reason}</p>
                )}
                <time className="mt-1 block text-xs text-zinc-500">
                  {dateTime(item.changedAt)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
      <section className="careers-panel p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <CalendarDays className="size-4" /> 일정
        </h2>
        {application.schedules.length === 0 ? (
          <p className="mt-5 text-sm text-zinc-500">등록된 일정이 없습니다.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {application.schedules.map((schedule) => (
              <div key={schedule.id} className="rounded-md bg-zinc-50 p-3">
                <p className="font-medium">{schedule.title}</p>
                <p className="mt-1 text-sm text-zinc-600">
                  {dateTime(schedule.startsAt)}
                  {schedule.location ? ` / ${schedule.location}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="careers-panel p-5 xl:col-span-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <MailCheck className="size-4" /> 메시지 기록
          <span className="text-xs font-normal text-slate-400">
            {application.messages.length}건
          </span>
        </h2>
        <div className="mt-4 divide-y divide-slate-100">
          {application.messages.length === 0 ? (
            <p className="py-4 text-sm text-slate-400">
              기록된 메시지가 없습니다.
            </p>
          ) : (
            application.messages.map((message) => (
              <article key={message.id} className="py-3 first:pt-0">
                <div className="flex justify-between gap-3">
                  <p className="font-medium">{message.subject}</p>
                  <time className="shrink-0 text-xs text-zinc-500">
                    {dateTime(message.createdAt)}
                  </time>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600">
                  {message.body}
                </p>
              </article>
            ))
          )}
        </div>
        <p className="mt-3 flex items-center gap-1 text-xs text-slate-400">
          <FileText className="size-3.5" /> 첨부파일 {application.files.length}
          개
        </p>
      </section>
    </div>
  );
}

function Detail({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      {href ? (
        <a href={href} className="mt-1 block font-medium hover:underline">
          {value}
        </a>
      ) : (
        <p className="mt-1 font-medium">{value}</p>
      )}
    </div>
  );
}

function DetailTerm({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function ResumeSection({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="careers-panel p-5">
      <h2 className="font-semibold">{title}</h2>
      {empty ? (
        <p className="mt-4 text-sm text-slate-400">등록된 내용이 없습니다.</p>
      ) : (
        <div className="mt-4 space-y-4">{children}</div>
      )}
    </section>
  );
}

function ResumeItem({ title, detail }: { title: string; detail: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-800">{title}</p>
      {detail && <p className="mt-1 text-sm text-slate-500">{detail}</p>}
    </div>
  );
}
