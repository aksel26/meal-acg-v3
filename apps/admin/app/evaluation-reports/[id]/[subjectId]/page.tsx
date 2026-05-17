"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@repo/ui/src/badge";
import { queryKeys } from "@/lib/query-keys";

type EvaluatorType = "상사" | "동료";
type QuestionCategory = "공통" | "상사" | "동료";

type ScoreAverage = {
  key: string;
  label: string;
  count: number;
  averageScore: number | null;
  averageWeightedScore: number | null;
};

type QuestionScore = {
  key: string;
  questionId: string | null;
  label: string;
  sortOrder: number;
  questionCategory: QuestionCategory;
  lowerKeyword: string | null;
  upperKeyword: string | null;
  count: number;
  averageScore: number | null;
  averageWeightedScore: number | null;
  evaluatorTypeAverages: ScoreAverage[];
};

type SubjectiveAnswerGroup = {
  key: string;
  questionId: string | null;
  label: string;
  sortOrder: number;
  questionCategory: QuestionCategory;
  answers: Array<{
    evaluatorType: EvaluatorType;
    textAnswer: string;
    submittedAt: string | null;
  }>;
};

type PersonalReport = {
  round: {
    id: string;
    name: string;
    description: string | null;
    startDate: string;
    endDate: string;
    isDeployed: boolean;
    questionSetName: string | null;
    questionSetAppliedAt: string | null;
    updatedAt: string;
  };
  subject: {
    id: string;
    name: string;
    teamName: string;
    positionName: string;
    titleName: string;
  };
  summary: {
    assignedEvaluatorCount: number;
    submittedCount: number;
    scoreCount: number;
    overall: ScoreAverage;
    evaluatorTypeAverages: ScoreAverage[];
  };
  questionScores: QuestionScore[];
  subjectiveAnswers: SubjectiveAnswerGroup[];
};

type ChartDatum = {
  name: string;
  value: number;
  count?: number;
  fill?: string;
};

type TooltipPayload = {
  payload?: ChartDatum;
  value?: number;
};

const EVALUATOR_TYPES: EvaluatorType[] = ["상사", "동료"];
const CATEGORY_COLORS: Record<QuestionCategory, string> = {
  공통: "#111827",
  상사: "#475569",
  동료: "#94a3b8",
};

async function requestJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(payload?.error || "요청 처리에 실패했습니다.");
  }

  return payload as T;
}

