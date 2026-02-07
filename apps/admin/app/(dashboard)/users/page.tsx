"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import dayjs from "dayjs";
import {
  ChevronDown,
  FileSpreadsheet,
  Check,
  X,
  Loader2,
  Trash2,
  Plus,
  Send,
  AlertTriangle,
  RefreshCw,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/src/tooltip";
import { useActiveStatusMembers } from "@/hooks/useActiveStatusMembers";

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

interface UserFormData {
  fullName: string;
  loginId: string;
  password: string;
  email: string;
}

type InputCheckStatus =
  | "idle"
  | "loading"
  | "complete"
  | "incomplete"
  | "error";

interface InputCheckResult {
  status: InputCheckStatus;
  missingCount?: number;
}

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentDate = dayjs();

  // URL 쿼리 파라미터에서 연도/월 읽기 (없으면 현재 날짜)
  const selectedYear = parseInt(
    searchParams.get("year") || String(currentDate.year()),
  );
  const selectedMonth = parseInt(
    searchParams.get("month") || String(currentDate.month() + 1),
  );

  // URL 쿼리 파라미터 업데이트 함수
  const updateUrlParams = useCallback(
    (year: number, month: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("year", String(year));
      params.set("month", String(month));
      router.replace(`/users?${params.toString()}`);
    },
    [router, searchParams],
  );
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [downloadingUserId, setDownloadingUserId] = useState<string | null>(
    null,
  );

  // 스크롤 위치 관련
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const SCROLL_STORAGE_KEY = "usersPageScrollPosition";

  // 입력 체크 관련 상태
  const [inputCheckResults, setInputCheckResults] = useState<
    Map<string, InputCheckResult>
  >(new Map());
  const [isCheckingInputs, setIsCheckingInputs] = useState(false);
  const [checkProgress, setCheckProgress] = useState({ current: 0, total: 0 });

  const queryClient = useQueryClient();

  // 특이사항 인원 조회
  const { data: statusMembers } = useActiveStatusMembers();
  const statusMap = useMemo(() => {
    const map = new Map<string, string>();
    statusMembers?.forEach((m) => {
      if (m.member_id && m.current_status) {
        map.set(m.member_id, m.current_status);
      }
    });
    return map;
  }, [statusMembers]);

  // localStorage 키 생성
  const getStorageKey = useCallback((year: number, month: number) => {
    return `inputCheckResults_${year}_${month}`;
  }, []);

  // localStorage에서 체크 결과 복원
  useEffect(() => {
    const storageKey = getStorageKey(selectedYear, selectedMonth);
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const restoredMap = new Map<string, InputCheckResult>(
          Object.entries(parsed),
        );
        setInputCheckResults(restoredMap);
      } catch {
        setInputCheckResults(new Map());
      }
    } else {
      setInputCheckResults(new Map());
    }
  }, [selectedYear, selectedMonth, getStorageKey]);

  // 체크 결과를 localStorage에 저장
  const saveResultsToStorage = useCallback(
    (results: Map<string, InputCheckResult>, year: number, month: number) => {
      const storageKey = getStorageKey(year, month);
      const obj = Object.fromEntries(results);
      localStorage.setItem(storageKey, JSON.stringify(obj));
    },
    [getStorageKey],
  );

  // 스크롤 위치 저장
  const handleScroll = useCallback(() => {
    if (tableContainerRef.current) {
      sessionStorage.setItem(
        SCROLL_STORAGE_KEY,
        String(tableContainerRef.current.scrollTop),
      );
    }
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<UserFormData>({
    defaultValues: {
      fullName: "",
      loginId: "",
      password: "",
      email: "",
    },
  });

  const handleUserClick = (userId: string) => {
    router.push(
      `/calendar?userId=${userId}&year=${selectedYear}&month=${selectedMonth}`,
    );
  };

  // 입력 체크 실행
  const handleCheckAllInputs = async () => {
    if (!users || users.length === 0) return;

    setIsCheckingInputs(true);
    setCheckProgress({ current: 0, total: users.length });

    // 모든 사용자를 loading 상태로 초기화
    const initialResults = new Map<string, InputCheckResult>();
    users.forEach((user) => {
      initialResults.set(user.user_id, { status: "loading" });
    });
    setInputCheckResults(initialResults);

    // 최종 결과 저장용
    const finalResults = new Map<string, InputCheckResult>();

    // 각 사용자별로 순차 체크
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      if (!user) continue;

      setCheckProgress({ current: i + 1, total: users.length });

      try {
        const response = await fetch(
          `/api/stats/incomplete-users?year=${selectedYear}&month=${selectedMonth}&userId=${user.user_id}`,
        );

        if (response.ok) {
          const data = await response.json();
          const result: InputCheckResult = data.is_complete
            ? { status: "complete" }
            : {
                status: "incomplete",
                missingCount: data.missing_dates?.length || 0,
              };

          finalResults.set(user.user_id, result);
          setInputCheckResults((prev) => {
            const newMap = new Map(prev);
            newMap.set(user.user_id, result);
            return newMap;
          });
        } else {
          throw new Error("API error");
        }
      } catch {
        const errorResult: InputCheckResult = { status: "error" };
        finalResults.set(user.user_id, errorResult);
        setInputCheckResults((prev) => {
          const newMap = new Map(prev);
          newMap.set(user.user_id, errorResult);
          return newMap;
        });
      }
    }

    // 체크 완료 후 localStorage에 저장
    saveResultsToStorage(finalResults, selectedYear, selectedMonth);

    setIsCheckingInputs(false);
    setCheckProgress({ current: 0, total: 0 });
  };

  const { data: users, isLoading } = useQuery<UserStats[]>({
    queryKey: queryKeys.stats.monthly(selectedYear, selectedMonth),
    queryFn: async () => {
      const response = await fetch(
        `/api/stats/monthly?year=${selectedYear}&month=${selectedMonth}`,
      );
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  // 스크롤 위치 복원 (데이터 로딩 완료 후)
  useEffect(() => {
    if (!isLoading && users && tableContainerRef.current) {
      const savedPosition = sessionStorage.getItem(SCROLL_STORAGE_KEY);
      if (savedPosition) {
        tableContainerRef.current.scrollTop = parseInt(savedPosition, 10);
      }
    }
  }, [isLoading, users]);

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
    if (
      window.confirm(
        `"${userName}" 사용자를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`,
      )
    ) {
      deleteUserMutation.mutate(userId);
    }
  };

  const createUserMutation = useMutation({
    mutationFn: async (data: {
      fullName: string;
      loginId: string;
      password: string;
      email?: string;
    }) => {
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
      reset();
    },
    onError: (error: Error) => {
      if (error.message === "Login ID already exists") {
        setError("loginId", { message: "이미 존재하는 아이디입니다." });
      } else {
        toast.error("사용자 추가에 실패했습니다.");
      }
    },
  });

  const sendNotifyMutation = useMutation({
    mutationFn: async ({
      userId,
      fullName,
    }: {
      userId: string;
      fullName: string;
    }) => {
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

  const onSubmitUser = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };

  const handleDownloadExcel = async (userId: string, fullName: string) => {
    try {
      setDownloadingUserId(userId);
      const half = selectedMonth <= 6 ? "H1" : "H2";
      const response = await fetch(
        `/api/export/member?year=${selectedYear}&half=${half}&memberId=${userId}`,
      );

      if (!response.ok) {
        throw new Error("Failed to download");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fullName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`${fullName}님의 엑셀 파일을 다운로드했습니다.`);
    } catch {
      toast.error("엑셀 파일 다운로드에 실패했습니다.");
    } finally {
      setDownloadingUserId(null);
    }
  };

  const filteredUsers = users?.filter((user) => {
    if (!selectedUserId) return true;
    return user.user_id === selectedUserId;
  });

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "-";
    return new Intl.NumberFormat("ko-KR").format(amount);
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.year() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Summary stats
  const totalUsers = users?.length || 0;
  const settledUsers = users?.filter((u) => u.is_settled).length || 0;
  const totalUsed =
    users?.reduce((sum, u) => sum + (u.total_used || 0), 0) || 0;

  // 입력완료 상태 렌더링
  const renderInputCheckStatus = (userId: string) => {
    const result = inputCheckResults.get(userId);

    if (!result || result.status === "idle") {
      return <span className="text-slate-300">-</span>;
    }

    if (result.status === "loading") {
      return (
        <Loader2 className="h-4 w-4 animate-spin text-slate-400 mx-auto" />
      );
    }

    if (result.status === "complete") {
      return (
        <div className="flex items-center justify-center">
          <Check className="h-4 w-4 text-emerald-500" />
        </div>
      );
    }

    if (result.status === "incomplete") {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center gap-1 cursor-help">
              <X className="h-4 w-4 text-rose-500" />
              <span className="text-xs text-rose-500">
                {result.missingCount}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>{result.missingCount}일 누락</TooltipContent>
        </Tooltip>
      );
    }

    if (result.status === "error") {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center cursor-help">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
          </TooltipTrigger>
          <TooltipContent>체크 중 오류 발생</TooltipContent>
        </Tooltip>
      );
    }

    return null;
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col gap-6">
      {/* Quick Stats */}
      <div className="flex items-center gap-6 rounded-xl border border-slate-200/60 bg-white/50 px-6 py-3 backdrop-blur-sm">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm text-slate-500">총 인원</span>
          <span className="text-lg font-semibold tabular-nums text-slate-900">
            {totalUsers}명
          </span>
          {statusMembers && statusMembers.length > 0 && (
            <span className="text-xs text-slate-400">
              (특이사항 {statusMembers.length})
            </span>
          )}
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm text-slate-500">정산 완료</span>
          <span className="text-lg font-semibold tabular-nums text-slate-900">
            {settledUsers}
          </span>
          <span className="text-sm text-slate-400">/ {totalUsers}</span>
        </div>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm text-slate-500">총 사용액</span>
          <span className="text-lg font-semibold tabular-nums text-slate-900">
            {(totalUsed / 10000).toFixed(1)}
          </span>
          <span className="text-sm text-slate-400">만원</span>
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
            className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/60 transition-all hover:bg-slate-50"
          >
            {selectedYear}년
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-400 transition-transform",
                isYearOpen && "rotate-180",
              )}
            />
          </button>
          {isYearOpen && (
            <div className="absolute left-0 top-full z-50 mt-2 w-32 rounded-lg bg-white p-1 shadow-lg ring-1 ring-slate-200/60">
              {years.map((year) => (
                <button
                  key={year}
                  onClick={() => {
                    updateUrlParams(year, selectedMonth);
                    setIsYearOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors",
                    year === selectedYear
                      ? "bg-[#135bec]/10 font-medium text-[#135bec]"
                      : "text-slate-600 hover:bg-slate-50",
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
            className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/60 transition-all hover:bg-slate-50"
          >
            {selectedMonth}월
            <ChevronDown
              className={cn(
                "h-4 w-4 text-slate-400 transition-transform",
                isMonthOpen && "rotate-180",
              )}
            />
          </button>
          {isMonthOpen && (
            <div className="absolute left-0 top-full z-50 mt-2 grid w-48 grid-cols-4 gap-1 rounded-lg bg-white p-2 shadow-lg ring-1 ring-slate-200/60">
              {months.map((month) => (
                <button
                  key={month}
                  onClick={() => {
                    updateUrlParams(selectedYear, month);
                    setIsMonthOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-center rounded-lg py-2 text-sm transition-colors",
                    month === selectedMonth
                      ? "bg-[#135bec]/10 font-medium text-[#135bec]"
                      : "text-slate-600 hover:bg-slate-50",
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

        {/* 입력 체크 버튼 */}
        <Button
          onClick={handleCheckAllInputs}
          size="sm"
          className="gap-1.5"
          disabled={isCheckingInputs || !users || users.length === 0}
        >
          {isCheckingInputs ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {checkProgress.current}/{checkProgress.total}
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              입력 체크
            </>
          )}
        </Button>

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
      <div className="glass-panel min-h-0 flex-1 overflow-hidden rounded-2xl">
        <div
          ref={tableContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-auto"
        >
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgb(241,245,249)] [&>tr>th]:h-9 [&>tr>th]:px-3 [&>tr>th]:py-0">
              <tr>
                <th className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  No.
                </th>
                <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  성명
                </th>
                <th className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  근무
                </th>
                <th className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  휴일
                </th>
                <th className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  주말
                </th>
                <th className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  개별
                </th>
                <th className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  재택
                </th>
                <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  사용가능액
                </th>
                <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  사용액
                </th>
                <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  잔액
                </th>
                <th className="w-16 whitespace-nowrap text-center text-xs font-semibold tracking-wider text-slate-500">
                  입력완료
                </th>
                <th className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  정산
                </th>
                <th className="w-14 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  정산요청
                </th>
                <th className="w-12 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  파일
                </th>
                <th className="w-14 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                  삭제
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 15 }).map((_, cellIndex) => (
                      <td key={cellIndex} className="px-3 py-1.5">
                        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredUsers && filteredUsers.length > 0 ? (
                filteredUsers.map((user, index) => {
                  const balance = user.balance ?? 0;
                  const memberStatus = statusMap.get(user.user_id);
                  return (
                    <tr
                      key={user.user_id || index}
                      className={cn(
                        "table-row-interactive",
                        memberStatus && "opacity-50",
                      )}
                    >
                      <td className="px-3 py-1.5 text-center text-sm text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleUserClick(user.user_id)}
                            className="text-sm text-[#135bec] hover:text-[#135bec]/80 underline underline-offset-2 decoration-[#135bec]/30 hover:decoration-[#135bec]/60 transition-colors"
                          >
                            {user.full_name}
                          </button>
                          {memberStatus && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                              {memberStatus}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-center text-sm text-slate-600">
                        {user.work_days ?? 0}일
                      </td>
                      <td className="px-3 py-1.5 text-center text-sm text-slate-600">
                        {user.holiday_count ?? 0}일
                      </td>
                      <td className="px-3 py-1.5 text-center text-sm text-slate-600">
                        {user.weekend_work_days ?? 0}일
                      </td>
                      <td className="px-3 py-1.5 text-center text-sm text-slate-600">
                        {user.individual_meals ?? 0}회
                      </td>
                      <td className="px-3 py-1.5 text-center text-sm text-slate-600">
                        {user.remote_work_days ?? 0}일
                      </td>
                      <td className="px-3 py-1.5 text-right text-sm font-medium text-sky-600">
                        {formatCurrency(user.total_allowance)}
                      </td>
                      <td className="px-3 py-1.5 text-right text-sm font-medium text-[#a855f7]">
                        {formatCurrency(user.total_used)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-1.5 text-right text-sm font-semibold",
                          balance >= 0 ? "text-emerald-600" : "text-rose-600",
                        )}
                      >
                        {formatCurrency(balance)}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        {renderInputCheckStatus(user.user_id)}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          onClick={() =>
                            handleToggleSettlement(
                              user.user_id,
                              user.is_settled,
                            )
                          }
                          disabled={toggleSettlementMutation.isPending}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-medium transition-all",
                            toggleSettlementMutation.isPending &&
                              toggleSettlementMutation.variables?.userId ===
                                user.user_id
                              ? "bg-slate-100 text-slate-500"
                              : user.is_settled
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
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
                      <td className="px-1 py-1.5 text-center">
                        {user.email ? (
                          <button
                            onClick={() => {
                              sendNotifyMutation.mutate({
                                userId: user.user_id,
                                fullName: user.full_name,
                              });
                            }}
                            disabled={sendNotifyMutation.isPending}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-sky-500 transition-colors hover:bg-sky-50 hover:text-sky-600"
                            title="정산 요청 보내기"
                          >
                            {sendNotifyMutation.isPending &&
                            sendNotifyMutation.variables?.userId ===
                              user.user_id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                          </button>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-slate-300 cursor-not-allowed">
                                <Send className="h-3.5 w-3.5" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              이메일이 등록되지 않았습니다
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        {user.has_excel_file ? (
                          <button
                            onClick={() =>
                              handleDownloadExcel(user.user_id, user.full_name)
                            }
                            disabled={downloadingUserId === user.user_id}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-emerald-600 transition-colors hover:bg-emerald-50"
                          >
                            {downloadingUserId === user.user_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileSpreadsheet className="h-4 w-4" />
                            )}
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        <button
                          onClick={() =>
                            handleDeleteUser(user.user_id, user.full_name)
                          }
                          disabled={deleteUserMutation.isPending}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          {deleteUserMutation.isPending &&
                          deleteUserMutation.variables === user.user_id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
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
            reset();
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>사용자 추가</DialogTitle>
            <DialogDescription>새 사용자 정보를 입력하세요.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitUser)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">이름</Label>
                <Input
                  id="fullName"
                  placeholder="홍길동"
                  className={
                    errors.fullName
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }
                  {...register("fullName", {
                    required: "이름을 입력해주세요.",
                  })}
                />
                {errors.fullName && (
                  <p className="text-sm text-red-500">
                    {errors.fullName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="loginId">아이디</Label>
                <Input
                  id="loginId"
                  placeholder="hong123"
                  className={
                    errors.loginId
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }
                  {...register("loginId", {
                    required: "아이디를 입력해주세요.",
                  })}
                />
                {errors.loginId && (
                  <p className="text-sm text-red-500">
                    {errors.loginId.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className={
                    errors.password
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }
                  {...register("password", {
                    required: "비밀번호를 입력해주세요.",
                  })}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">이메일 (선택)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="hong@example.com"
                  className={
                    errors.email
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }
                  {...register("email", {
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "올바른 이메일 형식이 아닙니다.",
                    },
                  })}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  reset();
                }}
              >
                취소
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? "추가 중..." : "추가"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
