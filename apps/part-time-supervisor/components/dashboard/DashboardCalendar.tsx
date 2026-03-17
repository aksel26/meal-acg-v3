"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import dayjs from "dayjs";
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker";
import type { CalendarWeek } from "react-day-picker";
import { ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, ChevronDownIcon } from "lucide-react";
import { Button, buttonVariants } from "@repo/ui/src/button";
import { cn } from "@repo/ui/lib/utils";
import type { DayJobLabel } from "@/hooks/use-dashboard-calendar";

type Props = {
  dayMap: Map<string, DayJobLabel[]>;
  selectedDate: Date;
  displayMonth: Date;
  onDisplayMonthChange: (month: Date) => void;
  onDateSelect: (date: Date) => void;
  onPreset: (range: { startDate: string; endDate: string }) => void;
  activePreset: string | null;
};

const STATUS_COLORS = [
  "bg-blue-200 text-blue-800",
  "bg-emerald-200 text-emerald-800",
  "bg-amber-200 text-amber-800",
  "bg-violet-200 text-violet-800",
  "bg-rose-200 text-rose-800",
  "bg-cyan-200 text-cyan-800",
];

function getJobColor(index: number) {
  return STATUS_COLORS[index % STATUS_COLORS.length] ?? STATUS_COLORS[0];
}

function formatLabel(title: string, platform: string | null): string {
  if (platform) return `${title}-(${platform})`;
  return title;
}

function CalendarChevron({
  orientation,
  ...props
}: { orientation?: string } & React.ComponentPropsWithoutRef<"svg">) {
  if (orientation === "left") return <ChevronLeftIcon className="size-4" {...props} />;
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
  return <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />;
}

function CalendarWeekNumber({
  children,
  ...props
}: React.ComponentPropsWithoutRef<"td"> & { children?: React.ReactNode }) {
  return (
    <td {...props}>
      <div className="flex size-(--cell-size) items-center justify-center text-center">{children}</div>
    </td>
  );
}

export function DashboardCalendar({
  dayMap,
  selectedDate,
  displayMonth,
  onDisplayMonthChange,
  onDateSelect,
  onPreset,
  activePreset,
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
      const { isCollapsed: collapsed, selectedDateStr: selDate } = stateRef.current;
      const containsSelected = week.days.some(
        (day) => dayjs(day.date).format("YYYY-MM-DD") === selDate
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
    []
  );

  const platformColorMap = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    for (const labels of dayMap.values()) {
      for (const label of labels) {
        const key = label.platform ?? "기타";
        if (!map.has(key)) {
          map.set(key, idx++);
        }
      }
    }
    return map;
  }, [dayMap]);

  const CustomDayButton = useCallback(
    ({ className, day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) => {
      const defaultClassNames = getDefaultClassNames();
      const dateKey = dayjs(day.date).format("YYYY-MM-DD");
      const labels = dayMap.get(dateKey) ?? [];
      const maxShow = 2;
      const overflow = labels.length - maxShow;

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
            "",
            "flex h-auto w-full min-h-[4.5rem] min-w-0 flex-col items-center rounded-lg p-1 leading-none font-normal",
            "justify-start gap-0.5",
            "hover:bg-accent/50",
            defaultClassNames.day,
            className
          )}
          {...props}
        >
          <span
            className={cn(
              "text-sm tabular-nums self-center size-8 flex items-center justify-center rounded-full",
              modifiers.selected && !modifiers.outside && "bg-slate-900 text-white",
              !modifiers.selected && modifiers.today && "font-bold text-blue-600",
              modifiers.outside && "text-muted-foreground/40"
            )}
          >
            {day.date.getDate()}
          </span>
          {!modifiers.outside && labels.length > 0 && (
            <div className="flex w-full flex-col gap-px">
              {labels.slice(0, maxShow).map((label) => {
                const colorIdx = platformColorMap.get(label.platform ?? "기타") ?? 0;
                const color = getJobColor(colorIdx);
                return (
                  <div
                    key={label.id}
                    className={cn(
                      "w-full truncate rounded-md px-1 py-0.5 text-[9px] leading-tight",
                      color
                    )}
                  >
                    {label.platform ?? "기타"}
                  </div>
                );
              })}
              {overflow > 0 && (
                <span className="text-[9px] text-muted-foreground pl-0.5">
                  +{overflow}건
                </span>
              )}
            </div>
          )}
        </Button>
      );
    },
    [dayMap, platformColorMap]
  );

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

  const defaultClassNames = getDefaultClassNames();

  return (
    <div className="flex flex-col gap-3">
      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={(date) => date && onDateSelect(date)}
        month={displayMonth}
        onMonthChange={onDisplayMonthChange}
        showOutsideDays
        className="p-3 [--cell-size:--spacing(9)]"
        formatters={{
          formatCaption: (date) =>
            `${date.getFullYear()}년 ${date.getMonth() + 1}월`,
          formatMonthDropdown: (date) =>
            `${date.getMonth() + 1}월`,
          formatWeekdayName: (date) => {
            const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
            return dayNames[date.getDay()] || "";
          },
        }}
        classNames={{
          root: cn("w-full", defaultClassNames.root),
          months: cn("flex gap-4 flex-col relative", defaultClassNames.months),
          month: cn("flex flex-col w-full gap-4", defaultClassNames.month),
          nav: cn(
            "flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between",
            defaultClassNames.nav
          ),
          button_previous: cn(
            buttonVariants({ variant: "ghost" }),
            "size-(--cell-size) aria-disabled:opacity-50 p-0 select-none",
            defaultClassNames.button_previous
          ),
          button_next: cn(
            buttonVariants({ variant: "ghost" }),
            "size-(--cell-size) aria-disabled:opacity-50 p-0 select-none",
            defaultClassNames.button_next
          ),
          month_caption: cn(
            "flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)",
            defaultClassNames.month_caption
          ),
          caption_label: cn(
            "select-none font-medium text-sm",
            defaultClassNames.caption_label
          ),
          table: "w-full border-collapse",
          weekdays: cn("flex", defaultClassNames.weekdays),
          weekday: cn(
            "rounded-md flex-1 font-normal text-[0.8rem] select-none",
            "[&:first-child]:text-red-500",
            "[&:last-child]:text-blue-500",
            "[&:not(:first-child):not(:last-child)]:text-muted-foreground",
            defaultClassNames.weekday
          ),
          week: cn("flex w-full", defaultClassNames.week),
          week_number_header: cn(
            "select-none w-(--cell-size)",
            defaultClassNames.week_number_header
          ),
          week_number: cn(
            "text-[0.8rem] select-none text-muted-foreground",
            defaultClassNames.week_number
          ),
          day: cn(
            "relative w-full p-0 text-center group/day select-none",
            defaultClassNames.day
          ),
          today: cn(
            "rounded-lg",
            defaultClassNames.today
          ),
          outside: cn(
            "text-muted-foreground",
            defaultClassNames.outside
          ),
          disabled: cn(
            "text-muted-foreground opacity-50",
            defaultClassNames.disabled
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
        className="flex w-full items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
  );
}
