"use client";

import {
  ArrowLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  Users,
  UserX,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
import { toast } from "@repo/ui/src/sonner";
import { CareersStatusBadge } from "@/components/CareersStatusBadge";
import { PageError, PageLoading } from "@/components/PageStates";
import { PostingFormDialog } from "@/components/PostingFormDialog";
import {
  careersApi,
  careersKeys,
  useCareersMutation,
  usePosting,
} from "@/hooks/useCareersApi";

function date(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export default function PostingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const query = usePosting(params.id);
  const deleteMutation = useCareersMutation(careersApi.softDeletePosting, [
    careersKeys.all,
  ]);
  const fieldSuggestions = useMemo(
    () => (query.data?.field ? [query.data.field] : []),
    [query.data?.field],
  );

  async function remove() {
    try {
      await deleteMutation.mutateAsync(params.id);
      toast.success("공고와 소속 지원자 데이터를 삭제했습니다.");
      router.push("/postings");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "공고를 삭제하지 못했습니다.",
      );
    }
  }

  if (query.isLoading) {
    return (
      <div className="careers-page">
        <PageLoading />
      </div>
    );
  }
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

  const posting = query.data;
  const stages = [...(posting.stages || [])].sort(
    (left, right) => left.displayOrder - right.displayOrder,
  );

  return (
    <div className="careers-page">
      <div className="mb-5 flex flex-col gap-4">
        <Link
          href="/postings"
          className="inline-flex w-fit items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="size-4" /> 공고 목록
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CareersStatusBadge value={posting.derivedStatus} />
              <span className="text-sm text-slate-500">{posting.field}</span>
              <span className="text-xs text-slate-400">
                {date(posting.startDate)} ~ {date(posting.endDate)}
              </span>
            </div>
            <h1 className="mt-2 text-xl font-semibold text-slate-900">
              {posting.title}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/applicants?posting=${posting.id}&new=1`}>
                <Plus /> 지원자 등록
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/applicants?posting=${posting.id}`}>
                <Users /> 지원자 보기
              </Link>
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil /> 공고 수정
            </Button>
            <Button
              variant="outline"
              disabled={deleteMutation.isPending}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 /> 공고 삭제
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Link
          href={`/applicants?posting=${posting.id}`}
          className="flex items-center justify-between rounded-xl bg-white p-4 hover:bg-slate-50"
        >
          <span className="flex items-center gap-3">
            <Users className="size-5 text-slate-500" />
            <span>
              <span className="block text-sm font-medium">지원자 목록</span>
              <span className="text-xs text-slate-500">
                {posting.applicantCount || 0}명
              </span>
            </span>
          </span>
          <ChevronRight className="size-4 text-slate-400" />
        </Link>
        <Link
          href={`/separated?posting=${posting.id}`}
          className="flex items-center justify-between rounded-xl bg-white p-4 hover:bg-slate-50"
        >
          <span className="flex items-center gap-3">
            <UserX className="size-5 text-slate-500" />
            <span>
              <span className="block text-sm font-medium">별도 관리</span>
              <span className="text-xs text-slate-500">
                {posting.separatedApplicantCount || 0}명
              </span>
            </span>
          </span>
          <ChevronRight className="size-4 text-slate-400" />
        </Link>
        <Link
          href={`/process-management?posting=${posting.id}`}
          className="flex items-center justify-between rounded-xl bg-white p-4 hover:bg-slate-50"
        >
          <span className="flex items-center gap-3">
            <Workflow className="size-5 text-slate-500" />
            <span>
              <span className="block text-sm font-medium">프로세스 관리</span>
              <span className="text-xs text-slate-500">
                {stages.length}단계
              </span>
            </span>
          </span>
          <ChevronRight className="size-4 text-slate-400" />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold">기본 정보</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-slate-400">구분</dt>
              <dd className="mt-1">{posting.careerType}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">고용 형태</dt>
              <dd className="mt-1">{posting.employmentType}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">모집 분야</dt>
              <dd className="mt-1">{posting.field}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">공개 여부</dt>
              <dd className="mt-1">{posting.isPublic ? "공개" : "비공개"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">게시 기간</dt>
              <dd className="mt-1">
                {date(posting.startDate)} ~ {date(posting.endDate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">등록 / 수정</dt>
              <dd className="mt-1 text-xs leading-5">
                등록 {date(posting.createdAt)} · {posting.createdBy || "-"}
                <br />
                수정 {date(posting.updatedAt)} · {posting.updatedBy || "-"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold">프로세스 요약</h2>
          {stages.length ? (
            <div className="flex flex-wrap gap-2">
              {stages.map((stage, index) => (
                <Badge key={stage.id} variant="outline">
                  {index + 1}. {stage.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              등록된 전형 단계가 없습니다.
            </p>
          )}
        </section>

        <section className="rounded-xl bg-white p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">공고 요약</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-600">
            {posting.description || "등록된 요약이 없습니다."}
          </p>
        </section>

        <section className="rounded-xl bg-white p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">공고 본문</h2>
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {posting.content || "등록된 본문이 없습니다."}
          </p>
        </section>

        <section className="rounded-xl bg-white p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">자기소개서 문항</h2>
          {posting.coverLetterQuestions.length ? (
            <ol className="list-inside list-decimal space-y-2 text-sm text-slate-600">
              {posting.coverLetterQuestions.map((question) => (
                <li key={question.id}>
                  {question.question}
                  {question.maxLength && (
                    <span className="ml-1 text-xs text-slate-400">
                      (최대 {question.maxLength}자)
                    </span>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-500">등록된 문항이 없습니다.</p>
          )}
        </section>
      </div>

      <PostingFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        posting={posting}
        fieldSuggestions={fieldSuggestions}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공고를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{posting.title}&quot; 공고와 소속 지원자{" "}
              {posting.applicantCount || 0}명의 데이터를 함께 삭제합니다. 이
              작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
