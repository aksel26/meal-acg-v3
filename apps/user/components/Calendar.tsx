import { HolidayData, useHolidays } from "@/hooks/useHolidays";
import * as React from "react";
import { Calendar, CalendarDayButton } from "@repo/ui/src/calendar";
import Image from "next/image";
import dayjs from "dayjs";
// import { Calendar, CalendarDayButton } from "./calendar";
// import { useHolidays, type HolidayData } from "./hooks/useHolidays";

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
  // react-query를 사용하므로 onHolidayFetch는 더 이상 필요하지 않음
}

export default function CalendarComponent({ onDateSelect, selectedDate, onMonthChange, mealData = [], holidayData: externalHolidayData = [], isLoading = false }: Calendar21Props) {
  const [date, setDate] = React.useState<Date | undefined>(selectedDate || new Date());
  const [currentMonth, setCurrentMonth] = React.useState<number>((selectedDate || new Date()).getMonth() + 1);
  const [currentYear, setCurrentYear] = React.useState<number>((selectedDate || new Date()).getFullYear());
  const [displayDate, setDisplayDate] = React.useState<Date>(selectedDate || new Date());

  // React Query로 공휴일 데이터 가져오기
  const { data: queryHolidayData, isLoading: holidayLoading, error: holidayError } = useHolidays(currentMonth, currentYear);

  // 외부에서 전달된 데이터가 있으면 그것을 사용하고, 없으면 React Query 데이터 사용
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
    // 공휴일이 있으면 공휴일 이름을 텍스트로 표시
    if (holiday) {
      return {
        icons: [holiday],
        color: "text-red-600",
        isImage: false,
      };
    }

    const attendance = meal?.attendance || "";
    const lowerAttendance = attendance.toLowerCase();

    // 근무 관련
    if (lowerAttendance === "근무" || lowerAttendance.includes("출근")) {
      return {
        icons: ["/icons/onigiri.png"],
        color: "text-green-600",
        isImage: true,
      };
    }

    // 반차 관련
    if (lowerAttendance.includes("반차")) {
      return {
        icons: ["/icons/clock.png"],
        color: "text-yellow-600",
        isImage: true,
      };
    }

    // 휴가/휴무 관련
    if (lowerAttendance.includes("휴무") || lowerAttendance.includes("쉼")) {
      return {
        icons: ["/icons/holiday.png"],
        color: "text-gray-600",
        isImage: true,
      };
    }

    // 재택근무 관련
    if (lowerAttendance.includes("재택") || lowerAttendance.includes("홈오피스")) {
      return {
        icons: ["/icons/homeOffice.png"],
        color: "text-orange-600",
        isImage: true,
      };
    }

    // attendance가 비어있을 때 breakfast/lunch/dinner 체크
    if (!attendance) {
      const icons: string[] = [];

      // 실제 데이터가 있는지 확인 (amount > 0 또는 store가 있는 경우)
      const hasBreakfast = meal?.breakfast && (meal.breakfast.amount > 0 || meal.breakfast.store);
      const hasLunch = meal?.lunch && (meal.lunch.amount > 0 || meal.lunch.store);
      const hasDinner = meal?.dinner && (meal.dinner.amount > 0 || meal.dinner.store);

      // 식대 기록이 있으면 onigiri 아이콘 표시
      if (hasBreakfast || hasLunch || hasDinner) {
        icons.push("/icons/onigiri.png");
      }

      if (icons.length > 0) {
        return {
          icons,
          color: "",
          isImage: true,
        };
      }
    }

    // 기타 - 텍스트가 있으면 기본 업무 아이콘
    if (attendance) {
      return {
        icons: ["/icons/onigiri.png"],
        color: "text-gray-600",
        isImage: true,
      };
    }

    return { icons: [], color: "", isImage: false };
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

  // 에러 로깅
  React.useEffect(() => {
    if (holidayError) {
      console.error("Holiday fetch error:", holidayError);
    }
  }, [holidayError]);

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
      className=" bg-white rounded-lg w-full min-h-[550px]"
      formatters={{
        formatMonthDropdown: (date) => {
          return date.toLocaleString("default", { month: "long" });
        },
      }}
      components={{
        YearsDropdown: ({ value }) => {
          return <div className="p-2 text-sm sm:text-base">{value ?? new Date().getFullYear()}</div>;
        },
        MonthsDropdown: ({ value }) => {
          return <div className="p-2 text-sm sm:text-base">{Number(value ?? new Date().getMonth()) + 1}월</div>;
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
            <CalendarDayButton day={day} modifiers={modifiers} {...props} className={`${isSelected ? `bg-blue-50!` : ""} hover:bg-blue-50/40! hover:text-blue-800! `}>
              <div className={`rounded-md flex flex-col  space-y-1 items-center relative py-1.5 transition duration-200`}>
                <span className={`text-[11px] sm:text-sm ${isToday ? "bg-[#0a2165] text-gray-50 px-1.5 py-0.5 rounded-sm" : isSelected ? "text-blue-600" : ""}`}>{children}</span>

                {/* icon wrapper */}
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center relative ${isSelected ? "bg-blue-100" : ""}`}>
                  {isLoading || holidayLoading ? (
                    <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                  ) : holidayError ? (
                    <span className="text-xs text-red-500" title="공휴일 정보를 불러올 수 없습니다">
                      ⚠️
                    </span>
                  ) : icons.length > 0 ? (
                    isImage ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        {icons.map((icon, index) => (
                          <div
                            key={index}
                            className={`absolute transition-all duration-300 ${
                              icons.length > 1
                                ? index === 0
                                  ? "-translate-x-1 -translate-y-1 z-10" // 첫 번째 아이콘 (위/왼쪽)
                                  : "translate-x-1 translate-y-1 z-0 opacity-80" // 두 번째 아이콘 (아래/오른쪽)
                                : ""
                            }`}
                          >
                            <Image
                              src={icon}
                              alt={holiday || meal?.attendance || "icon"}
                              width={25}
                              height={25}
                              title={holiday || meal?.attendance}
                            />
                          </div>
                        ))}
                        {meal?.attendance?.includes("개별식사") && <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 text-blue-400 text-[10px]!">개별</div>}
                      </div>
                    ) : (
                      <span className={`${holiday !== "" ? "text-[10px] sm:text-[10px] text-red-600 truncate font-medium text-center leading-tight" : "text-lg"}`} title={holiday || meal?.attendance}>
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
  );
}
