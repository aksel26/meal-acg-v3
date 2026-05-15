import { requireAuth } from "@/lib/auth";
import { EvaluationDetailClient } from "@/components/evaluations/EvaluationDetailClient";

type PageProps = {
  params: Promise<{ roundId: string }>;
};

export default async function EvaluationRoundPage({ params }: PageProps) {
  await requireAuth();
  const { roundId } = await params;

  return (
    <div className="p-4 md:p-6">
      <EvaluationDetailClient roundId={roundId} />
    </div>
  );
}
