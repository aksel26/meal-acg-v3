"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@repo/ui/src/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { PageError, PageHeader, PageLoading } from "@/components/PageStates";
import { ProcessEditor } from "@/components/ProcessEditor";
import {
  usePosting,
  usePostings,
  useProcessPreset,
} from "@/hooks/useCareersApi";

const PRESET_ID = "__preset__";

export default function ProcessManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("posting") || PRESET_ID;
  const postings = usePostings({ sort: "deadlineAsc" });
  const hasMorePostings = postings.hasNextPage;
  const isFetchingPostings = postings.isFetchingNextPage;
  const fetchMorePostings = postings.fetchNextPage;
  const preset = useProcessPreset();
  const posting = usePosting(selectedId === PRESET_ID ? "" : selectedId);

  const options = postings.data?.items ?? [];
  const isPreset = selectedId === PRESET_ID;
  const isLoading = isPreset ? preset.isLoading : posting.isLoading;
  const isError = isPreset ? preset.isError : posting.isError;
  const error = isPreset ? preset.error : posting.error;

  useEffect(() => {
    if (hasMorePostings && !isFetchingPostings) {
      void fetchMorePostings();
    }
  }, [fetchMorePostings, hasMorePostings, isFetchingPostings]);

  return (
    <div className="careers-page">
      <PageHeader
        title="프로세스 관리"
        description="기본 프리셋과 공고별 전형 단계·상태·발송 메시지를 관리합니다."
      />

      <div className="mb-5 flex max-w-xl items-center gap-2">
        <Select
          value={selectedId}
          onValueChange={(value) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("posting", value);
            router.replace(`/process-management?${params.toString()}`);
          }}
        >
          <SelectTrigger className="w-full" aria-label="프로세스 선택">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PRESET_ID}>기본 프로세스 프리셋</SelectItem>
            {options.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isPreset && (
          <Button variant="outline" asChild>
            <Link href={`/postings/${selectedId}`}>
              공고 상세 <ExternalLink />
            </Link>
          </Button>
        )}
      </div>

      {isLoading ? (
        <PageLoading />
      ) : isError ? (
        <PageError
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => (isPreset ? preset.refetch() : posting.refetch())}
        />
      ) : isPreset && preset.data ? (
        <ProcessEditor mode="preset" initialStages={preset.data.stages} />
      ) : posting.data ? (
        <ProcessEditor
          postingId={posting.data.id}
          initialStages={posting.data.stages || []}
        />
      ) : (
        <PageError message="선택한 공고를 찾을 수 없습니다." />
      )}
    </div>
  );
}
