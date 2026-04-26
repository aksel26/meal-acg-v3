"use client";
import { useMemo } from "react";

interface WeeklyScheduleProps {
  isLoading: boolean;
  mondayMember?: string;
  fridayMember?: string;
  excludedMembers?: string[];
}

const DAYS_OF_WEEK = [
  { value: 1, label: "월", fullLabel: "월요일" },
  { value: 2, label: "화", fullLabel: "화요일" },
  { value: 3, label: "수", fullLabel: "수요일" },
  { value: 4, label: "목", fullLabel: "목요일" },
  { value: 5, label: "금", fullLabel: "금요일" },
] as const;

const FIXED_VISIBLE_DAYS = DAYS_OF_WEEK.filter(
  (day) => day.value === 1 || day.value === 5,
);

function parseMemberText(value?: string) {
  return (value ?? "")
    .split(",")
    .map((member) => member.trim())
    .filter(Boolean);
}

function ScheduleItems({
  members,
  labels,
}: {
  members: string[];
  labels: string[];
}) {
  if (members.length === 0 && labels.length === 0) {
    return (
      <div className="rounded-[10px] bg-white/55 px-2 py-2 text-xs text-[var(--slate-gray)]">
        없음
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {members.map((member, index) => (
        <div
          key={`member-${index}`}
          className="flex items-center gap-2 rounded-[10px] bg-[rgba(244,241,232,0.62)] px-2 py-1.5"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-medium text-[var(--granite)]">
            {member.charAt(0)}
          </div>
          <span className="truncate text-xs text-[var(--ink-black)]">
            {member}
          </span>
        </div>
      ))}
      {labels.map((label, index) => (
        <div
          key={`label-${index}`}
          className="rounded-[10px] bg-[rgba(236,126,0,0.1)] px-2 py-1.5 text-xs text-[#9a4f00]"
        >
          {label}
        </div>
      ))}
    </div>
  );
}

const WeeklySchedule = ({
  isLoading,
  mondayMember,
  fridayMember,
  excludedMembers = [],
}: WeeklyScheduleProps) => {
  const schedulesByDay = useMemo(() => {
    const grouped: Record<number, { members: string[]; labels: string[] }> = {};

    DAYS_OF_WEEK.forEach((day) => {
      grouped[day.value] = { members: [], labels: [] };
    });

    grouped[1].members.push(...parseMemberText(mondayMember));
    grouped[5].members.push(...parseMemberText(fridayMember));

    return grouped;
  }, [fridayMember, mondayMember]);

  if (isLoading) {
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

  return (
    <div className="space-y-3 border-t border-[rgba(14,15,12,0.06)] pt-4">
      <div className="grid grid-cols-2 gap-2">
        {FIXED_VISIBLE_DAYS.map((day) => {
          const dayData = schedulesByDay[day.value] ?? {
            members: [],
            labels: [],
          };

          return (
            <div key={day.value}>
              <div className="min-h-[7rem] rounded-[16px] bg-[rgba(244,241,232,0.58)] p-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-[var(--ink-black)]">
                    {day.fullLabel}
                  </p>
                  <span className="text-[10px] text-[var(--slate-gray)]">
                    고정
                  </span>
                </div>
                <ScheduleItems
                  members={dayData.members}
                  labels={dayData.labels}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-[16px] bg-[rgba(244,241,232,0.58)] p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-[var(--ink-black)]">
            제외 인원
          </p>
          <span className="text-[10px] text-[var(--slate-gray)]">
            {excludedMembers.length}명
          </span>
        </div>
        {excludedMembers.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {excludedMembers.map((member) => (
              <span
                key={member}
                className="rounded-full bg-white/65 px-2 py-1 text-xs text-[var(--granite)]"
              >
                {member}
              </span>
            ))}
          </div>
        ) : (
          <div className="rounded-[10px] bg-white/55 px-2 py-2 text-xs text-[var(--slate-gray)]">
            없음
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklySchedule;
