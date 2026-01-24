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
import { toast } from "sonner";
import {
  Save,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  UserMinus,
  Send,
  Table,
  GripVertical,
  X,
} from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import type { Member, LunchGroupSettings, LunchGroupWithMembers } from "@/lib/supabase/types";

// 월요일 기준으로 주 시작일 계산
const getWeekStartDate = (date: dayjs.Dayjs) => {
  const day = date.day();
  const diff = day === 0 ? -6 : 1 - day;
  return date.add(diff, "day").format("YYYY-MM-DD");
};

interface GroupState {
  groupNumber: number;
  memberIds: string[];
  maxSlots: number; // 해당 조의 최대 인원 (기본 또는 +1)
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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
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
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
        isDragging
          ? "opacity-50 border-blue-400 bg-blue-50 shadow-lg z-50"
          : isSelected
            ? "bg-blue-50 border-blue-300"
            : "bg-white border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* 드래그 핸들 - 이 부분만 드래그 가능 */}
      <div
        className="p-1 -ml-1 cursor-grab active:cursor-grabbing rounded hover:bg-gray-100"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="w-3 h-3 text-gray-400" />
      </div>
      {/* 체크박스 - 클릭으로 선택 */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggleSelect}
        onClick={(e) => e.stopPropagation()}
      />
      {/* 이름 - 클릭으로 선택 */}
      <span
        className="text-sm font-medium flex-1 text-gray-700 cursor-pointer"
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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
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
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
        isDragging
          ? "opacity-50 border-blue-400 bg-blue-50 shadow-lg z-50"
          : "bg-emerald-50 border-emerald-200"
      }`}
    >
      {/* 드래그 핸들 */}
      <div
        className="p-1 -ml-1 cursor-grab active:cursor-grabbing rounded hover:bg-emerald-100"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="w-3 h-3 text-emerald-400" />
      </div>
      <span className="text-sm font-medium flex-1 text-emerald-700">
        {member.full_name}
      </span>
      {/* X 버튼 - 클릭으로 제거 */}
      <button
        onClick={onRemove}
        className="p-0.5 rounded hover:bg-emerald-200 text-emerald-500 hover:text-emerald-700"
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
  isExtraGroup,
}: {
  groupNumber: number;
  maxSlots: number;
  children: React.ReactNode;
  memberCount: number;
  isExtraGroup: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `group-${groupNumber}`,
    data: { groupNumber, maxSlots },
  });

  const isFull = memberCount >= maxSlots;

  return (
    <div
      ref={setNodeRef}
      className={`p-4 rounded-xl border-2 bg-white min-h-[180px] transition-all ${
        isOver && !isFull
          ? "border-blue-400 bg-blue-50/50 scale-[1.02]"
          : isOver && isFull
            ? "border-red-300 bg-red-50/50"
            : isExtraGroup
              ? "border-amber-300"
              : "border-gray-200"
      }`}
    >
      {/* 조 번호 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`w-7 h-7 flex items-center justify-center text-white text-sm font-bold rounded-lg ${
              isExtraGroup ? "bg-amber-500" : "bg-gray-900"
            }`}
          >
            {groupNumber}
          </span>
          <span className="text-sm font-medium text-gray-600">조</span>
          {isExtraGroup && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded font-medium">
              +1
            </span>
          )}
        </div>
        <span className={`text-xs ${isFull ? "text-emerald-500 font-medium" : "text-gray-400"}`}>
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
      className={`space-y-1 max-h-[300px] overflow-y-auto p-1 rounded-lg transition-all ${
        isOver ? "bg-blue-50 ring-2 ring-blue-300" : ""
      }`}
    >
      {children}
    </div>
  );
}

export default function LunchGroupsPage() {
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState(dayjs());
  const [excludedMemberIds, setExcludedMemberIds] = useState<Set<string>>(new Set());
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [groups, setGroups] = useState<GroupState[]>([]);
  const [maxPerGroup, setMaxPerGroup] = useState(4);
  const [isTableCreated, setIsTableCreated] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const weekStartDate = getWeekStartDate(currentWeek);

  // 멤버 목록 조회
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: queryKeys.members.all,
    queryFn: async () => {
      const response = await fetch("/api/members");
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
  const { data: existingGroups } = useQuery<LunchGroupWithMembers[]>({
    queryKey: queryKeys.lunchGroups.byWeek(weekStartDate),
    queryFn: async () => {
      const response = await fetch(`/api/lunch-groups?weekStartDate=${weekStartDate}`);
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
    mutationFn: async (data: { weekStartDate: string; groups: GroupState[] }) => {
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
      toast.success("점심조가 저장되었습니다.");
    },
    onError: () => {
      toast.error("저장 중 오류가 발생했습니다.");
    },
  });

  // 참여 가능 인원 (제외 인원 빼기)
  const availableMembers = useMemo(() => {
    return members.filter((m) => !excludedMemberIds.has(m.id));
  }, [members, excludedMemberIds]);

  // 총 조 개수 및 나머지 계산
  const { totalGroups, remainder } = useMemo(() => {
    if (availableMembers.length === 0 || maxPerGroup <= 0) {
      return { totalGroups: 0, remainder: 0 };
    }
    // 31 ÷ 4 = 7 나머지 3 → 7개 조, 3개 조는 +1명
    const groups = Math.ceil(availableMembers.length / (maxPerGroup + 1));
    const baseSlots = groups * maxPerGroup;
    const rem = availableMembers.length - baseSlots;
    return { totalGroups: groups, remainder: rem > 0 ? rem : 0 };
  }, [availableMembers.length, maxPerGroup]);

  // 조 테이블 생성 (빈 조만 생성, 나머지 인원은 랜덤 조에 +1 슬롯)
  const handleCreateTable = useCallback(() => {
    if (totalGroups === 0) {
      toast.error("생성할 조가 없습니다.");
      return;
    }

    // 나머지 인원을 받을 조를 랜덤하게 선택
    const groupNumbers: number[] = Array.from({ length: totalGroups }, (_, i) => i + 1);
    // Fisher-Yates shuffle
    for (let i = groupNumbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = groupNumbers[i]!;
      groupNumbers[i] = groupNumbers[j]!;
      groupNumbers[j] = temp;
    }
    const groupsWithExtra = new Set(groupNumbers.slice(0, remainder));

    const newGroups: GroupState[] = Array.from({ length: totalGroups }, (_, i) => ({
      groupNumber: i + 1,
      memberIds: [],
      maxSlots: groupsWithExtra.has(i + 1) ? maxPerGroup + 1 : maxPerGroup,
    }));

    setGroups(newGroups);
    setIsTableCreated(true);

    if (remainder > 0) {
      toast.success(`${totalGroups}개 조 생성 (${remainder}개 조는 ${maxPerGroup + 1}명)`);
    } else {
      toast.success(`${totalGroups}개 조 테이블이 생성되었습니다.`);
    }
  }, [totalGroups, maxPerGroup, remainder]);

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

  // 인원 제외하기
  const handleExcludeMembers = useCallback(() => {
    setExcludedMemberIds((prev) => {
      const next = new Set(prev);
      selectedMemberIds.forEach((id) => next.add(id));
      return next;
    });
    setSelectedMemberIds(new Set());
    toast.success(`${selectedMemberIds.size}명이 제외되었습니다.`);
  }, [selectedMemberIds]);

  // 뽑기 요청하기 (알림 전송 - 실제 구현은 추후)
  const handleSendLotteryRequest = useCallback(() => {
    toast.success(`${selectedMemberIds.size}명에게 뽑기 요청을 전송했습니다.`);
    setSelectedMemberIds(new Set());
  }, [selectedMemberIds]);

  // 제외 인원 복원
  const handleRestoreMember = useCallback((memberId: string) => {
    setExcludedMemberIds((prev) => {
      const next = new Set(prev);
      next.delete(memberId);
      return next;
    });
  }, []);

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

      // 참여인원 목록으로 드롭 (조에서 제거)
      if (overId === "unassigned") {
        setGroups((prev) =>
          prev.map((g) => ({
            ...g,
            memberIds: g.memberIds.filter((id) => id !== memberId),
          }))
        );
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
        setGroups((prev) =>
          prev.map((g) => {
            if (g.groupNumber === groupNumber) {
              return {
                ...g,
                memberIds: [...g.memberIds.filter((id) => id !== memberId), memberId],
              };
            }
            return {
              ...g,
              memberIds: g.memberIds.filter((id) => id !== memberId),
            };
          })
        );
      }
    },
    [groups]
  );

  // 조에서 멤버 제거
  const handleRemoveFromGroup = useCallback((groupNumber: number, memberId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.groupNumber === groupNumber
          ? { ...g, memberIds: g.memberIds.filter((id) => id !== memberId) }
          : g
      )
    );
  }, []);

  // 저장
  const handleSave = () => {
    saveMutation.mutate({ weekStartDate, groups });
  };

  // 드래그 중인 멤버
  const activeMember = activeDragId ? members.find((m) => m.id === activeDragId) : null;

  // 주 변경
  const handlePrevWeek = () => setCurrentWeek((prev) => prev.subtract(1, "week"));
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
          <div>
            <h1 className="text-2xl font-bold">점심조 관리</h1>
            <p className="text-gray-500 text-sm mt-1">
              조 테이블을 생성하고, 인원을 드래그하여 조에 배정할 수 있습니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium">
              {dayjs(weekStartDate).format("YYYY.MM.DD")} 주차
            </div>
            <Button variant="outline" size="icon" onClick={handleNextWeek}>
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
                    onChange={(e) => setMaxPerGroup(parseInt(e.target.value) || 4)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">총 조 개수 (자동 계산)</Label>
                  <div className="mt-1 h-10 flex items-center px-3 bg-gray-100 rounded-md text-sm font-medium">
                    {totalGroups}개
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {availableMembers.length}명 ÷ {maxPerGroup}명 = {totalGroups}조
                {remainder > 0 && ` (나머지 ${remainder}명 → ${remainder}개 조에 +1)`}
              </div>
              <Button onClick={handleCreateTable} className="w-full" disabled={totalGroups === 0}>
                <Table className="w-4 h-4 mr-2" />
                조 테이블 생성
              </Button>
            </CardContent>
          </Card>

          {/* 인원 목록 카드 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  참여 인원
                </CardTitle>
                <span className="text-xs text-gray-500">
                  {unassignedMembers.length}명 미배정 / {availableMembers.length}명
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
                  className="flex-1"
                >
                  <UserMinus className="w-4 h-4 mr-1" />
                  인원 제외하기
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendLotteryRequest}
                  disabled={!hasSelectedMembers}
                  className="flex-1"
                >
                  <Send className="w-4 h-4 mr-1" />
                  뽑기 요청하기
                </Button>
              </div>

              {/* 전체 선택 */}
              <div className="flex items-center gap-2 py-2 border-b">
                <Checkbox
                  checked={selectedMemberIds.size === unassignedMembers.length && unassignedMembers.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm font-medium">전체 선택 (미배정)</span>
              </div>

              {/* 인원 목록 - 드래그 가능 */}
              <DroppableUnassigned>
                {unassignedMembers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    {isTableCreated ? "모든 인원이 배정되었습니다." : "조 테이블을 먼저 생성하세요."}
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
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-gray-500">
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
                        className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm text-gray-500"
                      >
                        <span>{member.full_name}</span>
                        <button
                          onClick={() => handleRestoreMember(member.id)}
                          className="ml-1 text-gray-400 hover:text-gray-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 오른쪽: 조 테이블 */}
        <div className="col-span-7">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">조 테이블</CardTitle>
                {isTableCreated && (
                  <Button onClick={handleSave} disabled={saveMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    {saveMutation.isPending ? "저장 중..." : "저장"}
                  </Button>
                )}
              </div>
              <CardDescription>
                유저들이 뽑기를 하면 해당 조에 자동으로 배정됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isTableCreated ? (
                <div className="flex items-center justify-center h-64 text-gray-400">
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
                    const emptySlots = group.maxSlots - assignedMembers.length;
                    const isExtraGroup = group.maxSlots > maxPerGroup;

                    return (
                      <DroppableGroup
                        key={group.groupNumber}
                        groupNumber={group.groupNumber}
                        maxSlots={group.maxSlots}
                        memberCount={assignedMembers.length}
                        isExtraGroup={isExtraGroup}
                      >
                        {/* 멤버 슬롯 */}
                        <div className="space-y-2">
                          {assignedMembers.map((member) => (
                            <DraggableMemberInGroup
                              key={member.id}
                              member={member}
                              onRemove={() => handleRemoveFromGroup(group.groupNumber, member.id)}
                            />
                          ))}
                          {/* 빈 슬롯 */}
                          {Array.from({ length: emptySlots }).map((_, i) => (
                            <div
                              key={`empty-${i}`}
                              className="px-3 py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 text-center"
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
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-400 bg-blue-50 shadow-xl">
            <GripVertical className="w-3 h-3 text-blue-400 flex-shrink-0" />
            <span className="text-sm font-medium text-blue-700">{activeMember.full_name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
