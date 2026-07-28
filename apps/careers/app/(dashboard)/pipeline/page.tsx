"use client";

import { useState } from "react";
import { Button } from "@repo/ui/src/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { ApplicantPipeline } from "@/components/ApplicantPipeline";
import {
  EmptyState,
  PageError,
  PageHeader,
  PageLoading,
} from "@/components/PageStates";
import { usePipeline, usePostings } from "@/hooks/useCareersApi";

export default function PipelinePage() {
  const postings = usePostings({ status: "진행중" });
  const [postingId, setPostingId] = useState("");
  const selectedId = postingId || postings.data?.items[0]?.id || "";
  const pipeline = usePipeline(selectedId);

  return (
    <div className="careers-page">
      <PageHeader
        title="지원자 파이프라인"
        description="카드를 끌어 놓거나 카드의 단계 선택 메뉴에서 원하는 전형으로 이동합니다."
        action={
          <Select value={selectedId} onValueChange={setPostingId}>
            <SelectTrigger className="w-full sm:w-72" aria-label="공고 선택">
              <SelectValue placeholder="공고 선택" />
            </SelectTrigger>
            <SelectContent>
              {(postings.data?.items || []).map((posting) => (
                <SelectItem key={posting.id} value={posting.id}>
                  {posting.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      {!selectedId ? (
        <EmptyState
          title="진행 중인 공고가 없습니다."
          description="공고를 등록하면 파이프라인을 확인할 수 있습니다."
        />
      ) : pipeline.isLoading ? (
        <PageLoading rows={3} />
      ) : pipeline.isError && !pipeline.data ? (
        <PageError
          message={pipeline.error.message}
          onRetry={() => pipeline.refetch()}
        />
      ) : pipeline.data ? (
        <>
          <ApplicantPipeline
            posting={pipeline.data.posting}
            columns={pipeline.data.columns}
          />
          {pipeline.hasNextPage && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                disabled={pipeline.isFetchingNextPage}
                onClick={() => pipeline.fetchNextPage()}
              >
                {pipeline.isFetchingNextPage
                  ? "불러오는 중..."
                  : pipeline.isFetchNextPageError
                    ? "불러오기 실패 · 다시 시도"
                    : "더 보기"}
              </Button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
