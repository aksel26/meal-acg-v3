import * as React from "react";
import { DateRange } from "react-day-picker";

import { Calendar, CalendarDayButton } from "../src/calendar";

interface Calendar21Props {
  onDateSelect?: (date: Date | undefined) => void;
  selectedDate?: Date;
  onMonthChange?: (month: number, year: number) => void;
  mealData?: Array<{
    date: string;
    attendance: string;
  }>;
}

export default function Calendar21({ onDateSelect, selectedDate, onMonthChange, mealData = [] }: Calendar21Props) {
  const [date, setDate] = React.useState<Date | undefined>(selectedDate || new Date());
  const [currentMonth, setCurrentMonth] = React.useState<number>((selectedDate || new Date()).getMonth() + 1);
  const [currentYear, setCurrentYear] = React.useState<number>((selectedDate || new Date()).getFullYear());
  const [displayDate, setDisplayDate] = React.useState<Date>(selectedDate || new Date());

  const getAttendanceForDate = (targetDate: Date): string => {
    const dateString = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;
    const dayData = mealData.find((meal) => meal.date === dateString);
    return dayData?.attendance || "";
  };

  const getAttendanceIcon = (attendance: string): { icon: string; color: string } => {
    const lowerAttendance = attendance.toLowerCase();

    // 근무 관련
    if (lowerAttendance.includes("근무") || lowerAttendance.includes("출근")) {
      return { icon: "🍙", color: "text-green-600" };
    }

    // 휴가/휴무 관련

    if (lowerAttendance.includes("휴무") || lowerAttendance.includes("쉼")) {
      return { icon: "🏖️", color: "text-gray-600" };
    }

    // 재택근무 관련
    if (lowerAttendance.includes("재택") || lowerAttendance.includes("홈오피스")) {
      return { icon: "🏠", color: "text-orange-600" };
    }

    // 반차 관련
    if (lowerAttendance.includes("반차")) {
      return { icon: "🕐", color: "text-yellow-600" };
    }

    // 기타 - 텍스트가 있으면 기본 업무 아이콘
    if (attendance) {
      return { icon: "📋", color: "text-gray-600" };
    }

    return { icon: "", color: "" };
  };

  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate);
    onDateSelect?.(newDate);

    // Check if month changed when selecting a date
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

  return (
    <Calendar
      mode="single"
      selected={date}
      onSelect={handleDateSelect}
      numberOfMonths={1}
      month={displayDate}
      onNextClick={handleNextClick}
      onPrevClick={handlePrevClick}
      captionLayout="dropdown"
      className="rounded-lg [--cell-size:--spacing(11)] md:[--cell-size:--spacing(13)] w-full p-6"
      formatters={{
        formatMonthDropdown: (date) => {
          return date.toLocaleString("default", { month: "long" });
        },
      }}
      components={{
        YearsDropdown: ({ value }) => {
          return <div className="p-2 text-sm">{value ?? new Date().getFullYear()}</div>;
        },
        MonthsDropdown: ({ value }) => {
          return <div className="p-2 text-sm">{Number(value ?? new Date().getMonth()) + 1}월</div>;
        },
        DayButton: ({ children, modifiers, day, ...props }) => {
          if (modifiers.outside) {
            return (
              <CalendarDayButton day={day} modifiers={modifiers} {...props} onClick={undefined} disabled>
                <div className="flex flex-col items-center opacity-0 pointer-events-none">{children}</div>
              </CalendarDayButton>
            );
          }

          const attendance = getAttendanceForDate(day.date);
          const { icon } = getAttendanceIcon(attendance);

          return (
            <CalendarDayButton day={day} modifiers={modifiers} {...props}>
              <div className="flex flex-col items-center relative">
                {children}
                {icon && (
                  <span className="text-sm mt-0.5 absolute top-4 " title={attendance}>
                    {icon}
                  </span>
                )}
              </div>
            </CalendarDayButton>
          );
        },
      }}
    />
  );
}
