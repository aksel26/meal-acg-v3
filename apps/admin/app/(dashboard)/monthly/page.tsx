"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { getChoseong } from "es-hangul";
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
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Settings,
  Coffee,
  Plus,
  X,
  Users,
  Trash2,
} from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import type { Member } from "@/lib/supabase/types";

interface MonthlyData {
  applications: {
    id: string;
    userId: string;
    name: string;
    drink: string;
    memo: string;
  }[];
  drinkOptions: string[];
  pickupPersons: string[];
  year: number;
  month: number;
}

const DEFAULT_DRINKS = [
  "HOT 아메리카노",
  "ICE 아메리카노",
  "HOT 디카페인 아메리카노",
  "ICE 디카페인 아메리카노",
  "바닐라크림 콜드브루",
  "ICE 자몽허니블랙티",
  "선택안함",
];

export default function MonthlyPage() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [searchQuery, setSearchQuery] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<
    MonthlyData["applications"][0] | null
  >(null);
  const [selectedDrink, setSelectedDrink] = useState("");

  // 설정 편집용 state
  const [editDrinkOptions, setEditDrinkOptions] = useState<string[]>([]);
  const [editPickupPersons, setEditPickupPersons] = useState<string[]>([]);
  const [newDrinkOption, setNewDrinkOption] = useState("");
  const [newPickupPerson, setNewPickupPerson] = useState("");
  const [showPickupDropdown, setShowPickupDropdown] = useState(false);

  const year = currentDate.year();
  const month = currentDate.month() + 1;

  // Fetch monthly data
  const { data: monthlyData, isLoading } = useQuery<MonthlyData>({
    queryKey: [...queryKeys.monthly.all, year, month],
    queryFn: async () => {
      const response = await fetch(`/api/monthly?year=${year}&month=${month}`);
      if (!response.ok) throw new Error("Failed to fetch monthly data");
      const result = await response.json();
      return result.data;
    },
  });

  // Fetch members for adding new applications
  const { data: members } = useQuery<Member[]>({
    queryKey: queryKeys.members.all,
    queryFn: async () => {
      const response = await fetch("/api/members");
      if (!response.ok) throw new Error("Failed to fetch members");
      return response.json();
    },
  });

  // Update drink mutation
  const updateDrinkMutation = useMutation({
    mutationFn: async (data: {
      userId: string;
      drink: string;
      year: number;
      month: number;
    }) => {
      const response = await fetch("/api/monthly", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update drink");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.monthly.all, year, month],
      });
      toast.success("음료가 업데이트되었습니다.");
      setIsEditOpen(false);
      setEditingApp(null);
    },
    onError: () => {
      toast.error("업데이트 중 오류가 발생했습니다.");
    },
  });

  // Delete application mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/monthly?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.monthly.all, year, month],
      });
      toast.success("삭제되었습니다.");
    },
    onError: () => {
      toast.error("삭제 중 오류가 발생했습니다.");
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: {
      drinkOptions: string[];
      pickupPersons: string[];
      year: number;
      month: number;
    }) => {
      const response = await fetch("/api/monthly/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.monthly.all, year, month],
      });
      toast.success("설정이 저장되었습니다.");
      setIsSettingsOpen(false);
    },
    onError: () => {
      toast.error("설정 저장 중 오류가 발생했습니다.");
    },
  });

  // 검색 필터링
  const filteredApplications = useMemo(() => {
    if (!monthlyData?.applications) return [];
    if (!searchQuery.trim()) return monthlyData.applications;

    const query = searchQuery.trim();
    return monthlyData.applications.filter((app) => {
      const name = app.name || "";
      if (name.toLowerCase().includes(query.toLowerCase())) return true;
      const nameChoseong = getChoseong(name);
      if (nameChoseong.includes(query)) return true;
      if (app.drink?.toLowerCase().includes(query.toLowerCase())) return true;
      return false;
    });
  }, [monthlyData?.applications, searchQuery]);

  // 픽업 담당자 검색 필터링
  const filteredMembersForPickup = useMemo(() => {
    if (!members || !newPickupPerson.trim()) return [];
    const query = newPickupPerson.trim().toLowerCase();
    return members
      .filter((member) => {
        // 이미 추가된 담당자는 제외
        if (editPickupPersons.includes(member.full_name)) return false;
        const name = member.full_name || "";
        // 이름 직접 매칭
        if (name.toLowerCase().includes(query)) return true;
        // 자음 검색
        const nameChoseong = getChoseong(name);
        if (nameChoseong.includes(query)) return true;
        return false;
      })
      .slice(0, 5); // 최대 5명까지 표시
  }, [members, newPickupPerson, editPickupPersons]);

  // 음료별 통계
  const drinkStats = useMemo(() => {
    if (!monthlyData?.applications) return {};
    const stats: Record<string, number> = {};
    monthlyData.applications.forEach((app) => {
      if (app.drink) {
        stats[app.drink] = (stats[app.drink] || 0) + 1;
      }
    });
    return stats;
  }, [monthlyData?.applications]);

  // 신청 완료 인원
  const completedCount =
    monthlyData?.applications.filter(
      (app) => app.drink && app.drink !== "선택안함",
    ).length || 0;

  const handlePrevMonth = () =>
    setCurrentDate(currentDate.subtract(1, "month"));
  const handleNextMonth = () => setCurrentDate(currentDate.add(1, "month"));

  const handleEditClick = (app: MonthlyData["applications"][0]) => {
    setEditingApp(app);
    setSelectedDrink(app.drink);
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingApp) return;
    updateDrinkMutation.mutate({
      userId: editingApp.userId,
      drink: selectedDrink,
      year,
      month,
    });
  };

  const handleOpenSettings = () => {
    setEditDrinkOptions(monthlyData?.drinkOptions || DEFAULT_DRINKS);
    setEditPickupPersons(monthlyData?.pickupPersons || []);
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      drinkOptions: editDrinkOptions,
      pickupPersons: editPickupPersons,
      year,
      month,
    });
  };

  // 음료 선택 여부 확인
  const hasDrink = (drink: string) => drink && drink !== "선택안함";

  return (
    <div className="space-y-6">
      {/* Month Navigation & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Month Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-lg font-semibold">
                {currentDate.format("YYYY년 M월")}
              </span>
              <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Coffee className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">신청 완료</p>
                <p className="text-xl font-bold text-slate-900">
                  {completedCount}
                  <span className="text-sm font-normal text-slate-400">
                    /{monthlyData?.applications.length || 0}명
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pickup Persons */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 text-violet-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-500">픽업 담당</p>
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {monthlyData?.pickupPersons?.length
                    ? monthlyData.pickupPersons.join(", ")
                    : "미지정"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card
          className="cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={handleOpenSettings}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <Settings className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">설정</p>
                <p className="text-sm font-semibold text-slate-900">
                  음료 옵션 관리
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drink Stats */}
      {Object.keys(drinkStats).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">음료별 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(drinkStats)
                .sort(([, a], [, b]) => b - a)
                .map(([drink, count]) => (
                  <div
                    key={drink}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full"
                  >
                    <span className="text-sm text-slate-700">{drink}</span>
                    <span className="text-xs font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded-full">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applications List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>신청 내역</CardTitle>
              <CardDescription>
                클릭하여 음료를 변경할 수 있습니다
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름 또는 음료 검색..."
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 bg-slate-100 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {searchQuery ? "검색 결과가 없습니다" : "신청 내역이 없습니다"}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredApplications.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between py-2 hover:bg-slate-50 -mx-4 px-4 cursor-pointer rounded-lg transition-colors"
                  onClick={() => handleEditClick(app)}
                >
                  <div className="flex items-center gap-2.5">
                    {hasDrink(app.drink) ? (
                      <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center">
                        <Coffee className="h-3.5 w-3.5 text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300" />
                    )}
                    <div>
                      <p className="font-medium text-sm text-slate-900">{app.name}</p>
                      {app.memo && (
                        <p className="text-xs text-slate-400">{app.memo}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-medium ${
                        app.drink ? "text-slate-700" : "text-slate-400"
                      }`}
                    >
                      {app.drink || "미선택"}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          confirm(`${app.name}님의 신청을 삭제하시겠습니까?`)
                        ) {
                          deleteMutation.mutate(app.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
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
            {(monthlyData?.drinkOptions || DEFAULT_DRINKS).map((drink) => (
              <button
                key={drink}
                onClick={() => setSelectedDrink(drink)}
                className={`px-4 py-3 rounded-xl border text-left text-sm font-medium transition-all ${
                  selectedDrink === drink
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                {drink}
              </button>
            ))}
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
            <DialogTitle>{currentDate.format("YYYY년 M월")} 설정</DialogTitle>
            <DialogDescription>
              음료 옵션과 픽업 담당자를 관리합니다
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Drink Options */}
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
                          editDrinkOptions.filter((_, i) => i !== index),
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

            {/* Pickup Persons */}
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
                          editPickupPersons.filter((_, i) => i !== index),
                        )
                      }
                      className="text-violet-400 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="relative">
                <div className="flex gap-2">
                  <Input
                    value={newPickupPerson}
                    onChange={(e) => {
                      setNewPickupPerson(e.target.value);
                      setShowPickupDropdown(true);
                    }}
                    onFocus={() => setShowPickupDropdown(true)}
                    onBlur={() => {
                      // delay to allow click on dropdown item
                      setTimeout(() => setShowPickupDropdown(false), 150);
                    }}
                    placeholder="이름 또는 자음으로 검색 (예: ㄱㅎㅁ)"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newPickupPerson.trim()) {
                        // 검색 결과가 있으면 첫 번째 결과 선택
                        const firstMatch = filteredMembersForPickup[0];
                        if (firstMatch) {
                          setEditPickupPersons([
                            ...editPickupPersons,
                            firstMatch.full_name,
                          ]);
                        } else {
                          setEditPickupPersons([
                            ...editPickupPersons,
                            newPickupPerson.trim(),
                          ]);
                        }
                        setNewPickupPerson("");
                        setShowPickupDropdown(false);
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (newPickupPerson.trim()) {
                        const firstMatch = filteredMembersForPickup[0];
                        if (firstMatch) {
                          setEditPickupPersons([
                            ...editPickupPersons,
                            firstMatch.full_name,
                          ]);
                        } else {
                          setEditPickupPersons([
                            ...editPickupPersons,
                            newPickupPerson.trim(),
                          ]);
                        }
                        setNewPickupPerson("");
                        setShowPickupDropdown(false);
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {/* 검색 드롭다운 */}
                {showPickupDropdown && filteredMembersForPickup.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                    {filteredMembersForPickup.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-violet-50 flex items-center gap-2 transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault(); // prevent input blur
                          setEditPickupPersons([
                            ...editPickupPersons,
                            member.full_name,
                          ]);
                          setNewPickupPerson("");
                          setShowPickupDropdown(false);
                        }}
                      >
                        <div className="w-7 h-7 bg-violet-100 rounded-full flex items-center justify-center text-xs font-medium text-violet-700">
                          {member.full_name.charAt(0)}
                        </div>
                        <span className="text-slate-700">
                          {member.full_name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
