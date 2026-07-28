import Link from "next/link";
import {
  type DerivedScheduleItem,
  scheduleDate,
  scheduleTime,
} from "./ScheduleCalendar";

const TIME_SLOTS = Array.from(
  { length: 10 },
  (_, index) => `${String(index + 9).padStart(2, "0")}:00`,
);

export function ScheduleTimetable({
  date,
  schedules,
}: {
  date: string;
  schedules: DerivedScheduleItem[];
}) {
  const selected = schedules
    .filter((item) => scheduleDate(item) === date)
    .sort((left, right) =>
      scheduleTime(left).localeCompare(scheduleTime(right)),
    );

  if (selected.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-slate-400">
        해당 날짜에 예정된 일정이 없습니다.
      </p>
    );
  }

  return (
    <div>
      {TIME_SLOTS.map((slot) => {
        const hour = slot.slice(0, 2);
        const items = selected.filter((item) =>
          scheduleTime(item).startsWith(hour),
        );
        return (
          <div
            key={slot}
            className={`flex min-h-12 border-b border-slate-100 last:border-b-0 ${
              items.length ? "bg-slate-50/60" : ""
            }`}
          >
            <div className="w-16 shrink-0 border-r border-slate-100 px-3 py-3 font-mono text-xs text-slate-400">
              {slot}
            </div>
            <div className="min-w-0 flex-1 space-y-1 px-3 py-2">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={`/applicants/${item.applicationId}`}
                  className="careers-interactive flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-2 py-1 text-sm hover:bg-white"
                >
                  <span className="font-medium text-blue-600">
                    {scheduleTime(item)}
                  </span>
                  <span className="font-medium text-slate-800">
                    {item.applicantName}
                  </span>
                  <span className="text-xs text-slate-400">
                    {item.field || item.postingTitle}
                  </span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                    {item.stageName || item.title}
                  </span>
                  {item.note && (
                    <span className="truncate text-xs text-slate-400">
                      {item.note}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
