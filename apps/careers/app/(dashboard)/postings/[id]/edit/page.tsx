"use client";

import { useParams, useRouter } from "next/navigation";
import { PageError, PageLoading } from "@/components/PageStates";
import { PostingForm } from "@/components/PostingForm";
import { usePosting } from "@/hooks/useCareersApi";

export default function EditPostingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const posting = usePosting(params.id);

  if (posting.isLoading) {
    return (
      <div className="careers-page">
        <PageLoading />
      </div>
    );
  }

  if (posting.isError || !posting.data) {
    return (
      <div className="careers-page">
        <PageError
          message={posting.error?.message}
          onRetry={() => posting.refetch()}
        />
      </div>
    );
  }

  const detailPath = `/postings/${posting.data.id}`;

  return (
    <div className="careers-page">
      <PostingForm
        posting={posting.data}
        layout="split"
        fieldSuggestions={[posting.data.field]}
        onCancel={() => router.push(detailPath)}
        onSaved={() => router.push(detailPath)}
      />
    </div>
  );
}
