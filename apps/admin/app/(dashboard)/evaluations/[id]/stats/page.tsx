"use client";

import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@repo/ui/src/badge";
import { Button } from "@repo/ui/src/button";
import { Card, CardContent } from "@repo/ui/src/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/src/table";
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

type QuestionAverage = ScoreAverage & {
  questionId: string | null;
  sortOrder: number;
  evaluatorTypes: EvaluatorType[];
  questionCategory: QuestionCategory;
};

type PersonalResult = {
  subjectId: string;
  subjectName: string;
  teamName: string;
  positionName: string;
  submittedCount: number;
  evaluatorCounts: Record<EvaluatorType, number>;
  scoreCount: number;
  averageScore: number | null;
  averageWeightedScore: number | null;
  questionScores: QuestionAverage[];
};

type UnsubmittedAssignment = {
  assignmentId: string;
  subjectId: string;
  subjectName: string;
  subjectTeamName: string;
  subjectPositionName: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorTeamName: string;
  evaluatorType: EvaluatorType;
};

type EvaluationRoundStatistics = {
  round: {
    id: string;
    name: string;
    description: string | null;
    startDate: string;
    endDate: string;
    status: string;
    isDeployed: boolean;
    questionSetName: string | null;
    questionSetAppliedAt: string | null;
    updatedAt: string;
  };
  summary: {
    totalAssignments: number;
    submittedCount: number;
    unsubmittedCount: number;
    submissionRate: number;
    totalQuestions: number;
    scoreQuestions: number;
    subjectiveQuestions: number;
    evaluatedSubjectCount: number;
  };
  evaluatorTypeAverages: ScoreAverage[];
  teamAverages: ScoreAverage[];
  positionAverages: ScoreAverage[];
  questionAverages: QuestionAverage[];
  personalResults: PersonalResult[];
  unsubmittedAssignments: UnsubmittedAssignment[];
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
  name?: string;
};

async function requestJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(payload?.error || "요청 처리에 실패했습니다.");
  }

  return payload as T;
}

