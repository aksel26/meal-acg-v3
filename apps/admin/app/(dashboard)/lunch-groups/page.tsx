"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
  pointerWithin,
} from "@dnd-kit/core";
import dayjs from "dayjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/src/card";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { Checkbox } from "@repo/ui/src/checkbox";
import { SearchableDropdown } from "@repo/ui/src/searchable-dropdown";
import { toast } from "@repo/ui/src/sonner";
import {
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  UserMinus,
  Send,
  Table,
  GripVertical,
  X,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/src/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui/src/tooltip";
import { queryKeys } from "@/lib/query-keys";
import type {
  Member,
  LunchGroupSettings,
  LunchGroupWithMembers,
} from "@/lib/supabase/types";
import {
  calculateLunchGroupPlan,
  DEFAULT_MAX_PER_GROUP,
  DEFAULT_MIN_PER_GROUP,
} from "@/lib/lunch-group-plan";
import FixedScheduleSection from "./FixedScheduleSection";

// 월요일 기준으로 주 시작일 계산
const getWeekStartDate = (date: dayjs.Dayjs) => {
  const day = date.day();
  const diff = day === 0 ? -6 : 1 - day;
  return date.add(diff, "day").format("YYYY-MM-DD");
};

interface GroupState {
  groupNumber: number;
  memberIds: string[];
  maxSlots: number; // 해당 조의 최대 인원
}

// 참여인원 목록용 드래그 가능한 멤버 (체크박스 선택 가능)
function DraggableMemberInList({
  member,
  isSelected,
  onToggleSelect,
}: {
  member: Member;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: member.id,
      data: { member, isAssigned: false },
    });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-all ${
        isDragging
          ? "opacity-50 border-[#135bec] bg-[#135bec]/10 shadow-lg z-50"
          : isSelected
            ? "bg-[#135bec]/10 border-[#135bec]/40"
            : "bg-white border-slate-200 hover:border-slate-300"
      }`}
    >
      {/* 드래그 핸들 - 이 부분만 드래그 가능 */}
      <div
        className="p-1 -ml-1 cursor-grab active:cursor-grabbing rounded hover:bg-slate-100"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="w-3 h-3 text-slate-400" />
      </div>
      {/* 체크박스 - 클릭으로 선택 */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggleSelect}
        onClick={(e) => e.stopPropagation()}
      />
      {/* 이름 - 클릭으로 선택 */}
      <span
        className="text-sm font-medium flex-1 text-slate-700 cursor-pointer"
        onClick={onToggleSelect}
      >
        {member.full_name}
      </span>
    </div>
  );
}

// 조 테이블용 드래그 가능한 멤버 (X 버튼으로 제거)
function DraggableMemberInGroup({
  member,
  onRemove,
}: {
  member: Member;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: member.id,
      data: { member, isAssigned: true },
    });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-all ${
        isDragging
          ? "opacity-50 border-[#135bec] bg-[#135bec]/10 shadow-lg z-50"
          : "bg-[#135bec]/5 border-[#135bec]/20"
      }`}
    >
      {/* 드래그 핸들 */}
      <div
        className="p-1 -ml-1 cursor-grab active:cursor-grabbing rounded hover:bg-[#135bec]/10"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="w-3 h-3 text-[#135bec]/60" />
      </div>
      <span className="text-sm font-medium flex-1 text-[#135bec]">
        {member.full_name}
      </span>
      {/* X 버튼 - 클릭으로 제거 */}
      <button
        onClick={onRemove}
        className="p-0.5 rounded hover:bg-[#135bec]/10 text-[#135bec]/60 hover:text-[#135bec]"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// 조의 빈 자리 - 다른 조로 끌어다 놓으면 정원이 그 조로 넘어간다
