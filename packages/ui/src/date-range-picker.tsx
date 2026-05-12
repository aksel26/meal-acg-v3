"use client";

import * as React from "react";
import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "../lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onChange?: (range: { startDate: string; endDate: string }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  modal?: boolean;
}

function DateRangePicker({
  startDate,
  endDate,
  onChange,
  placeholder = "기간 선택",
  className,
  disabled,
  modal,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selected: DateRange | undefined =
    startDate || endDate
      ? {
          from: startDate
            ? parse(startDate, "yyyy-MM-dd", new Date())
            : undefined,
          to: endDate ? parse(endDate, "yyyy-MM-dd", new Date()) : undefined,
        }
      : undefined;

  const handleSelect = (range: DateRange | undefined) => {
    if (range) {
      onChange?.({
        startDate: range.from ? format(range.from, "yyyy-MM-dd") : "",
        endDate: range.to ? format(range.to, "yyyy-MM-dd") : "",
      });
    }
  };

  const formatDisplay = () => {
    if (!selected?.from) return null;
    const fromStr = format(selected.from, "yyyy년 M월 d일", { locale: ko });
    if (!selected.to) return fromStr;
    const sameYear =
      selected.from.getFullYear() === selected.to.getFullYear();
    const sameMonth =
      sameYear && selected.from.getMonth() === selected.to.getMonth();
    if (sameMonth) {
      return `${fromStr} ~ ${format(selected.to, "d일", { locale: ko })}`;
    }
    if (sameYear) {
      return `${fromStr} ~ ${format(selected.to, "M월 d일", { locale: ko })}`;
    }
    return `${fromStr} ~ ${format(selected.to, "yyyy년 M월 d일", { locale: ko })}`;
  };

  const display = formatDisplay();

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !display && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {display ?? placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        onPointerDownOutside={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("[data-slot='popover-content']")) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("[data-slot='popover-content']")) {
            event.preventDefault();
          }
        }}
      >
        <div
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <Calendar
            mode="range"
            selected={selected}
            onSelect={handleSelect}
            locale={ko}
            defaultMonth={selected?.from}
            numberOfMonths={2}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DateRangePicker };
export type { DateRangePickerProps };
