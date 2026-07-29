"use client";

import type { ReactNode } from "react";
import { useState, useMemo } from "react";
import Link from "next/link";
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
import { Checkbox } from "@repo/ui/src/checkbox";
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
import { usePositions } from "@/hooks/usePositions";
import { useTitles } from "@/hooks/useTitles";
import type {
  MemberCurrentStatus,
  MemberStatus,
  MemberStatusType,
} from "@/lib/supabase/types";
import { STATUS_COLORS } from "@/lib/constants";
import {
  ADMIN_ROLES,
  DEFAULT_ADMIN_ROLE,
  USER_AUTHORITIES,
  getAdminRoleLabel,
} from "@/lib/rbac";

// ── Constants ──

const STATUS_TYPES: MemberStatusType[] = [
  "육아휴직",
  "병가",
  "재택근무",
  "파견",
  "휴직",
  "퇴사",
];

const ADMIN_ROLE_BADGE_STYLES: Record<string, string> = {
  대표: "bg-slate-100 text-slate-800",
  팀장: "bg-slate-50 text-slate-700",
  일반: "bg-slate-50 text-slate-700",
};

interface MemberOption {
  id: string;
  full_name: string;
  note: string | null;
  email: string | null;
  member_role: string | null;
  intern_months: number | null;
  role: string | null;
  admin_role: string | null;
  user_authority: string | null;
}

interface UserFormData {
  fullName: string;
  loginId: string;
  password: string;
  email: string;
  birthDate: string;
  phone: string;
  passportNumber: string;
  memberRole: string;
  internMonths: string;
  role: string;
  adminRole: string;
  userAuthority: string;
  position_id: string;
  title_id: string;
}

type SortKey = "member_role" | "team_name" | "current_status";
type SortDir = "asc" | "desc";

// ── Main View ──

