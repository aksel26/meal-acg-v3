"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "@repo/ui/src/sonner";
import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Textarea } from "@repo/ui/src/textarea";
import { DatePicker } from "@repo/ui/src/date-picker";
import { Label } from "@repo/ui/src/label";
import { Badge } from "@repo/ui/src/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/src/table";
import { SearchableDropdown } from "@repo/ui/src/searchable-dropdown";
import {
  AlertTriangle,
  ArrowUpDown,
  Eye,
  EyeOff,
  History,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import {
  useMemberStatuses,
  useMemberStatusHistory,
} from "@/hooks/useMemberStatuses";
import {
  useCreateMemberStatus,
  useUpdateMemberStatus,
  useDeleteMemberStatus,
} from "@/hooks/useMemberStatusMutations";
import type {
  MemberCurrentStatus,
  MemberStatus,
  MemberStatusType,
} from "@/lib/supabase/types";
import { STATUS_COLORS } from "@/lib/constants";

// ── Constants ──

const STATUS_TYPES: MemberStatusType[] = [
  "육아휴직",
  "병가",
  "재택근무",
  "파견",
  "휴직",
  "퇴사",
];

interface MemberOption {
  id: string;
  full_name: string;
  note: string | null;
  email: string | null;
  member_role: string | null;
  intern_months: number | null;
}

interface UserFormData {
  fullName: string;
  loginId: string;
  password: string;
  email: string;
  memberRole: string;
  internMonths: string;
}

type SortKey = "member_role" | "team_name" | "current_status";
type SortDir = "asc" | "desc";

// ── Main Page ──

export default function MemberStatusPage() {
  const queryClient = useQueryClient();

  // Filter state
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [isClearing, setIsClearing] = useState(false);

  // Sort state
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Dialog states
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isEditMemberOpen, setIsEditMemberOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Edit member state
  const [editingMember, setEditingMember] = useState<{
    id: string;
    full_name: string;
    email: string;
    member_role: string;
    intern_months: string;
  } | null>(null);

  // History modal
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyMemberId, setHistoryMemberId] = useState<string | null>(null);
  const [historyMemberName, setHistoryMemberName] = useState("");

  // Form state
  const [formMemberId, setFormMemberId] = useState("");
  const [formStatus, setFormStatus] = useState<string>("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formNote, setFormNote] = useState("");

  // Edit/Delete target
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState<{
    id: string;
    memberId?: string;
    name: string;
    status: string;
  } | null>(null);

  // Build query filters
  const queryFilters = useMemo(
    () => ({
      status: statusFilter !== "전체" ? statusFilter : undefined,
      search: searchInput || undefined,
    }),
    [statusFilter, searchInput],
  );

  // Queries
  const { data: membersData, isLoading } = useMemberStatuses(queryFilters);
  const { data: allMembersStatus } = useMemberStatuses({});
  const { data: historyData, isLoading: isHistoryLoading } =
    useMemberStatusHistory(historyMemberId);

  const { data: allMembers } = useQuery<MemberOption[]>({
    queryKey: queryKeys.members.all,
    queryFn: async () => {
      const res = await fetch("/api/members");
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  // Mutations
  const createStatus = useCreateMemberStatus();
  const updateStatus = useUpdateMemberStatus();
  const deleteStatus = useDeleteMemberStatus();

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete member");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.memberStatuses.all,
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      toast.success("멤버가 삭제되었습니다.");
    },
    onError: () => {
      toast.error("멤버 삭제에 실패했습니다.");
    },
  });

  // Add member form
  const {
    register,
    handleSubmit: handleFormSubmit,
    reset: resetAddForm,
    setError: setAddFormError,
    watch: watchAddForm,
    setValue: setAddFormValue,
    formState: { errors: addFormErrors },
  } = useForm<UserFormData>({
    defaultValues: {
      fullName: "",
      loginId: "",
      password: "",
      email: "",
      memberRole: "팀원",
      internMonths: "",
    },
  });

  const watchedMemberRole = watchAddForm("memberRole");

  const createUserMutation = useMutation({
    mutationFn: async (data: {
      fullName: string;
      loginId: string;
      password: string;
      email?: string;
      memberRole?: string;
      internMonths?: string;
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
        queryKey: queryKeys.memberStatuses.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.members.all,
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      toast.success("인원이 추가되었습니다.");
      setIsAddMemberOpen(false);
      resetAddForm();
    },
    onError: (error: Error) => {
      if (error.message === "Login ID already exists") {
        setAddFormError("loginId", { message: "이미 존재하는 아이디입니다." });
      } else {
        toast.error("인원 추가에 실패했습니다.");
      }
    },
  });

  const onSubmitAddMember = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };

  // Member note map (id → note)
  const noteMap = useMemo(() => {
    const map = new Map<string, string>();
    allMembers?.forEach((m) => {
      if (m.note) map.set(m.id, m.note);
    });
    return map;
  }, [allMembers]);

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const res = await fetch(`/api/members/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error("Failed to update note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
    },
    onError: () => {
      toast.error("비고 저장에 실패했습니다.");
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      full_name: string;
      email?: string;
      member_role: string;
      intern_months?: number | null;
    }) => {
      const res = await fetch(`/api/members/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: data.full_name,
          email: data.email || null,
          member_role: data.member_role,
          intern_months:
            data.member_role === "인턴" && data.intern_months
              ? data.intern_months
              : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update member");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.memberStatuses.all,
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      toast.success("인원 정보가 수정되었습니다.");
      setIsEditMemberOpen(false);
      setEditingMember(null);
    },
    onError: () => {
      toast.error("인원 정보 수정에 실패했습니다.");
    },
  });

  const handleEditMemberOpen = (row: MemberCurrentStatus) => {
    const member = allMembers?.find((m) => m.id === row.member_id);
    setEditingMember({
      id: row.member_id || "",
      full_name: row.full_name || "",
      email: row.email || "",
      member_role: member?.member_role || row.member_role || "팀원",
      intern_months: member?.intern_months?.toString() || "",
    });
    setIsEditMemberOpen(true);
  };

  const handleEditMemberSubmit = () => {
    if (!editingMember || !editingMember.full_name.trim()) return;
    updateMemberMutation.mutate({
      id: editingMember.id,
      full_name: editingMember.full_name.trim(),
      email: editingMember.email,
      member_role: editingMember.member_role,
      intern_months:
        editingMember.member_role === "인턴" && editingMember.intern_months
          ? parseInt(editingMember.intern_months, 10)
          : null,
    });
  };

  const members: MemberCurrentStatus[] = membersData ?? [];

  // Sort
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedMembers = useMemo(() => {
    if (!sortKey) return members;
    return [...members].sort((a, b) => {
      const aVal = (a[sortKey] ?? "") as string;
      const bVal = (b[sortKey] ?? "") as string;
      const cmp = aVal.localeCompare(bVal, "ko");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [members, sortKey, sortDir]);

  // Stats (필터와 무관하게 전체 기준)
  const allStatusMembers: MemberCurrentStatus[] = allMembersStatus ?? [];
  const totalCount = allStatusMembers.length;
  const activeStatusCount = allStatusMembers.filter(
    (m) => m.current_status,
  ).length;
  const normalCount = allStatusMembers.filter((m) => !m.current_status).length;

  // ── Create Handlers ──

  const resetForm = () => {
    setFormMemberId("");
    setFormStatus("");
    setFormStartDate("");
    setFormEndDate("");
    setFormNote("");
  };

  const handleCreateOpen = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = () => {
    if (!formMemberId || !formStatus || !formStartDate) return;
    createStatus.mutate(
      {
        member_id: formMemberId,
        status: formStatus,
        start_date: formStartDate,
        end_date: formEndDate || undefined,
        note: formNote || undefined,
      },
      {
        onSuccess: () => {
          setIsCreateOpen(false);
          resetForm();
        },
      },
    );
  };

  // ── Edit Handlers ──

  const handleEditSubmit = async () => {
    if (!editingId) return;
    if (formStatus === "정상") {
      // 정상으로 변경 = member_id 기준 활성 특이사항 전체 삭제
      if (!formMemberId) return;
      setIsClearing(true);
      try {
        const res = await fetch(
          `/api/member-statuses?member_id=${formMemberId}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "특이사항 삭제에 실패했습니다.");
        }
        toast.success("정상으로 변경되었습니다.");
        queryClient.invalidateQueries({
          queryKey: queryKeys.memberStatuses.all,
        });
        setIsEditOpen(false);
        setEditingId(null);
        resetForm();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "특이사항 삭제에 실패했습니다.",
        );
      } finally {
        setIsClearing(false);
      }
    } else {
      updateStatus.mutate(
        {
          id: editingId,
          status: formStatus || undefined,
          start_date: formStartDate || undefined,
          end_date: formEndDate || null,
          note: formNote || null,
        },
        {
          onSuccess: () => {
            setIsEditOpen(false);
            setEditingId(null);
            resetForm();
          },
        },
      );
    }
  };

  // ── Delete Handlers ──

  const handleDeleteConfirm = () => {
    if (!deletingItem) return;
    const onSuccess = () => {
      setIsDeleteOpen(false);
      setDeletingItem(null);
    };
    if (deletingItem.memberId) {
      deleteMemberMutation.mutate(deletingItem.memberId, { onSuccess });
    } else {
      deleteStatus.mutate(deletingItem.id, { onSuccess });
    }
  };

  // ── Status Cell Click Handler ──

  const handleStatusCellClick = (row: MemberCurrentStatus) => {
    if (row.status_id && row.current_status) {
      // 기존 특이사항 수정
      setEditingId(row.status_id);
      setFormMemberId(row.member_id || "");
      setFormStatus(row.current_status);
      setFormStartDate(row.status_start_date || "");
      setFormEndDate(row.status_end_date || "");
      setFormNote(row.status_note || "");
      setIsEditOpen(true);
    } else {
      // 신규 특이사항 등록
      resetForm();
      setFormMemberId(row.member_id || "");
      setIsCreateOpen(true);
    }
  };

  // ── History Handlers ──

  const handleHistoryOpen = (memberId: string, memberName: string) => {
    setHistoryMemberId(memberId);
    setHistoryMemberName(memberName);
    setIsHistoryOpen(true);
  };

  const handleHistoryEditOpen = (record: MemberStatus) => {
    setIsHistoryOpen(false);
    setEditingId(record.id);
    setFormMemberId(record.member_id);
    setFormStatus(record.status);
    setFormStartDate(record.start_date);
    setFormEndDate(record.end_date || "");
    setFormNote(record.note || "");
    setIsEditOpen(true);
  };

  const handleHistoryDeleteOpen = (record: MemberStatus) => {
    setIsHistoryOpen(false);
    setDeletingItem({
      id: record.id,
      name: historyMemberName,
      status: record.status,
    });
    setIsDeleteOpen(true);
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col gap-6">
      {/* Filter Bar + Stats */}
      <div className="relative z-20 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg bg-white px-5 py-3">
        <SearchableDropdown
          items={allMembers ?? []}
          value={allMembers?.find((m) => m.full_name === searchInput)?.id ?? ""}
          getItemKey={(m) => m.id}
          getItemLabel={(m) => m.full_name}
          onSelect={(m) => setSearchInput(m.full_name)}
          onClear={() => setSearchInput("")}
          placeholder="이름 검색"
          searchPlaceholder="이름 검색 (초성 가능)"
          emptyText="검색 결과가 없습니다"
          allowClear
          className="w-44"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 w-32 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="전체">전체</SelectItem>
            <SelectItem value="정상">정상</SelectItem>
            {STATUS_TYPES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={() => setIsAddMemberOpen(true)}
          size="sm"
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          인원 추가
        </Button>

        <div className="ml-auto flex items-center gap-5 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">전체</span>
            <span className="font-semibold tabular-nums text-slate-800">
              {totalCount}
            </span>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">정상</span>
            <span className="font-semibold tabular-nums text-slate-800">
              {normalCount}
            </span>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">특이사항</span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                activeStatusCount > 0 ? "text-amber-600" : "text-slate-800",
              )}
            >
              {activeStatusCount}
            </span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-panel min-h-0 flex-1 overflow-hidden rounded-xl">
        {isLoading ? (
          <div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-3">
                {Array.from({ length: 8 }).map((_, j) => (
                  <div
                    key={j}
                    className="h-4 flex-1 animate-pulse rounded bg-slate-100"
                  />
                ))}
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-lg font-medium text-slate-600">
              조회 결과가 없습니다
            </p>
            <p className="mt-1 text-sm text-slate-400">필터를 조정해보세요.</p>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-slate-50 [&>th]:h-9 [&>th]:px-3 [&>th]:py-0">
                  <TableHead className="pl-6 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-24 text-center">
                    이름
                  </TableHead>
                  <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    이메일
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-center text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-800"
                    onClick={() => handleSort("member_role")}
                  >
                    <span className="inline-flex items-center gap-1">
                      직급
                      <ArrowUpDown
                        className={cn(
                          "h-3 w-3",
                          sortKey === "member_role"
                            ? "text-[#135bec]"
                            : "text-slate-300",
                        )}
                      />
                    </span>
                  </TableHead>
                  <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    본부
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-left text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-800"
                    onClick={() => handleSort("team_name")}
                  >
                    <span className="inline-flex items-center gap-1">
                      팀
                      <ArrowUpDown
                        className={cn(
                          "h-3 w-3",
                          sortKey === "team_name"
                            ? "text-[#135bec]"
                            : "text-slate-300",
                        )}
                      />
                    </span>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-center text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-800"
                    onClick={() => handleSort("current_status")}
                  >
                    <span className="inline-flex items-center gap-1">
                      특이사항
                      <ArrowUpDown
                        className={cn(
                          "h-3 w-3",
                          sortKey === "current_status"
                            ? "text-[#135bec]"
                            : "text-slate-300",
                        )}
                      />
                    </span>
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    기간(일자)
                  </TableHead>
                  <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    메모
                  </TableHead>
                  <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    비고
                  </TableHead>
                  <TableHead className="w-12 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    삭제
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100/60">
                {sortedMembers.map((row) => {
                  const displayStatus = row.current_status || "정상";
                  const colorClass =
                    STATUS_COLORS[displayStatus] || STATUS_COLORS["정상"];
                  return (
                    <TableRow
                      key={`${row.member_id}-${row.status_id || "normal"}`}
                      className="transition-colors hover:bg-slate-50/50 [&>td]:px-3 [&>td]:py-1.5"
                    >
                      <TableCell className="pl-6 text-sm font-medium w-24 text-center">
                        <button
                          onClick={() => handleEditMemberOpen(row)}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                          title="인원 정보 수정"
                        >
                          {row.full_name}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {row.email || "-"}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {row.member_role ? (
                          <Badge
                            className={cn(
                              "border-0 px-2 py-0.5 text-[11px] font-medium",
                              (row.member_role as string) === "대표"
                                ? "bg-rose-100 text-rose-700"
                                : row.member_role === "본부장"
                                  ? "bg-purple-100 text-purple-700"
                                  : row.member_role === "팀장"
                                    ? "bg-blue-100 text-blue-700"
                                    : row.member_role === "인턴"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-slate-100 text-slate-600",
                            )}
                          >
                            {row.member_role}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-left text-sm text-slate-600">
                        {row.division_name || "-"}
                      </TableCell>
                      <TableCell className="text-left text-sm text-slate-600">
                        {row.team_name || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={cn(
                            "cursor-pointer border-0 px-2 py-0.5 text-[11px] transition-all hover:ring-2 hover:ring-offset-1",
                            colorClass,
                            row.current_status
                              ? "hover:ring-slate-300"
                              : "hover:ring-[#135bec]/30",
                          )}
                          onClick={() => handleStatusCellClick(row)}
                        >
                          {displayStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm text-slate-600">
                        {row.status_start_date
                          ? row.current_status === "퇴사"
                            ? row.status_start_date
                            : `${row.status_start_date} ~ ${row.status_end_date || "진행중"}`
                          : "-"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-slate-600">
                        {row.status_note || "-"}
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        <input
                          key={`${row.member_id}-${noteMap.get(row.member_id!) || ""}`}
                          defaultValue={noteMap.get(row.member_id!) || ""}
                          onBlur={(e) => {
                            const newVal = e.target.value.trim();
                            const oldVal = noteMap.get(row.member_id!) || "";
                            if (newVal !== oldVal && row.member_id) {
                              updateNoteMutation.mutate({
                                id: row.member_id,
                                note: newVal,
                              });
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter")
                              (e.target as HTMLInputElement).blur();
                          }}
                          className="w-full rounded border-0 bg-transparent px-1.5 py-0.5 text-sm text-slate-600 outline-none focus:bg-white focus:ring-1 focus:ring-slate-300"
                          placeholder="-"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {row.current_status === "퇴사" && (
                          <button
                            onClick={() => {
                              setDeletingItem({
                                id: row.status_id!,
                                memberId: row.member_id!,
                                name: row.full_name || "",
                                status: "퇴사",
                              });
                              setIsDeleteOpen(true);
                            }}
                            className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                            title="멤버 삭제"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Member Dialog ── */}
      <Dialog
        open={isAddMemberOpen}
        onOpenChange={(open) => {
          setIsAddMemberOpen(open);
          if (!open) resetAddForm();
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>인원 추가</DialogTitle>
            <DialogDescription>새 인원 정보를 입력하세요.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit(onSubmitAddMember)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="addFullName">이름</Label>
                <Input
                  id="addFullName"
                  placeholder="홍길동"
                  className={
                    addFormErrors.fullName
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }
                  {...register("fullName", {
                    required: "이름을 입력해주세요.",
                  })}
                />
                {addFormErrors.fullName && (
                  <p className="text-sm text-red-500">
                    {addFormErrors.fullName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="addLoginId">아이디</Label>
                <Input
                  id="addLoginId"
                  placeholder="hong123"
                  className={
                    addFormErrors.loginId
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }
                  {...register("loginId", {
                    required: "아이디를 입력해주세요.",
                  })}
                />
                {addFormErrors.loginId && (
                  <p className="text-sm text-red-500">
                    {addFormErrors.loginId.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="addPassword">비밀번호</Label>
                <div className="relative">
                  <Input
                    id="addPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={
                      addFormErrors.password
                        ? "border-red-500 focus-visible:ring-red-500 pr-10"
                        : "pr-10"
                    }
                    {...register("password", {
                      required: "비밀번호를 입력해주세요.",
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {addFormErrors.password && (
                  <p className="text-sm text-red-500">
                    {addFormErrors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="addEmail">이메일 (선택)</Label>
                <Input
                  id="addEmail"
                  type="email"
                  placeholder="hong@example.com"
                  className={
                    addFormErrors.email
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
                {addFormErrors.email && (
                  <p className="text-sm text-red-500">
                    {addFormErrors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>직급</Label>
                <Select
                  value={watchedMemberRole}
                  onValueChange={(val) => {
                    setAddFormValue("memberRole", val);
                    if (val !== "인턴") setAddFormValue("internMonths", "");
                  }}
                >
                  <SelectTrigger className="border border-slate-200 w-full">
                    <SelectValue placeholder="직급 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="팀원">팀원</SelectItem>
                    <SelectItem value="인턴">인턴</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {watchedMemberRole === "인턴" && (
                <div className="space-y-2">
                  <Label htmlFor="addInternMonths">인턴 기간 (개월)</Label>
                  <Input
                    id="addInternMonths"
                    type="number"
                    min={1}
                    max={6}
                    placeholder="1~6"
                    {...register("internMonths", {
                      min: { value: 1, message: "1 이상 입력해주세요." },
                      max: { value: 6, message: "6 이하로 입력해주세요." },
                    })}
                  />
                  {addFormErrors.internMonths && (
                    <p className="text-sm text-red-500">
                      {addFormErrors.internMonths.message}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddMemberOpen(false);
                  resetAddForm();
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

      {/* ── Create Dialog ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>특이사항 등록</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>멤버</Label>
              {formMemberId &&
              allMembers?.find((m) => m.id === formMemberId) ? (
                <Input
                  value={
                    allMembers.find((m) => m.id === formMemberId)!.full_name
                  }
                  disabled
                  className="bg-slate-50"
                />
              ) : (
                <SearchableDropdown
                  items={allMembers ?? []}
                  value={formMemberId}
                  getItemKey={(m) => m.id}
                  getItemLabel={(m) => m.full_name}
                  onSelect={(m) => setFormMemberId(m.id)}
                  onClear={() => setFormMemberId("")}
                  placeholder="멤버 선택"
                  searchPlaceholder="이름 검색 (초성 가능)"
                  emptyText="검색 결과가 없습니다"
                  allowClear
                  className="w-full"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>특이사항</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger className="border border-slate-200 w-full">
                  <SelectValue placeholder="특이사항 선택" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formStatus === "퇴사" ? (
              <div className="space-y-2">
                <Label>퇴사일</Label>
                <DatePicker
                  value={formStartDate}
                  onChange={(val) => {
                    setFormStartDate(val);
                    setFormEndDate(val);
                  }}
                  placeholder="퇴사일 선택"
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>시작일</Label>
                  <DatePicker
                    value={formStartDate}
                    onChange={(val) => setFormStartDate(val)}
                    placeholder="시작일 선택"
                  />
                </div>

                <div className="space-y-2">
                  <Label>종료일 (미입력 시 진행중)</Label>
                  <DatePicker
                    value={formEndDate}
                    onChange={(val) => setFormEndDate(val)}
                    placeholder="종료일 선택"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>비고</Label>
              <Textarea
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="특이사항을 입력하세요"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleCreateSubmit}
              disabled={
                createStatus.isPending ||
                !formMemberId ||
                !formStatus ||
                !formStartDate
              }
            >
              {createStatus.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  등록 중...
                </>
              ) : (
                "등록"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>특이사항 수정</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>특이사항</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger className="border border-slate-200 w-full">
                  <SelectValue placeholder="특이사항 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="정상">정상</SelectItem>
                  {STATUS_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formStatus !== "정상" && (
              <>
                {formStatus === "퇴사" ? (
                  <div className="space-y-2">
                    <Label>퇴사일</Label>
                    <DatePicker
                      value={formStartDate}
                      onChange={(val) => {
                        setFormStartDate(val);
                        setFormEndDate(val);
                      }}
                      placeholder="퇴사일 선택"
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>시작일</Label>
                      <DatePicker
                        value={formStartDate}
                        onChange={(val) => setFormStartDate(val)}
                        placeholder="시작일 선택"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>종료일 (미입력 시 진행중)</Label>
                      <DatePicker
                        value={formEndDate}
                        onChange={(val) => setFormEndDate(val)}
                        placeholder="종료일 선택"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>비고</Label>
                  <Textarea
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    placeholder="특이사항을 입력하세요"
                    rows={2}
                  />
                </div>
              </>
            )}

            {formStatus === "정상" && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-700">
                  정상으로 변경하면 현재 특이사항 기록이 삭제됩니다.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={updateStatus.isPending || isClearing}
              variant={formStatus === "정상" ? "destructive" : "default"}
            >
              {updateStatus.isPending || isClearing ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : formStatus === "정상" ? (
                "정상으로 변경"
              ) : (
                "저장"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {deletingItem?.memberId ? "멤버 삭제" : "특이사항 삭제"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <p className="text-sm text-rose-700">
                {deletingItem?.memberId
                  ? "이 작업은 되돌릴 수 없습니다. 해당 멤버와 관련 데이터가 삭제됩니다."
                  : "이 작업은 되돌릴 수 없습니다. 해당 특이사항 기록이 삭제됩니다."}
              </p>
            </div>

            {deletingItem && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-1">
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-700">이름:</span>{" "}
                  {deletingItem.name}
                </p>
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-700">특이사항:</span>{" "}
                  {deletingItem.status}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={
                deleteStatus.isPending || deleteMemberMutation.isPending
              }
            >
              {deleteStatus.isPending || deleteMemberMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  삭제 중...
                </>
              ) : (
                "삭제"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Member Dialog ── */}
      <Dialog
        open={isEditMemberOpen}
        onOpenChange={(open) => {
          setIsEditMemberOpen(open);
          if (!open) setEditingMember(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>인원 정보 수정</DialogTitle>
            <DialogDescription>
              인원의 기본 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          {editingMember && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editFullName">이름</Label>
                <Input
                  id="editFullName"
                  value={editingMember.full_name}
                  onChange={(e) =>
                    setEditingMember({
                      ...editingMember,
                      full_name: e.target.value,
                    })
                  }
                  placeholder="홍길동"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEmail">이메일 (선택)</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editingMember.email}
                  onChange={(e) =>
                    setEditingMember({
                      ...editingMember,
                      email: e.target.value,
                    })
                  }
                  placeholder="hong@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>직급</Label>
                <Select
                  value={editingMember.member_role}
                  onValueChange={(val) =>
                    setEditingMember({
                      ...editingMember,
                      member_role: val,
                      intern_months:
                        val !== "인턴" ? "" : editingMember.intern_months,
                    })
                  }
                >
                  <SelectTrigger className="border border-slate-200 w-full">
                    <SelectValue placeholder="직급 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="팀원">팀원</SelectItem>
                    <SelectItem value="인턴">인턴</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingMember.member_role === "인턴" && (
                <div className="space-y-2">
                  <Label htmlFor="editInternMonths">인턴 기간 (개월)</Label>
                  <Input
                    id="editInternMonths"
                    type="number"
                    min={1}
                    max={6}
                    value={editingMember.intern_months}
                    onChange={(e) =>
                      setEditingMember({
                        ...editingMember,
                        intern_months: e.target.value,
                      })
                    }
                    placeholder="1~6"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditMemberOpen(false);
                setEditingMember(null);
              }}
            >
              취소
            </Button>
            <Button
              onClick={handleEditMemberSubmit}
              disabled={
                updateMemberMutation.isPending ||
                !editingMember?.full_name.trim()
              }
            >
              {updateMemberMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                "저장"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── History Modal ── */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{historyMemberName} - 특이사항 이력</DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-auto">
            {isHistoryLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2 rounded-md border p-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : !historyData || historyData.length === 0 ? (
              <div className="py-12 text-center">
                <History className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-600">
                  특이사항 이력이 없습니다
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  정상 근무 중인 멤버입니다
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyData.map((record) => {
                  const colorClass =
                    STATUS_COLORS[record.status] || STATUS_COLORS["정상"];
                  return (
                    <div
                      key={record.id}
                      className="rounded-md border border-slate-200 bg-white p-3"
                    >
                      <div className="flex items-center justify-between">
                        <Badge
                          className={cn(
                            "border-0 px-2 py-0.5 text-[11px]",
                            colorClass,
                          )}
                        >
                          {record.status}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400">
                            {record.status === "퇴사"
                              ? record.start_date
                              : `${record.start_date} ~ ${record.end_date || "진행중"}`}
                          </span>
                          <button
                            onClick={() => handleHistoryEditOpen(record)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-[#135bec]/10 hover:text-[#135bec]"
                            title="수정"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleHistoryDeleteOpen(record)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                            title="삭제"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      {record.note && (
                        <p className="mt-2 text-sm text-slate-600">
                          {record.note}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-slate-400">
                        등록: {record.created_at?.slice(0, 10)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
