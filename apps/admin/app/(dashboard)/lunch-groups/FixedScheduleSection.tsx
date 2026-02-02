"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/src/card";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Combobox } from "@repo/ui/src/combobox";
import { toast } from "sonner";
import { Calendar, Save, User, Tag, Plus, X } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import type { Member, LunchFixedScheduleWithMember } from "@/lib/supabase/types";

const DAYS_OF_WEEK = [
  { value: 1, label: "월" },
  { value: 2, label: "화" },
  { value: 3, label: "수" },
  { value: 4, label: "목" },
  { value: 5, label: "금" },
] as const;

interface ScheduleItem {
  id?: string;
  day_of_week: number;
  user_id?: string;
  label?: string;
  member?: Member;
}

interface FixedScheduleSectionProps {
  members: Member[];
}

export default function FixedScheduleSection({ members }: FixedScheduleSectionProps) {
  const queryClient = useQueryClient();
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [addingMemberDay, setAddingMemberDay] = useState<number | null>(null);
  const [addingLabelDay, setAddingLabelDay] = useState<number | null>(null);
  const [newLabel, setNewLabel] = useState("");

  // 고정 스케줄 조회
  const { data: existingSchedules, isLoading } = useQuery<LunchFixedScheduleWithMember[]>({
    queryKey: queryKeys.lunchGroups.fixedSchedules,
    queryFn: async () => {
      const response = await fetch("/api/lunch-groups/fixed-schedules");
      if (!response.ok) throw new Error("Failed to fetch fixed schedules");
      return response.json();
    },
  });

  // 기존 스케줄 로드
  useEffect(() => {
    if (existingSchedules) {
      setSchedules(
        existingSchedules.map((s) => ({
          id: s.id,
          day_of_week: s.day_of_week,
          user_id: s.user_id || undefined,
          label: s.label || undefined,
          member: s.member,
        }))
      );
    }
  }, [existingSchedules]);

  // 저장 mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { schedules: Omit<ScheduleItem, "id" | "member">[] }) => {
      const response = await fetch("/api/lunch-groups/fixed-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lunchGroups.fixedSchedules,
      });
      toast.success("고정 스케줄이 저장되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "저장 중 오류가 발생했습니다.");
    },
  });

  // 요일별 스케줄 그룹화
  const schedulesByDay = useMemo(() => {
    const grouped: Record<number, ScheduleItem[]> = {};
    DAYS_OF_WEEK.forEach((day) => {
      grouped[day.value] = schedules.filter((s) => s.day_of_week === day.value);
    });
    return grouped;
  }, [schedules]);

  // 이미 스케줄에 포함된 멤버 ID 목록
  const usedMemberIds = useMemo(() => {
    return new Set(schedules.filter((s) => s.user_id).map((s) => s.user_id!));
  }, [schedules]);

  // 선택 가능한 멤버 (이미 선택된 멤버 제외)
  const availableMemberOptions = useMemo(() => {
    return members
      .filter((m) => !usedMemberIds.has(m.id))
      .map((m) => m.full_name);
  }, [members, usedMemberIds]);

  // 멤버 이름으로 멤버 찾기
  const findMemberByName = (name: string) => {
    return members.find((m) => m.full_name === name);
  };

  // 멤버 추가
  const handleAddMember = (dayOfWeek: number, memberName: string) => {
    const member = findMemberByName(memberName);
    if (!member) return;

    setSchedules((prev) => [
      ...prev,
      {
        day_of_week: dayOfWeek,
        user_id: member.id,
        member,
      },
    ]);
    setAddingMemberDay(null);
  };

  // 라벨 추가
  const handleAddLabel = (dayOfWeek: number) => {
    if (!newLabel.trim()) return;

    setSchedules((prev) => [
      ...prev,
      {
        day_of_week: dayOfWeek,
        label: newLabel.trim(),
      },
    ]);
    setNewLabel("");
    setAddingLabelDay(null);
  };

  // 요일 내에서 항목 삭제
  const handleRemoveFromDay = (dayOfWeek: number, itemIndex: number) => {
    const daySchedules = schedulesByDay[dayOfWeek] ?? [];
    const itemToRemove = daySchedules[itemIndex];
    if (!itemToRemove) return;

    setSchedules((prev) => prev.filter((s) => {
      if (s.day_of_week !== dayOfWeek) return true;
      if (s.user_id && itemToRemove.user_id) return s.user_id !== itemToRemove.user_id;
      if (s.label && itemToRemove.label) return s.label !== itemToRemove.label;
      return true;
    }));
  };

  // 저장
  const handleSave = () => {
    const schedulesToSave = schedules.map((s) => ({
      day_of_week: s.day_of_week,
      user_id: s.user_id,
      label: s.label,
    }));
    saveMutation.mutate({ schedules: schedulesToSave });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            요일별 고정 스케줄
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">불러오는 중...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            요일별 고정 스케줄
          </CardTitle>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-[#135bec]/5 text-[#135bec] hover:bg-[#135bec]/10"
          >
            <Save className="w-4 h-4 mr-1" />
            {saveMutation.isPending ? "저장 중..." : "저장"}
          </Button>
        </div>
        <CardDescription>
          각 요일에 고정 멤버 또는 라벨을 설정하세요.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {DAYS_OF_WEEK.map((day) => {
          const daySchedules = schedulesByDay[day.value] ?? [];
          const isAddingMember = addingMemberDay === day.value;
          const isAddingLabel = addingLabelDay === day.value;

          return (
            <div key={day.value} className="border rounded-lg p-3">
              {/* 요일 헤더 */}
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-sm font-bold">
                  {day.label}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-[#135bec] hover:bg-[#135bec]/10"
                    onClick={() => {
                      setAddingMemberDay(isAddingMember ? null : day.value);
                      setAddingLabelDay(null);
                    }}
                  >
                    <User className="w-3 h-3 mr-1" />
                    멤버
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-[#135bec] hover:bg-[#135bec]/10"
                    onClick={() => {
                      setAddingLabelDay(isAddingLabel ? null : day.value);
                      setAddingMemberDay(null);
                    }}
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    라벨
                  </Button>
                </div>
              </div>

              {/* 멤버 추가 폼 */}
              {isAddingMember && (
                <div className="mb-2">
                  <Combobox
                    options={availableMemberOptions}
                    placeholder="멤버 선택..."
                    searchPlaceholder="멤버 검색..."
                    emptyText="선택 가능한 멤버가 없습니다."
                    onValueChange={(value) => {
                      if (value) handleAddMember(day.value, value);
                    }}
                    className="text-sm"
                  />
                </div>
              )}

              {/* 라벨 추가 폼 */}
              {isAddingLabel && (
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="라벨 입력 (예: 팀장식사)"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    className="h-9 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddLabel(day.value);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-9 bg-[#135bec]/5 text-[#135bec] hover:bg-[#135bec]/10"
                    onClick={() => handleAddLabel(day.value)}
                    disabled={!newLabel.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* 스케줄 항목 */}
              <div className="flex flex-wrap gap-2">
                {daySchedules.length === 0 && !isAddingMember && !isAddingLabel ? (
                  <span className="text-xs text-gray-400">(비어있음)</span>
                ) : (
                  daySchedules.map((item, index) => (
                    <div
                      key={item.user_id || item.label || index}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                        item.user_id
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.user_id ? (
                        <User className="w-3 h-3" />
                      ) : (
                        <Tag className="w-3 h-3" />
                      )}
                      <span>{item.member?.full_name || item.label}</span>
                      <button
                        onClick={() => handleRemoveFromDay(day.value, index)}
                        className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
