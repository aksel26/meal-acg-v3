"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import dayjs from "dayjs";
import type { RequestRecord } from "@/lib/requests";
import { CalendarPanel } from "./CalendarPanel";
import { DayRequestList } from "./DayRequestList";

interface DashboardClientProps {
  requests: RequestRecord[];
  rightTopSlot?: ReactNode;
}

export function DashboardClient({ requests, rightTopSlot }: DashboardClientProps) {
  const [selectedDate, setSelectedDate] = useState(() =>
    dayjs().format("YYYY-MM-DD"),
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[6fr_4fr]">
      <CalendarPanel
        requests={requests}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />
      <div className="flex flex-col gap-4">
        {rightTopSlot}
        <div className="min-h-0 flex-1">
          <DayRequestList selectedDate={selectedDate} requests={requests} />
        </div>
      </div>
    </div>
  );
}
