"use client";

import { useState, useMemo, useCallback } from "react";
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

function calculateLunchGroupPlan(totalMembers: number, maxPerGroup: number) {
  if (totalMembers === 0 || maxPerGroup <= 0) {
    return {
      baseGroups: 0,
      totalGroups: 0,
      remainder: 0,
      shouldDistributeSingleRemainder: false,
    };
  }

  const baseGroups = Math.floor(totalMembers / maxPerGroup);
  const remainder = totalMembers % maxPerGroup;
  const shouldDistributeSingleRemainder = baseGroups > 0 && remainder === 1;
  const totalGroups =
    baseGroups + (remainder > 0 && !shouldDistributeSingleRemainder ? 1 : 0);

  return {
    baseGroups,
    totalGroups,
    remainder,
    shouldDistributeSingleRemainder,
  };
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
          ? "opacity-50 border-[#1d1d1f] bg-[#1d1d1f]/10 z-50"
          : isSelected
            ? "bg-[#1d1d1f]/10 border-[#1d1d1f]/40"
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
          ? "opacity-50 border-[#1d1d1f] bg-[#1d1d1f]/10 z-50"
          : "bg-[#1d1d1f]/5 border-[#1d1d1f]/20"
      }`}
    >
      {/* 드래그 핸들 */}
      <div
        className="p-1 -ml-1 cursor-grab active:cursor-grabbing rounded hover:bg-[#1d1d1f]/10"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="w-3 h-3 text-[#1d1d1f]/60" />
      </div>
      <span className="text-sm font-medium flex-1 text-[#1d1d1f]">
        {member.full_name}
      </span>
      {/* X 버튼 - 클릭으로 제거 */}
      <button
        onClick={onRemove}
        className="p-0.5 rounded hover:bg-[#1d1d1f]/10 text-[#1d1d1f]/60 hover:text-[#1d1d1f]"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// 드롭 가능한 조 영역
function DroppableGroup({
  groupNumber,
  maxSlots,
  children,
  memberCount,
  isRemainderGroup,
}: {
  groupNumber: number;
  maxSlots: number;
  children: React.ReactNode;
  memberCount: number;
  isRemainderGroup: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `group-${groupNumber}`,
    data: { groupNumber, maxSlots },
  });

  const isFull = memberCount >= maxSlots;

  return (
    <div
      ref={setNodeRef}
      className={`p-4 rounded-lg border-2 bg-white min-h-[180px] transition-all ${
        isOver && !isFull
          ? "border-[#1d1d1f] bg-[#1d1d1f]/5 scale-[1.02]"
          : isOver && isFull
            ? "border-slate-300 bg-slate-50/50"
            : "border-slate-200"
      }`}
    >
      {/* 조 번호 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 flex items-center justify-center text-[#1d1d1f] text-sm font-bold rounded-md bg-[#1d1d1f]/5">
            {groupNumber}
          </span>
          <span className="text-sm font-medium text-slate-600">조</span>
          {isRemainderGroup && (
            <span className="text-[10px] px-1.5 py-0.5 bg-[#1d1d1f]/5 text-[#1d1d1f] rounded font-medium">
              추가
            </span>
          )}
        </div>
        <span
          className={`text-xs ${isFull ? "text-[#1d1d1f] font-medium" : "text-slate-400"}`}
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
        isOver ? "bg-[#1d1d1f]/10 ring-2 ring-[#1d1d1f]/40" : ""
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
  const [maxPerGroup, setMaxPerGroup] = useState(4);
  const [isTableCreated, setIsTableCreated] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

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
  useMemo(() => {
    if (settings) {
      setMaxPerGroup(settings.max_members_per_group);
    }
  }, [settings]);

  // 기존 배정 로드
  useMemo(() => {
    if (existingGroups && existingGroups.length > 0) {
      const loadedGroups = existingGroups.map((g) => ({
        groupNumber: g.group_number,
        memberIds: g.members.map((m) => m.user_id),
        maxSlots: g.max_slots || maxPerGroup, // DB에 저장된 값 또는 기본값
      }));
      setGroups(loadedGroups);
      setIsTableCreated(true);
    } else {
      setGroups([]);
      setIsTableCreated(false);
    }
  }, [existingGroups, maxPerGroup]);

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
      setIsTableCreated(false);
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

  // 총 조 개수 및 나머지 계산
  const {
    baseGroups,
    totalGroups,
    remainder,
    shouldDistributeSingleRemainder,
  } = useMemo(
    () => calculateLunchGroupPlan(availableMembers.length, maxPerGroup),
    [availableMembers.length, maxPerGroup],
  );

  // 조 테이블 생성 (나머지 1명은 기존 조에 흡수, 그 외 나머지는 추가 조로 생성)
  const handleCreateTable = useCallback(() => {
    if (totalGroups === 0) {
      toast.error("생성할 조가 없습니다.");
      return;
    }

    const groupNumberWithSingleRemainder = shouldDistributeSingleRemainder
      ? Math.floor(Math.random() * totalGroups) + 1
      : null;

    const newGroups: GroupState[] = Array.from(
      { length: totalGroups },
      (_, i) => ({
        groupNumber: i + 1,
        memberIds: [],
        maxSlots:
          groupNumberWithSingleRemainder === i + 1
            ? maxPerGroup + 1
            : remainder > 0 &&
                !shouldDistributeSingleRemainder &&
                i === totalGroups - 1
              ? remainder
              : maxPerGroup,
      }),
    );

    setIsTableCreated(true);

    const successMsg = shouldDistributeSingleRemainder
      ? `${totalGroups}개 조 생성 (1개 조는 ${maxPerGroup + 1}명)`
      : remainder > 0
        ? `${baseGroups}개 기본 조 + 나머지 ${remainder}명 조 1개 생성 (총 ${totalGroups}개 조)`
        : `${totalGroups}개 조 테이블이 생성되었습니다.`;

    autoSaveGroups(newGroups, successMsg);
  }, [
    baseGroups,
    totalGroups,
    maxPerGroup,
    remainder,
    shouldDistributeSingleRemainder,
    autoSaveGroups,
  ]);

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

      const memberId = active.id as string;
      const overId = over.id as string;
      const memberName =
        members.find((m) => m.id === memberId)?.full_name ?? "";
      const wasAssigned = groups.some((g) => g.memberIds.includes(memberId));

      // 참여인원 목록으로 드롭 (조에서 제거)
      if (overId === "unassigned") {
        if (!wasAssigned) return;
        const newGroups = groups.map((g) => ({
          ...g,
          memberIds: g.memberIds.filter((id) => id !== memberId),
        }));
        autoSaveGroups(newGroups, `${memberName}님이 조에서 제외되었습니다.`);
        return;
      }

      // 조에 드롭
      if (overId.startsWith("group-")) {
        const groupNumber = parseInt(overId.replace("group-", ""));
        const targetGroup = groups.find((g) => g.groupNumber === groupNumber);

        if (!targetGroup) return;

        // 이미 해당 조에 있으면 무시
        if (targetGroup.memberIds.includes(memberId)) return;

        // 조가 가득 찼으면 무시
        if (targetGroup.memberIds.length >= targetGroup.maxSlots) {
          toast.error(`${groupNumber}조가 가득 찼습니다.`);
          return;
        }

        // 다른 조에서 제거하고 새 조에 추가
        const newGroups = groups.map((g) => {
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
    [groups, members, autoSaveGroups],
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

  // 드래그 중인 멤버
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
              className="bg-[#1d1d1f]/5 text-[#1d1d1f] border-[#1d1d1f]/20 hover:bg-[#1d1d1f]/10 hover:border-[#1d1d1f]/30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 py-2 bg-[#1d1d1f]/5 rounded-md text-sm font-medium text-[#1d1d1f]">
              {dayjs(weekStartDate).format("YYYY.MM.DD")} 주차
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextWeek}
              className="bg-[#1d1d1f]/5 text-[#1d1d1f] border-[#1d1d1f]/20 hover:bg-[#1d1d1f]/10 hover:border-[#1d1d1f]/30"
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">조당 최대 인원</Label>
                    <Input
                      type="number"
                      min={2}
                      max={10}
                      value={maxPerGroup}
                      onChange={(e) =>
                        setMaxPerGroup(parseInt(e.target.value) || 4)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">총 조 개수 (자동 계산)</Label>
                    <div className="mt-1 h-10 flex items-center px-3 bg-slate-100 rounded text-sm font-medium">
                      {totalGroups}개
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  {availableMembers.length}명 ÷ {maxPerGroup}명 = {baseGroups}개
                  조
                  {shouldDistributeSingleRemainder
                    ? ` + 나머지 1명은 랜덤 1개 조에 배정 (총 ${totalGroups}개 조)`
                    : remainder > 0 &&
                      ` + 나머지 ${remainder}명 조 1개 (총 ${totalGroups}개 조)`}
                </div>
                <Button
                  onClick={handleCreateTable}
                  className="w-full bg-[#1d1d1f]/5 text-[#1d1d1f] hover:bg-[#1d1d1f]/10"
                  disabled={totalGroups === 0}
                >
                  <Table className="w-4 h-4 mr-2" />조 테이블 생성
                </Button>
              </CardContent>
            </Card>

            {/* 인원 목록 카드 */}
            <Card className="admin-card">
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
                  {isTableCreated
                    ? "인원을 드래그하여 조에 배정하세요."
                    : "먼저 조 테이블을 생성하세요."}
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
                    className="flex-1 bg-[#1d1d1f]/5 text-[#1d1d1f] border-[#1d1d1f]/20 hover:bg-[#1d1d1f]/10 hover:border-[#1d1d1f]/30"
                  >
                    <UserMinus className="w-4 h-4 mr-1" />
                    인원 제외하기
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSendLotteryRequest}
                    disabled={!hasSelectedMembers}
                    className="flex-1 bg-[#1d1d1f]/5 text-[#1d1d1f] hover:bg-[#1d1d1f]/10"
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
                      {isTableCreated
                        ? "모든 인원이 배정되었습니다."
                        : "조 테이블을 먼저 생성하세요."}
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
              <Card className="admin-card">
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
            <Card className="admin-card">
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
                                className="h-8 w-8 bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
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
                                className="bg-slate-500 hover:bg-slate-600"
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
                      className="h-8 w-8 bg-[#1d1d1f]/5 text-[#1d1d1f] border-[#1d1d1f]/20 hover:bg-[#1d1d1f]/10 hover:border-[#1d1d1f]/30"
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
                  유저들이 뽑기를 하면 해당 조에 자동으로 배정됩니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isTableCreated ? (
                  <div className="flex items-center justify-center h-64 text-slate-400">
                    <div className="text-center">
                      <Table className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>조 테이블 생성 버튼을 눌러 테이블을 만드세요</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {groups.map((group) => {
                      const assignedMembers = group.memberIds
                        .map((id) => members.find((m) => m.id === id))
                        .filter((m): m is Member => m !== undefined);
                      const emptySlots =
                        group.maxSlots - assignedMembers.length;
                      const isRemainderGroup = group.maxSlots !== maxPerGroup;

                      return (
                        <DroppableGroup
                          key={group.groupNumber}
                          groupNumber={group.groupNumber}
                          maxSlots={group.maxSlots}
                          memberCount={assignedMembers.length}
                          isRemainderGroup={isRemainderGroup}
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
                            {/* 빈 슬롯 */}
                            {Array.from({ length: emptySlots }).map((_, i) => (
                              <div
                                key={`empty-${i}`}
                                className="px-3 py-2 border-2 border-dashed border-slate-200 rounded-md text-sm text-slate-400 text-center"
                              >
                                드래그하여 배정
                              </div>
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
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-[#1d1d1f] bg-[#1d1d1f]/10">
            <GripVertical className="w-3 h-3 text-[#1d1d1f] flex-shrink-0" />
            <span className="text-sm font-medium text-[#1d1d1f]">
              {activeMember.full_name}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