function DraggableEmptySlot({
  groupNumber,
  index,
}: {
  groupNumber: number;
  index: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `slot-${groupNumber}-${index}`,
      data: { type: "slot", groupNumber },
    });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`px-3 py-2 border-2 border-dashed rounded-md text-xs text-center cursor-grab active:cursor-grabbing transition-all ${
        isDragging
          ? "opacity-50 border-[#135bec] bg-[#135bec]/10 text-[#135bec] z-50"
          : "border-slate-200 text-slate-400 hover:border-[#135bec]/40 hover:text-[#135bec]/70"
      }`}
    >
      빈 자리 · 끌어서 이동
    </div>
  );
}

// 드롭 가능한 조 영역
function DroppableGroup({
  groupNumber,
  maxSlots,
  children,
  memberCount,
  slotNotice,
  isDraggingSlot,
}: {
  groupNumber: number;
  maxSlots: number;
  children: React.ReactNode;
  memberCount: number;
  slotNotice: string | null;
  isDraggingSlot: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `group-${groupNumber}`,
    data: { groupNumber, maxSlots },
  });

  // 빈 자리를 옮기는 중이면 정원이 찬 조도 받을 수 있다
  const isFull = memberCount >= maxSlots && !isDraggingSlot;

  return (
    <div
      ref={setNodeRef}
      className={`p-4 rounded-lg border-2 bg-white min-h-[180px] transition-all ${
        isOver && !isFull
          ? "border-[#135bec] bg-[#135bec]/5 scale-[1.02]"
          : isOver && isFull
            ? "border-red-300 bg-red-50/50"
            : "border-slate-200"
      }`}
    >
      {/* 조 번호 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 flex items-center justify-center text-[#135bec] text-sm font-bold rounded-md bg-[#135bec]/5">
            {groupNumber}
          </span>
          <span className="text-sm font-medium text-slate-600">조</span>
          {slotNotice && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded font-medium">
              {slotNotice}
            </span>
          )}
        </div>
        <span
          className={`text-xs ${isFull ? "text-[#135bec] font-medium" : "text-slate-400"}`}
        >
          {memberCount}/{maxSlots}명
        </span>
      </div>
      {children}
    </div>
  );
}

// 참여인원 목록 드롭 영역 (조에서 제거 시)
function DroppableUnassigned({ children }: { children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id: "unassigned",
  });

  return (
    <div
      ref={setNodeRef}
      className={`space-y-1 max-h-[300px] overflow-y-auto p-1 rounded-md transition-all ${
        isOver ? "bg-[#135bec]/10 ring-2 ring-[#135bec]/40" : ""
      }`}
    >
      {children}
    </div>
  );
}

export default function LunchGroupsPage() {
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(dayjs());
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
    new Set(),
  );
  const [groups, setGroups] = useState<GroupState[]>([]);
  const [maxInput, setMaxInput] = useState(String(DEFAULT_MAX_PER_GROUP));
  const [minInput, setMinInput] = useState(String(DEFAULT_MIN_PER_GROUP));
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const maxPerGroup = Number(maxInput) || DEFAULT_MAX_PER_GROUP;
  const minPerGroup = Number(minInput) || DEFAULT_MIN_PER_GROUP;

  const weekStartDate = getWeekStartDate(currentWeek);

  // 제외 인원 조회 (DB) - 주차별
  const { data: excludedMembersData = [] } = useQuery<
    {
      id: string;
      member_id: string;
      week_start_date: string;
      excluded_at: string | null;
      members: { id: string; full_name: string } | null;
    }[]
  >({
    queryKey: queryKeys.lunchGroups.excludedMembers(weekStartDate),
    queryFn: async () => {
      const response = await fetch(
        `/api/lunch-groups/excluded-members?weekStartDate=${weekStartDate}`,
      );
      if (!response.ok) throw new Error("Failed to fetch excluded members");
      return response.json();
    },
  });

  const excludedMemberIds = useMemo(
    () => new Set(excludedMembersData.map((e) => e.member_id)),
    [excludedMembersData],
  );

  // 멤버 목록 조회 (특이사항 인원 제외)
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: queryKeys.members.active,
    queryFn: async () => {
      const response = await fetch("/api/members?exclude_status=true");
      if (!response.ok) throw new Error("Failed to fetch members");
      return response.json();
    },
  });

  // 설정 조회
  const { data: settings } = useQuery<LunchGroupSettings>({
    queryKey: queryKeys.lunchGroups.settings,
    queryFn: async () => {
      const response = await fetch("/api/lunch-groups/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
  });

  // 기존 배정 조회
  const { data: existingGroups, isFetching: isGroupsFetching } = useQuery<
    LunchGroupWithMembers[]
  >({
    queryKey: queryKeys.lunchGroups.byWeek(weekStartDate),
    queryFn: async () => {
      const response = await fetch(
        `/api/lunch-groups?weekStartDate=${weekStartDate}`,
      );
      if (!response.ok) throw new Error("Failed to fetch groups");
      return response.json();
    },
  });

  // 설정 로드
  useEffect(() => {
    if (!settings) return;
    setMaxInput(String(settings.max_members_per_group));
    setMinInput(
      String(settings.min_members_per_group ?? DEFAULT_MIN_PER_GROUP),
    );
  }, [settings]);

  // 기존 배정 로드
  useEffect(() => {
    if (!existingGroups) return;
    setGroups(
      existingGroups.map((g) => ({
        groupNumber: g.group_number,
        memberIds: g.members.map((m) => m.user_id),
        maxSlots: g.max_slots || DEFAULT_MAX_PER_GROUP, // DB에 저장된 값 또는 기본값
      })),
    );
  }, [existingGroups]);

  // 저장 mutation
  const saveMutation = useMutation({
    mutationFn: async (data: {
      weekStartDate: string;
      groups: GroupState[];
    }) => {
      const response = await fetch("/api/lunch-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lunchGroups.byWeek(weekStartDate),
      });
    },
  });

  // 배정 설정(조당 최대/최소 인원) 저장 mutation
  const settingsMutation = useMutation({
    mutationFn: async (values: { max: number; min: number }) => {
      const response = await fetch("/api/lunch-groups/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxMembersPerGroup: values.max,
          minMembersPerGroup: values.min,
          totalGroups: settings?.total_groups ?? 0,
        }),
      });
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: null }));
        throw new Error(error ?? "설정 저장에 실패했습니다.");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lunchGroups.settings,
      });
      toast.success("배정 설정이 저장되었습니다.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // 입력칸을 벗어날 때 저장 (값이 바뀐 경우에만)
  const handleSettingsBlur = useCallback(() => {
    if (minPerGroup > maxPerGroup) {
      toast.error("최소 인원은 최대 인원보다 클 수 없습니다.");
      setMaxInput(String(settings?.max_members_per_group ?? DEFAULT_MAX_PER_GROUP));
      setMinInput(String(settings?.min_members_per_group ?? DEFAULT_MIN_PER_GROUP));
      return;
    }
    if (
      settings &&
      settings.max_members_per_group === maxPerGroup &&
      settings.min_members_per_group === minPerGroup
    ) {
      return;
    }
    settingsMutation.mutate({ max: maxPerGroup, min: minPerGroup });
  }, [maxPerGroup, minPerGroup, settings, settingsMutation]);

  // 리셋 mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        `/api/lunch-groups?weekStartDate=${weekStartDate}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Failed to reset");
      return response.json();
    },
    onSuccess: () => {
      setGroups([]);
      queryClient.invalidateQueries({
        queryKey: queryKeys.lunchGroups.byWeek(weekStartDate),
      });
      toast.success("조 테이블이 초기화되었습니다.");
    },
    onError: () => {
      toast.error("초기화 중 오류가 발생했습니다.");
    },
  });

  // 조 변경 후 자동 저장 + toast
  const autoSaveGroups = useCallback(
    (newGroups: GroupState[], successMsg: string) => {
      setGroups(newGroups);
      saveMutation.mutate(
        { weekStartDate, groups: newGroups },
        {
          onSuccess: () => toast.success(successMsg),
          onError: () => toast.error("저장 중 오류가 발생했습니다."),
        },
      );
    },
    [weekStartDate, saveMutation],
  );

  // 참여 가능 인원 (제외 인원 빼기)
  const availableMembers = useMemo(() => {
    return members.filter((m) => !excludedMemberIds.has(m.id));
  }, [members, excludedMemberIds]);

  // 조당 최대/최소 인원에 맞춘 조 정원 계산
  const plan = useMemo(
    () =>
      calculateLunchGroupPlan(
        availableMembers.length,
        maxPerGroup,
        minPerGroup,
      ),
    [availableMembers.length, maxPerGroup, minPerGroup],
  );

  // 아직 저장된 조가 없을 때 화면에 미리 띄우는 빈 조 (여기에 바로 드래그 가능)
  const previewGroups = useMemo<GroupState[]>(
    () =>
      plan.slots.map((maxSlots, i) => ({
        groupNumber: i + 1,
        memberIds: [],
        maxSlots,
      })),
    [plan],
  );

  // 저장된 조가 있으면 그것을, 없으면 빈 조 미리보기를 화면에 쓴다
  const isTableCreated = groups.length > 0;
  const displayGroups = isTableCreated ? groups : previewGroups;

  // 빈 조 테이블을 그대로 확정 저장
  const handleCreateTable = useCallback(() => {
    if (previewGroups.length === 0) {
      toast.error("생성할 조가 없습니다.");
      return;
    }
    autoSaveGroups(
      previewGroups,
      `${previewGroups.length}개 조 테이블이 생성되었습니다.`,
    );
  }, [previewGroups, autoSaveGroups]);

  // 이미 조에 배정된 멤버 ID 집합
  const assignedMemberIds = useMemo(() => {
    const ids = new Set<string>();
    groups.forEach((g) => g.memberIds.forEach((id) => ids.add(id)));
    return ids;
  }, [groups]);

  // 미배정 인원 (참여 인원 중 아직 조에 배정되지 않은 인원)
  const unassignedMembers = useMemo(() => {
    return availableMembers.filter((m) => !assignedMemberIds.has(m.id));
  }, [availableMembers, assignedMemberIds]);

  // 선택된 인원 체크박스 토글
  const toggleSelectMember = useCallback((memberId: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  }, []);

  // 전체 선택/해제 (미배정 인원만)
  const toggleSelectAll = useCallback(() => {
    if (selectedMemberIds.size === unassignedMembers.length) {
      setSelectedMemberIds(new Set());
    } else {
      setSelectedMemberIds(new Set(unassignedMembers.map((m) => m.id)));
    }
  }, [unassignedMembers, selectedMemberIds.size]);

  // 인원 제외하기 mutation
  const excludeMutation = useMutation({
    mutationFn: async (memberIds: string[]) => {
      const response = await fetch("/api/lunch-groups/excluded-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds, weekStartDate }),
      });
      if (!response.ok) throw new Error("Failed to exclude members");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lunchGroups.excludedMembers(weekStartDate),
      });
    },
  });

  const handleExcludeMembers = useCallback(() => {
    const ids = Array.from(selectedMemberIds);
    excludeMutation.mutate(ids, {
      onSuccess: () => {
        toast.success(`${ids.length}명이 제외되었습니다.`);
        setSelectedMemberIds(new Set());
      },
      onError: () => toast.error("제외 처리 중 오류가 발생했습니다."),
    });
  }, [selectedMemberIds, excludeMutation]);

  // 뽑기 요청하기 (알림 전송)
  const handleSendLotteryRequest = useCallback(async () => {
    if (selectedMemberIds.size === 0) return;

    try {
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberIds: Array.from(selectedMemberIds),
          title: "점심조 뽑기",
          body: "점심조 뽑기가 시작되었습니다! 앱에서 참여하세요.",
          url: "/lunch",
          tag: "lunch-lottery",
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "뽑기 요청 전송에 실패했습니다.");
        return;
      }

      const { summary } = result;
      toast.success(
        `${summary.total}명에게 뽑기 요청을 전송했습니다. (성공: ${summary.success}, 실패: ${summary.failed})`,
      );
      setSelectedMemberIds(new Set());
    } catch {
      toast.error("뽑기 요청 전송 중 오류가 발생했습니다.");
    }
  }, [selectedMemberIds]);

  // 제외 인원 복원 mutation
  const restoreMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await fetch(
        `/api/lunch-groups/excluded-members?memberId=${memberId}&weekStartDate=${weekStartDate}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("Failed to restore member");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lunchGroups.excludedMembers(weekStartDate),
      });
    },
  });

  const handleRestoreMember = useCallback(
    (memberId: string) => {
      restoreMutation.mutate(memberId, {
        onSuccess: () => toast.success("제외가 해제되었습니다."),
        onError: () => toast.error("복원 처리 중 오류가 발생했습니다."),
      });
    },
    [restoreMutation],
  );

  // 드래그 시작
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  }, []);

  // 드래그 종료
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = event;

      if (!over) return;

      const overId = over.id as string;

      // 빈 자리 이동: 출발 조의 정원 1칸을 도착 조로 넘긴다
      const slotData = active.data.current;
      if (slotData?.type === "slot") {
        if (!overId.startsWith("group-")) return;

        const sourceNumber = slotData.groupNumber as number;
        const targetNumber = parseInt(overId.replace("group-", ""));
        if (sourceNumber === targetNumber) return;

        const sourceGroup = displayGroups.find(
          (g) => g.groupNumber === sourceNumber,
        );
        if (!sourceGroup) return;

        // 정원이 0인 조가 생기지 않도록 마지막 한 자리는 남긴다
        if (sourceGroup.maxSlots <= 1) {
          toast.error(
            "조에는 최소 1자리가 필요합니다. 조 개수는 배정 설정에서 바꿔주세요.",
          );
          return;
        }

        const newGroups = displayGroups.map((g) =>
          g.groupNumber === sourceNumber
            ? { ...g, maxSlots: g.maxSlots - 1 }
            : g.groupNumber === targetNumber
              ? { ...g, maxSlots: g.maxSlots + 1 }
              : g,
        );
        autoSaveGroups(
          newGroups,
          `${sourceNumber}조의 빈 자리를 ${targetNumber}조로 옮겼습니다.`,
        );
        return;
      }

      const memberId = active.id as string;
      const memberName =
        members.find((m) => m.id === memberId)?.full_name ?? "";
      const wasAssigned = displayGroups.some((g) =>
        g.memberIds.includes(memberId),
      );

      // 참여인원 목록으로 드롭 (조에서 제거)
      if (overId === "unassigned") {
        if (!wasAssigned) return;
        const newGroups = displayGroups.map((g) => ({
          ...g,
          memberIds: g.memberIds.filter((id) => id !== memberId),
        }));
        autoSaveGroups(newGroups, `${memberName}님이 조에서 제외되었습니다.`);
        return;
      }

      // 조에 드롭
      if (overId.startsWith("group-")) {
        const groupNumber = parseInt(overId.replace("group-", ""));
        const targetGroup = displayGroups.find(
          (g) => g.groupNumber === groupNumber,
        );

        if (!targetGroup) return;

        // 이미 해당 조에 있으면 무시
        if (targetGroup.memberIds.includes(memberId)) return;

        // 조가 가득 찼으면 무시
        if (targetGroup.memberIds.length >= targetGroup.maxSlots) {
          toast.error(`${groupNumber}조가 가득 찼습니다.`);
          return;
        }

        // 다른 조에서 제거하고 새 조에 추가 (아직 저장 전이면 이 시점에 조가 생성된다)
        const newGroups = displayGroups.map((g) => {
          if (g.groupNumber === groupNumber) {
            return {
              ...g,
              memberIds: [
                ...g.memberIds.filter((id) => id !== memberId),
                memberId,
              ],
            };
          }
          return {
            ...g,
            memberIds: g.memberIds.filter((id) => id !== memberId),
          };
        });
        autoSaveGroups(
          newGroups,
          `${memberName}님이 ${groupNumber}조에 배정되었습니다.`,
        );
      }
    },
    [displayGroups, members, autoSaveGroups],
  );

  // 조에서 멤버 제거 (X 버튼)
  const handleRemoveFromGroup = useCallback(
    (groupNumber: number, memberId: string) => {
      const memberName =
        members.find((m) => m.id === memberId)?.full_name ?? "";
      const newGroups = groups.map((g) =>
        g.groupNumber === groupNumber
          ? { ...g, memberIds: g.memberIds.filter((id) => id !== memberId) }
          : g,
      );
      autoSaveGroups(
        newGroups,
        `${memberName}님이 ${groupNumber}조에서 제외되었습니다.`,
      );
    },
    [groups, members, autoSaveGroups],
  );

  // 드래그 중인 대상 (멤버 또는 조의 빈 자리)
  const isDraggingSlot = activeDragId?.startsWith("slot-") ?? false;
  const activeMember = activeDragId
    ? members.find((m) => m.id === activeDragId)
    : null;

  // 주 변경
  const handlePrevWeek = () =>
    setCurrentWeek((prev) => prev.subtract(1, "week"));
  const handleNextWeek = () => setCurrentWeek((prev) => prev.add(1, "week"));

  // 버튼 활성화 여부
  const hasSelectedMembers = selectedMemberIds.size > 0;

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevWeek}
              className="bg-[#135bec]/5 text-[#135bec] border-[#135bec]/20 hover:bg-[#135bec]/10 hover:border-[#135bec]/30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 py-2 bg-[#135bec]/5 rounded-md text-sm font-medium text-[#135bec]">
              {dayjs(weekStartDate).format("YYYY.MM.DD")} 주차
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextWeek}
              className="bg-[#135bec]/5 text-[#135bec] border-[#135bec]/20 hover:bg-[#135bec]/10 hover:border-[#135bec]/30"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* 왼쪽: 설정 & 인원 목록 */}
          <div className="col-span-5 space-y-4">
            {/* 설정 카드 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  배정 설정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">조당 최대 인원</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={maxInput}
                      onChange={(e) => setMaxInput(e.target.value)}
                      onBlur={handleSettingsBlur}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">조당 최소 인원</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={minInput}
                      onChange={(e) => setMinInput(e.target.value)}
                      onBlur={handleSettingsBlur}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">총 조 개수 (자동)</Label>
                    <div className="mt-1 h-10 flex items-center px-3 bg-slate-100 rounded text-sm font-medium">
                      {plan.totalGroups}개
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  {availableMembers.length}명을 조당 {minPerGroup}~{maxPerGroup}
                  명으로 나누면 {plan.totalGroups}개 조
                  {plan.slots.length > 0 && ` (${plan.slots.join(" · ")}명)`}
                  {settingsMutation.isPending && " · 설정 저장 중..."}
                </div>
                {plan.hasOverMax && (
                  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                    최소 {minPerGroup}명을 지키려면 조를 줄여야 해서 최대{" "}
                    {maxPerGroup}명을 넘는 조가 생깁니다.
                  </div>
                )}
                {plan.hasUnderMin && (
                  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                    참여 인원이 {minPerGroup}명보다 적어 최소 인원을 채울 수
                    없습니다.
                  </div>
                )}
                {assignedMemberIds.size > 0 ? (
                  // 이미 배정된 인원이 있으면 되돌릴 수 없으므로 한 번 확인받는다
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        className="w-full bg-[#135bec]/5 text-[#135bec] hover:bg-[#135bec]/10"
                        disabled={plan.totalGroups === 0}
                      >
                        <Table className="w-4 h-4 mr-2" />조 테이블 다시 생성
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>조 테이블 다시 생성</AlertDialogTitle>
                        <AlertDialogDescription>
                          현재 설정({minPerGroup}~{maxPerGroup}명)으로 조를 새로
                          만듭니다. 이미 배정된 {assignedMemberIds.size}명의
                          배정이 모두 해제됩니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCreateTable}>
                          다시 생성
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button
                    onClick={handleCreateTable}
                    className="w-full bg-[#135bec]/5 text-[#135bec] hover:bg-[#135bec]/10"
                    disabled={plan.totalGroups === 0}
                  >
                    <Table className="w-4 h-4 mr-2" />
                    {isTableCreated ? "조 테이블 다시 생성" : "조 테이블 생성"}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* 인원 목록 카드 */}
            <Card className="glass-panel">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    참여 인원
                  </CardTitle>
                  <span className="text-xs text-slate-500">
                    {unassignedMembers.length}명 미배정 /{" "}
                    {availableMembers.length}명
                  </span>
                </div>
                <CardDescription>
                  인원을 오른쪽 조로 드래그하여 배정하세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* 액션 버튼 */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExcludeMembers}
                    disabled={!hasSelectedMembers}
                    className="flex-1 bg-[#135bec]/5 text-[#135bec] border-[#135bec]/20 hover:bg-[#135bec]/10 hover:border-[#135bec]/30"
                  >
                    <UserMinus className="w-4 h-4 mr-1" />
                    인원 제외하기
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSendLotteryRequest}
                    disabled={!hasSelectedMembers}
                    className="flex-1 bg-[#135bec]/5 text-[#135bec] hover:bg-[#135bec]/10"
                  >
                    <Send className="w-4 h-4 mr-1" />
                    뽑기 요청하기
                  </Button>
                </div>

                {/* 멤버 선택 */}
                <SearchableDropdown<Member>
                  items={unassignedMembers}
                  value=""
                  getItemKey={(m) => m.id}
                  getItemLabel={(m) => m.full_name}
                  onSelect={(member) => toggleSelectMember(member.id)}
                  placeholder="멤버 검색..."
                  searchPlaceholder="이름 또는 초성 검색..."
                  emptyText="검색 결과가 없습니다"
                />

                {/* 전체 선택 */}
                <div className="flex items-center gap-2 py-2">
                  <Checkbox
                    checked={
                      selectedMemberIds.size === unassignedMembers.length &&
                      unassignedMembers.length > 0
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    전체 선택 (미배정)
                  </span>
                </div>

                {/* 인원 목록 - 드래그 가능 */}
                <DroppableUnassigned>
                  {unassignedMembers.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      모든 인원이 배정되었습니다.
                    </div>
                  ) : (
                    unassignedMembers.map((member) => (
                      <div key={member.id} className="mb-1">
                        <DraggableMemberInList
                          member={member}
                          isSelected={selectedMemberIds.has(member.id)}
                          onToggleSelect={() => toggleSelectMember(member.id)}
                        />
                      </div>
                    ))
                  )}
                </DroppableUnassigned>
              </CardContent>
            </Card>

            {/* 제외된 인원 */}
            {excludedMemberIds.size > 0 && (
              <Card className="glass-panel">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-slate-500">
                    제외된 인원 ({excludedMemberIds.size}명)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {members
                      .filter((m) => excludedMemberIds.has(m.id))
                      .map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-sm text-slate-500"
                        >
                          <span>{member.full_name}</span>
                          <button
                            onClick={() => handleRestoreMember(member.id)}
                            className="ml-1 text-slate-400 hover:text-slate-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 요일별 고정 스케줄 */}
            <FixedScheduleSection members={members} />
          </div>

          {/* 오른쪽: 조 테이블 */}
          <div className="col-span-7">
            <Card className="glass-panel">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">조 테이블</CardTitle>
                  <div className="flex items-center gap-2">
                    {saveMutation.isPending && (
                      <span className="text-xs text-slate-400">저장 중...</span>
                    )}
                    <TooltipProvider>
                      <Tooltip>
                        <AlertDialog>
                          <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 bg-red-50 text-red-500 border-red-200 hover:bg-red-100 hover:border-red-300"
                                disabled={
                                  !isTableCreated || resetMutation.isPending
                                }
                              >
                                <RotateCcw
                                  className={`h-4 w-4 ${resetMutation.isPending ? "animate-spin" : ""}`}
                                />
                              </Button>
                            </AlertDialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>조 테이블 초기화</p>
                          </TooltipContent>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                조 테이블 초기화
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {dayjs(weekStartDate).format("YYYY.MM.DD")}{" "}
                                주차의 모든 조 배정이 삭제됩니다. 이 작업은
                                되돌릴 수 없습니다.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>취소</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => resetMutation.mutate()}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                초기화
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </Tooltip>
                    </TooltipProvider>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 bg-[#135bec]/5 text-[#135bec] border-[#135bec]/20 hover:bg-[#135bec]/10 hover:border-[#135bec]/30"
                      disabled={isGroupsFetching}
                      onClick={() => {
                        queryClient.invalidateQueries({
                          queryKey: queryKeys.lunchGroups.byWeek(weekStartDate),
                        });
                      }}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${isGroupsFetching ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {isTableCreated
                    ? "유저들이 뽑기를 하면 해당 조에 자동으로 배정됩니다."
                    : "아직 저장 전인 미리보기입니다. 인원을 끌어다 놓으면 이 구성으로 저장됩니다."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {displayGroups.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-slate-400">
                    <div className="text-center">
                      <Table className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>참여 인원이 없어 만들 수 있는 조가 없습니다</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {displayGroups.map((group) => {
                      const assignedMembers = group.memberIds
                        .map((id) => members.find((m) => m.id === id))
                        .filter((m): m is Member => m !== undefined);
                      const emptySlots =
                        group.maxSlots - assignedMembers.length;
                      const slotNotice =
                        group.maxSlots > maxPerGroup
                          ? "최대 초과"
                          : group.maxSlots < minPerGroup
                            ? "최소 미달"
                            : null;

                      return (
                        <DroppableGroup
                          key={group.groupNumber}
                          groupNumber={group.groupNumber}
                          maxSlots={group.maxSlots}
                          memberCount={assignedMembers.length}
                          slotNotice={slotNotice}
                          isDraggingSlot={isDraggingSlot}
                        >
                          {/* 멤버 슬롯 */}
                          <div className="space-y-2">
                            {assignedMembers.map((member) => (
                              <DraggableMemberInGroup
                                key={member.id}
                                member={member}
                                onRemove={() =>
                                  handleRemoveFromGroup(
                                    group.groupNumber,
                                    member.id,
                                  )
                                }
                              />
                            ))}
                            {/* 빈 슬롯 - 다른 조로 끌어 옮길 수 있다 */}
                            {Array.from({ length: emptySlots }).map((_, i) => (
                              <DraggableEmptySlot
                                key={`empty-${i}`}
                                groupNumber={group.groupNumber}
                                index={i}
                              />
                            ))}
                          </div>
                        </DroppableGroup>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 드래그 오버레이 */}
      <DragOverlay>
        {activeMember && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-[#135bec] bg-[#135bec]/10 shadow-xl">
            <GripVertical className="w-3 h-3 text-[#135bec] flex-shrink-0" />
            <span className="text-sm font-medium text-[#135bec]">
              {activeMember.full_name}
            </span>
          </div>
        )}
        {isDraggingSlot && (
          <div className="px-3 py-2 rounded-md border-2 border-dashed border-[#135bec] bg-[#135bec]/10 text-xs text-center text-[#135bec] shadow-xl">
            빈 자리
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
