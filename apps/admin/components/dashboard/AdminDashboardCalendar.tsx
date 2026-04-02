"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import dayjs from "dayjs";
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker";
import type { CalendarWeek } from "react-day-picker";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "lucide-react";
import { Button, buttonVariants } from "@repo/ui/src/button";
import { cn } from "@repo/ui/lib/utils";

export type DayIndicator = {
  id: string;
  title: string;
  type: "supervisor" | "interview" | "dayoff" | "status";
};

type Props = {
  dayMap: Map<string, DayIndicator[]>;
  selectedDate: Date;
  displayMonth: Date;
  onDisplayMonthChange: (month: Date) => void;
  onDateSelect: (date: Date) => void;
  onPreset: (range: { startDate: string; endDate: string }) => void;
  activePreset: string | null;
  dateLabel: string;
};

function CalendarChevron({
  orientation,
  ...props
}: { orientation?: string } & React.ComponentPropsWithoutRef<"svg">) {
  if (orientation === "left")
    return <ChevronLeftIcon className="size-4" {...props} />;
  return <ChevronRightIcon className="size-4" {...props} />;
}

function CalendarRoot({
  className,
  rootRef,
  ...props
}: {
  className?: string;
  rootRef?: React.Ref<HTMLDivElement>;
} & React.ComponentPropsWithoutRef<"div">) {
  return (
    <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />
  );
}

function CalendarWeekNumber({
  children,
  ...props
}: React.ComponentPropsWithoutRef<"td"> & { children?: React.ReactNode }) {
  return (
    <td {...props}>
      <div className="flex size-(--cell-size) items-center justify-center text-center">
        {children}
      </div>
    </td>
  );
}

