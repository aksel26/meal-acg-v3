"use client";

import { useState, useMemo, useRef, useEffect, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { cn } from "@repo/ui/lib/utils";
import { Card, CardContent } from "@repo/ui/src/card";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { Badge } from "@repo/ui/src/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { Checkbox } from "@repo/ui/src/checkbox";
import { SearchableDropdown } from "@repo/ui/src/searchable-dropdown";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@repo/ui/src/drawer";
import { toast } from "@repo/ui/src/sonner";
import {
  Pencil,
  Trash2,
  Loader2,
  ClipboardList,
  History,
  AlertTriangle,
  Download,
  Upload,
} from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/useAuth";
import { ImportPointsDialog } from "@/components/review/ImportPointsDialog";
import { useUsageRecords } from "@/hooks/useUsageRecords";
import {
  useAdvanceReview,
  useRevertReview,
  useUpdateUsageRecord,
  useDeleteUsageRecord,
  useDeleteUsageRecords,
} from "@/hooks/useUsageRecordMutations";
import { useAuditLogs } from "@/hooks/useAuditLogs";

// ── Types ──

interface UsageRecord {
  id: string;
  member_id: string;
  allocation_id: string;
  type: string;
  amount: number;
  description: string | null;
  used_at: string;
  companions: string[] | null;
  notes: string | null;
  delay_reason: string | null;
  receipt_url: string | null;
  no: number | null;
  is_reviewed: boolean;
  review_status: number;
  reviewed_by: string | null;
  reviewed_at: string | null;
  first_reviewed_by: string | null;
  first_reviewed_at: string | null;
  second_reviewed_by: string | null;
  second_reviewed_at: string | null;
  created_at: string;
  members?: {
    full_name: string;
    member_role: string;
  };
  first_reviewer?: {
    full_name: string;
  } | null;
  second_reviewer?: {
    full_name: string;
  } | null;
}

interface AuditLog {
  id: string;
  usage_record_id: string;
  action: string;
  changed_by: string;
  changed_at: string;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  members?: {
    full_name: string;
  };
}

interface Member {
  id: string;
  full_name: string;
  member_role: string;
  team_name: string | null;
}

interface FieldChange {
  fieldKey: string;
  label: string;
  oldValue: string;
  newValue: string;
  isNew: boolean;
}

// ── Helpers ──

function typeBadgeStyle(type: string) {
  switch (type) {
    case "복지포인트":
      return "bg-blue-50/60 text-blue-600 border-transparent";
    case "활동비":
      return "bg-amber-50 text-amber-500 border-transparent";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "-";
  return amount.toLocaleString() + "원";
}

function formatDate(dateStr: string) {
  return dateStr.slice(0, 10);
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

const REVIEW_STATUS_LABELS: Record<number, string> = {
  0: "미확인",
  1: "P&C확인완료",
  2: "최종확인",
};

const FIELD_LABELS: Record<string, string> = {
  type: "유형",
  description: "설명/사용처",
  amount: "금액",
  used_at: "사용일",
  notes: "비고",
  companions: "동반자",
  delay_reason: "지연 사유",
  receipt_url: "영수증",
  no: "번호",
  review_status: "검토 상태",
  is_reviewed: "검토 여부",
  first_reviewed_at: "1차 검토일시",
  first_reviewed_by: "1차 검토자",
  second_reviewed_at: "2차 검토일시",
  second_reviewed_by: "2차 검토자",
  reviewed_at: "검토일시",
  reviewed_by: "검토자",
  last_modified_at: "마지막 수정일시",
  last_modified_by: "마지막 수정자",
};

function formatFieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "-";

  // Date fields
  if (key.includes("_at") || key === "used_at") {
    return formatDateTime(String(value));
  }

  // Amount (currency)
  if (key === "amount") {
    return `${Number(value).toLocaleString()}원`;
  }

  // Boolean
  if (typeof value === "boolean") {
    return value ? "예" : "아니오";
  }

  // Review status enum
  if (key === "review_status") {
    const statusMap: Record<number, string> = {
      0: "미확인",
      1: "P&C확인완료",
      2: "최종확인",
    };
    return statusMap[Number(value)] || String(value);
  }

  // Arrays (companions)
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return String(value);
}

function getFieldChanges(
  previous: Record<string, unknown> | null,
  current: Record<string, unknown> | null,
): FieldChange[] {
  if (!current) return [];

  const changes: FieldChange[] = [];
  const allKeys = new Set([
    ...Object.keys(previous || {}),
    ...Object.keys(current),
  ]);

  for (const key of allKeys) {
    const oldVal = previous?.[key];
    const newVal = current[key];

    // Skip if values are the same
    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;

    // Skip internal/system fields that users don't need to see
    if (key.includes("_id") || key === "id") continue;

    changes.push({
      fieldKey: key,
      label: FIELD_LABELS[key] || key,
      oldValue: formatFieldValue(key, oldVal),
      newValue: formatFieldValue(key, newVal),
      isNew: oldVal === undefined || oldVal === null,
    });
  }

  return changes;
}

// ── Review Step Indicator ──
// 0=빈 체크박스, 1·2=체크박스 안 '-', 3=체크된 체크박스

function ReviewStepIndicator({
  record,
  onAdvance,
  onRevert,
  isPending,
}: {
  record: UsageRecord;
  onAdvance: () => void;
  onRevert: (targetStatus: number) => void;
  isPending: boolean;
}) {
  const status = record.review_status ?? 0;
  const [revertMenuOpen, setRevertMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!revertMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setRevertMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [revertMenuOpen]);

  const handleClick = () => {
    if (isPending) return;
    if (status < 2) {
      onAdvance();
    } else {
      setRevertMenuOpen(true);
    }
  };

  const lastDate =
    status === 2
      ? record.reviewed_at
      : status === 1
        ? record.first_reviewed_at
        : null;

  const tooltipParts: string[] = [];
  if (record.first_reviewed_at) {
    tooltipParts.push(
      `1차: ${record.first_reviewer?.full_name || "-"} (${formatShortDate(record.first_reviewed_at)})`,
    );
  }
  if (status === 2 && record.reviewed_at) {
    tooltipParts.push(
      `최종: ${record.second_reviewer?.full_name || "-"} (${formatShortDate(record.reviewed_at)})`,
    );
  }

  const tooltip =
    status === 0
      ? "미확인 - 클릭하여 P&C확인"
      : status === 1
        ? `P&C확인완료 - 클릭하여 최종확인\n${tooltipParts.join("\n")}`
        : `최종확인 - 클릭하여 되돌리기\n${tooltipParts.join("\n")}`;

  return (
    <div className="relative flex items-center justify-center gap-1.5">
      <button
        onClick={handleClick}
        disabled={isPending}
        className={cn(
          "relative flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-[1.5px] transition-all",
          status === 0
            ? "border-slate-300 bg-white hover:border-slate-400"
            : status === 1
              ? "border-blue-400 bg-blue-50 hover:border-blue-500"
              : "border-emerald-500 bg-emerald-500 hover:border-emerald-600 hover:bg-emerald-600",
        )}
        title={tooltip}
      >
        {/* 0: empty */}
        {/* 1: dash */}
        {status === 1 && (
          <span className="text-[11px] font-bold leading-none text-blue-500">
            –
          </span>
        )}
        {/* 2: checkmark */}
        {status === 2 && (
          <svg
            className="h-3 w-3 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </button>

      {status > 0 && (
        <span className="text-[10px] tabular-nums text-slate-400">
          {lastDate ? formatShortDate(lastDate) : status === 1 ? "P&C" : "완료"}
        </span>
      )}

      {revertMenuOpen && (
        <div
          ref={menuRef}
          className="absolute top-full z-20 mt-1 rounded border border-slate-200 bg-white py-1 shadow-lg"
        >
          {status === 2 && (
            <button
              className="w-full whitespace-nowrap px-3 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50"
              onClick={() => {
                onRevert(1);
                setRevertMenuOpen(false);
              }}
            >
              P&C확인으로 되돌리기
            </button>
          )}
          <button
            className="w-full whitespace-nowrap px-3 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50"
            onClick={() => {
              onRevert(0);
              setRevertMenuOpen(false);
            }}
          >
            미확인으로 되돌리기
          </button>
        </div>
      )}
    </div>
  );
}

// ── Field Change Display Component ──

function FieldChangeDisplay({ change }: { change: FieldChange }) {
  return (
    <div className="flex items-start gap-3 py-1.5 first:pt-0">
      <span className="min-w-[80px] text-xs text-slate-400">
        {change.label}
      </span>
      <div className="flex-1 text-xs">
        {change.isNew ? (
          <span className="text-slate-900">{change.newValue}</span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-slate-400 line-through">
              {change.oldValue}
            </span>
            <span className="text-slate-300">→</span>
            <span className="text-slate-900">{change.newValue}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──

export default function ReviewPage() {
  return (
    <Suspense>
      <ReviewPageContent />
    </Suspense>
  );
}

function ReviewPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  // Filter state
  const currentYear = new Date().getFullYear();
  const currentHalf = new Date().getMonth() < 6 ? "H1" : "H2";
  const [periodYear, setPeriodYear] = useState(String(currentYear));
  const [periodHalf, setPeriodHalf] = useState(currentHalf);
  const period = `${periodYear}-${periodHalf}`;
  const [typeFilter, setTypeFilter] = useState("전체");
  const [memberFilter, setMemberFilter] = useState(
    searchParams.get("member") || "전체",
  );
  const [reviewFilter, setReviewFilter] = useState("전체");

  // Dialog states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<UsageRecord | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editUsedAt, setEditUsedAt] = useState("");

  const [editNotes, setEditNotes] = useState("");

  // Delete confirm
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<UsageRecord | null>(
    null,
  );

  // Export
  const [isExporting, setIsExporting] = useState(false);

  // Import
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Audit log drawer
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditRecordId, setAuditRecordId] = useState<string | undefined>(
    undefined,
  );

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Build query filters
  const queryFilters = useMemo(
    () => ({
      period,
      type: typeFilter !== "전체" ? typeFilter : undefined,
      member_id: memberFilter !== "전체" ? memberFilter : undefined,
      review_status:
        reviewFilter === "최종확인"
          ? "2"
          : reviewFilter === "미확인"
            ? "0"
            : reviewFilter === "P&C확인완료"
              ? "1"
              : undefined,
    }),
    [period, typeFilter, memberFilter, reviewFilter],
  );

  // Queries
  const { data: recordsData, isLoading } = useUsageRecords(queryFilters);

  const { data: members } = useQuery<Member[]>({
    queryKey: queryKeys.members.all,
    queryFn: async () => {
      const res = await fetch("/api/members");
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  const { data: auditLogsData, isLoading: isAuditLoading } =
    useAuditLogs(auditRecordId);

  // Mutations
  const advanceReview = useAdvanceReview();
  const revertReview = useRevertReview();
  const updateRecord = useUpdateUsageRecord();
  const deleteRecord = useDeleteUsageRecord();
  const deleteMany = useDeleteUsageRecords();

  // Derived data
  const records: UsageRecord[] = useMemo(() => {
    if (!recordsData) return [];
    return Array.isArray(recordsData) ? recordsData : recordsData.data || [];
  }, [recordsData]);

  const auditLogs: AuditLog[] = useMemo(() => {
    if (!auditLogsData) return [];
    return Array.isArray(auditLogsData)
      ? auditLogsData
      : auditLogsData.data || [];
  }, [auditLogsData]);

  // Stats
  const totalCount = records.length;
  const reviewedCount = records.filter((r) => r.review_status === 2).length;
  const totalAmount = records.reduce((sum, r) => sum + (r.amount || 0), 0);

  // Reset selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [periodYear, periodHalf, typeFilter, memberFilter, reviewFilter]);

  // ── Bulk Delete Handlers ──

  const handleBulkDeleteConfirm = async () => {
    await deleteMany.mutateAsync(
      { ids: Array.from(selectedIds), modified_by: user?.id || "" },
      {
        onSuccess: () => {
          setSelectedIds(new Set());
          setIsBulkDeleteOpen(false);
        },
      },
    );
  };

  // ── Review Handlers ──

  const handleAdvanceReview = (record: UsageRecord) => {
    if (!user?.id) {
      toast.error("로그인 정보를 확인할 수 없습니다.");
      return;
    }
    advanceReview.mutate({ id: record.id, reviewer_id: user.id });
  };

  const handleRevertReview = (record: UsageRecord, targetStatus: number) => {
    if (!user?.id) {
      toast.error("로그인 정보를 확인할 수 없습니다.");
      return;
    }
    revertReview.mutate({
      id: record.id,
      reviewer_id: user.id,
      target_status: targetStatus,
    });
  };

  // ── Edit Handlers ──

  const handleEditClick = (record: UsageRecord) => {
    setEditingRecord(record);
    setEditAmount(String(record.amount));
    setEditDescription(record.description || "");
    setEditUsedAt(formatDate(record.used_at));
    setEditNotes(record.notes || "");
    setIsEditOpen(true);
  };

  const handleEditSave = () => {
    if (!editingRecord) return;
    const amount = parseInt(editAmount, 10);
    if (isNaN(amount) || amount < 0) {
      toast.error("올바른 금액을 입력해주세요.");
      return;
    }
    if (!editUsedAt) {
      toast.error("사용일자를 입력해주세요.");
      return;
    }
    updateRecord.mutate(
      {
        id: editingRecord.id,
        amount,
        description: editDescription || undefined,
        used_at: editUsedAt,
        notes: editNotes || null,
        modified_by: user?.id,
      },
      {
        onSuccess: () => {
          setIsEditOpen(false);
          setEditingRecord(null);
        },
      },
    );
  };

  // ── Delete Handlers ──

  const handleDeleteClick = (record: UsageRecord) => {
    setDeletingRecord(record);
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deletingRecord) return;
    deleteRecord.mutate(
      {
        id: deletingRecord.id,
        modified_by: user?.id || "",
      },
      {
        onSuccess: () => {
          setIsDeleteOpen(false);
          setDeletingRecord(null);
        },
      },
    );
  };

  // ── Audit Log Handlers ──

  const handleAuditOpen = (recordId: string) => {
    setAuditRecordId(recordId);
    setIsAuditOpen(true);
  };

  // ── Export ──

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (queryFilters.period) params.set("period", queryFilters.period);
      if (queryFilters.type) params.set("type", queryFilters.type);
      if (queryFilters.member_id)
        params.set("member_id", queryFilters.member_id);
      if (queryFilters.review_status)
        params.set("review_status", queryFilters.review_status);

      const res = await fetch(`/api/export/usage-records?${params}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "복포활동비_사용내역.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("엑셀 파일이 다운로드되었습니다.");
    } catch {
      toast.error("엑셀 내보내기에 실패했습니다.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col gap-6">
      {/* Filter Bar + Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={periodYear} onValueChange={setPeriodYear}>
            <SelectTrigger className="h-10 w-24 bg-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={periodHalf} onValueChange={setPeriodHalf}>
            <SelectTrigger className="h-10 w-24 bg-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="H1">상반기</SelectItem>
              <SelectItem value="H2">하반기</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-10 w-32 bg-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="전체">유형 전체</SelectItem>
              <SelectItem value="복지포인트">복지포인트</SelectItem>
              <SelectItem value="활동비">활동비</SelectItem>
            </SelectContent>
          </Select>
          <SearchableDropdown
            items={members || []}
            value={memberFilter !== "전체" ? memberFilter : undefined}
            getItemKey={(m) => m.id}
            getItemLabel={(m) => m.full_name}
            onSelect={(m) => setMemberFilter(m.id)}
            onClear={() => setMemberFilter("전체")}
            placeholder="멤버 전체"
            searchPlaceholder="이름 검색..."
            emptyText="검색 결과가 없습니다"
            allowClear
            className="w-44 h-10"
          />
          <Select value={reviewFilter} onValueChange={setReviewFilter}>
            <SelectTrigger className="h-10 w-36 bg-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="전체">확인 전체</SelectItem>
              <SelectItem value="미확인">미확인</SelectItem>
              <SelectItem value="P&C확인완료">P&C확인완료</SelectItem>
              <SelectItem value="최종확인">최종확인</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
          {records.length > 0 && (
            <>
              <span>{totalCount}건</span>
              <span className="text-slate-300">·</span>
              <span>
                검토 {reviewedCount}/{totalCount}
              </span>
              <span className="text-slate-300">·</span>
              <span>{(totalAmount / 10000).toFixed(1)}만원</span>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            className={
              records.length > 0
                ? "ml-2 h-10 gap-1.5 text-xs"
                : "h-10 gap-1.5 text-xs"
            }
            onClick={handleExport}
            disabled={isExporting || records.length === 0}
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            다운로드
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-10 gap-1.5 text-xs"
            onClick={() => setIsImportOpen(true)}
          >
            <Upload className="h-3.5 w-3.5" />
            업로드
          </Button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2">
          <span className="text-sm font-medium text-rose-700">
            {selectedIds.size}개 선택됨
          </span>
          <Button
            variant="destructive"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setIsBulkDeleteOpen(true)}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            선택 삭제
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-slate-600"
            onClick={() => setSelectedIds(new Set())}
          >
            선택 해제
          </Button>
        </div>
      )}

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
        ) : records.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-lg font-medium text-slate-600">
              사용내역이 없습니다
            </p>
            <p className="mt-1 text-sm text-slate-400">
              조건에 맞는 사용내역이 없습니다. 필터를 조정해보세요.
            </p>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr>
                  <th className="w-[36px] whitespace-nowrap px-2 py-2 text-center">
                    <Checkbox
                      checked={
                        records.length > 0 &&
                        selectedIds.size === records.length
                      }
                      data-state={
                        selectedIds.size > 0 &&
                        selectedIds.size < records.length
                          ? "indeterminate"
                          : undefined
                      }
                      onCheckedChange={(checked) => {
                        setSelectedIds(
                          checked
                            ? new Set(records.map((r) => r.id))
                            : new Set(),
                        );
                      }}
                    />
                  </th>
                  <th className="w-[44px] whitespace-nowrap px-2 py-2 text-center text-xs font-semibold text-slate-400">
                    No.
                  </th>
                  <th className="w-[88px] whitespace-nowrap px-3 py-2 text-center text-xs font-semibold text-slate-500">
                    사용날짜
                  </th>
                  <th className="w-[88px] whitespace-nowrap px-3 py-2 text-center text-xs font-semibold text-slate-500">
                    입력날짜
                  </th>
                  <th className="w-[72px] whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-slate-500">
                    이름
                  </th>
                  <th className="w-[80px] whitespace-nowrap px-3 py-2 text-center text-xs font-semibold text-slate-500">
                    유형
                  </th>
                  <th className="min-w-[120px] whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-slate-500">
                    사용처
                  </th>
                  <th className="w-[88px] whitespace-nowrap px-3 py-2 text-right text-xs font-semibold text-slate-500">
                    금액
                  </th>
                  <th className="min-w-[80px] whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-slate-500">
                    비고
                  </th>
                  <th className="min-w-[100px] whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-slate-500">
                    지연 사유
                  </th>
                  <th className="w-[150px] whitespace-nowrap px-3 py-2 text-center text-xs font-semibold text-slate-500">
                    P&C팀 확인
                  </th>
                  <th className="w-[88px] whitespace-nowrap px-3 py-2 text-center text-xs font-semibold text-slate-500">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr
                    key={record.id}
                    className={cn(
                      "transition-colors hover:bg-slate-50/60",
                      selectedIds.has(record.id) && "bg-rose-50/40",
                    )}
                  >
                    <td className="px-2 py-1 text-center">
                      <Checkbox
                        checked={selectedIds.has(record.id)}
                        onCheckedChange={(checked) => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(record.id);
                            else next.delete(record.id);
                            return next;
                          });
                        }}
                      />
                    </td>
                    <td className="whitespace-nowrap px-2 py-1 text-center tabular-nums text-slate-400">
                      {record.no}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1 text-center tabular-nums text-slate-500">
                      {formatDate(record.used_at)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1 text-center tabular-nums text-slate-400">
                      {formatDate(record.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1 font-medium text-slate-900">
                      {record.members?.full_name || "-"}
                    </td>
                    <td className="px-3 py-1 text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] px-1.5 py-0",
                          typeBadgeStyle(record.type),
                        )}
                      >
                        {record.type}
                      </Badge>
                    </td>
                    <td className="max-w-[240px] truncate px-3 py-1 text-slate-600">
                      {record.description || "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1 text-right tabular-nums font-medium text-slate-900">
                      {formatCurrency(record.amount)}
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-1 text-slate-400">
                      {record.notes || "-"}
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-1 text-slate-400">
                      {record.delay_reason || "-"}
                    </td>
                    <td className="px-3 py-1 text-center">
                      <ReviewStepIndicator
                        record={record}
                        onAdvance={() => handleAdvanceReview(record)}
                        onRevert={(targetStatus) =>
                          handleRevertReview(record, targetStatus)
                        }
                        isPending={
                          advanceReview.isPending || revertReview.isPending
                        }
                      />
                    </td>
                    <td className="px-3 py-1 text-center">
                      <div className="flex items-center justify-center gap-0">
                        <button
                          onClick={() => handleAuditOpen(record.id)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                          title="변경 이력"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleEditClick(record)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-[#135bec]/10 hover:text-[#135bec]"
                          title="수정"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(record)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          title="삭제"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit Dialog ── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>사용내역 수정</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {editingRecord && (editingRecord.review_status ?? 0) >= 1 && (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-700">
                  {REVIEW_STATUS_LABELS[editingRecord.review_status] || "확인"}{" "}
                  상태의 내역을 수정합니다. 변경 이력이 기록됩니다.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-amount">금액</Label>
              <Input
                id="edit-amount"
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="금액을 입력하세요"
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">사용처</Label>
              <textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="사용처를 입력하세요"
                rows={2}
                className="flex w-full rounded border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-used-at">사용일자</Label>
              <Input
                id="edit-used-at"
                type="date"
                value={editUsedAt}
                onChange={(e) => setEditUsedAt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">비고</Label>
              <Input
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="비고를 입력하세요"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              취소
            </Button>
            <Button onClick={handleEditSave} disabled={updateRecord.isPending}>
              {updateRecord.isPending ? (
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

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>사용내역 삭제</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <p className="text-sm text-rose-700">
                이 작업은 되돌릴 수 없습니다. 삭제 이력이 기록됩니다.
              </p>
            </div>

            {deletingRecord && (
              <Card className="border-slate-200 bg-slate-50">
                <CardContent className="space-y-1 p-3">
                  <p className="text-sm text-slate-600">
                    <span className="font-medium text-slate-700">이름:</span>{" "}
                    {deletingRecord.members?.full_name || "-"}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="font-medium text-slate-700">사용처:</span>{" "}
                    {deletingRecord.description || "-"}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="font-medium text-slate-700">금액:</span>{" "}
                    {formatCurrency(deletingRecord.amount)}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteRecord.isPending}
            >
              {deleteRecord.isPending ? (
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

      {/* ── Bulk Delete Confirm Dialog ── */}
      <Dialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>선택한 내역 삭제</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <p className="text-sm text-rose-700">
                선택한{" "}
                <span className="font-semibold">{selectedIds.size}개</span>{" "}
                항목을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkDeleteOpen(false)}
              disabled={deleteMany.isPending}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDeleteConfirm}
              disabled={deleteMany.isPending}
            >
              {deleteMany.isPending ? (
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

      {/* ── Import Points Dialog ── */}
      <ImportPointsDialog open={isImportOpen} onOpenChange={setIsImportOpen} />

      {/* ── Audit Log Drawer ── */}
      <Drawer
        open={isAuditOpen}
        onOpenChange={setIsAuditOpen}
        direction="right"
      >
        <DrawerContent className="sm:max-w-md">
          <DrawerHeader>
            <DrawerTitle>변경 이력</DrawerTitle>
            <DrawerDescription>
              이 사용내역의 변경 이력을 확인합니다
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-auto px-4 pb-4">
            {isAuditLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2 rounded-md border p-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="py-12 text-center">
                <History className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-600">
                  변경 이력이 없습니다
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-md border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] px-1.5 py-0",
                          log.action === "DELETE"
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : "border-sky-200 bg-sky-50 text-sky-700",
                        )}
                      >
                        {log.action}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {formatDateTime(log.changed_at)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-600">
                      <span className="font-medium text-slate-700">
                        변경자:
                      </span>{" "}
                      {log.members?.full_name || log.changed_by}
                    </p>

                    {/* DELETE 액션: 삭제된 내역 표시 */}
                    {log.action === "DELETE" && log.previous_data && (
                      <div className="mt-3 border-t pt-3">
                        <p className="mb-2 text-xs font-medium text-slate-500">
                          삭제된 내역
                        </p>
                        <div className="space-y-1.5">
                          {Object.entries(log.previous_data).map(
                            ([key, value]) => {
                              if (key.includes("_id") || key === "id")
                                return null;
                              return (
                                <div
                                  key={key}
                                  className="flex items-start gap-3"
                                >
                                  <span className="min-w-[80px] text-xs text-slate-400">
                                    {FIELD_LABELS[key] || key}
                                  </span>
                                  <span className="flex-1 text-xs text-slate-600">
                                    {formatFieldValue(key, value)}
                                  </span>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>
                    )}

                    {/* IMPORT/UPDATE 액션: 변경 내역 표시 */}
                    {log.action !== "DELETE" &&
                      (() => {
                        const changes = getFieldChanges(
                          log.previous_data,
                          log.new_data,
                        );

                        if (changes.length === 0) {
                          // IMPORT 액션이고 previous_data가 없으면 추가된 내역 표시
                          if (log.action === "IMPORT" && log.new_data) {
                            return (
                              <div className="mt-3 border-t pt-3">
                                <p className="mb-2 text-xs font-medium text-slate-500">
                                  추가된 내역
                                </p>
                                <div className="space-y-1.5">
                                  {Object.entries(log.new_data).map(
                                    ([key, value]) => {
                                      if (key.includes("_id") || key === "id")
                                        return null;
                                      return (
                                        <div
                                          key={key}
                                          className="flex items-start gap-3"
                                        >
                                          <span className="min-w-[80px] text-xs text-slate-400">
                                            {FIELD_LABELS[key] || key}
                                          </span>
                                          <span className="flex-1 text-xs text-slate-900">
                                            {formatFieldValue(key, value)}
                                          </span>
                                        </div>
                                      );
                                    },
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }

                        // 변경된 필드가 있으면 표시
                        return (
                          <div className="mt-3 border-t pt-3">
                            <p className="mb-2 text-xs font-medium text-slate-500">
                              변경 내역
                            </p>
                            <div className="space-y-1.5">
                              {changes.map((change) => (
                                <FieldChangeDisplay
                                  key={change.fieldKey}
                                  change={change}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DrawerFooter className="border-t p-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsAuditOpen(false)}
            >
              닫기
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
