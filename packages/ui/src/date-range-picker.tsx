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
  mode?: "single" | "range";
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  modal?: boolean;
  clearable?: boolean;
}

function DateRangePicker({
  startDate,
  endDate,
  onChange,
  mode = "range",
  placeholder = "기간 선택",
  ariaLabel,
  className,
  disabled,
  modal,
  clearable = false,
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
      const nextStartDate = range.from ? format(range.from, "yyyy-MM-dd") : "";
      const nextEndDate =
        mode === "single" ? "" : range.to ? format(range.to, "yyyy-MM-dd") : "";
      onChange?.({
        startDate: nextStartDate,
        endDate: nextEndDate,
      });
      if (mode === "single" && nextStartDate) setOpen(false);
    }
  };

  const formatDisplay = () => {
    if (!selected?.from) return null;
    const fromStr = format(selected.from, "yyyy년 M월 d일", { locale: ko });
    if (mode === "single" || !selected.to) return fromStr;
    const sameYear = selected.from.getFullYear() === selected.to.getFullYear();
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
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "h-10 w-full justify-start rounded-lg border-slate-200 bg-white text-left font-normal text-slate-900",
            !display && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {display ?? placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[60] w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          locale={ko}
          defaultMonth={selected?.from}
          numberOfMonths={mode === "range" ? 2 : 1}
        />
        {clearable && (startDate || endDate) && (
          <div className="flex justify-end border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange?.({ startDate: "", endDate: "" });
                setOpen(false);
              }}
            >
              초기화
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export { DateRangePicker };
export type { DateRangePickerProps };
