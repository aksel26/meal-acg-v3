"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { PostingForm } from "@/components/PostingForm";
import { usePostings } from "@/hooks/useCareersApi";

export default function NewPostingPage() {
  const router = useRouter();
  const postings = usePostings({ sort: "createdDesc" });
  const hasMorePostings = postings.hasNextPage;
  const isFetchingPostings = postings.isFetchingNextPage;
  const fetchMorePostings = postings.fetchNextPage;
  const fieldSuggestions = useMemo(
    () =>
      [
        ...new Set(
          postings.data?.items.map((posting) => posting.field).filter(Boolean),
        ),
      ].sort((left, right) => left.localeCompare(right, "ko")),
    [postings.data?.items],
  );

  useEffect(() => {
    if (hasMorePostings && !isFetchingPostings) {
      void fetchMorePostings();
    }
  }, [fetchMorePostings, hasMorePostings, isFetchingPostings]);

  return (
    <div className="careers-page">
      <PostingForm
        layout="split"
        fieldSuggestions={fieldSuggestions}
        onCancel={() => router.push("/postings")}
        onSaved={() => router.push("/postings")}
      />
    </div>
  );
}