export default function MemberStatusView({
  toolbarRight,
}: {
  toolbarRight?: ReactNode;
}) {
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
    login_id: string;
    password: string;
    full_name: string;
    email: string;
    birth_date: string;
    phone: string;
    passport_number: string;
    member_role: string;
    intern_months: string;
    role: string;
    admin_role: string;
    user_authority: string;
    position_id: string;
    title_id: string;
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
    memberRole?: string;
    internMonths?: number;
    teamId?: string;
  } | null>(null);
  const [actualMonths, setActualMonths] = useState<number>(1);
  const [isDeleting, setIsDeleting] = useState(false);

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
  const { data: positions } = usePositions();
  const { data: titles } = useTitles();

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
      queryClient.invalidateQueries({
        queryKey: queryKeys.budgetAllocations.all,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetSummary.all });
      queryClient.invalidateQueries({ queryKey: ["organizations", "tree"] });
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
      birthDate: "",
      phone: "",
      passportNumber: "",
      memberRole: "팀원",
      internMonths: "",
      role: "user",
      adminRole: DEFAULT_ADMIN_ROLE,
      userAuthority: "",
      position_id: "",
      title_id: "",
    },
  });

  const watchedMemberRole = watchAddForm("memberRole");
  const watchedRole = watchAddForm("role");
  const watchedPositionId = watchAddForm("position_id");
  const watchedTitleId = watchAddForm("title_id");

  const createUserMutation = useMutation({
    mutationFn: async (data: {
      fullName: string;
      loginId: string;
      password: string;
      email?: string;
      birthDate?: string;
      phone?: string;
      passportNumber?: string;
      memberRole?: string;
      internMonths?: string;
      position_id?: string;
      title_id?: string;
      role?: string;
      adminRole?: string;
      userAuthority?: string;
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.budgetAllocations.all,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetSummary.all });
      queryClient.invalidateQueries({ queryKey: ["organizations", "tree"] });
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
    createUserMutation.mutate({
      ...data,
      birthDate: data.birthDate || undefined,
      phone: data.phone || undefined,
      passportNumber: data.passportNumber || undefined,
      position_id: data.position_id || undefined,
      title_id: data.title_id || undefined,
      adminRole: data.role === "admin" ? data.adminRole : undefined,
      userAuthority: data.userAuthority || undefined,
    });
  };

  // Member note map (id → note)
  const noteMap = useMemo(() => {
    const map = new Map<string, string>();
    allMembers?.forEach((m) => {
      if (m.note) map.set(m.id, m.note);
    });
    return map;
  }, [allMembers]);

  const memberById = useMemo(() => {
    const map = new Map<string, MemberOption>();
    allMembers?.forEach((member) => {
      map.set(member.id, member);
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
      login_id?: string;
      password?: string;
      full_name: string;
      email?: string;
      birth_date?: string;
      phone?: string;
      passport_number?: string;
      member_role: string;
      intern_months?: number | null;
      role?: string;
      admin_role?: string | null;
      user_authority?: string | null;
      position_id?: string;
      title_id?: string | null;
    }) => {
      const res = await fetch(`/api/members/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: data.full_name,
          login_id: data.login_id,
          ...(data.password ? { password: data.password } : {}),
          email: data.email || null,
          birth_date: data.birth_date || null,
          phone: data.phone || null,
          passport_number: data.passport_number || null,
          member_role: data.member_role,
          intern_months:
            data.member_role === "인턴" && data.intern_months
              ? data.intern_months
              : null,
          role: data.role,
          admin_role: data.role === "admin" ? data.admin_role : null,
          user_authority: data.user_authority || null,
          ...(data.position_id !== undefined
            ? { position_id: data.position_id }
            : {}),
          title_id: data.title_id ?? null,
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
    onError: (error: Error) => {
      if (error.message === "Login ID already exists") {
        toast.error("이미 존재하는 아이디입니다.");
      } else {
        toast.error("인원 정보 수정에 실패했습니다.");
      }
    },
  });

  const handleEditMemberOpen = (row: MemberCurrentStatus) => {
    const member = allMembers?.find((m) => m.id === row.member_id);
    setEditingMember({
      id: row.member_id || "",
      login_id: row.login_id || "",
      password: "",
      full_name: row.full_name || "",
      email: row.email || "",
      birth_date: row.birth_date || "",
      phone: row.phone || "",
      passport_number: row.passport_number || "",
      member_role: member?.member_role || row.member_role || "팀원",
      intern_months: member?.intern_months?.toString() || "",
      role: member?.role || "user",
      admin_role: member?.admin_role || DEFAULT_ADMIN_ROLE,
      user_authority: member?.user_authority || "",
      position_id: row.position_id || "",
      title_id: row.title_id || "",
    });
    setIsEditMemberOpen(true);
  };

  const handleEditMemberSubmit = () => {
    if (
      !editingMember ||
      !editingMember.full_name.trim() ||
      !editingMember.login_id.trim()
    ) {
      return;
    }
    updateMemberMutation.mutate({
      id: editingMember.id,
      login_id: editingMember.login_id.trim(),
      password: editingMember.password.trim() || undefined,
      full_name: editingMember.full_name.trim(),
      email: editingMember.email,
      birth_date: editingMember.birth_date || undefined,
      phone: editingMember.phone || undefined,
      passport_number: editingMember.passport_number || undefined,
      member_role: editingMember.member_role,
      intern_months:
        editingMember.member_role === "인턴" && editingMember.intern_months
          ? parseInt(editingMember.intern_months, 10)
          : null,
      role: editingMember.role,
      admin_role:
        editingMember.role === "admin" ? editingMember.admin_role : null,
      user_authority: editingMember.user_authority || null,
      position_id: editingMember.position_id || undefined,
      title_id: editingMember.title_id || null,
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

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    const onSuccess = () => {
      setIsDeleteOpen(false);
      setDeletingItem(null);
    };

    // 특이사항만 삭제 (멤버 삭제 아님)
    if (!deletingItem.memberId) {
      deleteStatus.mutate(deletingItem.id, { onSuccess });
      return;
    }

    const role = deletingItem.memberRole;

    // 팀장/본부장: 재계산 없이 기존 DELETE API 사용
    if (role === "대표" || role === "팀장" || role === "본부장") {
      deleteMemberMutation.mutate(deletingItem.memberId, { onSuccess });
      return;
    }

    // 인턴/팀원: recalc-on-delete API 사용 (삭제 + 재계산 통합)
    setIsDeleting(true);
    try {
      const currentMonth = new Date().getMonth() + 1;
      const period = `${new Date().getFullYear()}-${currentMonth <= 6 ? "H1" : "H2"}`;

      const res = await fetch("/api/budget-allocations/recalc-on-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: deletingItem.memberId,
          period,
          intern_actual_months: role === "인턴" ? actualMonths : undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete member");
      }

      // 성공 시 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.memberStatuses.all,
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.budgetAllocations.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.budgetSummary.all,
      });
      queryClient.invalidateQueries({ queryKey: ["organizations", "tree"] });
      toast.success("멤버가 삭제되었습니다.");
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "멤버 삭제에 실패했습니다.",
      );
    } finally {
      setIsDeleting(false);
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
      <div className="relative z-20 flex flex-wrap items-center gap-x-6 gap-y-3 py-3">
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
          className="w-44 h-10"
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
          className="gap-1.5 h-10"
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
                activeStatusCount > 0 ? "text-slate-600" : "text-slate-800",
              )}
            >
              {activeStatusCount}
            </span>
          </div>
          {toolbarRight && <div className="h-4 w-px bg-slate-200" />}
          {toolbarRight}
        </div>
      </div>

      {/* Main Table */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl bg-white">
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
              <TableHeader className="sticky top-0 z-10 bg-white">
                <TableRow className="border-b border-slate-100 [&>th]:h-auto [&>th]:px-3 [&>th]:py-1.5 [&>th]:text-xs [&>th]:font-medium [&>th]:text-slate-400">
                  <TableHead className="pl-6 text-center w-24">이름</TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-left hover:text-slate-600"
                    onClick={() => handleSort("team_name")}
                  >
                    <span className="inline-flex items-center gap-1">
                      팀명
                      <ArrowUpDown
                        className={cn(
                          "h-3 w-3",
                          sortKey === "team_name"
                            ? "text-[#1d1d1f]"
                            : "text-slate-300",
                        )}
                      />
                    </span>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-left hover:text-slate-600"
                    onClick={() => handleSort("member_role")}
                  >
                    <span className="inline-flex items-center gap-1">
                      직급
                      <ArrowUpDown
                        className={cn(
                          "h-3 w-3",
                          sortKey === "member_role"
                            ? "text-[#1d1d1f]"
                            : "text-slate-300",
                        )}
                      />
                    </span>
                  </TableHead>
                  <TableHead className="text-left">직책</TableHead>
                  <TableHead className="text-center">아이디</TableHead>
                  <TableHead className="text-center">생년월일</TableHead>
                  <TableHead className="text-center">휴대폰번호</TableHead>
                  <TableHead className="text-center w-16">권한</TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-center hover:text-slate-600"
                    onClick={() => handleSort("current_status")}
                  >
                    <span className="inline-flex items-center gap-1">
                      상태
                      <ArrowUpDown
                        className={cn(
                          "h-3 w-3",
                          sortKey === "current_status"
                            ? "text-[#1d1d1f]"
                            : "text-slate-300",
                        )}
                      />
                    </span>
                  </TableHead>
                  <TableHead className="text-center">가입일</TableHead>
                  <TableHead className="text-center w-16">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedMembers.map((row) => {
                  const displayStatus = row.current_status || "정상";
                  const colorClass =
                    STATUS_COLORS[displayStatus] || STATUS_COLORS["정상"];
                  const member = row.member_id
                    ? memberById.get(row.member_id)
                    : undefined;
                  const isAdmin = member?.role === "admin";
                  const adminRole = member?.admin_role || DEFAULT_ADMIN_ROLE;
                  return (
                    <TableRow
                      key={`${row.member_id}-${row.status_id || "normal"}`}
                      className="border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50 [&>td]:px-3 [&>td]:py-2 [&>td]:text-[13px]"
                    >
                      <TableCell className="pl-6 text-sm font-medium w-24 text-center">
                        {row.member_id ? (
                          <Link
                            href={`/organization/members/${row.member_id}`}
                            className="text-slate-800 hover:text-slate-900 hover:underline"
                            title="인원 상세 보기"
                          >
                            {row.full_name}
                          </Link>
                        ) : (
                          <span className="text-slate-800">
                            {row.full_name || "-"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-left text-sm text-slate-600">
                        {row.team_name || "-"}
                      </TableCell>
                      <TableCell className="text-left text-sm">
                        {row.position_name ? (
                          <span className="text-[12px] font-medium text-slate-700">
                            {row.position_name}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-left text-sm">
                        {row.title_name ? (
                          <span className="text-[12px] text-slate-600">
                            {row.title_name}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm text-slate-500">
                        {row.login_id || "-"}
                      </TableCell>
                      <TableCell className="text-center text-sm text-slate-500">
                        {row.birth_date || "-"}
                      </TableCell>
                      <TableCell className="text-center text-sm text-slate-500">
                        {row.phone || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {isAdmin ? (
                          <Badge
                            variant="secondary"
                            className={cn(
                              "w-[68px] justify-center border-0 px-1.5 py-0.5 text-[10px] font-medium",
                              ADMIN_ROLE_BADGE_STYLES[adminRole] ||
                                ADMIN_ROLE_BADGE_STYLES[DEFAULT_ADMIN_ROLE],
                            )}
                          >
                            {getAdminRoleLabel(adminRole)}
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            일반
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={cn(
                            "cursor-pointer rounded-full border-0 px-2 py-0.5 text-xs font-medium transition-all hover:ring-2 hover:ring-offset-1",
                            colorClass,
                            row.current_status
                              ? "hover:ring-slate-300"
                              : "hover:ring-[#1d1d1f]/30",
                          )}
                          onClick={() => handleStatusCellClick(row)}
                        >
                          {displayStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm text-slate-500">
                        {row.created_at
                          ? new Date(row.created_at).toLocaleDateString("ko-KR")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {row.member_id && (
                            <button
                              onClick={() => handleEditMemberOpen(row)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                              title="인원 정보 수정"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {row.current_status === "퇴사" && (
                            <button
                              onClick={() => {
                                const member = allMembers?.find(
                                  (m) => m.id === row.member_id,
                                );
                                setDeletingItem({
                                  id: row.status_id!,
                                  memberId: row.member_id!,
                                  name: row.full_name || "",
                                  status: "퇴사",
                                  memberRole: row.member_role || undefined,
                                  internMonths:
                                    member?.intern_months || undefined,
                                  teamId: row.team_id || undefined,
                                });
                                setActualMonths(member?.intern_months || 1);
                                setIsDeleteOpen(true);
                              }}
                              className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
                              title="멤버 삭제"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
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
        <DialogContent style={{ maxWidth: 672 }}>
          <DialogHeader>
            <DialogTitle>인원 추가</DialogTitle>
            <DialogDescription>새 인원 정보를 입력하세요.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit(onSubmitAddMember)}>
            <div className="py-5">
              {/* 기본 정보 */}
              <div className="mb-8 space-y-4 last:mb-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  기본 정보
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="addFullName">이름</Label>
                    <Input
                      id="addFullName"
                      placeholder="홍길동"
                      className={
                        addFormErrors.fullName
                          ? "border-slate-500 focus-visible:ring-slate-500"
                          : ""
                      }
                      {...register("fullName", {
                        required: "이름을 입력해주세요.",
                      })}
                    />
                    {addFormErrors.fullName && (
                      <p className="text-sm text-slate-500">
                        {addFormErrors.fullName.message}
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
                          ? "border-slate-500 focus-visible:ring-slate-500"
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
                      <p className="text-sm text-slate-500">
                        {addFormErrors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addBirthDate">생년월일 (선택)</Label>
                    <Input
                      id="addBirthDate"
                      type="date"
                      {...register("birthDate")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addPhone">휴대폰번호 (선택)</Label>
                    <Input
                      id="addPhone"
                      type="tel"
                      placeholder="010-1234-5678"
                      {...register("phone")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addPassportNumber">여권번호 (선택)</Label>
                    <Input
                      id="addPassportNumber"
                      placeholder="M12345678"
                      {...register("passportNumber")}
                    />
                  </div>
                </div>
              </div>

              {/* 직급/직책 */}
              <div className="mb-8 space-y-4 last:mb-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  직급 / 직책
                </p>
                <div className="flex gap-4">
                  <div className="space-y-2 flex-1">
                    <Label>직급</Label>
                    <Select
                      value={watchedPositionId}
                      onValueChange={(val) => {
                        setAddFormValue("position_id", val);
                        const selected = positions?.find((p) => p.id === val);
                        if (selected?.name !== "인턴")
                          setAddFormValue("internMonths", "");
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="직급 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {(positions ?? []).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {positions?.find((p) => p.id === watchedPositionId)?.name ===
                    "인턴" && (
                    <div className="space-y-2 w-32">
                      <Label htmlFor="addInternMonths">개월 수</Label>
                      <Input
                        id="addInternMonths"
                        type="number"
                        min={1}
                        max={12}
                        placeholder="1~12"
                        {...register("internMonths", {
                          min: { value: 1, message: "1 이상" },
                          max: { value: 12, message: "12 이하" },
                        })}
                      />
                      {addFormErrors.internMonths && (
                        <p className="text-sm text-slate-500">
                          {addFormErrors.internMonths.message}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="space-y-2 flex-1">
                    <Label>직책 (선택)</Label>
                    <Select
                      value={watchedTitleId}
                      onValueChange={(val) =>
                        setAddFormValue(
                          "title_id",
                          val === "__none__" ? "" : val,
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="직책 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">없음</SelectItem>
                        {(titles ?? []).map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 계정 정보 */}
              <div className="mb-8 space-y-4 last:mb-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  계정 정보
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="addLoginId">아이디</Label>
                    <Input
                      id="addLoginId"
                      placeholder="hong123"
                      className={
                        addFormErrors.loginId
                          ? "border-slate-500 focus-visible:ring-slate-500"
                          : ""
                      }
                      {...register("loginId", {
                        required: "아이디를 입력해주세요.",
                      })}
                    />
                    {addFormErrors.loginId && (
                      <p className="text-sm text-slate-500">
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
                            ? "border-slate-500 focus-visible:ring-slate-500 pr-10"
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
                      <p className="text-sm text-slate-500">
                        {addFormErrors.password.message}
                      </p>
                    )}
                  </div>
                </div>
                <label className="flex w-full items-center justify-between rounded-md bg-white px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors">
                  <span className="text-sm font-medium">관리자 권한</span>
                  <Checkbox
                    checked={watchedRole === "admin"}
                    onCheckedChange={(checked) =>
                      setAddFormValue("role", checked ? "admin" : "user")
                    }
                  />
                </label>
                {watchedRole === "admin" && (
                  <div className="space-y-2">
                    <Label>어드민 권한</Label>
                    <Select
                      value={watchAddForm("adminRole")}
                      onValueChange={(value) =>
                        setAddFormValue("adminRole", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="어드민 권한 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {ADMIN_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {getAdminRoleLabel(role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>User 권한</Label>
                  <Select
                    value={watchAddForm("userAuthority") || "__none__"}
                    onValueChange={(value) =>
                      setAddFormValue(
                        "userAuthority",
                        value === "__none__" ? "" : value,
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="User 권한 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">없음</SelectItem>
                      {USER_AUTHORITIES.map((authority) => (
                        <SelectItem key={authority} value={authority}>
                          {authority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>특이사항 등록</DialogTitle>
            <DialogDescription>
              대상 인원과 적용 기간을 선택해 특이사항을 등록합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">멤버</Label>
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
              <Label className="text-xs font-medium text-slate-500">
                특이사항
              </Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger className="w-full">
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
                <Label className="text-xs font-medium text-slate-500">
                  퇴사일
                </Label>
                <DatePicker
                  value={formStartDate}
                  onChange={(val) => {
                    setFormStartDate(val);
                    setFormEndDate(val);
                  }}
                  placeholder="퇴사일 선택"
                  className="h-10 bg-white"
                  modal
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-slate-500">
                    기간
                  </Label>
                  <span className="text-[11px] text-slate-400">
                    종료일 미입력 시 진행중
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-medium text-slate-400">
                      시작일
                    </span>
                    <DatePicker
                      value={formStartDate}
                      onChange={(val) => setFormStartDate(val)}
                      placeholder="시작일 선택"
                      className="h-10 bg-white"
                      modal
                    />
                  </div>
                  <span className="hidden pb-2 text-sm text-slate-400 sm:block">
                    ~
                  </span>
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-medium text-slate-400">
                      종료일
                    </span>
                    <DatePicker
                      value={formEndDate}
                      onChange={(val) => setFormEndDate(val)}
                      placeholder="종료일 선택"
                      className="h-10 bg-white"
                      modal
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-500">비고</Label>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>특이사항 수정</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>특이사항</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger className="w-full">
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
                      modal
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
                        modal
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>종료일 (미입력 시 진행중)</Label>
                      <DatePicker
                        value={formEndDate}
                        onChange={(val) => setFormEndDate(val)}
                        placeholder="종료일 선택"
                        modal
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
              <div className="flex items-start gap-2 rounded-md bg-slate-50 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                <p className="text-sm text-slate-700">
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
            <div className="flex items-start gap-2 rounded-md bg-slate-50 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
              <p className="text-sm text-slate-700">
                {deletingItem?.memberId
                  ? "이 작업은 되돌릴 수 없습니다. 해당 멤버와 관련 데이터가 삭제됩니다."
                  : "이 작업은 되돌릴 수 없습니다. 해당 특이사항 기록이 삭제됩니다."}
              </p>
            </div>

            {deletingItem && (
              <div className="rounded-md bg-slate-50 p-3 space-y-1">
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

            {deletingItem?.memberRole === "인턴" && (
              <div className="space-y-1.5 rounded-md bg-slate-50 p-3">
                <Label
                  htmlFor="actual-months"
                  className="text-sm font-medium text-slate-700"
                >
                  실제 근무 개월
                </Label>
                <Input
                  id="actual-months"
                  type="number"
                  min={1}
                  max={6}
                  value={actualMonths}
                  onChange={(e) =>
                    setActualMonths(parseInt(e.target.value) || 1)
                  }
                />
                <p className="text-xs text-slate-400">
                  기존 등록: {deletingItem.internMonths}개월 → 실제:{" "}
                  {actualMonths}개월로 재계산됩니다
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
                deleteStatus.isPending ||
                deleteMemberMutation.isPending ||
                isDeleting
              }
            >
              {deleteStatus.isPending ||
              deleteMemberMutation.isPending ||
              isDeleting ? (
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>인원 정보 수정</DialogTitle>
            <DialogDescription>
              인원의 기본 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          {editingMember && (
            <div className="py-5">
              {/* 기본 정보 */}
              <div className="mb-8 space-y-4 last:mb-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  기본 정보
                </p>
                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="editBirthDate">생년월일 (선택)</Label>
                    <Input
                      id="editBirthDate"
                      type="date"
                      value={editingMember.birth_date}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          birth_date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editPhone">휴대폰번호 (선택)</Label>
                    <Input
                      id="editPhone"
                      type="tel"
                      value={editingMember.phone}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          phone: e.target.value,
                        })
                      }
                      placeholder="010-1234-5678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editPassportNumber">여권번호 (선택)</Label>
                    <Input
                      id="editPassportNumber"
                      value={editingMember.passport_number}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          passport_number: e.target.value,
                        })
                      }
                      placeholder="M12345678"
                    />
                  </div>
                </div>
              </div>

              {/* 직급/직책 */}
              <div className="mb-8 space-y-4 last:mb-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  직급 / 직책
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>직급</Label>
                    <Select
                      value={editingMember.position_id}
                      onValueChange={(val) =>
                        setEditingMember({ ...editingMember, position_id: val })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="직급 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {(positions ?? []).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>직책 (선택)</Label>
                    <Select
                      value={editingMember.title_id || "__none__"}
                      onValueChange={(val) =>
                        setEditingMember({
                          ...editingMember,
                          title_id: val === "__none__" ? "" : val,
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="직책 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">없음</SelectItem>
                        {(titles ?? []).map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>직군</Label>
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
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="직군 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="대표">대표</SelectItem>
                        <SelectItem value="팀장">팀장</SelectItem>
                        <SelectItem value="팀원">팀원</SelectItem>
                        <SelectItem value="인턴">인턴</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {editingMember.member_role === "인턴" && (
                    <div className="space-y-2">
                      <Label htmlFor="editInternMonths">개월 수</Label>
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
              </div>

              {/* 계정 정보 */}
              <div className="mb-8 space-y-4 last:mb-0">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  계정 정보
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editLoginId">아이디</Label>
                    <Input
                      id="editLoginId"
                      value={editingMember.login_id}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          login_id: e.target.value,
                        })
                      }
                      placeholder="hong123"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editPassword">비밀번호</Label>
                    <div className="relative">
                      <Input
                        id="editPassword"
                        type={showPassword ? "text" : "password"}
                        value={editingMember.password}
                        onChange={(e) =>
                          setEditingMember({
                            ...editingMember,
                            password: e.target.value,
                          })
                        }
                        placeholder="변경 시 입력"
                        className="pr-10"
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
                  </div>
                </div>
                <label className="flex w-full items-center justify-between rounded-md bg-white px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors">
                  <span className="text-sm font-medium">관리자 권한</span>
                  <Checkbox
                    checked={editingMember.role === "admin"}
                    onCheckedChange={(checked) =>
                      setEditingMember({
                        ...editingMember,
                        role: checked ? "admin" : "user",
                      })
                    }
                  />
                </label>
                {editingMember.role === "admin" && (
                  <div className="space-y-2">
                    <Label>어드민 권한</Label>
                    <Select
                      value={editingMember.admin_role}
                      onValueChange={(val) =>
                        setEditingMember({
                          ...editingMember,
                          admin_role: val,
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="어드민 권한 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {ADMIN_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {getAdminRoleLabel(role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>User 권한</Label>
                  <Select
                    value={editingMember.user_authority || "__none__"}
                    onValueChange={(val) =>
                      setEditingMember({
                        ...editingMember,
                        user_authority: val === "__none__" ? "" : val,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="User 권한 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">없음</SelectItem>
                      {USER_AUTHORITIES.map((authority) => (
                        <SelectItem key={authority} value={authority}>
                          {authority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
                !editingMember?.full_name.trim() ||
                !editingMember?.login_id.trim()
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
                    <div key={record.id} className="rounded-md bg-white p-3">
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
                            className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-[#1d1d1f]/10 hover:text-[#1d1d1f]"
                            title="수정"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleHistoryDeleteOpen(record)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
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
