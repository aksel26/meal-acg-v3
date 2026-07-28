"use client";

import { KanbanSquare, LayoutGrid, List, Plus, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { ApplicantGroupedView } from "@/components/ApplicantGroupedView";
import { ApplicantPipeline } from "@/components/ApplicantPipeline";
import { ApplicantTable } from "@/components/ApplicantTable";
import { ApplicationFormDialog } from "@/components/ApplicationFormDialog";
import {
  EmptyState,
  PageError,
  PageHeader,
  PageLoading,
} from "@/components/PageStates";
import {
  type ApplicantSort,
  useApplications,
  usePipeline,
  usePosting,
  usePostings,
} from "@/hooks/useCareersApi";

type ViewMode = "list" | "group" | "pipeline";

export default function ApplicantsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPosting =
    searchParams.get("posting") || searchParams.get("postingId") || "all";
  const [search, setSearch] = useState("");
  const [postingId, setPostingId] = useState(initialPosting);
  const [field, setField] = useState("all");
  const [stageId, setStageId] = useState("all");
  const [statusId, setStatusId] = useState("all");
  const [sort, setSort] = useState<ApplicantSort>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>(
    initialPosting === "all" ? "group" : "list",
  );
  const [dialogOpen, setDialogOpen] = useState(searchParams.get("new") === "1");
  const postings = usePostings();
  const posting = usePosting(postingId === "all" ? "" : postingId);
  const pipeline = usePipeline(
    viewMode === "pipeline" && postingId !== "all" ? postingId : "",
  );
  const selectedStage = posting.data?.stages?.find(
    (stage) => stage.id === stageId,
  );
  const query = useApplications({
    search: search || undefined,
    postingId: postingId === "all" ? undefined : postingId,
    field: field === "all" ? undefined : field,
    stageId: stageId === "all" ? undefined : stageId,
    statusId: statusId === "all" ? undefined : statusId,
    sort,
  });
  const postingItems = useMemo(
    () => postings.data?.items || [],
    [postings.data?.items],
  );
  const fieldOptions = useMemo(
    () =>
      Array.from(
        new Set(
          postingItems
            .map((candidate) => candidate.field)
            .filter((value) => Boolean(value)),
        ),
      ).sort((left, right) => left.localeCompare(right, "ko")),
    [postingItems],
  );
  const hasFilter =
    Boolean(search.trim()) ||
    postingId !== "all" ||
    field !== "all" ||
    stageId !== "all" ||
    statusId !== "all";

  function changePosting(value: string) {
    setPostingId(value);
    setField("all");
    setStageId("all");
    setStatusId("all");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("postingId");
    if (value === "all") params.delete("posting");
    else params.set("posting", value);
    router.replace(params.size ? `/applicants?${params}` : "/applicants");
  }

  function resetFilters() {
    setSearch("");
    changePosting("all");
    setField("all");
    setStageId("all");
    setStatusId("all");
  }

  const items = query.data?.items || [];
  const resolvedPostings = posting.data
    ? postingItems.map((candidate) =>
        candidate.id === posting.data.id ? posting.data : candidate,
      )
    : postingItems;

  return (
    <div className="careers-page">
      <PageHeader
        title="지원자 목록"
        description={
          hasFilter
            ? `조건에 맞는 지원자 ${items.length}명`
            : `지원자 ${items.length}명`
        }
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus /> 지원자 등록
          </Button>
        }
      />

      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
          <div className="relative flex-1 xl:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              aria-label="지원자 검색"
              className="w-full pl-9"
              placeholder="이름, 이메일, 연락처, 메모 검색"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={postingId} onValueChange={changePosting}>
            <SelectTrigger className="w-full xl:w-64" aria-label="공고 선택">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 공고</SelectItem>
              {postingItems.map((candidate) => (
                <SelectItem key={candidate.id} value={candidate.id}>
                  {candidate.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={field} onValueChange={setField}>
            <SelectTrigger className="w-full xl:w-40" aria-label="모집 분야">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 분야</SelectItem>
              {fieldOptions.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={stageId}
            disabled={postingId === "all"}
            onValueChange={(value) => {
              setStageId(value);
              setStatusId("all");
            }}
          >
            <SelectTrigger className="w-full xl:w-40" aria-label="전형 단계">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 단계</SelectItem>
              {(posting.data?.stages || []).map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusId}
            disabled={stageId === "all"}
            onValueChange={setStatusId}
          >
            <SelectTrigger className="w-full xl:w-40" aria-label="단계 상태">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              {(selectedStage?.statuses || []).map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sort}
            onValueChange={(value) => setSort(value as ApplicantSort)}
          >
            <SelectTrigger className="w-full xl:ml-auto xl:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">최신 지원순</SelectItem>
              <SelectItem value="oldest">오래된 지원순</SelectItem>
              <SelectItem value="name">이름순</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-lg bg-slate-50 p-1">
            <ViewButton
              active={viewMode === "list"}
              onClick={() => setViewMode("list")}
              icon={<List />}
              label="목록"
            />
            <ViewButton
              active={viewMode === "group"}
              onClick={() => setViewMode("group")}
              icon={<LayoutGrid />}
              label="그룹"
            />
            <ViewButton
              active={viewMode === "pipeline"}
              onClick={() => setViewMode("pipeline")}
              icon={<KanbanSquare />}
              label="파이프라인"
            />
          </div>
        </div>
        {hasFilter && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X /> 검색·필터 초기화
          </Button>
        )}
      </div>

      {query.isLoading ? (
        <PageLoading />
      ) : query.isError && !query.data ? (
        <PageError
          message={query.error.message}
          onRetry={() => query.refetch()}
        />
      ) : viewMode === "pipeline" && postingId === "all" ? (
        <EmptyState
          title="공고를 선택해 주세요."
          description="파이프라인은 한 공고의 전형 단계별로 표시됩니다."
        />
      ) : viewMode === "pipeline" && pipeline.isLoading ? (
        <PageLoading rows={3} />
      ) : viewMode === "pipeline" && pipeline.isError ? (
        <PageError
          message={pipeline.error.message}
          onRetry={() => pipeline.refetch()}
        />
      ) : viewMode === "pipeline" && pipeline.data ? (
        <ApplicantPipeline
          posting={pipeline.data.posting}
          columns={pipeline.data.columns}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="조건에 맞는 지원자가 없습니다."
          description="검색 조건을 바꾸거나 지원자를 등록해 주세요."
        />
      ) : viewMode === "group" ? (
        <ApplicantGroupedView
          applications={items}
          postings={resolvedPostings}
        />
      ) : (
        <ApplicantTable applications={items} postings={resolvedPostings} />
      )}

      {viewMode !== "pipeline" && query.hasNextPage && (
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
      {viewMode === "pipeline" && pipeline.hasNextPage && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            disabled={pipeline.isFetchingNextPage}
            onClick={() => pipeline.fetchNextPage()}
          >
            {pipeline.isFetchingNextPage ? "불러오는 중..." : "더 보기"}
          </Button>
        </div>
      )}

      <ApplicationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        postings={postingItems}
        defaultPostingId={postingId === "all" ? undefined : postingId}
      />
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={
        active ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
      }
      onClick={onClick}
    >
      <span className="[&>svg]:size-4">{icon}</span>
      {label}
    </Button>
  );
}
