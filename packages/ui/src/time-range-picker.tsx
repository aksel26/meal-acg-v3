"use client";

import * as React from "react";
import { cn } from "../lib/utils";

interface TimeRangePickerProps {
  startTime?: string;
  endTime?: string;
  onChange?: (range: { startTime: string; endTime: string }) => void;
  className?: string;
  disabled?: boolean;
}

function TimeRangePicker({
  startTime = "",
  endTime = "",
  onChange,
  className,
  disabled,
}: TimeRangePickerProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input
        type="time"
        value={startTime}
        onChange={(e) =>
          onChange?.({ startTime: e.target.value, endTime })
        }
        disabled={disabled}
        className="w-full rounded-lg border px-3 py-2 text-sm"
      />
      <span className="shrink-0 text-sm text-muted-foreground">~</span>
      <input
        type="time"
        value={endTime}
        onChange={(e) =>
          onChange?.({ startTime, endTime: e.target.value })
        }
        disabled={disabled}
        className="w-full rounded-lg border px-3 py-2 text-sm"
      />
    </div>
  );
}

export { TimeRangePicker };
export type { TimeRangePickerProps };