export default function EvaluationRoundStatsPage() {
  const { id: roundId } = useParams<{ id: string }>();

  const { data, isLoading, isError, error } = useQuery<EvaluationRoundStatistics>({
    queryKey: queryKeys.evaluations.roundStatistics(roundId || ""),
    queryFn: async () =>
      requestJson<EvaluationRoundStatistics>(
        `/api/evaluations/rounds/${roundId}/statistics`,
      ),
    enabled: !!roundId,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-5 p-6">
        <Button asChild variant="outline">
          <Link href="/evaluations">
            <ArrowLeft className="mr-1 h-4 w-4" />
            회차 목록
          </Link>
        </Button>
        <div className="rounded-xl bg-slate-50 px-5 py-4 text-sm text-slate-700">
          {error instanceof Error ? error.message : "통계를 불러오지 못했습니다."}
        </div>
      </div>
    );
  }

  const completionChartData: ChartDatum[] = [
    {
      name: "제출",
      value: data.summary.submittedCount,
      fill: "#0f172a",
    },
    {
      name: "미제출",
      value: data.summary.unsubmittedCount,
      fill: "#cbd5e1",
    },
  ];
  const evaluatorChartData = data.evaluatorTypeAverages.map((item) => ({
    name: item.label,
    value: item.averageWeightedScore ?? item.averageScore ?? 0,
    count: item.count,
    fill: item.label === "상사" ? "#0f172a" : "#64748b",
  }));
  const teamChartData = toAverageChartData(data.teamAverages, 8);
  const positionChartData = toAverageChartData(data.positionAverages, 8);
  const questionChartData = data.questionAverages.slice(0, 10).map((item) => ({
    name: `${item.questionCategory} · ${compactQuestionLabel(item.label)}`,
    value: item.averageWeightedScore ?? item.averageScore ?? 0,
    count: item.count,
    fill: questionCategoryColor(item.questionCategory),
  }));

  return (
    <div className="evaluations-page space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/evaluations">
              <ArrowLeft className="mr-1 h-4 w-4" />
              회차 목록
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
                {data.round.name} 통계
              </h1>
              <Badge className="border-0 bg-slate-100 text-slate-600">
                {data.round.isDeployed ? "배포 ON" : "배포 OFF"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {data.round.startDate} ~ {data.round.endDate}
              {data.round.questionSetName ? ` · ${data.round.questionSetName}` : ""}
            </p>
          </div>
        </div>
        <div className="text-right text-xs leading-5 text-slate-400">
          <div>마지막 수정 {dayjs(data.round.updatedAt).format("YYYY-MM-DD HH:mm")}</div>
          {data.round.questionSetAppliedAt && (
            <div>
              SET 적용 {dayjs(data.round.questionSetAppliedAt).format("YYYY-MM-DD HH:mm")}
            </div>
          )}
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <MetricTile
          label="제출률"
          value={`${data.summary.submissionRate}%`}
          detail={`${data.summary.submittedCount}/${data.summary.totalAssignments}건 제출`}
        />
        <MetricTile
          label="미제출"
          value={`${data.summary.unsubmittedCount}건`}
          detail="평가자-대상자 배정 기준"
        />
        <MetricTile
          label="평가 대상자"
          value={`${data.summary.evaluatedSubjectCount}명`}
          detail="제출 응답이 있는 대상자"
        />
        <MetricTile
          label="문항"
          value={`${data.summary.totalQuestions}개`}
          detail={`척도 ${data.summary.scoreQuestions} · 주관식 ${data.summary.subjectiveQuestions}`}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <ChartPanel
          title="제출 현황"
          description="전체 평가자-대상자 배정 기준"
        >
          <div className="grid h-[240px] grid-rows-[150px_1fr] items-center gap-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={completionChartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={46}
                  outerRadius={66}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {completionChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip suffix="건" />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-[76px_1fr] items-center gap-3">
              <div>
                <div className="text-2xl font-semibold text-slate-950">
                  {data.summary.submissionRate}%
                </div>
                <div className="mt-1 text-xs text-slate-400">제출률</div>
              </div>
              <ChartLegend
                items={[
                  {
                    label: "제출",
                    value: `${data.summary.submittedCount}건`,
                    color: "#0f172a",
                  },
                  {
                    label: "미제출",
                    value: `${data.summary.unsubmittedCount}건`,
                    color: "#cbd5e1",
                  },
                ]}
              />
            </div>
          </div>
        </ChartPanel>

        <ChartPanel
          title="상사/동료 평균"
          description="가중 평균 기준, 척도 문항만 포함"
        >
          <VerticalBarChart data={evaluatorChartData} height={240} barColor="#0f172a" />
        </ChartPanel>
        <ChartPanel
          title="팀별 평균"
          description="가중 평균 기준 상위 8개 항목"
        >
          <HorizontalBarChart data={teamChartData} height={240} yAxisWidth={86} />
        </ChartPanel>
        <ChartPanel
          title="직급별 평균"
          description="가중 평균 기준 상위 8개 항목"
        >
          <HorizontalBarChart data={positionChartData} height={240} yAxisWidth={86} />
        </ChartPanel>
      </section>

      <ChartPanel
        title="문항별 평균 점수"
        description="문항 순서 기준 최대 10개 문항"
      >
        <HorizontalBarChart data={questionChartData} height={360} />
      </ChartPanel>

      <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="border-slate-200 bg-white shadow-none">
          <CardContent className="p-0">
            <SectionHeader
              icon={BarChart3}
              title="상사/동료 평균"
              description="제출된 척도 답변 기준"
            />
            <div className="divide-y divide-slate-100">
              {data.evaluatorTypeAverages.map((item) => (
                <AverageRow key={item.key} item={item} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-none">
          <CardContent className="p-0">
            <SectionHeader
              icon={CheckCircle2}
              title="미제출자"
              description="실명 기준으로 평가자와 대상자를 확인합니다."
            />
            <div className="max-h-[300px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 hover:bg-transparent">
                    <TableHead className="h-auto px-3 py-2 text-xs font-medium text-slate-400">평가자</TableHead>
                    <TableHead className="h-auto px-3 py-2 text-xs font-medium text-slate-400">구분</TableHead>
                    <TableHead className="h-auto px-3 py-2 text-xs font-medium text-slate-400">대상자</TableHead>
                    <TableHead className="h-auto px-3 py-2 text-xs font-medium text-slate-400">대상자 소속</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.unsubmittedAssignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="px-3 py-10 text-center text-sm text-slate-500">
                        모든 배정이 제출되었습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.unsubmittedAssignments.map((item) => (
                      <TableRow
                        key={item.assignmentId}
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                      >
                        <TableCell className="px-3 py-3 font-medium text-slate-900">
                          {item.evaluatorName}
                          <div className="mt-0.5 text-xs font-normal text-slate-400">
                            {item.evaluatorTeamName}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <EvaluatorBadge type={item.evaluatorType} />
                        </TableCell>
                        <TableCell className="px-3 py-3 text-slate-700">
                          {item.subjectName}
                        </TableCell>
                        <TableCell className="px-3 py-3 text-sm text-slate-500">
                          {item.subjectTeamName} · {item.subjectPositionName}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <AverageTable title="팀별 평균" items={data.teamAverages} emptyLabel="팀별 점수가 없습니다." />
        <AverageTable
          title="직급별 평균"
          items={data.positionAverages}
          emptyLabel="직급별 점수가 없습니다."
        />
      </section>

      <QuestionAverageTable items={data.questionAverages} />

      <PersonalResultsTable roundId={data.round.id} items={data.personalResults} />
    </div>
  );
}

function MetricTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl bg-white px-5 py-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{detail}</div>
    </div>
  );
}

function ChartPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-slate-200 bg-white shadow-none">
      <CardContent className="p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-400">{description}</p>
        </div>
        <div className="p-5">{children}</div>
      </CardContent>
    </Card>
  );
}

function VerticalBarChart({
  data,
  height,
  barColor,
}: {
  data: ChartDatum[];
  height: number;
  barColor: string;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis domain={[0, 5]} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} fill={barColor}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill || barColor} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              formatter={(value: number) => formatScore(value)}
              fill="#0f172a"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function HorizontalBarChart({
  data,
  height,
  yAxisWidth = 120,
}: {
  data: ChartDatum[];
  height: number;
  yAxisWidth?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 30, left: 12, bottom: 4 }}
        >
          <CartesianGrid horizontal={false} stroke="#e2e8f0" />
          <XAxis
            type="number"
            domain={[0, 5]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={yAxisWidth}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#475569", fontSize: 12 }}
          />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#475569">
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill || "#475569"} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(value: number) => formatScore(value)}
              fill="#0f172a"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  suffix = "점",
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs">
      <div className="font-medium text-slate-900">{item.name}</div>
      <div className="mt-1 text-slate-500">
        {suffix === "건" ? `${item.value}${suffix}` : `${formatScore(item.value)}${suffix}`}
      </div>
      {item.count !== undefined && (
        <div className="mt-0.5 text-slate-400">{item.count}개 답변</div>
      )}
    </div>
  );
}

