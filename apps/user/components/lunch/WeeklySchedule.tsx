"use client";
import { useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
import { useFixedSchedules } from "@/hooks/useFixedSchedules";

interface WeeklyScheduleProps {
  isLoading: boolean;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "월", fullLabel: "월요일" },
  { value: 2, label: "화", fullLabel: "화요일" },
  { value: 3, label: "수", fullLabel: "수요일" },
  { value: 4, label: "목", fullLabel: "목요일" },
  { value: 5, label: "금", fullLabel: "금요일" },
] as const;

const WeeklySchedule = ({ isLoading }: WeeklyScheduleProps) => {
  const { data: fixedSchedules, isLoading: schedulesLoading } = useFixedSchedules();

  // 요일별 스케줄 그룹화 (Supabase 데이터만 사용)
  const schedulesByDay = useMemo(() => {
    const grouped: Record<number, { members: string[]; labels: string[] }> = {};

    DAYS_OF_WEEK.forEach((day) => {
      grouped[day.value] = { members: [], labels: [] };
    });

    // Supabase에서 가져온 고정 스케줄만 사용
    if (fixedSchedules) {
      fixedSchedules.forEach((schedule) => {
        const dayGroup = grouped[schedule.day_of_week];
        if (dayGroup) {
          if (schedule.members?.full_name) {
            dayGroup.members.push(schedule.members.full_name);
          } else if (schedule.label) {
            dayGroup.labels.push(schedule.label);
          }
        }
      });
    }

    return grouped;
  }, [fixedSchedules]);

  // 데이터가 있는 요일만 필터링
  const daysWithData = useMemo(() => {
    return DAYS_OF_WEEK.filter((day) => {
      const dayData = schedulesByDay[day.value];
      return dayData && (dayData.members.length > 0 || dayData.labels.length > 0);
    });
  }, [schedulesByDay]);

  if (isLoading || schedulesLoading) {
    return (
      <div className="pt-4 border-t border-[rgba(14,15,12,0.06)] grid grid-cols-2 gap-2">
        {[1, 2].map((i) => (
          <div key={i} className="bg-[var(--soft-bone)] rounded-xl p-2">
            <div className="skeleton w-6 h-3 rounded mb-1.5 mx-auto" />
            <div className="skeleton w-10 h-3 rounded mx-auto" />
          </div>
        ))}
      </div>
    );
  }

  // 설정된 요일이 없으면 표시하지 않음
  if (daysWithData.length === 0) {
    return null;
  }

  return (
    <div className={`pt-4 border-t border-[rgba(14,15,12,0.06)] grid gap-2 ${
      daysWithData.length === 1 ? "grid-cols-1" :
      daysWithData.length === 2 ? "grid-cols-2" :
      daysWithData.length === 3 ? "grid-cols-3" :
      daysWithData.length === 4 ? "grid-cols-4" :
      "grid-cols-5"
    }`}>
      {daysWithData.map((day) => {
        const dayData = schedulesByDay[day.value] ?? { members: [], labels: [] };

        return (
          <Popover key={day.value}>
            <PopoverTrigger asChild>
              <button className="w-full rounded-xl p-2.5 text-center transition-colors group bg-[var(--soft-bone)] hover:bg-[var(--whisper-cream)]">
                <p className="text-xs font-medium text-[var(--granite)]">{day.label}</p>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 rounded-xl border border-[rgba(14,15,12,0.06)] shadow-lg" align="center">
              <div className="p-3 border-b border-[rgba(14,15,12,0.06)]">
                <h4 className="font-medium text-sm text-[var(--ink-black)]">{day.fullLabel} 고정 스케줄</h4>
                <p className="text-xs text-[var(--granite)] mt-0.5">이번 주 담당자</p>
              </div>
              <div className="p-2 max-h-48 overflow-y-auto">
                <div className="space-y-1.5">
                  {/* 멤버 표시 */}
                  {dayData.members.map((member, index) => (
                    <div key={`member-${index}`} className="flex items-center gap-2 p-2 bg-[rgba(56,200,255,0.12)] rounded-lg">
                      <div className="w-5 h-5 rounded-full bg-[rgba(56,200,255,0.2)] flex items-center justify-center text-[10px] font-medium text-[#0f4c75]">
                        {member.charAt(0)}
                      </div>
                      <span className="text-xs text-[#0f4c75]">{member}</span>
                    </div>
                  ))}
                  {/* 라벨 표시 */}
                  {dayData.labels.map((label, index) => (
                    <div key={`label-${index}`} className="flex items-center gap-2 p-2 bg-[rgba(255,209,26,0.15)] rounded-lg">
                      <div className="w-5 h-5 rounded-full bg-[rgba(255,209,26,0.3)] flex items-center justify-center">
                        <svg className="w-3 h-3 text-[#6b4c00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <span className="text-xs text-[#6b4c00]">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
};

export default WeeklySchedule;
