import * as React from "react";
import { CalendarDayButton } from "@repo/ui/src/calendar";
import Image from "next/image";
import dayjs from "dayjs";

// CalendarDayButton에서 day와 modifiers 타입 추출
type DayButtonProps = React.ComponentProps<typeof CalendarDayButton>;
type CalendarDay = DayButtonProps["day"];
type Modifiers = DayButtonProps["modifiers"];

interface MealIndicator {
  type: "breakfast" | "lunch" | "dinner";
  className: string;
}

interface AttendanceIcon {
  icon: string;
  label: string;
}

interface CalendarDayCellProps {
  children: React.ReactNode;
  day: CalendarDay;
  modifiers: Modifiers;
  mealIndicators: MealIndicator[];
  attendanceIcon: AttendanceIcon | null;
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
    prev.mealIndicators.map((indicator) => indicator.type).join(",") ===
      next.mealIndicators.map((indicator) => indicator.type).join(",") &&
    prev.attendanceIcon?.icon === next.attendanceIcon?.icon &&
    prev.attendanceIcon?.label === next.attendanceIcon?.label &&
    prev.holiday === next.holiday &&
    prev.isLoading === next.isLoading &&
    prev.onDateSelect === next.onDateSelect
  );
}

export const CalendarDayCell = React.memo(function CalendarDayCell({
  children,
  day,
  modifiers,
  mealIndicators,
  attendanceIcon,
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
        relative min-w-0 rounded-[14px] p-1 transition-all duration-200 sm:p-1.5 lg:aspect-auto lg:h-full lg:min-h-0 lg:rounded-[12px] lg:p-1
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
        <span className="absolute left-2.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--signal-orange)] lg:left-2.5 lg:top-1.5" />
      )}
      <div className="flex min-h-[64px] flex-col items-center justify-center py-1.5 sm:min-h-[74px] sm:py-2 lg:h-full lg:min-h-0 lg:py-1">
        <div className="flex h-5 items-center justify-center sm:h-6 lg:h-5">
          <span
            className={`
              text-base sm:text-lg lg:text-base font-normal transition-all duration-200 leading-none
              ${isToday ? "text-[var(--signal-orange)]" : ""}
              ${isSelected && !isToday ? "text-[var(--ink-black)]" : ""}
              ${isSunday ? "text-[var(--danger)]" : ""}
              ${!isSunday && !isToday && !isSelected && isHoliday ? "text-[var(--signal-orange)]" : ""}
              ${!isToday && !isSelected && isSaturday && !isHoliday ? "text-[var(--link-blue)]" : ""}
              ${!isToday && !isSelected && !isSunday && !isSaturday && !isHoliday ? "text-[var(--granite)]" : ""}
            `}
          >
            {children}
          </span>
        </div>
        <div className="flex h-4 w-full items-center justify-center sm:h-4 lg:h-4">
          {holiday && (
            <span className="max-w-full truncate px-0.5 text-[10px] font-normal leading-tight text-[var(--danger)] sm:text-[11px] lg:max-w-[4rem] lg:text-[10px]">
              {holiday.length > 5 ? `${holiday.slice(0, 5)}..` : holiday}
            </span>
          )}
        </div>
        <div className="relative flex h-5 min-h-5 items-center justify-center sm:h-6 sm:min-h-6 lg:h-5 lg:min-h-5">
          {isLoading ? (
            <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--soft-bone)]" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--soft-bone)] [animation-delay:120ms]" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--soft-bone)] [animation-delay:240ms]" />
            </div>
          ) : attendanceIcon ? (
            <div className="relative flex items-center justify-center" aria-label={attendanceIcon.label}>
              <Image
                src={attendanceIcon.icon}
                alt={attendanceIcon.label}
                width={24}
                height={24}
                className="h-6 w-6 sm:h-7 sm:w-7 lg:h-6 lg:w-6"
              />
            </div>
          ) : mealIndicators.length > 0 ? (
            <div
              className="grid grid-cols-3 items-center justify-items-center gap-1.5"
              aria-label={`${mealIndicators.length}개 식사 기록`}
            >
              {(["breakfast", "lunch", "dinner"] as const).map((type) => {
                const indicator = mealIndicators.find((item) => item.type === type);

                return indicator ? (
                  <span
                    key={type}
                    className={`h-2.5 w-2.5 rounded-full sm:h-3 sm:w-3 lg:h-2.5 lg:w-2.5 ${indicator.className}`}
                  />
                ) : (
                  <span key={type} className="h-2.5 w-2.5 opacity-0 sm:h-3 sm:w-3 lg:h-2.5 lg:w-2.5" />
                );
              })}
            </div>
          ) : dayjs(day.date).isBefore(dayjs(), "day") ? (
            <span className="h-2.5 w-2.5 rounded-full opacity-0" aria-hidden="true" />
          ) : null}
        </div>
      </div>
    </CalendarDayButton>
  );
}, arePropsEqual);
