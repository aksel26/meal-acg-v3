import { requireAuth } from "@/lib/auth";
import { EvaluationListClient } from "@/components/evaluations/EvaluationListClient";

export default async function EvaluationsPage() {
  await requireAuth();

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-[#111111]">다면평가</h1>
        <p className="mt-1 text-sm text-slate-500">
          활성화된 회차를 확인하고 배정된 평가를 작성합니다.
        </p>
      </div>
      <EvaluationListClient />
    </div>
  );
}
