"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  ChevronDown,
  FileSpreadsheet,
  Check,
  X,
  Loader2,
  Users,
  Wallet,
  Trash2,
  Plus,
  Send,
} from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { SearchableDropdown } from "@repo/ui/src/searchable-dropdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/src/tooltip";

interface UserStats {
  user_id: string;
  full_name: string;
  login_id: string;
  email: string | null;
  work_days: number;
  holiday_count: number;
  weekend_work_days: number;
  individual_meals: number;
  remote_work_days: number;
  total_allowance: number;
  total_used: number;
  balance: number;
  has_excel_file: boolean;
  is_settled: boolean;
}

export default function UsersPage() {
  const router = useRouter();
  const currentDate = dayjs();
  const [selectedYear, setSelectedYear] = useState(currentDate.year());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.month() + 1);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [newUserForm, setNewUserForm] = useState({
    fullName: "",
    loginId: "",
    password: "",
  });
  const [loginIdError, setLoginIdError] = useState("");
  const queryClient = useQueryClient();

  const handleUserClick = (userId: string) => {
    router.push(`/calendar?userId=${userId}&year=${selectedYear}&month=${selectedMonth}`);
  };

  const { data: users, isLoading } = useQuery<UserStats[]>({
    queryKey: queryKeys.stats.monthly(selectedYear, selectedMonth),
    queryFn: async () => {
      const response = await fetch(
        `/api/stats/monthly?year=${selectedYear}&month=${selectedMonth}`
      );
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const toggleSettlementMutation = useMutation({
    mutationFn: async ({
      userId,
      isSettled,
    }: {
      userId: string;
      isSettled: boolean;
    }) => {
      const response = await fetch("/api/settlement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          year: selectedYear,
          month: selectedMonth,
          isSettled,
        }),
      });
      if (!response.ok) throw new Error("Failed to update settlement status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.stats.monthly(selectedYear, selectedMonth),
      });
      toast.success("정산 상태가 변경되었습니다.");
    },
    onError: () => {
      toast.error("정산 상태 변경에 실패했습니다.");
    },
  });

  const handleToggleSettlement = (userId: string, currentStatus: boolean) => {
    toggleSettlementMutation.mutate({
      userId,
      isSettled: !currentStatus,
    });
  };

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/members/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.stats.monthly(selectedYear, selectedMonth),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.members.all,
      });
      toast.success("사용자가 삭제되었습니다.");
    },
    onError: () => {
      toast.error("사용자 삭제에 실패했습니다.");
    },
  });

  const handleDeleteUser = (userId: string, userName: string) => {
    if (window.confirm(`"${userName}" 사용자를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  const createUserMutation = useMutation({
    mutationFn: async (data: { fullName: string; loginId: string; password: string }) => {
      const response = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.stats.monthly(selectedYear, selectedMonth),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.members.all,
      });
      toast.success("사용자가 추가되었습니다.");
      setIsAddDialogOpen(false);
      setNewUserForm({ fullName: "", loginId: "", password: "" });
    },
    onError: (error: Error) => {
      if (error.message === "Login ID already exists") {
        setLoginIdError("이미 존재하는 아이디입니다.");
      } else {
        toast.error("사용자 추가에 실패했습니다.");
      }
    },
  });

  const sendNotifyMutation = useMutation({
    mutationFn: async ({ userId, fullName }: { userId: string; fullName: string }) => {
      const response = await fetch("/api/slack/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: [userId],
          year: selectedYear,
          month: selectedMonth,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send notification");
      }
      const data = await response.json();
      // 결과 확인
      const result = data.results?.[0];
      if (!result?.success) {
        throw new Error(result?.error || "알림 발송 실패");
      }
      return { fullName };
    },
    onSuccess: (data) => {
      toast.success(`${data.fullName}님에게 정산 요청을 보냈습니다.`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "정산 요청 발송에 실패했습니다.");
    },
  });

  const handleCreateUser = () => {
    setLoginIdError("");
    if (!newUserForm.fullName.trim() || !newUserForm.loginId.trim() || !newUserForm.password.trim()) {
      toast.error("모든 필드를 입력해주세요.");
      return;
    }
    createUserMutation.mutate(newUserForm);
  };

  const filteredUsers = users?.filter((user) => {
    if (!selectedUserId) return true;
    return user.user_id === selectedUserId;
  });

  // Selection handlers
  const handleSelectUser = (userId: string, checked: boolean) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && filteredUsers) {
      setSelectedUserIds(new Set(filteredUsers.map((u) => u.user_id)));
    } else {
      setSelectedUserIds(new Set());
    }
  };

  const isAllSelected = Boolean(
    filteredUsers &&
    filteredUsers.length > 0 &&
    filteredUsers.every((u) => selectedUserIds.has(u.user_id))
  );

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "-";
    return new Intl.NumberFormat("ko-KR").format(amount);
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.year() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Summary stats (전체 기준, 검색 결과와 무관)
  const totalUsers = users?.length || 0;
  const settledUsers = users?.filter((u) => u.is_settled).length || 0;
  const totalUsed = users?.reduce((sum, u) => sum + (u.total_used || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 glass-panel rounded-2xl p-5 transition-all duration-300 hover:border-white/80">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#135bec]/10">
            <Users className="h-5 w-5 text-[#135bec]" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">총 인원</p>
            <p className="text-2xl font-bold text-slate-900">{totalUsers}명</p>
          </div>
        </div>
        <div className="flex items-center gap-4 glass-panel rounded-2xl p-5 transition-all duration-300 hover:border-white/80">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
            <Check className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">정산 완료</p>
            <p className="text-2xl font-bold text-slate-900">
              {settledUsers}
              <span className="ml-1 text-lg font-medium text-slate-400">
                / {totalUsers}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 glass-panel rounded-2xl p-5 transition-all duration-300 hover:border-white/80">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#a855f7]/10">
            <Wallet className="h-5 w-5 text-[#a855f7]" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">총 사용액</p>
            <p className="text-2xl font-bold text-slate-900">
              {(totalUsed / 10000).toFixed(0)}
              <span className="ml-1 text-lg font-medium text-slate-400">만원</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Year Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsYearOpen(!isYearOpen);
              setIsMonthOpen(false);
            }}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/60 transition-all hover:bg-slate-50"
          >
            {selectedYear}년
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-400 transition-transform",
                isYearOpen && "rotate-180"
              )}
            />
          </button>
          {isYearOpen && (
            <div className="absolute left-0 top-full z-50 mt-2 w-32 rounded-xl bg-white p-1 shadow-lg ring-1 ring-slate-200/60">
              {years.map((year) => (
                <button
                  key={year}
                  onClick={() => {
                    setSelectedYear(year);
                    setIsYearOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors",
                    year === selectedYear
                      ? "bg-[#135bec]/10 font-medium text-[#135bec]"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {year}년
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Month Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsMonthOpen(!isMonthOpen);
              setIsYearOpen(false);
            }}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/60 transition-all hover:bg-slate-50"
          >
            {selectedMonth}월
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-400 transition-transform",
                isMonthOpen && "rotate-180"
              )}
            />
          </button>
          {isMonthOpen && (
            <div className="absolute left-0 top-full z-50 mt-2 grid w-48 grid-cols-4 gap-1 rounded-xl bg-white p-2 shadow-lg ring-1 ring-slate-200/60">
              {months.map((month) => (
                <button
                  key={month}
                  onClick={() => {
                    setSelectedMonth(month);
                    setIsMonthOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-center rounded-lg py-2 text-sm transition-colors",
                    month === selectedMonth
                      ? "bg-[#135bec]/10 font-medium text-[#135bec]"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {month}월
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="ml-auto">
          <SearchableDropdown<UserStats>
            items={users ?? []}
            value={selectedUserId}
            getItemKey={(u) => u.user_id}
            getItemLabel={(u) => u.full_name}
            onSelect={(user) => setSelectedUserId(user.user_id)}
            onClear={() => setSelectedUserId("")}
            placeholder="사용자 선택..."
            searchPlaceholder="이름 또는 초성 검색..."
            emptyText="검색 결과가 없습니다"
            allowClear
          />
        </div>

        {/* Add User Button */}
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          size="sm"
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          추가
        </Button>
      </div>

      {/* Users Table */}
      <div className="glass-panel overflow-hidden rounded-2xl">
        <div className="max-h-[calc(100vh-360px)] overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgb(241,245,249)]">
              <tr>
                <th className="w-10 px-2 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#135bec] focus:ring-[#135bec]"
                  />
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  No.
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  성명
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  근무
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  휴일
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  주말
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  개별
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  재택
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  사용가능액
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  사용액
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  잔액
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  파일
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  정산
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  정산요청
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  삭제
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 15 }).map((_, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-2.5">
                        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredUsers && filteredUsers.length > 0 ? (
                filteredUsers.map((user, index) => {
                  const balance = user.balance ?? 0;
                  const isSelected = selectedUserIds.has(user.user_id);
                  return (
                    <tr
                      key={user.user_id || index}
                      className={cn(
                        "table-row-interactive",
                        isSelected && "bg-[#135bec]/5"
                      )}
                    >
                      <td className="w-10 px-2 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) =>
                            handleSelectUser(user.user_id, e.target.checked)
                          }
                          className="h-4 w-4 rounded border-slate-300 text-[#135bec] focus:ring-[#135bec]"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-center text-sm text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => handleUserClick(user.user_id)}
                          className="text-sm text-[#135bec] hover:text-[#135bec]/80 underline underline-offset-2 decoration-[#135bec]/30 hover:decoration-[#135bec]/60 transition-colors"
                        >
                          {user.full_name}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-center text-sm text-slate-600">
                        {user.work_days ?? 0}일
                      </td>
                      <td className="px-4 py-2.5 text-center text-sm text-slate-600">
                        {user.holiday_count ?? 0}일
                      </td>
                      <td className="px-4 py-2.5 text-center text-sm text-slate-600">
                        {user.weekend_work_days ?? 0}일
                      </td>
                      <td className="px-4 py-2.5 text-center text-sm text-slate-600">
                        {user.individual_meals ?? 0}회
                      </td>
                      <td className="px-4 py-2.5 text-center text-sm text-slate-600">
                        {user.remote_work_days ?? 0}일
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm font-medium text-sky-600">
                        {formatCurrency(user.total_allowance)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm font-medium text-[#a855f7]">
                        {formatCurrency(user.total_used)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right text-sm font-semibold",
                          balance >= 0 ? "text-emerald-600" : "text-rose-600"
                        )}
                      >
                        {formatCurrency(balance)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {user.has_excel_file ? (
                          <button className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-emerald-600 transition-colors hover:bg-emerald-50">
                            <FileSpreadsheet className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() =>
                            handleToggleSettlement(user.user_id, user.is_settled)
                          }
                          disabled={toggleSettlementMutation.isPending}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                            toggleSettlementMutation.isPending &&
                              toggleSettlementMutation.variables?.userId ===
                                user.user_id
                              ? "bg-slate-100 text-slate-500"
                              : user.is_settled
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          {toggleSettlementMutation.isPending &&
                          toggleSettlementMutation.variables?.userId ===
                            user.user_id ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              처리중
                            </>
                          ) : user.is_settled ? (
                            <>
                              <Check className="h-3 w-3" />
                              완료
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3" />
                              미정산
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {user.email ? (
                          <button
                            onClick={() => {
                              sendNotifyMutation.mutate({
                                userId: user.user_id,
                                fullName: user.full_name,
                              });
                            }}
                            disabled={sendNotifyMutation.isPending}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-sky-500 transition-colors hover:bg-sky-50 hover:text-sky-600"
                            title="정산 요청 보내기"
                          >
                            {sendNotifyMutation.isPending &&
                            sendNotifyMutation.variables?.userId === user.user_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </button>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 cursor-not-allowed">
                                <Send className="h-4 w-4" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              이메일이 등록되지 않았습니다
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => handleDeleteUser(user.user_id, user.full_name)}
                          disabled={deleteUserMutation.isPending}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          {deleteUserMutation.isPending &&
                          deleteUserMutation.variables === user.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={15}
                    className="px-4 py-12 text-center text-sm text-slate-500"
                  >
                    데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(isYearOpen || isMonthOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsYearOpen(false);
            setIsMonthOpen(false);
          }}
        />
      )}

      {/* Add User Dialog */}
      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            setNewUserForm({ fullName: "", loginId: "", password: "" });
            setLoginIdError("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>사용자 추가</DialogTitle>
            <DialogDescription>새 사용자 정보를 입력하세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">이름</Label>
              <Input
                id="fullName"
                value={newUserForm.fullName}
                onChange={(e) =>
                  setNewUserForm({ ...newUserForm, fullName: e.target.value })
                }
                placeholder="홍길동"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loginId">아이디</Label>
              <Input
                id="loginId"
                value={newUserForm.loginId}
                onChange={(e) => {
                  setNewUserForm({ ...newUserForm, loginId: e.target.value });
                  if (loginIdError) setLoginIdError("");
                }}
                placeholder="hong123"
                className={loginIdError ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {loginIdError && (
                <p className="text-sm text-red-500">{loginIdError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={newUserForm.password}
                onChange={(e) =>
                  setNewUserForm({ ...newUserForm, password: e.target.value })
                }
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setNewUserForm({ fullName: "", loginId: "", password: "" });
                setLoginIdError("");
              }}
            >
              취소
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending ? "추가 중..." : "추가"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
