import { HolidayData, useHolidays } from "@/hooks/useHolidays";
import * as React from "react";
import { Calendar, CalendarDayButton } from "@repo/ui/src/calendar";
import Image from "next/image";
import dayjs from "dayjs";
import { motion } from "motion/react";

interface Calendar21Props {
  onDateSelect?: (date: Date | undefined) => void;
  selectedDate?: Date;
  onMonthChange?: (month: number, year: number) => void;
  mealData?: Array<{
    date: string;
    attendance: string;
    breakfast?: any;
    dinner?: any;
  }>;
  holidayData?: HolidayData[];
  isLoading?: boolean;
}

export default function CalendarComponent({
  onDateSelect,
  selectedDate,
  onMonthChange,
  mealData = [],
  holidayData: externalHolidayData = [],
  isLoading = false,
}: Calendar21Props) {
  const [date, setDate] = React.useState<Date | undefined>(selectedDate || new Date());
  const [currentMonth, setCurrentMonth] = React.useState<number>((selectedDate || new Date()).getMonth() + 1);
  const [currentYear, setCurrentYear] = React.useState<number>((selectedDate || new Date()).getFullYear());
  const [displayDate, setDisplayDate] = React.useState<Date>(selectedDate || new Date());

  const { data: queryHolidayData, isLoading: holidayLoading, error: holidayError } = useHolidays(currentMonth, currentYear);
  const holidayData = externalHolidayData.length > 0 ? externalHolidayData : queryHolidayData || [];

  const getMealDataForDate = (targetDate: Date) => {
    const dateString = dayjs(targetDate).format("YYYY-MM-DD");
    return mealData.find((meal) => meal.date === dateString);
  };

  const getHolidayForDate = (targetDate: Date): string => {
    const dateString = dayjs(targetDate).format("YYYY-MM-DD");
    const holidayInfo = holidayData.find((holiday) => holiday.date === dateString);
    return holidayInfo?.name || "";
  };

  const getAttendanceIcon = (meal: any, holiday: string): { icons: string[]; color: string; isImage: boolean } => {
    if (holiday) {
      return {
        icons: [holiday],
        color: "text-[oklch(0.55_0.18_25)]",
        isImage: false,
      };
    }

    const attendance = meal?.attendance || "";
    const lowerAttendance = attendance.toLowerCase();

    if (lowerAttendance === "근무" || lowerAttendance.includes("출근")) {
      return { icons: ["/icons/onigiri.png"], color: "text-green-600", isImage: true };
    }

    if (lowerAttendance.includes("반차")) {
      return { icons: ["/icons/clock.png"], color: "text-yellow-600", isImage: true };
    }

    if (lowerAttendance.includes("휴무") || lowerAttendance.includes("쉼")) {
      return { icons: ["/icons/holiday.png"], color: "text-gray-600", isImage: true };
    }

    if (lowerAttendance.includes("재택") || lowerAttendance.includes("홈오피스")) {
      return { icons: ["/icons/homeOffice.png"], color: "text-orange-600", isImage: true };
    }

    if (!attendance) {
      const icons: string[] = [];
      const hasBreakfast = meal?.breakfast && (meal.breakfast.amount > 0 || meal.breakfast.store);
      const hasLunch = meal?.lunch && (meal.lunch.amount > 0 || meal.lunch.store);
      const hasDinner = meal?.dinner && (meal.dinner.amount > 0 || meal.dinner.store);

      if (hasBreakfast || hasLunch || hasDinner) {
        icons.push("/icons/onigiri.png");
      }

      if (icons.length > 0) {
        return { icons, color: "", isImage: true };
      }
    }

    if (attendance) {
      return { icons: ["/icons/onigiri.png"], color: "text-gray-600", isImage: true };
    }

    return { icons: [], color: "", isImage: false };
  };

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

  const handleNextClick = () => {
    const nextMonth = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1);
    setDisplayDate(nextMonth);
    const month = nextMonth.getMonth() + 1;
    const year = nextMonth.getFullYear();
    setCurrentMonth(month);
    setCurrentYear(year);
    onMonthChange?.(month, year);
  };

  const handlePrevClick = () => {
    const prevMonth = new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1);
    setDisplayDate(prevMonth);
    const month = prevMonth.getMonth() + 1;
    const year = prevMonth.getFullYear();
    setCurrentMonth(month);
    setCurrentYear(year);
    onMonthChange?.(month, year);
  };

  React.useEffect(() => {
    if (holidayError) {
      console.error("Holiday fetch error:", holidayError);
    }
  }, [holidayError]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="card-premium p-4 overflow-hidden"
    >
      <Calendar
        mode="single"
        selected={date}
        onSelect={handleDateSelect}
        numberOfMonths={1}
        month={displayDate}
        onNextClick={handleNextClick}
        onPrevClick={handlePrevClick}
        captionLayout="dropdown"
        className="w-full min-h-[520px]"
        formatters={{
          formatMonthDropdown: (date) => {
            return date.toLocaleString("default", { month: "long" });
          },
        }}
        components={{
          YearsDropdown: ({ value }) => {
            return (
              <div className="px-3 py-1.5 text-sm font-medium text-[oklch(0.30_0.02_250)]">
                {value ?? new Date().getFullYear()}
              </div>
            );
          },
          MonthsDropdown: ({ value }) => {
            return (
              <div className="px-3 py-1.5 text-sm font-medium text-[oklch(0.30_0.02_250)]">
                {Number(value ?? new Date().getMonth()) + 1}월
              </div>
            );
          },
          DayButton: ({ children, modifiers, day, ...props }) => {
            if (modifiers.outside) {
              return (
                <CalendarDayButton day={day} modifiers={modifiers} {...props} onClick={undefined} disabled>
                  <div className="flex flex-col items-center opacity-0 pointer-events-none">{children}</div>
                </CalendarDayButton>
              );
            }

            const meal = getMealDataForDate(day.date);
            const holiday = getHolidayForDate(day.date);
            const { icons, isImage } = getAttendanceIcon(meal, holiday);

            const isSelected = modifiers.selected;
            const isToday = modifiers.today;

            return (
              <CalendarDayButton
                day={day}
                modifiers={modifiers}
                {...props}
                className={`calendar-day ${isSelected ? "calendar-day-selected" : ""} hover:bg-[oklch(0.96_0.02_250)]`}
              >
                <div className="flex flex-col space-y-1 items-center relative py-1.5">
                  {/* Date Number */}
                  <span
                    className={`text-[11px] sm:text-sm font-medium transition-all duration-200 ${
                      isToday
                        ? "calendar-day-today px-2 py-0.5 rounded-md"
                        : isSelected
                        ? "text-[oklch(0.40_0.15_250)]"
                        : "text-[oklch(0.35_0.02_250)]"
                    }`}
                  >
                    {children}
                  </span>

                  {/* Icon Container */}
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      isSelected ? "bg-[oklch(0.92_0.05_250)]" : ""
                    }`}
                  >
                    {isLoading || holidayLoading ? (
                      <div className="skeleton w-5 h-5 rounded-full" />
                    ) : holidayError ? (
                      <span className="text-xs text-[oklch(0.55_0.15_25)]" title="공휴일 정보를 불러올 수 없습니다">
                        ⚠️
                      </span>
                    ) : icons.length > 0 ? (
                      isImage ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                          {icons.map((icon, index) => (
                            <motion.div
                              key={index}
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: index * 0.05 }}
                              className={`absolute transition-all duration-300 ${
                                icons.length > 1
                                  ? index === 0
                                    ? "-translate-x-1 -translate-y-1 z-10"
                                    : "translate-x-1 translate-y-1 z-0 opacity-80"
                                  : ""
                              }`}
                            >
                              <Image
                                src={icon}
                                alt={holiday || meal?.attendance || "icon"}
                                width={24}
                                height={24}
                                title={holiday || meal?.attendance}
                                className="drop-shadow-sm"
                              />
                            </motion.div>
                          ))}
                          {meal?.attendance?.includes("개별식사") && (
                            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 text-[9px] font-medium text-[oklch(0.50_0.12_250)]">
                              개별
                            </div>
                          )}
                        </div>
                      ) : (
                        <span
                          className={`${
                            holiday !== ""
                              ? "text-[9px] sm:text-[10px] text-[oklch(0.55_0.18_25)] truncate font-semibold text-center leading-tight"
                              : "text-lg"
                          }`}
                          title={holiday || meal?.attendance}
                        >
                          {icons[0]}
                        </span>
                      )
                    ) : null}
                  </div>
                </div>
              </CalendarDayButton>
            );
          },
        }}
      />
    </motion.div>
  );
}
