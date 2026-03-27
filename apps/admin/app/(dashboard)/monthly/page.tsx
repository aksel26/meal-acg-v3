"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { cn } from "@repo/ui/lib/utils";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/src/alert-dialog";
import { SearchableDropdown } from "@repo/ui/src/searchable-dropdown";
import { toast } from "@repo/ui/src/sonner";
import {
  ChevronLeft,
  Settings,
  Coffee,
  Plus,
  X,
  Trash2,
  ArrowLeft,
  ToggleLeft,
  ToggleRight,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { useActiveStatusMembers } from "@/hooks/useActiveStatusMembers";
import type { Member } from "@/lib/supabase/types";
import { STATUS_COLORS } from "@/lib/constants";

interface CollectionWithStats {
  id: string;
  title: string;
  year: number;
  month: number | null;
  is_active: boolean;
  is_one_time: boolean;
  drink_options: string[];
  pickup_persons: string[];
  created_at: string;
  updated_at: string;
  applicationCount: number;
  totalMembers: number;
}

interface CollectionDetail {
  collection: CollectionWithStats;
  applications: {
    id: string;
    userId: string;
    name: string;
    drink: string;
    memo: string;
  }[];
  drinkOptions: string[];
  pickupPersons: string[];
  totalMembers: number;
}

const DEFAULT_DRINKS = [
  "HOT 아메리카노",
  "ICE 아메리카노",
  "HOT 디카페인 아메리카노",
  "ICE 디카페인 아메리카노",
  "바닐라크림 콜드브루",
  "ICE 자몽허니블랙티",
  "기타",
  "선택안함",
];

// ─── 취합 건 리스트 (1단계) ───────────────────────────────────
function CollectionListView({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CollectionWithStats | null>(
    null
  );
  const [newTitle, setNewTitle] = useState("");
  const [newYear, setNewYear] = useState(dayjs().year());
  const [newMonth, setNewMonth] = useState(dayjs().month() + 1);
  const [newIsOneTime, setNewIsOneTime] = useState(false);

  const { data: collections, isLoading } = useQuery<CollectionWithStats[]>({
    queryKey: queryKeys.monthly.collections,
    queryFn: async () => {
      const res = await fetch("/api/monthly/collections");
      if (!res.ok) throw new Error("Failed to fetch");
      const result = await res.json();
      return result.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      year: number;
      month: number | null;
      is_one_time: boolean;
    }) => {
      const res = await fetch("/api/monthly/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.monthly.collections,
      });
      toast.success("취합 건이 생성되었습니다.");
      setIsCreateOpen(false);
      resetCreateForm();
    },
    onError: () => toast.error("생성 중 오류가 발생했습니다."),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string;
      is_active: boolean;
    }) => {
      const res = await fetch(`/api/monthly/collections/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.monthly.collections,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/monthly/collections/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.monthly.collections,
      });
      toast.success("삭제되었습니다.");
    },
    onError: () => toast.error("삭제 중 오류가 발생했습니다."),
  });

  const resetCreateForm = () => {
    setNewTitle("");
    setNewYear(dayjs().year());
    setNewMonth(dayjs().month() + 1);
    setNewIsOneTime(false);
  };

  const handleCreate = () => {
    if (!newTitle.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }
    createMutation.mutate({
      title: newTitle.trim(),
      year: newYear,
      month: newIsOneTime ? null : newMonth,
      is_one_time: newIsOneTime,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">음료 취합</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            취합 건을 관리하고 신청 현황을 확인합니다
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="gap-1.5"
          size="sm"
        >
          <Plus className="h-4 w-4" />새 취합 건
        </Button>
      </div>

      {/* Collections Grid */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-36 rounded-lg bg-slate-100 animate-pulse"
            />
          ))}
        </div>
      ) : !collections?.length ? (
        <Card className="glass-panel">
          <CardContent className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Coffee className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">아직 취합 건이 없습니다</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setIsCreateOpen(true)}
            >
              첫 취합 건 만들기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((col) => (
            <Card
              key={col.id}
              className={cn(
                "glass-panel cursor-pointer transition-all hover:ring-1 hover:ring-slate-300",
                !col.is_active && "opacity-50"
              )}
              onClick={() => onSelect(col.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-slate-800 truncate">
                      {col.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      {col.is_one_time ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                          <Sparkles className="h-3 w-3" />
                          일회성
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          <CalendarDays className="h-3 w-3" />
                          {col.year}년 {col.month}월
                        </span>
                      )}
                      <span
                        className={cn(
                          "text-[11px] px-1.5 py-0.5 rounded font-medium",
                          col.is_active
                            ? "text-emerald-700 bg-emerald-50"
                            : "text-slate-400 bg-slate-100"
                        )}
                      >
                        {col.is_active ? "활성" : "비활성"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMutation.mutate({
                          id: col.id,
                          is_active: !col.is_active,
                        });
                      }}
                      className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                      title={col.is_active ? "비활성화" : "활성화"}
                    >
                      {col.is_active ? (
                        <ToggleRight className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(col);
                      }}
                      className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {/* 신청 현황 */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-800 rounded-full transition-all"
                      style={{
                        width: `${col.totalMembers ? (col.applicationCount / col.totalMembers) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-slate-500 shrink-0">
                    {col.applicationCount}/{col.totalMembers}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 생성 다이얼로그 */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>새 취합 건</DialogTitle>
            <DialogDescription>
              음료 취합 건을 생성합니다
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm mb-1.5 block">제목</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="예: 4월 음료 취합"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIsOneTime}
                  onChange={(e) => setNewIsOneTime(e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-600">일회성</span>
              </label>
            </div>
            {!newIsOneTime && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-sm mb-1.5 block">년도</Label>
                  <Input
                    type="number"
                    value={newYear}
                    onChange={(e) => setNewYear(parseInt(e.target.value))}
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-sm mb-1.5 block">월</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={newMonth}
                    onChange={(e) => setNewMonth(parseInt(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "생성 중..." : "생성"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>취합 건 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo;을(를) 삭제하시겠습니까?
              <br />
              연결된 신청 내역도 모두 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── 취합 건 상세 (2단계) ─────────────────────────────────────
function CollectionDetailView({
  collectionId,
  onBack,
}: {
  collectionId: string;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<
    CollectionDetail["applications"][0] | null
  >(null);
  const [selectedDrink, setSelectedDrink] = useState("");
  const [customDrink, setCustomDrink] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // 설정 편집용 state
  const [editDrinkOptions, setEditDrinkOptions] = useState<string[]>([]);
  const [editPickupPersons, setEditPickupPersons] = useState<string[]>([]);
  const [newDrinkOption, setNewDrinkOption] = useState("");

  const { data, isLoading } = useQuery<CollectionDetail>({
    queryKey: queryKeys.monthly.collection(collectionId),
    queryFn: async () => {
      const res = await fetch(`/api/monthly/collections/${collectionId}`);
      if (!res.ok) throw new Error("Failed");
      const result = await res.json();
      return result.data;
    },
  });

  const { data: members } = useQuery<Member[]>({
    queryKey: queryKeys.members.active,
    queryFn: async () => {
      const res = await fetch("/api/members?exclude_status=true");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: activeStatusMembers } = useActiveStatusMembers();
  const statusMap = useMemo(() => {
    const map = new Map<string, string>();
    activeStatusMembers?.forEach((m) => {
      if (m.member_id && m.current_status) {
        map.set(m.member_id, m.current_status);
      }
    });
    return map;
  }, [activeStatusMembers]);

  const updateDrinkMutation = useMutation({
    mutationFn: async (mutData: {
      userId: string;
      drink: string;
      collectionId: string;
      year: number;
      month: number;
    }) => {
      const res = await fetch("/api/monthly", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mutData),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.monthly.collection(collectionId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.monthly.collections,
      });
      toast.success("음료가 업데이트되었습니다.");
      setIsEditOpen(false);
      setEditingApp(null);
      setCustomDrink("");
    },
    onError: () => toast.error("업데이트 중 오류가 발생했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/monthly?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.monthly.collection(collectionId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.monthly.collections,
      });
      toast.success("삭제되었습니다.");
    },
    onError: () => toast.error("삭제 중 오류가 발생했습니다."),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (mutData: {
      drink_options: string[];
      pickup_persons: string[];
    }) => {
      const res = await fetch(`/api/monthly/collections/${collectionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mutData),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.monthly.collection(collectionId),
      });
      toast.success("설정이 저장되었습니다.");
      setIsSettingsOpen(false);
    },
    onError: () => toast.error("설정 저장 중 오류가 발생했습니다."),
  });

  const filteredApplications = useMemo(() => {
    if (!data?.applications) return [];
    if (!selectedUserId) return data.applications;
    return data.applications.filter((app) => app.userId === selectedUserId);
  }, [data?.applications, selectedUserId]);

  const availableMembersForPickup = useMemo(() => {
    if (!members) return [];
    return members.filter(
      (m) => !editPickupPersons.includes(m.full_name)
    );
  }, [members, editPickupPersons]);

  const drinkStats = useMemo(() => {
    if (!data?.applications) return {};
    const stats: Record<string, number> = {};
    data.applications.forEach((app) => {
      if (app.drink) {
        stats[app.drink] = (stats[app.drink] || 0) + 1;
      }
    });
    return stats;
  }, [data?.applications]);

  const completedCount =
    data?.applications.filter(
      (app) => app.drink && app.drink !== "선택안함"
    ).length || 0;

  const collection = data?.collection;

  const handleEditClick = (
    app: CollectionDetail["applications"][0]
  ) => {
    setEditingApp(app);
    setSelectedDrink(app.drink);
    setCustomDrink("");
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingApp || !collection) return;
    const drink =
      selectedDrink === "기타" ? customDrink.trim() || "기타" : selectedDrink;
    updateDrinkMutation.mutate({
      userId: editingApp.userId,
      drink,
      collectionId,
      year: collection.year,
      month: collection.month || new Date().getMonth() + 1,
    });
  };

  const handleOpenSettings = () => {
    setEditDrinkOptions(data?.drinkOptions || DEFAULT_DRINKS);
    setEditPickupPersons(data?.pickupPersons || []);
    setIsSettingsOpen(true);
  };

  const hasDrink = (drink: string) => drink && drink !== "선택안함";

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg bg-white py-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          목록
        </button>

        <div className="h-4 w-px bg-slate-200" />

        <span className="text-base font-semibold text-slate-800">
          {collection?.title || "..."}
        </span>

        {collection && !collection.is_one_time && (
          <>
            <div className="h-4 w-px bg-slate-200" />
            <span className="text-sm text-slate-500">
              {collection.year}년 {collection.month}월
            </span>
          </>
        )}

        <div className="h-4 w-px bg-slate-200" />

        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">신청</span>
          <span className="text-base font-semibold tabular-nums text-slate-800">
            {completedCount}
            <span className="text-sm font-normal text-slate-400">
              /{data?.applications.length || 0}명
            </span>
          </span>
        </div>

        {activeStatusMembers && activeStatusMembers.length > 0 && (
          <>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">특이사항</span>
              <span className="text-base font-semibold tabular-nums text-amber-600">
                {activeStatusMembers.length}
                <span className="text-sm font-normal">명</span>
              </span>
            </div>
          </>
        )}

        <div className="h-4 w-px bg-slate-200" />

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm text-slate-500 shrink-0">픽업</span>
          <span className="text-sm font-medium text-slate-800 truncate">
            {data?.pickupPersons?.length
              ? data.pickupPersons.join(", ")
              : "미지정"}
          </span>
        </div>

        <button
          onClick={handleOpenSettings}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          title="설정"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Drink Stats */}
      {Object.keys(drinkStats).length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-medium text-slate-400">
            음료별
          </span>
          {Object.entries(drinkStats)
            .sort(([, a], [, b]) => b - a)
            .map(([drink, count]) => (
              <div
                key={drink}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs"
              >
                <span className="text-slate-600">{drink}</span>
                <span className="font-semibold tabular-nums text-slate-800">
                  {count}
                </span>
              </div>
            ))}
          <div className="h-3 w-px bg-slate-200" />
          <span className="text-xs text-slate-400">
            합계{" "}
            <span className="font-semibold tabular-nums text-slate-700">
              {Object.values(drinkStats).reduce((a, b) => a + b, 0)}
            </span>
          </span>
        </div>
      )}

      {/* Applications List */}
      <Card className="glass-panel">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>신청 내역</CardTitle>
              <CardDescription>
                클릭하여 음료를 변경할 수 있습니다
              </CardDescription>
            </div>
            <SearchableDropdown<Member>
              items={members ?? []}
              value={selectedUserId}
              getItemKey={(m) => m.id}
              getItemLabel={(m) => m.full_name}
              onSelect={(member) => setSelectedUserId(member.id)}
              onClear={() => setSelectedUserId("")}
              placeholder="사용자 선택..."
              searchPlaceholder="이름 또는 초성 검색..."
              emptyText="검색 결과가 없습니다"
              allowClear
              className="h-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 bg-slate-100 rounded-md animate-pulse"
                />
              ))}
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {selectedUserId
                ? "해당 사용자의 신청 내역이 없습니다"
                : "신청 내역이 없습니다"}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {filteredApplications.map((app) => {
                const memberStatus = statusMap.get(app.userId);
                return (
                  <div
                    key={app.id}
                    className={cn(
                      "flex items-center justify-between py-2 px-3 rounded-md transition-colors",
                      memberStatus
                        ? "opacity-50 cursor-default"
                        : "hover:bg-slate-50 cursor-pointer"
                    )}
                    onClick={() => !memberStatus && handleEditClick(app)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {hasDrink(app.drink) ? (
                        <div className="w-7 h-7 bg-slate-900 rounded-full flex items-center justify-center shrink-0">
                          <Coffee className="h-3 w-3 text-white" />
                        </div>
                      ) : app.drink === "선택안함" ? (
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <X className="h-3 w-3 text-slate-400" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full border-2 border-dashed border-slate-300 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-sm text-slate-900 truncate">
                            {app.name}
                          </p>
                          {memberStatus && (
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium shrink-0",
                                STATUS_COLORS[memberStatus] ||
                                  "bg-slate-100 text-slate-500 border-slate-300"
                              )}
                            >
                              {memberStatus}
                            </span>
                          )}
                        </div>
                        <p
                          className={cn(
                            "text-xs truncate",
                            app.drink ? "text-slate-500" : "text-slate-400"
                          )}
                        >
                          {app.drink || "미선택"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center shrink-0 ml-1">
                      {!memberStatus && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ id: app.id, name: app.name });
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingApp?.name}님 음료 변경</DialogTitle>
            <DialogDescription>새 음료를 선택해주세요</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 py-4">
            {(data?.drinkOptions || DEFAULT_DRINKS).map((drink) => (
              <button
                key={drink}
                onClick={() => {
                  setSelectedDrink(drink);
                  if (drink !== "기타") setCustomDrink("");
                }}
                className={`px-4 py-3 rounded-lg border text-left text-sm font-medium transition-all ${
                  selectedDrink === drink
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                {drink}
              </button>
            ))}
            {selectedDrink === "기타" && (
              <Input
                value={customDrink}
                onChange={(e) => setCustomDrink(e.target.value)}
                placeholder="음료명을 직접 입력하세요"
                className="mt-1"
                autoFocus
              />
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateDrinkMutation.isPending}
            >
              {updateDrinkMutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{collection?.title} 설정</DialogTitle>
            <DialogDescription>
              음료 옵션과 픽업 담당자를 관리합니다
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">
                음료 옵션
              </Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {editDrinkOptions.map((drink, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-full"
                  >
                    <span className="text-sm">{drink}</span>
                    <button
                      onClick={() =>
                        setEditDrinkOptions(
                          editDrinkOptions.filter((_, i) => i !== index)
                        )
                      }
                      className="text-slate-400 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newDrinkOption}
                  onChange={(e) => setNewDrinkOption(e.target.value)}
                  placeholder="새 음료 추가..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newDrinkOption.trim()) {
                      setEditDrinkOptions([
                        ...editDrinkOptions,
                        newDrinkOption.trim(),
                      ]);
                      setNewDrinkOption("");
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (newDrinkOption.trim()) {
                      setEditDrinkOptions([
                        ...editDrinkOptions,
                        newDrinkOption.trim(),
                      ]);
                      setNewDrinkOption("");
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">
                픽업 담당자
              </Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {editPickupPersons.map((person, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full"
                  >
                    <span className="text-sm">{person}</span>
                    <button
                      onClick={() =>
                        setEditPickupPersons(
                          editPickupPersons.filter((_, i) => i !== index)
                        )
                      }
                      className="text-violet-400 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <SearchableDropdown<Member>
                items={availableMembersForPickup}
                value=""
                getItemKey={(m) => m.id}
                getItemLabel={(m) => m.full_name}
                onSelect={(member) => {
                  setEditPickupPersons([
                    ...editPickupPersons,
                    member.full_name,
                  ]);
                }}
                renderItem={(member, isHighlighted) => (
                  <div
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5",
                      isHighlighted && "bg-violet-50"
                    )}
                  >
                    <div className="w-7 h-7 bg-violet-100 rounded-full flex items-center justify-center text-xs font-medium text-violet-700">
                      {member.full_name.charAt(0)}
                    </div>
                    <span className="text-slate-700">{member.full_name}</span>
                  </div>
                )}
                placeholder="담당자 추가..."
                searchPlaceholder="이름 또는 자음 검색 (예: ㄱㅎㅁ)"
                emptyText="검색 결과가 없습니다"
                className="h-10"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
              취소
            </Button>
            <Button
              onClick={() =>
                updateSettingsMutation.mutate({
                  drink_options: editDrinkOptions,
                  pickup_persons: editPickupPersons,
                })
              }
              disabled={updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 신청 삭제 확인 */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>신청 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name}님의 신청을 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────
export default function MonthlyPage() {
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null);

  if (selectedCollectionId) {
    return (
      <CollectionDetailView
        collectionId={selectedCollectionId}
        onBack={() => setSelectedCollectionId(null)}
      />
    );
  }

  return (
    <CollectionListView onSelect={(id) => setSelectedCollectionId(id)} />
  );
}
