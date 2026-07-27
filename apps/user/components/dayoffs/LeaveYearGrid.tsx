"use client";

import { Fragment, useMemo } from "react";
import dayjs from "dayjs";
import { Pause } from "lucide-react";
import type { DayoffRecord } from "@/hooks/use-dayoffs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/src/tooltip";

export type LeaveYearRecord = Pick<
  DayoffRecord,
  | "id"
  | "leave_date"
  | "leave_type_id"
  | "late_hour"
  | "late_minute"
  | "leave_type"
> &
  Partial<Pick<DayoffRecord, "approval_status" | "approver" | "reason">>;

const DUMMY_LEAVE_SCHEDULE = [
  [1, 8, 5, "연차", "연차", "full"],
  [1, 22, 3, "오전반차", "반차", "morning"],
  [2, 6, 4, "오후반차", "반차", "afternoon"],
  [2, 19, 5, "연차", "연차", "full"],
  [3, 5, 17, "오전반반차", "반반차", "morning"],
  [3, 23, 5, "연차", "연차", "full"],
  [4, 10, 5, "연차", "연차", "full"],
  [4, 24, 4, "오후반차", "반차", "afternoon"],
  [5, 8, 6, "대체휴무", "대체휴무", "full"],
  [5, 21, 3, "오전반차", "반차", "morning"],
  [6, 12, 5, "연차", "연차", "full"],
  [6, 26, 18, "오후반반차", "반반차", "afternoon"],
  [7, 3, 19, "하계휴가", "휴무", "full"],
  [7, 17, 19, "하계휴가", "휴무", "full"],
  [8, 7, 5, "연차", "연차", "full"],
  [8, 20, 3, "오전반차", "반차", "morning"],
  [9, 4, 7, "경조휴무", "경조휴무", "full"],
  [9, 18, 5, "연차", "연차", "full"],
  [10, 9, 4, "오후반차", "반차", "afternoon"],
  [10, 23, 5, "연차", "연차", "full"],
  [11, 6, 8, "특별휴무", "특별휴무", "full"],
  [11, 20, 17, "오전반반차", "반반차", "morning"],
  [12, 11, 5, "연차", "연차", "full"],
  [12, 24, 6, "대체휴무", "대체휴무", "full"],
] as const;

export function buildDummyLeaveRecords(year: number): LeaveYearRecord[] {
  const approvers = ["김민준", "이서연", "박지훈"];
  return DUMMY_LEAVE_SCHEDULE.map(
    ([month, day, id, name, category, durationType], index) => ({
      id: `dummy-leave-${year}-${index}`,
      leave_date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      leave_type_id: id,
      late_hour: null,
      late_minute: null,
      leave_type: { id, name, category, duration_type: durationType },
      approval_status: "approved",
      approver: {
        id: `dummy-approver-${index % approvers.length}`,
        full_name: approvers[index % approvers.length]!,
      },
      reason: "개인 일정",
    }),
  );
}

export default function LeaveYearGrid({
  dayoffs,
  dummyYear,
  onRecordSelect,
}: {
  dayoffs: LeaveYearRecord[];
  dummyYear?: number;
  onRecordSelect?: (record: LeaveYearRecord) => void;
}) {
  const records = useMemo<LeaveYearRecord[]>(
    () => [...dayoffs, ...(dummyYear ? buildDummyLeaveRecords(dummyYear) : [])],
    [dayoffs, dummyYear],
  );
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const monthRecords = records
        .filter((dayoff) => dayjs(dayoff.leave_date).month() + 1 === month)
        .sort((a, b) => a.leave_date.localeCompare(b.leave_date));
      const count = monthRecords.reduce((sum, record) => {
        if (record.leave_type?.category === "반반차") return sum + 0.25;
        return sum + (record.leave_type?.category === "반차" ? 0.5 : 1);
      }, 0);
      return { month, records: monthRecords, count };
    });
  }, [records]);

  return (
    <div className="overflow-x-auto rounded-xl bg-white">
      <div className="grid min-w-[1200px] grid-cols-12 gap-2 p-2">
        {months.map((monthData) => {
          const previous = months
            .slice(0, monthData.month - 1)
            .reduce((sum, item) => sum + item.count, 0);
          const cumulative = previous + monthData.count;

          return (
            <div
              key={monthData.month}
              className="flex flex-col overflow-hidden rounded-xl bg-slate-50"
            >
              <div className="bg-white px-2 py-2 text-center">
                <span className="text-xs font-semibold text-slate-700">
                  {monthData.month}월
                </span>
              </div>
              <div className="flex-1 space-y-1 px-2 py-2">
                {monthData.records.length > 0 ? (
                  monthData.records.map((record) => {
                    const content = (
                      <>
                        <span className="inline-flex items-center gap-0.5">
                          {dayjs(record.leave_date).format("D")}일
                          {record.approval_status === "pending" && (
                            <span
                              aria-label="승인 대기"
                              className="inline-flex text-amber-500"
                            >
                              <Pause
                                className="h-2.5 w-2.5"
                                aria-hidden="true"
                              />
                            </span>
                          )}
                        </span>
                        <span>
                          {record.leave_type_id === 1 && record.late_hour
                            ? `지각-${record.late_hour}시${record.late_minute || "00"}분`
                            : record.leave_type?.name || ""}
                        </span>
                      </>
                    );
                    const className =
                      "flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-md bg-white px-2 py-1.5 text-[11px] text-slate-600 transition-[background-color,font-weight] duration-150 hover:bg-slate-100 hover:font-medium";
                    const card = onRecordSelect ? (
                      <button
                        type="button"
                        onClick={() => onRecordSelect(record)}
                        aria-label={`${record.leave_date} ${record.leave_type?.name ?? "휴가"} 상세보기`}
                        className={className}
                      >
                        {content}
                      </button>
                    ) : (
                      <div className={className}>{content}</div>
                    );

                    return record.approval_status === "pending" ? (
                      <Tooltip key={record.id}>
                        <TooltipTrigger asChild>{card}</TooltipTrigger>
                        <TooltipContent side="top" sideOffset={4}>
                          대기중
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Fragment key={record.id}>{card}</Fragment>
                    );
                  })
                ) : (
                  <div className="px-2 py-3 text-center text-xs text-slate-300">
                    -
                  </div>
                )}
              </div>
              <div className="mt-auto bg-white/70">
                <div className="flex justify-between px-2 py-1 text-[10px] text-slate-400">
                  <span>이전</span>
                  <span>{previous > 0 ? previous : "-"}</span>
                </div>
                <div className="flex justify-between px-2 py-1 text-[10px] text-slate-500">
                  <span>합계</span>
                  <span className="font-medium">
                    {monthData.count > 0 ? monthData.count : "-"}
                  </span>
                </div>
                <div className="flex justify-between bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700">
                  <span>누적</span>
                  <span>{cumulative > 0 ? cumulative : "-"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
