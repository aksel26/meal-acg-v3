"use client";

import * as React from "react";
import { format, parse } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "../lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface DatePickerProps {
  /** YYYY-MM-DD string */
  value?: string;
  /** Called with YYYY-MM-DD string */
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  modal?: boolean;
}

function DatePicker({
  value,
  onChange,
  placeholder = "날짜 선택",
  className,
  disabled,
  modal,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = value
    ? parse(value, "yyyy-MM-dd", new Date())
    : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange?.(format(date, "yyyy-MM-dd"));
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate
            ? format(selectedDate, "yyyy년 M월 d일", { locale: ko })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        onPointerDownOutside={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("[data-slot='popover-content']")) {
            event.preventDefault();
            return;
          }
          setOpen(false);
          if (target?.closest("[data-slot='dialog-content']")) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("[data-slot='popover-content']")) {
            event.preventDefault();
            return;
          }
          setOpen(false);
          if (target?.closest("[data-slot='dialog-content']")) {
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
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            locale={ko}
            defaultMonth={selectedDate}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
export type { DatePickerProps };
