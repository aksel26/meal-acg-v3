"use client";

import { Eye, EyeOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { Input } from "@repo/ui/src/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/src/table";
import { CareersStatusBadge } from "@/components/CareersStatusBadge";
import {
  EmptyState,
  PageError,
  PageHeader,
  PageLoading,
} from "@/components/PageStates";
import {
  careersApi,
  careersKeys,
  type EmploymentType,
  type JobPosting,
  type PostingDerivedStatus,
  type PostingSort,
  useCareersMutation,
  usePostings,
} from "@/hooks/useCareersApi";
import { toast } from "@repo/ui/src/sonner";

function date(value: string | null | undefined) {
  if (!value) return "상시";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export default function PostingsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | PostingDerivedStatus>("all");
  const [employmentType, setEmploymentType] = useState<"all" | EmploymentType>(
    "all",
  );
  const [field, setField] = useState("all");
  const [sort, setSort] = useState<PostingSort>("deadlineAsc");
  const [deleteTarget, setDeleteTarget] = useState<JobPosting | null>(null);
  const query = usePostings({
    search: search || undefined,
    status: status === "all" ? undefined : status,
    employmentType: employmentType === "all" ? undefined : employmentType,
    field: field === "all" ? undefined : field,
    sort,
  });
  const allPostings = usePostings({ sort: "createdDesc" });
  const hasMoreFieldOptions = allPostings.hasNextPage;
  const isFetchingFieldOptions = allPostings.isFetchingNextPage;
  const fetchMoreFieldOptions = allPostings.fetchNextPage;
  const visibilityMutation = useCareersMutation(
    ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      careersApi.updatePosting(id, { isPublic }),
    [careersKeys.all],
  );
  const deleteMutation = useCareersMutation(careersApi.softDeletePosting, [
    careersKeys.all,
  ]);
  const fieldSuggestions = useMemo(() => {
    const values = new Set(
      allPostings.data?.items.map((posting) => posting.field).filter(Boolean),
    );
    if (field !== "all") values.add(field);
    return [...values].sort((left, right) => left.localeCompare(right, "ko"));
  }, [allPostings.data?.items, field]);

  useEffect(() => {
    if (hasMoreFieldOptions && !isFetchingFieldOptions) {
      void fetchMoreFieldOptions();
    }
  }, [fetchMoreFieldOptions, hasMoreFieldOptions, isFetchingFieldOptions]);

  return (
    <div className="careers-page">
      <PageHeader
        title="채용 공고"
        description="공고 기본 정보와 전형 프로세스를 관리합니다."
        action={
          <Button asChild>
            <Link href="/postings/new">
              <Plus /> 새 공고
            </Link>
          </Button>
        }
      />

      <div className="mb-4 grid gap-2 lg:grid-cols-[minmax(240px,1fr)_140px_140px_160px_190px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            aria-label="공고 검색"
            className="w-full pl-9"
            placeholder="공고 제목, 모집 분야 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) =>
            setStatus(value as "all" | PostingDerivedStatus)
          }
        >
          <SelectTrigger className="w-full" aria-label="공고 상태">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="진행중">진행 중</SelectItem>
            <SelectItem value="종료">종료</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={employmentType}
          onValueChange={(value) =>
            setEmploymentType(value as "all" | EmploymentType)
          }
        >
          <SelectTrigger className="w-full" aria-label="고용 형태">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 고용 형태</SelectItem>
            <SelectItem value="정규직">정규직</SelectItem>
            <SelectItem value="계약직">계약직</SelectItem>
            <SelectItem value="인턴">인턴</SelectItem>
          </SelectContent>
        </Select>
        <Select value={field} onValueChange={setField}>
          <SelectTrigger className="w-full" aria-label="모집 분야">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 모집 분야</SelectItem>
            {fieldSuggestions.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sort}
          onValueChange={(value) => setSort(value as PostingSort)}
        >
          <SelectTrigger className="w-full" aria-label="공고 정렬">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deadlineAsc">마감 임박순</SelectItem>
            <SelectItem value="createdDesc">등록 최신순</SelectItem>
            <SelectItem value="createdAsc">등록 오래된순</SelectItem>
            <SelectItem value="updatedDesc">최근 수정순</SelectItem>
            <SelectItem value="applicantsDesc">지원자 많은순</SelectItem>
            <SelectItem value="applicantsAsc">지원자 적은순</SelectItem>
            <SelectItem value="statusFirst">진행 중 우선</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {query.isLoading ? (
        <PageLoading />
      ) : query.isError && !query.data ? (
        <PageError
          message={query.error.message}
          onRetry={() => query.refetch()}
        />
      ) : !query.data?.items.length ? (
        <EmptyState
          title="조건에 맞는 공고가 없습니다."
          description="검색 조건을 바꾸거나 새 공고를 등록해 주세요."
          action={
            <Button asChild>
              <Link href="/postings/new">새 공고 등록</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl bg-white">
            <Table className="min-w-[480px] xl:min-w-[1440px]">
              <TableHeader className="sticky top-0 z-10 bg-white">
                <TableRow className="border-b border-slate-100 bg-white hover:bg-white [&>th]:h-auto [&>th]:px-3 [&>th]:py-2 [&>th]:text-xs [&>th]:font-medium [&>th]:text-slate-400">
                  <TableHead className="hidden w-14 text-center xl:table-cell">
                    No
                  </TableHead>
                  <TableHead className="hidden w-24 text-center sm:table-cell">
                    상태
                  </TableHead>
                  <TableHead className="w-16 text-center">공개</TableHead>
                  <TableHead className="text-left">공고명</TableHead>
                  <TableHead className="hidden w-36 text-left xl:table-cell">
                    모집 분야
                  </TableHead>
                  <TableHead className="hidden w-20 text-center xl:table-cell">
                    구분
                  </TableHead>
                  <TableHead className="hidden w-24 text-center xl:table-cell">
                    고용 형태
                  </TableHead>
                  <TableHead className="hidden w-28 text-center xl:table-cell">
                    게시 시작
                  </TableHead>
                  <TableHead className="hidden w-28 text-center xl:table-cell">
                    게시 종료
                  </TableHead>
                  <TableHead className="hidden w-20 text-right xl:table-cell">
                    전체
                  </TableHead>
                  <TableHead className="hidden w-20 text-right xl:table-cell">
                    진행
                  </TableHead>
                  <TableHead className="hidden w-20 text-right xl:table-cell">
                    일정 예정
                  </TableHead>
                  <TableHead className="hidden w-20 text-right xl:table-cell">
                    합격
                  </TableHead>
                  <TableHead className="hidden w-20 text-right xl:table-cell">
                    별도
                  </TableHead>
                  <TableHead className="hidden w-52 text-left xl:table-cell">
                    등록 / 수정
                  </TableHead>
                  <TableHead className="sticky right-0 z-20 w-24 bg-white text-center">
                    관리
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((posting, index) => (
                  <TableRow
                    key={posting.id}
                    className="group border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50 [&>td]:px-3 [&>td]:py-3"
                  >
                    <TableCell className="hidden text-center text-sm tabular-nums text-slate-400 xl:table-cell">
                      {index + 1}
                    </TableCell>
                    <TableCell className="hidden text-center sm:table-cell">
                      <CareersStatusBadge value={posting.derivedStatus} />
                    </TableCell>
                    <TableCell className="text-center text-slate-400">
                      <button
                        type="button"
                        className="mx-auto inline-flex size-[40px] items-center justify-center rounded hover:bg-slate-100 hover:text-slate-700"
                        aria-label={
                          posting.isPublic
                            ? "공고 비공개 전환"
                            : "공고 공개 전환"
                        }
                        onClick={async () => {
                          try {
                            await visibilityMutation.mutateAsync({
                              id: posting.id,
                              isPublic: !posting.isPublic,
                            });
                            toast.success(
                              posting.isPublic
                                ? "공고를 비공개로 전환했습니다."
                                : "공고를 공개했습니다.",
                            );
                          } catch (error) {
                            toast.error(
                              error instanceof Error
                                ? error.message
                                : "공개 여부를 변경하지 못했습니다.",
                            );
                          }
                        }}
                      >
                        {posting.isPublic ? (
                          <Eye className="size-4" />
                        ) : (
                          <EyeOff className="size-4" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/postings/${posting.id}`}
                        className="font-medium text-slate-800 hover:text-slate-900 hover:underline"
                      >
                        {posting.title}
                      </Link>
                      <span className="mt-1 block sm:hidden">
                        <CareersStatusBadge value={posting.derivedStatus} />
                      </span>
                      {posting.description && (
                        <p className="mt-0.5 max-w-sm truncate text-xs text-slate-400">
                          {posting.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-sm text-slate-600 xl:table-cell">
                      {posting.field}
                    </TableCell>
                    <TableCell className="hidden text-center text-sm text-slate-500 xl:table-cell">
                      {posting.careerType}
                    </TableCell>
                    <TableCell className="hidden text-center text-sm text-slate-500 xl:table-cell">
                      {posting.employmentType}
                    </TableCell>
                    <TableCell className="hidden text-center text-sm text-slate-500 xl:table-cell">
                      {date(posting.startDate)}
                    </TableCell>
                    <TableCell className="hidden text-center text-sm text-slate-500 xl:table-cell">
                      {date(posting.endDate)}
                    </TableCell>
                    <TableCell className="hidden text-right text-sm font-medium tabular-nums text-slate-700 xl:table-cell">
                      <Link href={`/applicants?posting=${posting.id}`}>
                        {posting.applicantCount || 0}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-right text-sm font-medium tabular-nums text-slate-700 xl:table-cell">
                      <Link href={`/applicants?posting=${posting.id}`}>
                        {posting.activeApplicantCount || 0}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-right text-sm font-medium tabular-nums text-slate-700 xl:table-cell">
                      {posting.upcomingScheduleCount || 0}
                    </TableCell>
                    <TableCell className="hidden text-right text-sm font-medium tabular-nums text-slate-700 xl:table-cell">
                      {posting.hiredCount || 0}
                    </TableCell>
                    <TableCell className="hidden text-right text-sm font-medium tabular-nums text-slate-500 xl:table-cell">
                      <Link href={`/separated?posting=${posting.id}`}>
                        {posting.separatedApplicantCount || 0}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden max-w-52 text-xs text-slate-400 xl:table-cell">
                      <p
                        className="truncate"
                        title={`등록 ${date(posting.createdAt)} · ${posting.createdBy || "-"}`}
                      >
                        등록 {date(posting.createdAt)} ·{" "}
                        {posting.createdBy || "-"}
                      </p>
                      <p
                        className="mt-0.5 truncate"
                        title={`수정 ${date(posting.updatedAt)} · ${posting.updatedBy || "-"}`}
                      >
                        수정 {date(posting.updatedAt)} ·{" "}
                        {posting.updatedBy || "-"}
                      </p>
                    </TableCell>
                    <TableCell className="sticky right-0 z-[1] bg-white group-hover:bg-slate-50">
                      <div className="flex justify-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`${posting.title} 수정`}
                          asChild
                        >
                          <Link href={`/postings/${posting.id}/edit`}>
                            <Pencil className="size-4" />
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`${posting.title} 삭제`}
                          onClick={() => setDeleteTarget(posting)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {query.hasNextPage && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                disabled={query.isFetchingNextPage}
                onClick={() => query.fetchNextPage()}
              >
                {query.isFetchingNextPage
                  ? "불러오는 중..."
                  : query.isFetchNextPageError
                    ? "불러오기 실패 · 다시 시도"
                    : "더 보기"}
              </Button>
            </div>
          )}
        </>
      )}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공고를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.title}&quot; 공고와 소속 지원자{" "}
              {deleteTarget?.applicantCount || 0}명의 데이터를 함께 삭제합니다.
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  await deleteMutation.mutateAsync(deleteTarget.id);
                  toast.success("공고와 소속 지원자 데이터를 삭제했습니다.");
                  setDeleteTarget(null);
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "공고를 삭제하지 못했습니다.",
                  );
                }
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
