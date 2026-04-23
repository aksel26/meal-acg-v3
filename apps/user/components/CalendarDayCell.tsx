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
        relative rounded-[12px] p-0.5 sm:p-1 transition-all duration-200
        ${isSelected ? "bg-[rgba(20,20,19,0.04)]" : "hover:bg-white/60 active:bg-white/80"}
        touch-manipulation
      `}
      style={
        isSelected
          ? {
              background: "rgba(232, 226, 218, 0.8)",
            }
          : undefined
      }
    >
      {isToday && (
        <span className="absolute left-2.5 top-1 h-1.5 w-1.5 rounded-full bg-[var(--signal-orange)]" />
      )}
      <div className="flex flex-col items-center gap-0.5 sm:gap-1 py-1 sm:py-1.5 min-h-[60px] sm:min-h-[72px]">
        <span
          className={`
            text-xs sm:text-sm font-semibold transition-all duration-200 leading-none
            ${isToday ? "text-[var(--signal-orange)] font-bold" : ""}
            ${isSelected && !isToday ? "text-[var(--ink-black)]" : ""}
            ${!isToday && !isSelected && (isSunday || isHoliday) ? "text-[var(--signal-orange)]" : ""}
            ${!isToday && !isSelected && isSaturday && !isHoliday ? "text-[var(--link-blue)]" : ""}
            ${!isToday && !isSelected && !isSunday && !isSaturday && !isHoliday ? "text-[var(--granite)]" : ""}
          `}
        >
          {children}
        </span>
        {holiday && (
          <span className="max-w-full px-0.5 text-[8px] font-medium leading-tight text-[var(--signal-orange)] sm:text-[9px]">
            {holiday.length > 5 ? `${holiday.slice(0, 5)}..` : holiday}
          </span>
        )}
        <div className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center relative">
          {isLoading ? (
            <div className="h-5 w-5 animate-pulse rounded-full bg-[var(--whisper-cream)]" />
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
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-white px-1.5 text-[7px] font-bold text-[var(--clay-brown)] sm:text-[8px]">
                  {mealIcon.label}
                </span>
              )}
            </div>
          ) : !isSunday &&
            !isSaturday &&
            !isHoliday &&
            dayjs(day.date).isBefore(dayjs(), "day") ? (
            <div className="h-7 w-7 rounded-full bg-[var(--whisper-cream)] sm:h-8 sm:w-8" />
          ) : null}
        </div>
      </div>
    </CalendarDayButton>
  );
}, arePropsEqual);