export default function EvaluationPersonalReportPrintPage() {
  const { id: roundId, subjectId } = useParams<{
    id: string;
    subjectId: string;
  }>();

  const { data, isLoading, isError, error } = useQuery<PersonalReport>({
    queryKey: queryKeys.evaluations.personalReport(roundId || "", subjectId || ""),
    queryFn: async () =>
      requestJson<PersonalReport>(
        `/api/evaluations/rounds/${roundId}/reports/${subjectId}`,
      ),
    enabled: !!roundId && !!subjectId,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-xl border border-rose-100 bg-white px-6 py-5 text-sm text-rose-700 shadow-sm">
          {error instanceof Error
            ? error.message
            : "개인별 리포트를 불러오지 못했습니다."}
        </div>
      </div>
    );
  }

  const evaluatorChartData = data.summary.evaluatorTypeAverages.map((item) => ({
    name: item.label,
    value: scoreValue(item),
    count: item.count,
    fill: item.label === "상사" ? "#111827" : "#94a3b8",
  }));
  const categoryChartData = buildCategoryChartData(data.questionScores);
  const questionChartData = data.questionScores.slice(0, 8).map((item) => ({
    name: compactQuestionLabel(item.label),
    value: item.averageWeightedScore ?? item.averageScore ?? 0,
    count: item.count,
    fill: CATEGORY_COLORS[item.questionCategory],
  }));

  return (
    <main className="min-h-screen bg-slate-200 py-8 text-slate-950 print:bg-white print:py-0">
      <ReportStyles />
      <article className="mx-auto flex w-fit flex-col gap-6 print:gap-0">
        <ReportPage pageLabel="01 / 02">
          <ReportHeader data={data} subtitle="개인 종합 리포트" />

          <section className="mt-8 grid grid-cols-[1.1fr_0.9fr] gap-5">
            <div className="p-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Subject
              </div>
              <h1 className="mt-3 text-4xl font-semibold tracking-normal">
                {data.subject.name}
              </h1>
              <dl className="mt-5 grid grid-cols-3 gap-4 py-4 text-sm">
                <InfoCell label="소속" value={data.subject.teamName} />
                <InfoCell label="직급" value={data.subject.positionName} />
                <InfoCell label="직책" value={data.subject.titleName} />
              </dl>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                본 자료는 조직장 면담 및 개인 피드백 참고용으로 작성되었습니다.
                평가자 실명은 표시하지 않고 상사/동료 그룹 기준으로만 집계합니다.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MetricBox
                label="개인 평균"
                value={formatScore(data.summary.overall.averageScore)}
                detail={`${data.summary.overall.count}개 척도`}
              />
              <MetricBox
                label="가중 평균"
                value={formatScore(data.summary.overall.averageWeightedScore)}
                detail="scale weight"
              />
              <MetricBox
                label="제출"
                value={`${data.summary.submittedCount}/${data.summary.assignedEvaluatorCount}`}
                detail="평가자 배정"
              />
              <MetricBox
                label="주관식"
                value={`${countSubjectiveAnswers(data.subjectiveAnswers)}건`}
                detail="원문 포함"
              />
            </div>
          </section>

          <section className="mt-6 grid grid-cols-[0.95fr_1.05fr] gap-5">
            <ChartPanel title="상사/동료 그룹 점수">
              <div className="h-[210px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evaluatorChartData} margin={{ top: 20, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 5]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={48}>
                      {evaluatorChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                      <LabelList dataKey="value" position="top" formatter={scoreLabel} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>

            <ChartPanel title="문항 구분별 평균">
              <div className="h-[210px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={categoryChartData} outerRadius={78}>
                    <PolarGrid stroke="#cbd5e1" />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} />
                    <Radar
                      dataKey="value"
                      stroke="#111827"
                      fill="#111827"
                      fillOpacity={0.18}
                    />
                    <Tooltip content={<ChartTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>
          </section>

          <section className="mt-6 p-1">
            <div className="mb-4 flex items-end justify-between">
              <SectionTitle eyebrow="Question Scores" title="문항별 점수 분포" />
              <div className="flex gap-2 text-[11px] text-slate-500">
                <LegendDot color={CATEGORY_COLORS.공통} label="공통" />
                <LegendDot color={CATEGORY_COLORS.상사} label="상사" />
                <LegendDot color={CATEGORY_COLORS.동료} label="동료" />
              </div>
            </div>
            <div className="h-[270px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={questionChartData}
                  layout="vertical"
                  margin={{ top: 0, right: 36, left: 18, bottom: 0 }}
                >
                  <CartesianGrid stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" domain={[0, 5]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#334155" }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                    {questionChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                    <LabelList dataKey="value" position="right" formatter={scoreLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </ReportPage>

        <ReportPage pageLabel="02 / 02">
          <ReportHeader data={data} subtitle="문항별 상세 및 주관식" compact />

          <section className="mt-6">
            <SectionTitle eyebrow="Scores Detail" title="문항별 점수" />
            <div className="mt-3">
              <table className="w-full border-collapse text-left text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-500">
                    <th className="border-b border-slate-300 px-2 py-2 font-semibold">구분</th>
                    <th className="w-[14%] border-b border-slate-300 px-2 py-2 font-semibold">키워드</th>
                    <th className="w-[14%] border-b border-slate-300 px-2 py-2 font-semibold">하위 키워드</th>
                    <th className="w-[30%] border-b border-slate-300 px-3 py-2 font-semibold">문항</th>
                    <th className="border-b border-slate-300 px-2 py-2 text-right font-semibold">답변</th>
                    <th className="border-b border-slate-300 px-2 py-2 text-right font-semibold">평균</th>
                    <th className="border-b border-slate-300 px-2 py-2 text-right font-semibold">가중</th>
                    <th className="border-b border-slate-300 px-2 py-2 text-right font-semibold">상사</th>
                    <th className="border-b border-slate-300 px-2 py-2 text-right font-semibold">동료</th>
                  </tr>
                </thead>
                <tbody>
                  {data.questionScores.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-slate-400">
                        제출된 척도 점수가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    data.questionScores.map((item) => (
                      <tr key={item.key} className="border-t border-slate-200 align-top">
                        <td className="px-2 py-2">
                          <PlainTextCell value={item.questionCategory} />
                        </td>
                        <td className="px-2 py-2">
                          <PlainTextCell value={item.upperKeyword} />
                        </td>
                        <td className="px-2 py-2">
                          <PlainTextCell value={item.lowerKeyword} />
                        </td>
                        <td className="px-3 py-2 font-medium leading-5 text-slate-900">
                          {item.label}
                        </td>
                        <td className="px-2 py-2 text-right text-slate-600">{item.count}</td>
                        <td className="px-2 py-2 text-right font-semibold">
                          {formatScore(item.averageScore)}
                        </td>
                        <td className="px-2 py-2 text-right text-slate-600">
                          {formatScore(item.averageWeightedScore)}
                        </td>
                        {EVALUATOR_TYPES.map((type) => {
                          const average = item.evaluatorTypeAverages.find(
                            (entry) => entry.key === type,
                          );
                          return (
                            <td key={type} className="px-2 py-2 text-right text-slate-600">
                              {formatScore(
                                average?.averageWeightedScore ??
                                  average?.averageScore ??
                                  null,
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-6">
            <SectionTitle eyebrow="Original Comments" title="주관식 답변 원문" />
            <div className="mt-3 grid gap-3">
              {data.subjectiveAnswers.length === 0 ? (
                <div className="border border-slate-200 px-4 py-8 text-center text-xs text-slate-400">
                  제출된 주관식 답변이 없습니다.
                </div>
              ) : (
                data.subjectiveAnswers.map((item) => (
                  <div key={item.key} className="border border-slate-200">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <ReportBadge category={item.questionCategory} />
                          <span className="text-[11px] text-slate-500">
                            {item.answers.length}건
                          </span>
                        </div>
                        <p className="mt-1 text-[12px] font-semibold leading-5 text-slate-900">
                          {item.label}
                        </p>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {item.answers.map((answer, index) => (
                        <div
                          key={`${item.key}-${answer.evaluatorType}-${index}`}
                          className="grid grid-cols-[58px_1fr] gap-3 px-3 py-2"
                        >
                          <span className="pt-0.5 text-[11px] font-semibold text-slate-500">
                            {answer.evaluatorType}
                          </span>
                          <p className="whitespace-pre-line text-[12px] leading-5 text-slate-800">
                            {answer.textAnswer}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </ReportPage>
      </article>
    </main>
  );
}

function ReportStyles() {
  return (
    <style jsx global>{`
      @page {
        size: A4;
        margin: 0;
      }

      .report-a4-page {
        width: 210mm;
        min-height: 297mm;
        page-break-after: always;
      }

      @media print {
        body {
          background: white !important;
        }

        .report-a4-page {
          box-shadow: none !important;
        }
      }
    `}</style>
  );
}

function ReportPage({
  pageLabel,
  children,
}: {
  pageLabel: string;
  children: ReactNode;
}) {
  return (
    <section className="report-a4-page relative bg-white px-[16mm] py-[14mm] shadow-xl print:shadow-none">
      {children}
      <div className="absolute bottom-[9mm] left-[16mm] right-[16mm] flex items-center justify-between border-t border-slate-200 pt-2 text-[10px] text-slate-400">
        <span>ACG 다면평가 개인 리포트</span>
        <span>{pageLabel}</span>
      </div>
    </section>
  );
}

function ReportHeader({
  data,
  subtitle,
  compact = false,
}: {
  data: PersonalReport;
  subtitle: string;
  compact?: boolean;
}) {
  return (
    <header className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          {subtitle}
        </div>
        <h2 className={compact ? "mt-1 text-2xl font-semibold" : "mt-2 text-3xl font-semibold"}>
          {data.round.name}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {data.round.startDate} - {data.round.endDate}
          {data.round.questionSetName ? ` · ${data.round.questionSetName}` : ""}
        </p>
      </div>
      {!compact && (
        <div className="text-right text-[11px] leading-5 text-slate-500">
          <div>기준 {dayjs(data.round.updatedAt).format("YYYY-MM-DD HH:mm")}</div>
          <div>평가자 익명 · 상사/동료 그룹 집계</div>
        </div>
      )}
    </header>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-slate-400">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function MetricBox({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="bg-slate-50 px-4 py-4">
      <div className="text-[11px] font-semibold text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-[11px] text-slate-400">{detail}</div>
    </div>
  );
}

function ChartPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="p-1">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {eyebrow}
      </div>
      <h3 className="mt-1 text-base font-semibold text-slate-950">{title}</h3>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-2 w-2" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function ReportBadge({ category }: { category: QuestionCategory }) {
  return (
    <Badge
      className="h-5 border-0 px-1.5 text-[10px] text-white"
      style={{ backgroundColor: CATEGORY_COLORS[category] }}
    >
      {category}
    </Badge>
  );
}

function PlainTextCell({ value }: { value: string | null }) {
  return (
    <span className={value ? "text-[11px] leading-5 text-slate-700" : "text-[11px] text-slate-300"}>
      {value || "-"}
    </span>
  );
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  return (
    <div className="border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <div className="font-medium text-slate-900">{item?.name}</div>
      <div className="mt-1 text-slate-500">
        점수 {formatScore(payload[0]?.value)}
        {typeof item?.count === "number" ? ` · ${item.count}개 답변` : ""}
      </div>
    </div>
  );
}

function buildCategoryChartData(items: QuestionScore[]): ChartDatum[] {
  const buckets = new Map<QuestionCategory, { sum: number; count: number }>();
  for (const category of ["공통", "상사", "동료"] as QuestionCategory[]) {
    buckets.set(category, { sum: 0, count: 0 });
  }

  for (const item of items) {
    const value = item.averageWeightedScore ?? item.averageScore;
    if (typeof value !== "number") continue;
    const bucket = buckets.get(item.questionCategory);
    if (!bucket) continue;
    bucket.sum += value;
    bucket.count += 1;
  }

  return Array.from(buckets.entries()).map(([category, bucket]) => ({
    name: category,
    value: bucket.count > 0 ? roundScore(bucket.sum / bucket.count) : 0,
    count: bucket.count,
    fill: CATEGORY_COLORS[category],
  }));
}

function compactQuestionLabel(label: string) {
  return label.length > 18 ? `${label.slice(0, 18)}...` : label;
}

function scoreValue(item: ScoreAverage) {
  return item.averageWeightedScore ?? item.averageScore ?? 0;
}

function scoreLabel(value: unknown) {
  return typeof value === "number" ? value.toFixed(2) : "";
}

function countSubjectiveAnswers(items: SubjectiveAnswerGroup[]) {
  return items.reduce((sum, item) => sum + item.answers.length, 0);
}

function formatScore(value: number | null | undefined) {
  return typeof value === "number" ? value.toFixed(2) : "-";
}

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}
