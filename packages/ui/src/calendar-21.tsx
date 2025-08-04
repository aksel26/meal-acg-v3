import * as React from "react";
import { DateRange } from "react-day-picker";

import { Calendar, CalendarDayButton } from "../src/calendar";

export default function Calendar21() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());

  return (
    <Calendar
      mode="single"
      // defaultMonth={range?.from}
      selected={date}
      onSelect={setDate}
      numberOfMonths={1}
      captionLayout="dropdown"
      className="rounded-lg border shadow-sm [--cell-size:--spacing(11)] md:[--cell-size:--spacing(13)] w-full"
      formatters={{
        formatMonthDropdown: (date) => {
          return date.toLocaleString("default", { month: "long" });
        },
      }}
      components={{
        DayButton: ({ children, modifiers, day, ...props }) => {
          const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;

          return (
            <CalendarDayButton day={day} modifiers={modifiers} {...props}>
              {children}
              {!modifiers.outside && <span>{isWeekend ? "🤔" : "🫥"}</span>}
            </CalendarDayButton>
          );
        },
      }}
    />
  );
}
