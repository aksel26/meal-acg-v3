import { requireAuth } from "@/lib/auth";
import { EvaluationListClient } from "@/components/evaluations/EvaluationListClient";

export default async function EvaluationsPage() {
  await requireAuth();

  return (
    <div className="space-y-5 p-4 md:p-6">
      <EvaluationListClient />
    </div>
  );
}
