"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ClipboardCheck } from "lucide-react";
import { toast } from "@repo/ui/src/sonner";

type EvaluationRound = {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  canEnter: boolean;
  assignedSubjectCount: number;
  submittedSubjectCount: number;
};

export function EvaluationListClient() {
  const router = useRouter();
  const [rounds, setRounds] = useState<EvaluationRound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    fetch("/api/evaluations/rounds")
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || "다면평가 회차를 불러오지 못했습니다.");
        }
        return response.json();
      })
      .then((data: EvaluationRound[]) => {
        if (!mounted) return;
        setRounds(data);
        setError(null);
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setError(err.message);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const available = rounds.filter((round) => round.canEnter).length;
    const submitted = rounds.reduce(
      (sum, round) => sum + round.submittedSubjectCount,
      0,
    );
    const assigned = rounds.reduce(
      (sum, round) => sum + round.assignedSubjectCount,
      0,
    );

    return { total: rounds.length, available, submitted, assigned };
  }, [rounds]);

  function handleRoundClick(round: EvaluationRound) {
    if (!round.canEnter) {
      toast.error("평가자로 배정된 회차만 작성할 수 있습니다.");
      return;
    }

    router.push(`/evaluations/${round.id}`);
  }

  if (isLoading) {
    return (
      <div className="grid gap-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-28 animate-pulse rounded-xl border border-[#f3f3f3] bg-white"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2 sm:max-w-xl">
        <SummaryBox label="활성 회차" value={stats.total} />
        <SummaryBox label="내 배정" value={stats.assigned} />
        <SummaryBox label="제출 완료" value={stats.submitted} />
      </div>

      {rounds.length === 0 ? (
        <div className="rounded-xl border border-[#f3f3f3] bg-white px-5 py-12 text-center">
          <ClipboardCheck className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-700">
            활성화된 다면평가 회차가 없습니다.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {rounds.map((round, index) => {
            const isComplete =
              round.assignedSubjectCount > 0 &&
              round.submittedSubjectCount >= round.assignedSubjectCount;

            return (
              <motion.button
                key={round.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                type="button"
                onClick={() => handleRoundClick(round)}
                className="group w-full rounded-xl border border-[#f3f3f3] bg-white px-4 py-4 text-left transition-colors hover:border-slate-200 hover:bg-[#fbfbfc]"
              >
                <div className="min-w-0">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-semibold text-[#111111]">
                        {round.name}
                      </h2>
                      {round.canEnter ? (
                        isComplete ? (
                          <Badge tone="green" label="완료" />
                        ) : (
                          <Badge tone="blue" label="작성 가능" />
                        )
                      ) : (
                        <Badge tone="gray" label="미배정" />
                      )}
                    </div>
                    {round.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {round.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>
                        {formatDate(round.startDate)} - {formatDate(round.endDate)}
                      </span>
                      {round.canEnter && (
                        <span>
                          {round.submittedSubjectCount}/{round.assignedSubjectCount}명 제출
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#f3f3f3] bg-white px-3 py-3">
      <p className="text-[11px] font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[#111111]">
        {value.toLocaleString("ko-KR")}
      </p>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: "blue" | "green" | "gray" }) {
  const className = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    gray: "bg-slate-100 text-slate-500",
  }[tone];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(`${date}T00:00:00`));
}