function ChartLegend({
  items,
}: {
  items: Array<{ label: string; value: string; color: string }>;
}) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-2 text-slate-500">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
          <span className="font-medium text-slate-900">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function AverageRow({ item }: { item: ScoreAverage }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-slate-900">{item.label}</div>
        <div className="mt-0.5 text-xs text-slate-400">{item.count}개 답변</div>
      </div>
      <div className="text-right">
        <div className="text-lg font-semibold text-slate-950">
          {formatScore(item.averageScore)}
        </div>
        <div className="text-xs text-slate-400">
          가중 {formatScore(item.averageWeightedScore)}
        </div>
      </div>
    </div>
  );
}

function AverageTable({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: ScoreAverage[];
  emptyLabel: string;
}) {
  return (
    <Card className="border-slate-200 bg-white shadow-none">
      <CardContent className="p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-100 hover:bg-transparent">
              <TableHead className="h-auto px-3 py-2 text-xs font-medium text-slate-400">구분</TableHead>
              <TableHead className="w-24 text-right h-auto px-3 py-2 text-xs font-medium text-slate-400">답변</TableHead>
              <TableHead className="w-28 text-right h-auto px-3 py-2 text-xs font-medium text-slate-400">평균</TableHead>
              <TableHead className="w-28 text-right h-auto px-3 py-2 text-xs font-medium text-slate-400">가중 평균</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="px-3 py-10 text-center text-sm text-slate-500">
                  {emptyLabel}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.key}
                  className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                >
                  <TableCell className="px-3 py-3 font-medium text-slate-900">
                    {item.label}
                  </TableCell>
                  <TableCell className="px-3 py-3 text-right text-sm text-slate-500">
                    {item.count}
                  </TableCell>
                  <TableCell className="px-3 py-3 text-right font-semibold text-slate-900">
                    {formatScore(item.averageScore)}
                  </TableCell>
                  <TableCell className="px-3 py-3 text-right text-sm text-slate-500">
                    {formatScore(item.averageWeightedScore)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function QuestionAverageTable({ items }: { items: QuestionAverage[] }) {
  return (
    <Card className="border-slate-200 bg-white shadow-none">
      <CardContent className="p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-950">문항별 평균 점수</h2>
        </div>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="min-w-[360px] h-auto px-3 py-2 text-xs font-medium text-slate-400">문항</TableHead>
                <TableHead className="w-24 h-auto px-3 py-2 text-xs font-medium text-slate-400">문항 구분</TableHead>
                <TableHead className="w-24 text-right h-auto px-3 py-2 text-xs font-medium text-slate-400">답변</TableHead>
                <TableHead className="w-28 text-right h-auto px-3 py-2 text-xs font-medium text-slate-400">평균</TableHead>
                <TableHead className="w-28 text-right h-auto px-3 py-2 text-xs font-medium text-slate-400">가중 평균</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="px-3 py-10 text-center text-sm text-slate-500">
                    척도 문항 답변이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow
                  key={item.key}
                  className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                >
                    <TableCell className="px-3 py-3">
                      <div className="line-clamp-2 text-sm font-medium text-slate-900">
                        {item.label}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <QuestionCategoryBadge category={item.questionCategory} />
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right text-sm text-slate-500">
                      {item.count}
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right font-semibold text-slate-900">
                      {formatScore(item.averageScore)}
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right text-sm text-slate-500">
                      {formatScore(item.averageWeightedScore)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function PersonalResultsTable({
  roundId,
  items,
}: {
  roundId: string;
  items: PersonalResult[];
}) {
  return (
    <Card className="border-slate-200 bg-white shadow-none">
      <CardContent className="p-0">
        <SectionHeader
          icon={Users}
          title="개인별 점수"
          description="관리자 전체 열람 범위로 집계된 개인 평균과 문항 점수입니다."
        />
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="w-52 h-auto px-3 py-2 text-xs font-medium text-slate-400">대상자</TableHead>
                <TableHead className="w-44 h-auto px-3 py-2 text-xs font-medium text-slate-400">소속/직급</TableHead>
                <TableHead className="w-32 h-auto px-3 py-2 text-xs font-medium text-slate-400">평가 수</TableHead>
                <TableHead className="w-24 text-right h-auto px-3 py-2 text-xs font-medium text-slate-400">평균</TableHead>
                <TableHead className="min-w-[420px] h-auto px-3 py-2 text-xs font-medium text-slate-400">문항별 점수</TableHead>
                <TableHead className="w-24 text-right h-auto px-3 py-2 text-xs font-medium text-slate-400">리포트</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="px-3 py-10 text-center text-sm text-slate-500">
                    제출된 개인 점수가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow
                    key={item.subjectId}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50"
                  >
                    <TableCell className="px-3 py-3 font-medium text-slate-900">
                      {item.subjectName}
                    </TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-500">
                      {item.teamName}
                      <div className="mt-0.5 text-xs text-slate-400">{item.positionName}</div>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline">상사 {item.evaluatorCounts.상사}</Badge>
                        <Badge variant="outline">동료 {item.evaluatorCounts.동료}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right">
                      <div className="font-semibold text-slate-900">
                        {formatScore(item.averageScore)}
                      </div>
                      <div className="text-xs text-slate-400">
                        가중 {formatScore(item.averageWeightedScore)}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <div className="flex max-w-[720px] flex-wrap gap-1.5">
                        {item.questionScores.map((question) => (
                          <span
                            key={question.key}
                            className="inline-flex max-w-[220px] items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"
                            title={question.label}
                          >
                            <span className="truncate">{question.label}</span>
                            <span className="shrink-0 font-semibold text-slate-900">
                              {formatScore(question.averageScore)}
                            </span>
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-slate-600 hover:text-slate-900"
                      >
                        <Link
                          href={`/evaluation-reports/${roundId}/${item.subjectId}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          리포트
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function EvaluatorBadge({ type }: { type: EvaluatorType }) {
  return (
    <Badge
      className={
        type === "상사"
          ? "border-0 bg-slate-900 text-white"
          : "border-0 bg-slate-100 text-slate-600"
      }
    >
      {type}
    </Badge>
  );
}

function QuestionCategoryBadge({ category }: { category: QuestionCategory }) {
  return (
    <Badge
      className={
        category === "공통"
          ? "border-0 bg-slate-900 text-white"
          : category === "상사"
            ? "border-0 bg-slate-100 text-slate-700"
            : "border-0 bg-slate-200 text-slate-700"
      }
    >
      {category}
    </Badge>
  );
}

function formatScore(value: number | null) {
  return value === null ? "-" : value.toFixed(2).replace(/\.00$/, "");
}

function toAverageChartData(items: ScoreAverage[], limit: number): ChartDatum[] {
  return items
    .slice(0, limit)
    .map((item, index) => ({
      name: item.label,
      value: item.averageWeightedScore ?? item.averageScore ?? 0,
      count: item.count,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }));
}

function compactQuestionLabel(label: string) {
  const normalized = label.replace(/\s+/g, " ").trim();
  return normalized.length > 28 ? `${normalized.slice(0, 28)}...` : normalized;
}

function questionCategoryColor(category: QuestionCategory) {
  if (category === "공통") return "#0f172a";
  if (category === "상사") return "#475569";
  return "#94a3b8";
}

const CHART_COLORS = [
  "#0f172a",
  "#334155",
  "#475569",
  "#64748b",
  "#334155",
  "#475569",
  "#94a3b8",
  "#64748b",
];
