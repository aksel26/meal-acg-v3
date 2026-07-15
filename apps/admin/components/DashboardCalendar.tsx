"use client";

import { useState, useMemo } from "react";
import { Badge } from "@repo/ui/src/badge";
import { Button } from "@repo/ui/src/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useDayoffs } from "@/hooks/useDayoffs";
import { useMemberStatuses } from "@/hooks/useMemberStatuses";
import { useSupervisorCalendar, useSupervisorCalendarByMonth } from "@/hooks/useSupervisorCalendar";
import dayjs from "dayjs";
import { cn } from "@repo/ui/lib/utils";

const LEAVE_TYPE_COLORS: Record<string, string> = {
  "지각/조퇴": "bg-slate-50 text-slate-700",
  반차: "bg-slate-50 text-slate-700",
  연차: "bg-slate-50 text-slate-700",
  대체휴무: "bg-slate-100 text-slate-800",
  경조휴무: "bg-slate-50 text-slate-700",
  특별휴무: "bg-slate-50 text-slate-700",
  훈련: "bg-slate-50 text-slate-700",
  휴무: "bg-slate-50 text-slate-700",
};

export default function DashboardCalendar() {
  const today = dayjs().format("YYYY-MM-DD");
  const [year, setYear] = useState(dayjs().year());
  const [month, setMonth] = useState(dayjs().month() + 1);
  const [selectedDate, setSelectedDate] = useState<string>(today);

  const { data: dayoffs = [] } = useDayoffs(year, month);
  const { data: memberStatuses = [] } = useMemberStatuses({});
  const { data: supervisorData } = useSupervisorCalendar(selectedDate);
  const { data: monthlyPostings } = useSupervisorCalendarByMonth(year, month);

  const handlePrevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  };
  const handleNextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  };

  // Calendar grid days
  const calendarDays = useMemo(() => {
    const start = dayjs(`${year}-${String(month).padStart(2, "0")}-01`);
    const daysInMonth = start.daysInMonth();
    const startDay = start.day();
    const days: { date: string; dayOfMonth: number; isCurrentMonth: boolean }[] = [];

    for (let i = 0; i < startDay; i++) {
      const d = start.subtract(startDay - i, "day");
      days.push({ date: d.format("YYYY-MM-DD"), dayOfMonth: d.date(), isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const d = start.date(i);
      days.push({ date: d.format("YYYY-MM-DD"), dayOfMonth: i, isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = start.add(1, "month").date(i);
      days.push({ date: d.format("YYYY-MM-DD"), dayOfMonth: i, isCurrentMonth: false });
    }
    return days;
  }, [year, month]);

  // Dayoffs by date
  const dayoffsByDate = useMemo(() => {
    const map = new Map<string, typeof dayoffs>();
    for (const d of dayoffs) {
      const list = map.get(d.leave_date) || [];
      list.push(d);
      map.set(d.leave_date, list);
    }
    return map;
  }, [dayoffs]);

  // Member statuses active on a date
  const statusesByDate = useMemo(() => {
    const map = new Map<string, typeof memberStatuses>();
    const start = dayjs(`${year}-${String(month).padStart(2, "0")}-01`);
    const daysInMonth = start.daysInMonth();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const active = memberStatuses.filter((s) => {
        if (!s.status_start_date) return false;
        const sStart = s.status_start_date;
        const sEnd = s.status_end_date;
        return sEnd ? dateStr >= sStart && dateStr <= sEnd : dateStr >= sStart;
      });
      if (active.length > 0) map.set(dateStr, active);
    }
    return map;
  }, [memberStatuses, year, month]);

  // Supervisor postings by date (for calendar cells)
  const supervisorPostingsByDate = useMemo(() => {
    const map = new Map<string, NonNullable<typeof monthlyPostings>["jobPostings"]>();
    const postings = monthlyPostings?.jobPostings ?? [];
    const start = dayjs(`${year}-${String(month).padStart(2, "0")}-01`);
    const daysInMonth = start.daysInMonth();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const active = postings.filter((jp) => dateStr >= jp.start_date && dateStr <= jp.end_date);
      if (active.length > 0) map.set(dateStr, active);
    }
    return map;
  }, [monthlyPostings, year, month]);

  // Interview postings by date (for calendar cells)
  const interviewPostingsByDate = useMemo(() => {
    const map = new Map<string, NonNullable<typeof monthlyPostings>["interviewPostings"]>();
    const postings = monthlyPostings?.interviewPostings ?? [];
    const start = dayjs(`${year}-${String(month).padStart(2, "0")}-01`);
    const daysInMonth = start.daysInMonth();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const active = postings.filter((ip) => dateStr >= ip.start_date && dateStr <= ip.end_date);
      if (active.length > 0) map.set(dateStr, active);
    }
    return map;
  }, [monthlyPostings, year, month]);

  // Selected date detail data
  const selectedDayoffs = dayoffsByDate.get(selectedDate) || [];
  const selectedStatuses = statusesByDate.get(selectedDate) || [];
  const jobPostings = supervisorData?.jobPostings ?? [];
  const interviewPostings = supervisorData?.interviewPostings ?? [];

  const dayOfWeekLabel = ["일", "월", "화", "수", "목", "금", "토"][dayjs(selectedDate).day()];

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* ── Left: Calendar Grid (6) ──────────────────────────────────────── */}
      <div className="basis-3/5 min-w-0 flex flex-col">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-base font-semibold text-slate-800 min-w-[100px] text-center">
              {year}년 {month}월
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => {
              setYear(dayjs().year());
              setMonth(dayjs().month() + 1);
              setSelectedDate(today);
            }}>
              오늘
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <LegendDot color="bg-slate-500" label="휴가" />
            <LegendDot color="bg-slate-400" label="특이사항" />
            <LegendDot color="bg-slate-500" label="감독관 공고" />
            <LegendDot color="bg-slate-1000" label="교육운영 공고" />
          </div>
        </div>

        {/* Calendar grid */}
        <div className="flex-1 grid grid-cols-7 gap-px rounded-lg bg-slate-200 overflow-hidden">
          {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
            <div key={day} className={cn(
              "bg-slate-50 p-2 text-center text-xs font-semibold",
              i === 0 ? "text-slate-500" : i === 6 ? "text-slate-700" : "text-slate-600"
            )}>
              {day}
            </div>
          ))}
          {calendarDays.map((day) => {
            const records = dayoffsByDate.get(day.date) || [];
            const statuses = statusesByDate.get(day.date) || [];
            const svPostings = supervisorPostingsByDate.get(day.date) || [];
            const ivPostings = interviewPostingsByDate.get(day.date) || [];
            const dow = dayjs(day.date).day();
            const isSelected = day.date === selectedDate;
            const isToday = day.date === today;
            const allItems = records.length + statuses.length + svPostings.length + ivPostings.length;
            let shown = 0;
            const maxShow = 3;
            return (
              <div
                key={day.date}
                className={cn(
                  "min-h-[90px] bg-white p-1.5 cursor-pointer transition-colors",
                  !day.isCurrentMonth && "opacity-40",
                  isSelected && "ring-2 ring-slate-700 ring-inset",
                  !isSelected && "hover:bg-slate-50"
                )}
                onClick={() => day.isCurrentMonth && setSelectedDate(day.date)}
              >
                <div className={cn(
                  "text-xs font-medium mb-0.5 w-5 h-5 flex items-center justify-center rounded-full",
                  dow === 0 ? "text-slate-500" : dow === 6 ? "text-slate-700" : "text-slate-700",
                  isToday && "bg-slate-900 text-white"
                )}>
                  {day.dayOfMonth}
                </div>
                <div className="space-y-0.5">
                  {records.slice(0, maxShow).map((r) => {
                    shown++;
                    return (
                      <div
                        key={r.id}
                        className={cn(
                          "truncate rounded px-1 py-0.5 text-[10px]",
                          LEAVE_TYPE_COLORS[r.leave_type?.name || ""] || "bg-slate-50 text-slate-700"
                        )}
                      >
                        {r.target?.full_name} {r.leave_type?.name}
                      </div>
                    );
                  })}
                  {statuses.length > 0 && shown < maxShow && statuses.slice(0, maxShow - shown).map((s) => {
                    shown++;
                    return (
                      <div key={s.member_id} className="truncate rounded px-1 py-0.5 text-[10px] bg-slate-50 text-slate-700">
                        {s.full_name} {s.current_status}
                      </div>
                    );
                  })}
                  {svPostings.length > 0 && shown < maxShow && svPostings.slice(0, maxShow - shown).map((jp) => {
                    shown++;
                    return (
                      <div key={jp.id} className="truncate rounded px-1 py-0.5 text-[10px] bg-slate-50 text-slate-700">
                        {jp.title}
                      </div>
                    );
                  })}
                  {ivPostings.length > 0 && shown < maxShow && ivPostings.slice(0, maxShow - shown).map((ip) => {
                    shown++;
                    return (
                      <div key={ip.id} className="truncate rounded px-1 py-0.5 text-[10px] bg-slate-100 text-slate-800">
                        {ip.title}
                      </div>
                    );
                  })}
                  {allItems > maxShow && (
                    <div className="text-[10px] text-slate-400 pl-1">
                      +{allItems - maxShow}건
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: Detail panel (4) ──────────────────────────────────────── */}
      <div className="basis-2/5 min-w-0 flex flex-col gap-3 overflow-y-auto pb-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-semibold text-slate-800">
            {dayjs(selectedDate).format("M월 D일")}
          </span>
          <span className="text-xs text-slate-400">{dayOfWeekLabel}요일</span>
        </div>

        {/* 휴가 현황 */}
        <Section title="휴가 현황" accent="purple">
          {selectedDayoffs.length === 0 ? (
            <EmptyRow />
          ) : (
            selectedDayoffs.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-0.5">
                <span className="text-sm text-slate-700">{d.target?.full_name ?? "—"}</span>
                <div className="flex items-center gap-1.5">
                  {d.leave_type && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                      {d.leave_type.name}
                    </Badge>
                  )}
                  {d.reason && (
                    <span className="text-xs text-slate-400 truncate max-w-[8rem]">{d.reason}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </Section>

        {/* 특이사항 */}
        <Section title="특이사항" accent="orange">
          {selectedStatuses.length === 0 ? (
            <EmptyRow />
          ) : (
            selectedStatuses.map((s) => (
              <div key={s.member_id} className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm text-slate-700 truncate">{s.full_name ?? "—"}</span>
                  {s.team_name && <span className="text-xs text-slate-400 shrink-0">{s.team_name}</span>}
                </div>
                <div className="flex items-center gap-1.5 ml-2 shrink-0">
                  {s.current_status && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">{s.current_status}</Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </Section>

        {/* 감독관 공고 */}
        <Section title="감독관 공고" accent="emerald">
          {jobPostings.length === 0 ? (
            <EmptyRow />
          ) : (
            jobPostings.map((jp) => (
              <div key={jp.id} className="flex items-center justify-between py-0.5">
                <div className="flex flex-col min-w-0">
                  <span className="text-sm text-slate-700 truncate">{jp.title}</span>
                  <span className="text-xs text-slate-400">{jp.location}</span>
                </div>
                <div className="flex items-center gap-1.5 ml-2 shrink-0">
                  <span className="text-xs text-slate-400">{jp.assigned_count}/{jp.headcount}명</span>
                  <Badge variant="secondary" className={cn(
                    "text-xs px-1.5 py-0 h-5",
                    jp.status === "open" && "bg-slate-50 text-slate-700",
                    jp.status === "closed" && "bg-slate-100 text-slate-500",
                    jp.status === "draft" && "bg-slate-50 text-slate-600"
                  )}>
                    {jp.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </Section>

        {/* 교육운영 공고 */}
        <Section title="교육운영 공고" accent="blue">
          {interviewPostings.length === 0 ? (
            <EmptyRow />
          ) : (
            interviewPostings.map((ip) => (
              <div key={ip.id} className="flex items-center justify-between py-0.5">
                <div className="flex flex-col min-w-0">
                  <span className="text-sm text-slate-700 truncate">{ip.title}</span>
                  <span className="text-xs text-slate-400">{ip.platform || "-"}</span>
                </div>
                <div className="flex items-center gap-1.5 ml-2 shrink-0">
                  <span className="text-xs text-slate-400">{ip.total_headcount}명</span>
                  <Badge variant="secondary" className={cn(
                    "text-xs px-1.5 py-0 h-5",
                    ip.status === "open" && "bg-slate-50 text-slate-700",
                    ip.status === "closed" && "bg-slate-100 text-slate-500",
                    ip.status === "draft" && "bg-slate-50 text-slate-600"
                  )}>
                    {ip.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </Section>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className={cn("size-1.5 rounded-full shrink-0", color)} />
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}

const accentBorder: Record<string, string> = {
  purple: "border-l-purple-400",
  orange: "border-l-orange-400",
  emerald: "border-l-emerald-400",
  blue: "border-l-blue-400",
};

function Section({ title, accent, children }: { title: string; accent: "purple" | "orange" | "emerald" | "blue"; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-lg bg-white px-3 py-2.5 border-l-2", accentBorder[accent])}>
      <p className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-1.5">{title}</p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function EmptyRow() {
  return <p className="text-xs text-slate-300 py-0.5">없음</p>;
}
