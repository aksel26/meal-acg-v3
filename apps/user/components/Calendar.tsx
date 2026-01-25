/* eslint-disable react/prop-types */
import * as React from "react";
import { Calendar, CalendarDayButton } from "@repo/ui/src/calendar";
import Image from "next/image";
import dayjs from "dayjs";
import { motion, AnimatePresence, PanInfo } from "motion/react";
import { useHolidays } from "@/hooks/useHolidays";

interface Calendar21Props {
  onDateSelect?: (date: Date | undefined) => void;
  selectedDate?: Date;
  onMonthChange?: (month: number, year: number) => void;
  mealData?: Array<{
    date: string;
    attendance: string;
    breakfast?: { amount?: number; store?: string };
    lunch?: { amount?: number; store?: string };
    dinner?: { amount?: number; store?: string };
  }>;
  isLoading?: boolean;
}

export default function CalendarComponent({
  onDateSelect,
  selectedDate,
  onMonthChange,
  mealData = [],
  isLoading = false,
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

  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate);
    onDateSelect?.(newDate);

    if (newDate) {
      const newMonth = newDate.getMonth() + 1;
      const newYear = newDate.getFullYear();
      if (newMonth !== currentMonth || newYear !== currentYear) {
        setCurrentMonth(newMonth);
        setCurrentYear(newYear);
        onMonthChange?.(newMonth, newYear);
      }
    }
  };

  const handleNextClick = React.useCallback(() => {
    setDirection(1);
    const nextMonth = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1);
    setDisplayDate(nextMonth);
    const month = nextMonth.getMonth() + 1;
    const year = nextMonth.getFullYear();
    setCurrentMonth(month);
    setCurrentYear(year);
    onMonthChange?.(month, year);
  }, [displayDate, onMonthChange]);

  const handlePrevClick = React.useCallback(() => {
    setDirection(-1);
    const prevMonth = new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1);
    setDisplayDate(prevMonth);
    const month = prevMonth.getMonth() + 1;
    const year = prevMonth.getFullYear();
    setCurrentMonth(month);
    setCurrentYear(year);
    onMonthChange?.(month, year);
  }, [displayDate, onMonthChange]);

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

  const calendarKey = `${currentYear}-${currentMonth}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="card-premium p-3 sm:p-4 overflow-hidden touch-pan-y"
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
              }}
              components={{
                DayButton: ({ children, modifiers, day, ...props }) => {
                  if (modifiers.outside) {
                    return (
                      <CalendarDayButton day={day} modifiers={modifiers} {...props} onClick={undefined} disabled>
                        <div className="flex flex-col items-center opacity-0 pointer-events-none">{children}</div>
                      </CalendarDayButton>
                    );
                  }

                  const meal = getMealDataForDate(day.date);
                  const mealIcon = getMealIcon(meal);
                  const holiday = getHolidayForDate(day.date);
                  const isSelected = modifiers.selected;
                  const isToday = modifiers.today;
                  const dayOfWeek = day.date.getDay();
                  const isSunday = dayOfWeek === 0;
                  const isSaturday = dayOfWeek === 6;
                  const isHoliday = !!holiday;

                  return (
                    <CalendarDayButton
                      day={day}
                      modifiers={modifiers}
                      {...props}
                      className={`
                        relative p-0.5 sm:p-1 rounded-xl transition-all duration-200
                        ${isSelected ? "bg-blue-50 ring-2 ring-blue-200" : "hover:bg-gray-50 active:bg-gray-100"}
                        touch-manipulation
                      `}
                    >
                      <div className="flex flex-col items-center gap-0.5 sm:gap-1 py-1 sm:py-1.5 min-h-[52px] sm:min-h-[64px]">
                        {/* 날짜 숫자 */}
                        <span
                          className={`
                            text-xs sm:text-sm font-semibold transition-all duration-200 leading-none
                            ${isToday ? "bg-gray-900 text-white px-1.5 py-0.5 rounded-md" : ""}
                            ${isSelected && !isToday ? "text-blue-600" : ""}
                            ${!isToday && !isSelected && (isSunday || isHoliday) ? "text-red-500" : ""}
                            ${!isToday && !isSelected && isSaturday && !isHoliday ? "text-blue-500" : ""}
                            ${!isToday && !isSelected && !isSunday && !isSaturday && !isHoliday ? "text-gray-700" : ""}
                          `}
                        >
                          {children}
                        </span>
                        {/* 공휴일 이름 */}
                        {holiday && (
                          <span className="text-[8px] sm:text-[9px] text-red-400 font-medium max-w-full px-0.5 leading-tight">
                            {holiday.length > 5 ? `${holiday.slice(0, 5)}..` : holiday}
                          </span>
                        )}

                        {/* 아이콘/상태 표시 영역 */}
                        <div className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center relative">
                          {isLoading ? (
                            <div className="w-5 h-5 rounded-full bg-gray-200 animate-pulse" />
                          ) : mealIcon ? (
                            // 식사/근태 아이콘
                            <motion.div
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="relative flex items-center justify-center"
                            >
                              <Image
                                src={mealIcon.icon}
                                alt={meal?.attendance || "meal"}
                                width={22}
                                height={22}
                                className="drop-shadow-sm sm:w-[26px] sm:h-[26px]"
                              />
                              {mealIcon.label && (
                                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] sm:text-[8px] font-bold text-blue-600 bg-blue-50 px-1 rounded">
                                  {mealIcon.label}
                                </span>
                              )}
                            </motion.div>
                          ) : null}
                        </div>
                      </div>
                    </CalendarDayButton>
                  );
                },
              }}
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>

    </motion.div>
  );
}
