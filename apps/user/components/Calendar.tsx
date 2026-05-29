/* eslint-disable react/prop-types */
import * as React from "react";
import { Calendar } from "@repo/ui/src/calendar";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { motion, AnimatePresence, PanInfo } from "motion/react";
import { useHolidays } from "@/hooks/useHolidays";
import { MealData } from "@/components/dashboard/types";
import { CalendarDayCell } from "./CalendarDayCell";

dayjs.locale("ko");

const EMPTY_MEAL_DATA: MealData[] = [];

const mealIndicatorStyles = {
  breakfast: "bg-[var(--warning)]",
  lunch: "bg-[var(--signal-orange)]",
  dinner: "bg-[var(--teal)]",
  individualLunch: "border border-[var(--signal-orange)] bg-transparent",
} as const;

const attendanceIcons = {
  halfDay: { icon: "/icons/clock.png", label: "반차" },
  off: { icon: "/icons/holiday.png", label: "휴가" },
  remote: { icon: "/icons/homeOffice.png", label: "재택" },
} as const;

type MealIndicator = {
  type: "breakfast" | "lunch" | "dinner";
  className: string;
};

interface Calendar21Props {
  onDateSelect?: (date: Date | undefined) => void;
  selectedDate?: Date;
  onMonthChange?: (month: number, year: number) => void;
  mealData?: MealData[];
  isLoading?: boolean;
  className?: string;
}

