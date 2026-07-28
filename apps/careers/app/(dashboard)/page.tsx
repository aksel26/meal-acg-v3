"use client";

import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/src/table";
import { CareersStatusBadge } from "@/components/CareersStatusBadge";
import { PageError, PageHeader, PageLoading } from "@/components/PageStates";
import {
  type DashboardData,
  type JobPosting,
  useDashboard,
} from "@/hooks/useCareersApi";

type DashboardPosting = JobPosting & {
  upcomingScheduleCount?: number;
  hiredCount?: number;
};

function isOngoing(posting: DashboardPosting) {
  if (posting.derivedStatus) return posting.derivedStatus === "진행중";
  if (!posting.endDate && !posting.closesAt) return posting.status === "open";
  const date = (posting.endDate || posting.closesAt || "").slice(0, 10);
  const end = new Date(`${date}T23:59:59`);
  return end.getTime() >= Date.now();
}

function field(posting: DashboardPosting) {
  return posting.field || posting.department || "-";
}

function period(posting: DashboardPosting) {
  const start = posting.startDate || posting.publishedAt || "-";
  const end = posting.endDate || posting.closesAt || "-";
  return `${start?.slice(0, 10)} ~ ${end?.slice(0, 10)}`;
}

export default function DashboardPage() {
  const query = useDashboard();
  const [fieldFilter, setFieldFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "ongoing" | "closed"
  >("all");

  const data = query.data as DashboardData | undefined;
  const postings = useMemo(
    () => (data?.postings || []) as DashboardPosting[],
    [data?.postings],
  );
  const fields = useMemo(
    () =>
      Array.from(new Set(postings.map(field).filter((value) => value !== "-"))),
    [postings],
  );
  const visiblePostings = useMemo(
    () =>
      postings
        .filter(
          (posting) => fieldFilter === "all" || field(posting) === fieldFilter,
        )
        .filter(
          (posting) =>
            statusFilter === "all" ||
            (statusFilter === "ongoing"
              ? isOngoing(posting)
              : !isOngoing(posting)),
        )
        .sort((left, right) =>
          (left.endDate || left.closesAt || "9999-12-31").localeCompare(
            right.endDate || right.closesAt || "9999-12-31",
          ),
        ),
    [fieldFilter, postings, statusFilter],
  );

  if (query.isLoading) {
    return (
      <div className="careers-page">
        <PageLoading />
      </div>
    );
  }
  if (query.isError || !data) {
    return (
      <div className="careers-page">
        <PageError
          message={query.error?.message}
          onRetry={() => query.refetch()}
        />
      </div>
    );
  }

  const stats = [
    {
      label: "진행중 공고",
      value: data.openPostings,
      icon: BriefcaseBusiness,
    },
    {
      label: "전체 지원자",
      value: data.activeApplications,
      icon: Users,
      note: "진행중 공고 기준",
    },
    {
      label: "일정 예정",
      value: data.upcomingApplicationCount,
      icon: CalendarDays,
      note: "진행중 공고 기준",
    },
    {
      label: "최종 합격",
      value: data.hiredApplicationCount,
      icon: UserCheck,
      note: "진행중 공고 기준",
    },
  ];

  return (
    <div className="careers-page">
      <PageHeader title="채용 대시보드" description="채용 공고 현황 요약" />

      <section
        aria-label="채용 현황"
        className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        {stats.map(({ label, value, icon: Icon, note }) => (
          <div key={label} className="careers-panel p-5">
            <div className="flex items-center gap-2">
              <Icon
                className="size-4 text-slate-400"
                strokeWidth={1.5}
                aria-hidden
              />
              <p className="text-xs font-medium text-slate-400">{label}</p>
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums text-slate-800">
              {value}
            </p>
            {note && <p className="mt-1 text-[11px] text-slate-400">{note}</p>}
          </div>
        ))}
      </section>

      <section className="careers-panel overflow-hidden">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
          <h2 className="text-sm font-semibold text-slate-700">공고별 현황</h2>
          <div className="flex gap-2 sm:ml-auto">
            <Select value={fieldFilter} onValueChange={setFieldFilter}>
              <SelectTrigger className="w-36" aria-label="모집 분야">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 분야</SelectItem>
                {fields.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as typeof statusFilter)
              }
            >
              <SelectTrigger className="w-32" aria-label="공고 상태">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="ongoing">진행중</SelectItem>
                <SelectItem value="closed">종료</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Table className="min-w-[1040px]">
          <TableHeader>
            <TableRow className="border-b border-slate-100 bg-white hover:bg-white [&>th]:px-4 [&>th]:text-xs [&>th]:text-slate-400">
              <TableHead>공고명</TableHead>
              <TableHead>모집 분야</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>기간</TableHead>
              <TableHead className="text-center">지원자</TableHead>
              <TableHead className="text-center">일정 예정</TableHead>
              <TableHead className="text-center">합격</TableHead>
              <TableHead className="text-center">별도관리</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiblePostings.map((posting) => (
              <TableRow
                key={posting.id}
                className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 [&>td]:px-4"
              >
                <TableCell>
                  <Link
                    href={`/postings/${posting.id}`}
                    className="font-medium text-slate-800 hover:underline"
                  >
                    {posting.title}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {field(posting)}
                </TableCell>
                <TableCell>
                  <CareersStatusBadge
                    value={isOngoing(posting) ? "open" : "closed"}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-slate-500">
                  {period(posting)}
                </TableCell>
                <TableCell className="text-center">
                  <Link
                    href={`/applicants?posting=${posting.id}`}
                    className="font-medium hover:underline"
                  >
                    {posting.applicantCount ??
                      posting.activeApplicantCount ??
                      0}
                  </Link>
                </TableCell>
                <TableCell className="text-center font-medium">
                  {posting.upcomingScheduleCount ?? 0}
                </TableCell>
                <TableCell className="text-center font-medium text-emerald-600">
                  {posting.hiredCount ?? 0}
                </TableCell>
                <TableCell className="text-center">
                  <Link
                    href={`/separated?posting=${posting.id}`}
                    className="text-slate-500 hover:underline"
                  >
                    {posting.separatedApplicantCount ?? 0}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/postings/${posting.id}`}
                    aria-label={`${posting.title} 상세 보기`}
                  >
                    <ChevronRight className="size-4 text-slate-300" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {visiblePostings.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-400">
            조건에 맞는 공고가 없습니다.
          </p>
        )}
      </section>
    </div>
  );
}
