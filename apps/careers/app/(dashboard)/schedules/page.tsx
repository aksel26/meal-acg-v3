"use client";

import { AlertTriangle, CalendarDays, Clock3 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@repo/ui/src/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/src/table";
import {
  type DerivedScheduleItem,
  localDateKey,
  ScheduleCalendar,
  scheduleDate,
  scheduleTime,
} from "@/components/ScheduleCalendar";
import { ScheduleFinalResultDialog } from "@/components/ScheduleFinalResultDialog";
import { ScheduleTimetable } from "@/components/ScheduleTimetable";
import { PageError, PageHeader, PageLoading } from "@/components/PageStates";
import { useSchedules } from "@/hooks/useCareersApi";

function ScheduleTable({
  schedules,
  overdue = false,
  onFinalResult,
}: {
  schedules: DerivedScheduleItem[];
  overdue?: boolean;
  onFinalResult?: (item: DerivedScheduleItem) => void;
}) {
  if (schedules.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-400">
        {overdue
          ? "결과 입력이 밀린 일정이 없습니다."
          : "예정된 일정이 없습니다."}
      </p>
    );
  }

  return (
    <Table className="min-w-[1100px]">
      <TableHeader>
        <TableRow className="border-b border-slate-100 bg-white hover:bg-white [&>th]:px-4 [&>th]:text-xs [&>th]:text-slate-400">
          <TableHead>지원자</TableHead>
          <TableHead>전형</TableHead>
          <TableHead>모집 분야</TableHead>
          <TableHead>공고</TableHead>
          <TableHead>일정일</TableHead>
          <TableHead>시간</TableHead>
          <TableHead>메모</TableHead>
          <TableHead>연락처</TableHead>
          <TableHead>지역</TableHead>
          {overdue && <TableHead className="text-center">관리</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {schedules.map((item) => (
          <TableRow
            key={item.id}
            className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 [&>td]:px-4"
          >
            <TableCell>
              <Link
                href={`/applicants/${item.applicationId}`}
                className="font-medium text-slate-800 hover:underline"
              >
                {item.applicantName}
              </Link>
            </TableCell>
            <TableCell className="text-xs text-slate-500">
              {item.stageName || item.title}
            </TableCell>
            <TableCell className="text-sm text-slate-600">
              {item.field || "-"}
            </TableCell>
            <TableCell className="max-w-52 truncate text-xs text-slate-500">
              {item.postingTitle}
            </TableCell>
            <TableCell
              className={`whitespace-nowrap text-sm ${
                overdue ? "font-medium text-amber-600" : "text-slate-600"
              }`}
            >
              {scheduleDate(item) || "-"}
            </TableCell>
            <TableCell className="text-sm text-slate-600">
              {scheduleTime(item) || "-"}
            </TableCell>
            <TableCell className="max-w-56 truncate text-xs text-slate-500">
              {item.note || "-"}
            </TableCell>
            <TableCell className="whitespace-nowrap text-xs text-slate-500">
              {item.phone || "-"}
            </TableCell>
            <TableCell className="text-xs text-slate-500">
              {item.region || "-"}
            </TableCell>
            {overdue && (
              <TableCell className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onFinalResult?.(item)}
                >
                  최종 결과 입력
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function SchedulesPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    () => new Date(),
  );
  const [resultTarget, setResultTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const schedulesQuery = useSchedules();
  const schedules = useMemo(
    () =>
      [
        ...(schedulesQuery.data?.upcoming || []),
        ...(schedulesQuery.data?.overdue || []),
        ...(schedulesQuery.data?.completed || []),
      ] as DerivedScheduleItem[],
    [schedulesQuery.data],
  );
  const upcoming = (schedulesQuery.data?.upcoming ||
    []) as DerivedScheduleItem[];
  const overdue = (schedulesQuery.data?.overdue || []) as DerivedScheduleItem[];
  const selectedDateKey = selectedDate ? localDateKey(selectedDate) : "";

  return (
    <div className="careers-page">
      <PageHeader
        title="채용 일정 관리"
        description={`일정 ${upcoming.length + overdue.length}건 (예정 ${upcoming.length}건 / 지난 일정 ${overdue.length}건)`}
      />

      {schedulesQuery.isLoading ? (
        <PageLoading />
      ) : schedulesQuery.isError && !schedulesQuery.data ? (
        <PageError
          message={schedulesQuery.error.message}
          onRetry={() => schedulesQuery.refetch()}
        />
      ) : (
        <>
          <div className="mb-6 grid gap-5 lg:grid-cols-[360px_1fr]">
            <section className="careers-panel overflow-hidden">
              <div className="flex items-center gap-2 px-4 pt-4 text-sm font-semibold text-slate-700">
                <CalendarDays className="size-4 text-slate-400" />
                일정 캘린더
              </div>
              <ScheduleCalendar
                schedules={schedules}
                selected={selectedDate}
                onSelect={setSelectedDate}
              />
            </section>
            <section className="careers-panel overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-4 text-sm font-semibold text-slate-700">
                <Clock3 className="size-4 text-slate-400" />
                {selectedDateKey
                  ? `${selectedDateKey} 타임테이블`
                  : "날짜를 선택하세요"}
              </div>
              {selectedDateKey ? (
                <ScheduleTimetable
                  date={selectedDateKey}
                  schedules={schedules}
                />
              ) : (
                <p className="py-12 text-center text-sm text-slate-400">
                  날짜를 선택해 주세요.
                </p>
              )}
            </section>
          </div>

          <section className="careers-panel mb-6 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-4 text-sm font-semibold text-slate-700">
              <CalendarDays className="size-4 text-slate-400" />
              예정된 일정
            </div>
            <ScheduleTable schedules={upcoming} />
          </section>

          <section className="careers-panel mb-6 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-4 text-sm font-semibold text-slate-700">
              <AlertTriangle className="size-4 text-amber-500" />
              지난 일정 (결과 미입력)
            </div>
            <ScheduleTable
              schedules={overdue}
              overdue
              onFinalResult={(item) =>
                setResultTarget({
                  id: item.applicationId,
                  name: item.applicantName,
                })
              }
            />
          </section>
        </>
      )}

      <ScheduleFinalResultDialog
        application={resultTarget}
        onOpenChange={(open) => !open && setResultTarget(null)}
      />
    </div>
  );
}