export default function CalendarComponent({
  onDateSelect,
  selectedDate,
  onMonthChange,
  mealData = EMPTY_MEAL_DATA,
  isLoading = false,
  className = "",
}: Calendar21Props) {
  const [date, setDate] = React.useState<Date | undefined>(selectedDate || new Date());
  const [currentMonth, setCurrentMonth] = React.useState<number>((selectedDate || new Date()).getMonth() + 1);
  const [currentYear, setCurrentYear] = React.useState<number>((selectedDate || new Date()).getFullYear());
  const [displayDate, setDisplayDate] = React.useState<Date>(selectedDate || new Date());
  const [direction, setDirection] = React.useState<number>(0);

  // 공휴일 데이터 가져오기
  const { data: holidayData = [] } = useHolidays(currentMonth, currentYear);

  const getMealDataForDate = React.useCallback(
    (targetDate: Date) => {
      const dateString = dayjs(targetDate).format("YYYY-MM-DD");
      return mealData.find((meal) => meal.date === dateString);
    },
    [mealData]
  );

  // 공휴일 확인
  const getHolidayForDate = React.useCallback(
    (targetDate: Date): string | null => {
      const dateString = dayjs(targetDate).format("YYYY-MM-DD");
      const holidayInfo = holidayData.find((holiday) => holiday.date === dateString);
      return holidayInfo?.name || null;
    },
    [holidayData]
  );

  const getMealIndicators = React.useCallback(
    (meal: ReturnType<typeof getMealDataForDate>) => {
      if (!meal) return [];

      const isIndividualMeal = (meal.attendance ?? "").trim().includes("개별식사");
      const indicators: MealIndicator[] = (["breakfast", "lunch", "dinner"] as const)
        .filter((type) => {
          const entry = meal[type];
          return !!entry && (Number(entry.amount) > 0 || (entry.store ?? "").trim().length > 0);
        })
        .map((type) => ({
          type,
          className:
            type === "lunch" && isIndividualMeal
              ? mealIndicatorStyles.individualLunch
              : mealIndicatorStyles[type],
        }));

      if (isIndividualMeal && !indicators.some((indicator) => indicator.type === "lunch")) {
        indicators.push({
          type: "lunch",
          className: mealIndicatorStyles.individualLunch,
        });
      }

      return indicators;
    },
    []
  );

  const getAttendanceIcon = React.useCallback(
    (meal: ReturnType<typeof getMealDataForDate>) => {
      const attendance = meal?.attendance?.trim() ?? "";

      if (!attendance || attendance.includes("개별식사")) return null;
      if (attendance.includes("재택")) return attendanceIcons.remote;
      if (attendance.includes("반차")) return attendanceIcons.halfDay;
      if (attendance.includes("연차") || attendance.includes("휴무")) return attendanceIcons.off;

      return null;
    },
    []
  );

  const handleDateSelect = React.useCallback(
    (newDate: Date | undefined) => {
      setDate(newDate);
      onDateSelect?.(newDate);

      if (newDate) {
        const newMonth = newDate.getMonth() + 1;
        const newYear = newDate.getFullYear();
        if (newMonth !== currentMonth || newYear !== currentYear) {
          setCurrentMonth(newMonth);
          setCurrentYear(newYear);
        }
      }
    },
    [onDateSelect, currentMonth, currentYear]
  );

  const handleNextClick = React.useCallback(() => {
    setDirection(1);
    setDisplayDate((prev) => {
      const nextMonth = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      const month = nextMonth.getMonth() + 1;
      const year = nextMonth.getFullYear();
      setCurrentMonth(month);
      setCurrentYear(year);
      return nextMonth;
    });
  }, []);

  const handlePrevClick = React.useCallback(() => {
    setDirection(-1);
    setDisplayDate((prev) => {
      const prevMonth = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      const month = prevMonth.getMonth() + 1;
      const year = prevMonth.getFullYear();
      setCurrentMonth(month);
      setCurrentYear(year);
      return prevMonth;
    });
  }, []);

  // 스와이프 핸들러
  const handleDragEnd = React.useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 50;
      if (info.offset.x > threshold) {
        handlePrevClick();
      } else if (info.offset.x < -threshold) {
        handleNextClick();
      }
    },
    [handlePrevClick, handleNextClick]
  );

  // 초기 렌더링 여부 추적
  const isInitialMount = React.useRef(true);

  // currentMonth/currentYear가 변경되면 부모에게 알림 (렌더링 후, 초기 렌더링 제외)
  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onMonthChange?.(currentMonth, currentYear);
  }, [currentMonth, currentYear, onMonthChange]);

  const calendarKey = `${currentYear}-${currentMonth}`;

  const calendarComponents = React.useMemo<React.ComponentProps<typeof Calendar>["components"]>(
    () => ({
      DayButton: ({ children, modifiers, day, ...props }) => {
        const meal = getMealDataForDate(day.date);
        const mealIndicators = getMealIndicators(meal);
        const attendanceIcon = getAttendanceIcon(meal);
        const holiday = getHolidayForDate(day.date);

        return (
          <CalendarDayCell
            day={day}
            modifiers={modifiers}
            mealIndicators={mealIndicators}
            attendanceIcon={attendanceIcon}
            holiday={holiday}
            isLoading={isLoading}
            onDateSelect={handleDateSelect}
            dayButtonProps={props}
          >
            {children}
          </CalendarDayCell>
        );
      },
    }),
    [getMealDataForDate, getMealIndicators, getAttendanceIcon, getHolidayForDate, isLoading, handleDateSelect]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={`overflow-hidden rounded-[20px] bg-white p-4 touch-pan-y sm:rounded-[22px] sm:p-5 lg:flex lg:min-h-0 lg:flex-col lg:p-4 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3 px-0.5 sm:px-1 lg:mb-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--slate-gray)]">
            Calendar
          </p>
          <span className="font-display text-[1.75rem] font-medium text-[var(--ink-black)] lg:text-[1.6rem]">
            {currentMonth}월
          </span>
          <span className="text-sm text-[var(--slate-gray)] lg:text-xs">{currentYear}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevClick}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--whisper-cream)] transition-colors hover:bg-[var(--soft-bone)] touch-manipulation sm:h-9 sm:w-9"
            aria-label="이전 달"
          >
            <svg className="h-5 w-5 text-[var(--ink-black)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={handleNextClick}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--whisper-cream)] transition-colors hover:bg-[var(--soft-bone)] touch-manipulation sm:h-9 sm:w-9"
            aria-label="다음 달"
          >
            <svg className="h-5 w-5 text-[var(--ink-black)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* 스와이프 가능한 캘린더 영역 */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className="min-h-[25.5rem] min-w-0 cursor-grab rounded-[18px] p-0.5 active:cursor-grabbing sm:min-h-[26rem] lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden lg:p-0.5"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={calendarKey}
            initial={{ opacity: 0, x: direction * 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -30 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="min-h-[25.5rem] sm:min-h-[26rem] lg:flex lg:h-full lg:min-h-0 lg:flex-1 lg:flex-col"
          >
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              numberOfMonths={1}
              month={displayDate}
              captionLayout="label"
              className="w-full max-w-full p-0 sm:pb-0 lg:flex lg:h-full lg:min-h-0 lg:flex-col"
              classNames={{
                month_caption: "hidden",
                month: "flex min-h-[25.5rem] w-full min-w-0 flex-col gap-3 sm:min-h-[26rem] lg:h-full lg:min-h-0 lg:gap-1",
                months: "flex min-h-[25.5rem] w-full flex-col gap-0 sm:min-h-[26rem] lg:h-full lg:min-h-0",
                nav: "hidden",
                month_grid: "w-full lg:flex lg:h-full lg:min-h-0 lg:flex-col",
                weeks: "lg:flex lg:h-full lg:min-h-0 lg:flex-1 lg:flex-col",
                week: "my-1.5 grid w-full min-w-0 grid-cols-7 gap-x-0 gap-y-3 lg:my-0 lg:flex-1 lg:min-h-0 lg:gap-0.5",
                day: "relative min-w-0 px-0 py-1 text-center min-h-[clamp(3rem,12.5vw,3.5rem)] sm:min-h-[52px] lg:min-h-0 lg:py-0 select-none",
                weekdays: "mb-0 mt-1 grid grid-cols-7 lg:mt-1.5",
                weekday: "flex h-[14px] min-w-0 items-center justify-center text-center text-xs font-normal uppercase tracking-[0.12em] text-[var(--slate-gray)] sm:text-sm lg:h-[14px] lg:text-sm",
              }}
              components={calendarComponents}
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>

    </motion.div>
  );
}