export function AdminDashboardCalendar({
  dayMap,
  selectedDate,
  displayMonth,
  onDisplayMonthChange,
  onDateSelect,
  onPreset,
  activePreset,
  dateLabel,
}: Props) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const selectedDateStr = dayjs(selectedDate).format("YYYY-MM-DD");

  const stateRef = useRef({ isCollapsed, selectedDateStr });
  stateRef.current = { isCollapsed, selectedDateStr };

  const CustomWeek = useCallback(
    ({
      week,
      ...trProps
    }: { week: CalendarWeek } & React.HTMLAttributes<HTMLTableRowElement>) => {
      const { isCollapsed: collapsed, selectedDateStr: selDate } =
        stateRef.current;
      const containsSelected = week.days.some(
        (day) => dayjs(day.date).format("YYYY-MM-DD") === selDate,
      );
      const shouldHide = collapsed && !containsSelected;
      return (
        <tr
          {...trProps}
          style={{
            ...trProps.style,
            maxHeight: shouldHide ? 0 : 200,
            overflow: "hidden",
            opacity: shouldHide ? 0 : 1,
            transition: "max-height 250ms ease, opacity 200ms ease",
          }}
        />
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const CustomDayButton = useCallback(
    ({
      className,
      day,
      modifiers,
      ...props
    }: React.ComponentProps<typeof DayButton>) => {
      const defaultClassNames = getDefaultClassNames();
      const dateKey = dayjs(day.date).format("YYYY-MM-DD");
      const labels = dayMap.get(dateKey) ?? [];
      const hasSupervisor = labels.some((l) => l.type === "supervisor");
      const hasInterview = labels.some((l) => l.type === "interview");
      const hasDayoff = labels.some((l) => l.type === "dayoff");

      return (
        <Button
          variant="ghost"
          size="icon"
          data-selected-single={
            modifiers.selected &&
            !modifiers.range_start &&
            !modifiers.range_end &&
            !modifiers.range_middle
          }
          className={cn(
            "flex h-auto w-full min-w-0 flex-col items-center rounded-xl p-1 leading-none font-normal transition-all duration-200",
            "justify-center",
            "hover:bg-blue-50",
            defaultClassNames.day,
            className,
          )}
          {...props}
        >
          <span className="relative flex flex-col items-center">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-sm tabular-nums",
                modifiers.selected &&
                  !modifiers.outside &&
                  "bg-slate-900 text-white",
                !modifiers.selected &&
                  modifiers.today &&
                  "font-bold text-blue-600",
                modifiers.outside && "text-muted-foreground/40",
              )}
            >
              {day.date.getDate()}
            </span>
            {!modifiers.outside &&
              (hasSupervisor || hasInterview || hasDayoff) && (
                <span className="mt-0.5 flex flex-col items-center gap-0.5">
                  {hasDayoff && (
                    <span className="block size-1.5 rounded-full bg-purple-500" />
                  )}
                  {hasSupervisor && (
                    <span className="block h-[3px] w-3 rounded-full bg-blue-500" />
                  )}
                  {hasInterview && (
                    <span className="block h-[3px] w-3 rounded-full bg-amber-500" />
                  )}
                </span>
              )}
          </span>
        </Button>
      );
    },
    [dayMap],
  );

  const defaultClassNames = getDefaultClassNames();
  const presets = useMemo(() => {
    const today = dayjs();
    const day = today.day();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = today.add(diffToMonday, "day").format("YYYY-MM-DD");
    const sunday = today.add(diffToMonday + 6, "day").format("YYYY-MM-DD");
    const monthFirst = today.startOf("month").format("YYYY-MM-DD");
    const monthLast = today.endOf("month").format("YYYY-MM-DD");
    const todayStr = today.format("YYYY-MM-DD");

    return [
      { label: "오늘", start: todayStr, end: todayStr },
      { label: "이번 주", start: monday, end: sunday },
      { label: "이번 달", start: monthFirst, end: monthLast },
    ];
  }, []);

  return (
    <div className="snow-panel rounded-xl p-3">
      <div className="mb-3 flex items-center justify-between px-2 pt-1">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">
            Calendar
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            일정 중심 보기
          </p>
        </div>
        <div className="snow-pill rounded-full px-3 py-1 text-[11px] font-medium">
          {dateLabel} 기준 현황
        </div>
      </div>
      <div className="mb-3 flex gap-1.5 px-1">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant={activePreset === preset.label ? "default" : "outline"}
            size="sm"
            onClick={() =>
              onPreset({ startDate: preset.start, endDate: preset.end })
            }
            className={
              activePreset === preset.label
                ? "h-8 rounded-full bg-slate-900 px-3 text-xs text-white shadow-none hover:bg-slate-800"
                : "h-8 rounded-full bg-[#f9f9fa] px-3 text-xs text-slate-600 hover:bg-[#f1f1f2]"
            }
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && onDateSelect(date)}
          month={displayMonth}
          onMonthChange={onDisplayMonthChange}
          showOutsideDays
          className="snow-grid rounded-xl bg-white p-3 [--cell-size:--spacing(9)]"
          formatters={{
            formatCaption: (date) =>
              `${date.getFullYear()}년 ${date.getMonth() + 1}월`,
            formatMonthDropdown: (date) => `${date.getMonth() + 1}월`,
            formatWeekdayName: (date) => {
              const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
              return dayNames[date.getDay()] || "";
            },
          }}
          classNames={{
            root: cn("w-full", defaultClassNames.root),
            months: cn(
              "flex gap-4 flex-col relative",
              defaultClassNames.months,
            ),
            month: cn(
              "flex flex-col w-full gap-4",
              defaultClassNames.month,
            ),
            nav: cn(
              "flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between",
              defaultClassNames.nav,
            ),
            button_previous: cn(
              buttonVariants({ variant: "ghost" }),
              "size-(--cell-size) aria-disabled:opacity-50 p-0 select-none",
              defaultClassNames.button_previous,
            ),
            button_next: cn(
              buttonVariants({ variant: "ghost" }),
              "size-(--cell-size) aria-disabled:opacity-50 p-0 select-none",
              defaultClassNames.button_next,
            ),
            month_caption: cn(
              "flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)",
              defaultClassNames.month_caption,
            ),
            caption_label: cn(
              "select-none font-medium text-sm",
              defaultClassNames.caption_label,
            ),
            table: "w-full border-collapse",
            weekdays: cn("flex", defaultClassNames.weekdays),
            weekday: cn(
              "rounded-md flex-1 font-normal text-[0.8rem] select-none",
              "[&:first-child]:text-red-500",
              "[&:last-child]:text-blue-500",
              "[&:not(:first-child):not(:last-child)]:text-muted-foreground",
              defaultClassNames.weekday,
            ),
            week: cn("flex w-full", defaultClassNames.week),
            week_number_header: cn(
              "select-none w-(--cell-size)",
              defaultClassNames.week_number_header,
            ),
            week_number: cn(
              "text-[0.8rem] select-none text-muted-foreground",
              defaultClassNames.week_number,
            ),
            day: cn(
              "relative w-full p-0 text-center group/day select-none",
              defaultClassNames.day,
            ),
            today: cn("rounded-lg", defaultClassNames.today),
            outside: cn("text-muted-foreground", defaultClassNames.outside),
            disabled: cn(
              "text-muted-foreground opacity-50",
              defaultClassNames.disabled,
            ),
            hidden: cn("invisible", defaultClassNames.hidden),
          }}
          components={{
            Root: CalendarRoot,
            Chevron: CalendarChevron,
            DayButton: CustomDayButton,
            WeekNumber: CalendarWeekNumber,
            Week: CustomWeek,
          }}
        />
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="snow-pill flex w-full items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium transition-colors hover:text-slate-900"
        >
          {isCollapsed ? (
            <>
              펼치기
              <ChevronDownIcon className="size-3.5" />
            </>
          ) : (
            <>
              접기
              <ChevronUpIcon className="size-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
