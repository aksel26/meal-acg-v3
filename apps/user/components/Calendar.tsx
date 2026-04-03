/* eslint-disable react/prop-types */
import * as React from "react";
import { Calendar } from "@repo/ui/src/calendar";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { motion, AnimatePresence, PanInfo } from "motion/react";
import { useHolidays } from "@/hooks/useHolidays";
import { MealData } from "@/components/dashboard/types";
import { CalendarDayCell } from "./CalendarDayCell";
import { useSupervisorCalendarByMonth, buildPostingsByDate } from "@/hooks/use-supervisor-calendar";
import { useDayoffs } from "@/hooks/use-dayoffs";

dayjs.locale("ko");

const EMPTY_MEAL_DATA: MealData[] = [];

interface Calendar21Props {
  onDateSelect?: (date: Date | undefined) => void;
  selectedDate?: Date;
  onMonthChange?: (month: number, year: number) => void;
  mealData?: MealData[];
  isLoading?: boolean;
}

export default function CalendarComponent({
  onDateSelect,
  selectedDate,
  onMonthChange,
  mealData = EMPTY_MEAL_DATA,
  isLoading = false,
}: Calendar21Props) {
  const [date, setDate] = React.useState<Date | undefined>(selectedDate || new Date());
  const [currentMonth, setCurrentMonth] = React.useState<number>((selectedDate || new Date()).getMonth() + 1);
  const [currentYear, setCurrentYear] = React.useState<number>((selectedDate || new Date()).getFullYear());
  const [displayDate, setDisplayDate] = React.useState<Date>(selectedDate || new Date());
  const [direction, setDirection] = React.useState<number>(0);

  // 공휴일 데이터 가져오기
  const { data: holidayData = [] } = useHolidays(currentMonth, currentYear);

  // 공고 데이터 가져오기
  const { data: supervisorData } = useSupervisorCalendarByMonth(currentYear, currentMonth);
  const postingsByDate = React.useMemo(() => buildPostingsByDate(supervisorData), [supervisorData]);

  // 휴가 데이터 가져오기
  const { data: dayoffsData } = useDayoffs(currentYear, currentMonth);
  const dayoffsByDate = React.useMemo(() => {
    const map = new Map<string, typeof dayoffsData>();
    if (!dayoffsData) return map;
    for (const d of dayoffsData) {
      const list = map.get(d.leave_date) || [];
      list.push(d);
      map.set(d.leave_date, list);
    }
    return map;
  }, [dayoffsData]);

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

  // 식사 아이콘 결정 로직
  const getMealIcon = React.useCallback(
    (meal: ReturnType<typeof getMealDataForDate>) => {
      if (!meal) return null;

      const attendance = meal.attendance || "";
      const lowerAttendance = attendance.toLowerCase();

      if (lowerAttendance.includes("개별식사")) {
        return { icon: "/icons/onigiri.png", label: "개별", type: "individual" };
      }
      if (lowerAttendance === "근무" || lowerAttendance.includes("출근")) {
        return { icon: "/icons/onigiri.png", label: null, type: "work" };
      }
      if (lowerAttendance.includes("반차")) {
        return { icon: "/icons/clock.png", label: null, type: "half" };
      }
      if (lowerAttendance.includes("연차") || lowerAttendance.includes("휴무")) {
        return { icon: "/icons/holiday.png", label: null, type: "off" };
      }
      if (lowerAttendance.includes("재택")) {
        return { icon: "/icons/homeOffice.png", label: null, type: "remote" };
      }

      // 근태 정보 없이 식사 기록만 있는 경우
      const hasAnyMeal =
        (meal.breakfast && (meal.breakfast.amount || meal.breakfast.store)) ||
        (meal.lunch && (meal.lunch.amount || meal.lunch.store)) ||
        (meal.dinner && (meal.dinner.amount || meal.dinner.store));

      if (hasAnyMeal) {
        return { icon: "/icons/onigiri.png", label: null, type: "meal" };
      }

      if (attendance) {
        return { icon: "/icons/onigiri.png", label: null, type: "work" };
      }

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
        const mealIcon = getMealIcon(meal);
        const holiday = getHolidayForDate(day.date);

        return (
          <CalendarDayCell
            day={day}
            modifiers={modifiers}
            meal={meal}
            mealIcon={mealIcon}
            holiday={holiday}
            isLoading={isLoading}
            onDateSelect={handleDateSelect}
            dayButtonProps={props}
            postings={postingsByDate.get(dayjs(day.date).format("YYYY-MM-DD"))}
            dayoffs={dayoffsByDate.get(dayjs(day.date).format("YYYY-MM-DD"))}
          >
            {children}
          </CalendarDayCell>
        );
      },
    }),
    [getMealDataForDate, getMealIcon, getHolidayForDate, isLoading, handleDateSelect, postingsByDate, dayoffsByDate]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="card-premium rounded-2xl p-3 sm:p-4 overflow-hidden touch-pan-y"
    >
      {/* 월 표시 헤더 */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          onClick={handlePrevClick}
          className="p-2 -ml-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
          aria-label="이전 달"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex items-baseline gap-1.5">
          <span className="text-xl sm:text-2xl font-bold text-gray-900">{currentMonth}월</span>
          <span className="text-sm text-gray-400">{currentYear}</span>
        </div>

        <button
          onClick={handleNextClick}
          className="p-2 -mr-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
          aria-label="다음 달"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 스와이프 가능한 캘린더 영역 */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className="cursor-grab active:cursor-grabbing"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={calendarKey}
            initial={{ opacity: 0, x: direction * 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -30 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              numberOfMonths={1}
              month={displayDate}
              captionLayout="label"
              className="w-full"
              classNames={{
                month_caption: "hidden",
                nav: "hidden",
                day: "relative w-full p-0 text-center min-h-[60px] sm:min-h-[72px] select-none",
              }}
              components={calendarComponents}
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>

    </motion.div>
  );
}
