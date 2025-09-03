"use client";

import React, { useState } from "react";
import { Calendar } from "@repo/ui/src/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
import { Button } from "@repo/ui/src/button";
import { CalendarIcon } from "@repo/ui/icons";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@repo/ui/lib/utils";

interface PopoverCalendarProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  triggerProps?: React.ComponentProps<typeof Button>;
  calendarProps?: React.ComponentProps<typeof Calendar>;
  popoverProps?: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
  };
}

export function PopoverCalendar({
  date,
  onDateChange,
  placeholder = "날짜 선택",
  disabled = false,
  className,
  buttonClassName,
  triggerProps,
  calendarProps,
  popoverProps,
}: PopoverCalendarProps) {
  const [open, setOpen] = useState(false);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    onDateChange?.(selectedDate);
    setOpen(false);
  };

  const isPopoverControlled = popoverProps?.open !== undefined;
  const popoverOpen = isPopoverControlled ? popoverProps.open : open;
  const onPopoverOpenChange = isPopoverControlled 
    ? popoverProps.onOpenChange 
    : setOpen;

  return (
    <div className={cn("relative", className)}>
      <Popover 
        open={popoverOpen} 
        onOpenChange={onPopoverOpenChange}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground",
              buttonClassName
            )}
            {...triggerProps}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? (
              format(date, "yyyy.MM.dd", { locale: ko })
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          side={popoverProps?.side || "bottom"}
          align={popoverProps?.align || "start"}
        >
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            captionLayout="dropdown"
            initialFocus
            {...calendarProps}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}


