"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useState } from "react";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import {
  EmptyState,
  PageError,
  PageHeader,
  PageLoading,
} from "@/components/PageStates";
import { SeparatedApplicationsTable } from "@/components/SeparatedApplicationsTable";
import { usePostings, useSeparatedApplications } from "@/hooks/useCareersApi";

type SeparateSort = "recentSeparated" | "oldestSeparated" | "applicationNewest";

export default function SeparatedPage() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [postingId, setPostingId] = useState(
    () => searchParams.get("posting") || "all",
  );
  const [sort, setSort] = useState<SeparateSort>("recentSeparated");
  const postings = usePostings();
  const {
    fetchNextPage: fetchMorePostings,
    hasNextPage: hasMorePostings,
    isFetchingNextPage: isFetchingMorePostings,
    isFetchNextPageError: fetchMorePostingsFailed,
  } = postings;
  const query = useSeparatedApplications({
    search: search || undefined,
    postingId: postingId === "all" ? undefined : postingId,
    sort,
  } as Parameters<typeof useSeparatedApplications>[0] & {
    sort: SeparateSort;
  });
  const applications = useMemo(() => {
    const items = [...(query.data?.items || [])];
    const time = (value?: string | null) =>
      value ? new Date(value).getTime() : 0;
    if (sort === "oldestSeparated") {
      return items.sort(
        (left, right) => time(left.separatedAt) - time(right.separatedAt),
      );
    }
    if (sort === "applicationNewest") {
      return items.sort(
        (left, right) => time(right.appliedAt) - time(left.appliedAt),
      );
    }
    return items.sort(
      (left, right) => time(right.separatedAt) - time(left.separatedAt),
    );
  }, [query.data?.items, sort]);
  const hasFilter = Boolean(search.trim() || postingId !== "all");

  useEffect(() => {
    if (
      hasMorePostings &&
      !isFetchingMorePostings &&
      !fetchMorePostingsFailed
    ) {
      void fetchMorePostings();
    }
  }, [
    fetchMorePostings,
    fetchMorePostingsFailed,
    hasMorePostings,
    isFetchingMorePostings,
  ]);

  return (
    <div className="careers-page">
      <PageHeader
        title="별도 관리"
        description={
          hasFilter
            ? `조건에 맞는 별도 관리 지원자 ${applications.length}명`
            : `미응시 / 중도 하차 인원 ${applications.length}명`
        }
      />
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            aria-label="별도 관리 지원자 검색"
            className="w-full pl-9"
            placeholder="이름, 이메일, 연락처, 메모, 사유 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select value={postingId} onValueChange={setPostingId}>
          <SelectTrigger className="w-full sm:w-64" aria-label="공고 선택">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 공고</SelectItem>
            {(postings.data?.items || []).map((posting) => (
              <SelectItem key={posting.id} value={posting.id}>
                {posting.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {postingId !== "all" && (
          <Button variant="outline" asChild>
            <Link href={`/postings/${postingId}`}>공고 상세</Link>
          </Button>
        )}
        <Select
          value={sort}
          onValueChange={(value) => setSort(value as SeparateSort)}
        >
          <SelectTrigger
            className="w-full lg:ml-auto lg:w-44"
            aria-label="정렬"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recentSeparated">최근 이동순</SelectItem>
            <SelectItem value="oldestSeparated">오래된 이동순</SelectItem>
            <SelectItem value="applicationNewest">지원일순</SelectItem>
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
      ) : applications.length === 0 ? (
        <EmptyState
          title="별도 관리 지원자가 없습니다."
          description="별도 관리로 이동한 지원 건이 여기에 표시됩니다."
        />
      ) : (
        <>
          <SeparatedApplicationsTable applications={applications} />
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
    </div>
  );
}
