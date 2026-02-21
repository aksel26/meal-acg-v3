import * as React from "react";
import { CalendarDayButton } from "@repo/ui/src/calendar";
import Image from "next/image";
import type { MealData } from "@/components/dashboard/types";
import dayjs from "dayjs";

// CalendarDayButton에서 day와 modifiers 타입 추출
type DayButtonProps = React.ComponentProps<typeof CalendarDayButton>;
type CalendarDay = DayButtonProps["day"];
type Modifiers = DayButtonProps["modifiers"];

interface MealIcon {
  icon: string;
  label: string | null;
  type: string;
}

interface CalendarDayCellProps {
  children: React.ReactNode;
  day: CalendarDay;
  modifiers: Modifiers;
  meal: MealData | undefined;
  mealIcon: MealIcon | null;
  holiday: string | null;
  isLoading: boolean;
  onDateSelect: (date: Date) => void;
  dayButtonProps: Omit<DayButtonProps, "day" | "modifiers" | "children">;
}

function arePropsEqual(prev: CalendarDayCellProps, next: CalendarDayCellProps) {
  return (
    prev.day.date.getTime() === next.day.date.getTime() &&
    prev.modifiers.selected === next.modifiers.selected &&
    prev.modifiers.today === next.modifiers.today &&
    prev.modifiers.outside === next.modifiers.outside &&
    prev.mealIcon?.icon === next.mealIcon?.icon &&
    prev.mealIcon?.label === next.mealIcon?.label &&
    prev.mealIcon?.type === next.mealIcon?.type &&
    prev.holiday === next.holiday &&
    prev.isLoading === next.isLoading &&
    prev.onDateSelect === next.onDateSelect
  );
}

export const CalendarDayCell = React.memo(function CalendarDayCell({
  children,
  day,
  modifiers,
  meal,
  mealIcon,
  holiday,
  isLoading,
  onDateSelect,
  dayButtonProps,
}: CalendarDayCellProps) {
  if (modifiers.outside) {
    return (
      <CalendarDayButton
        day={day}
        modifiers={modifiers}
        {...dayButtonProps}
        onClick={undefined}
        disabled
      >
        <div className="flex flex-col items-center opacity-0 pointer-events-none">
          {children}
        </div>
      </CalendarDayButton>
    );
  }

  const isSelected = modifiers.selected;
  const isToday = modifiers.today;
  const dayOfWeek = day.date.getDay();
  const isSunday = dayOfWeek === 0;
  const isSaturday = dayOfWeek === 6;
  const isHoliday = !!holiday;

  const handleDayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onDateSelect(day.date);
  };

  return (
    <CalendarDayButton
      day={day}
      modifiers={modifiers}
      {...dayButtonProps}
      onClick={handleDayClick}
      className={`
        relative p-0.5 sm:p-1 rounded-xl transition-all duration-200
        ${isSelected ? "" : "hover:bg-gray-50 active:bg-gray-100"}
        touch-manipulation
      `}
      style={
        isSelected
          ? {
              background:
                "radial-gradient(circle, oklch(0.92 0.05 250) 10%, transparent 50%)",
            }
          : undefined
      }
    >
      {isToday && (
        <span className="absolute top-1 left-2.5 w-1.5 h-1.5 rounded-full bg-[oklch(0.45_0.2_250)]" />
      )}
      <div className="flex flex-col items-center gap-0.5 sm:gap-1 py-1 sm:py-1.5 min-h-[60px] sm:min-h-[72px]">
        <span
          className={`
            text-xs sm:text-sm font-semibold transition-all duration-200 leading-none
            ${isToday ? "text-[oklch(0.45_0.2_250)] font-bold" : ""}
            ${isSelected && !isToday ? "text-blue-600" : ""}
            ${!isToday && !isSelected && (isSunday || isHoliday) ? "text-red-500" : ""}
            ${!isToday && !isSelected && isSaturday && !isHoliday ? "text-blue-500" : ""}
            ${!isToday && !isSelected && !isSunday && !isSaturday && !isHoliday ? "text-gray-400" : ""}
          `}
        >
          {children}
        </span>
        {holiday && (
          <span className="text-[8px] sm:text-[9px] text-red-400 font-medium max-w-full px-0.5 leading-tight">
            {holiday.length > 5 ? `${holiday.slice(0, 5)}..` : holiday}
          </span>
        )}
        <div className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center relative">
          {isLoading ? (
            <div className="w-5 h-5 rounded-full bg-gray-200 animate-pulse" />
          ) : mealIcon ? (
            <div className="relative flex items-center justify-center">
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
            </div>
          ) : !isSunday &&
            !isSaturday &&
            !isHoliday &&
            dayjs(day.date).isBefore(dayjs(), "day") ? (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-100" />
          ) : null}
        </div>
      </div>
    </CalendarDayButton>
  );
}, arePropsEqual);
