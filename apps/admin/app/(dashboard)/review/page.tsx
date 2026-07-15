"use client";

import {
  useState,
  useMemo,
  useRef,
  useEffect,
  forwardRef,
  Suspense,
  type ComponentPropsWithoutRef,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { format as formatDateFns, parse } from "date-fns";
import { ko } from "date-fns/locale";
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
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@repo/ui/src/tooltip";
import { Calendar } from "@repo/ui/src/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
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
  X,
  Search,
  ChevronDown,
  Calendar as CalendarIcon,
} from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/useAuth";
import { useUsageRecords } from "@/hooks/useUsageRecords";
import {
  useAdvanceReview,
  useRevertReview,
  useUpdateUsageRecord,
  useDeleteUsageRecord,
  useDeleteUsageRecords,
} from "@/hooks/useUsageRecordMutations";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useActiveStatusMembers } from "@/hooks/useActiveStatusMembers";

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
  co_payers: string[] | null;
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

interface DateRangeFilterValue {
  from?: string;
  to?: string;
}

function formatDateInput(date: Date) {
  return formatDateFns(date, "yyyy-MM-dd");
}

function parseDateInput(value?: string) {
  if (!value) return undefined;
  return parse(value, "yyyy-MM-dd", new Date());
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

const HeaderFilterButton = forwardRef<
  HTMLButtonElement,
  {
    label: string;
    activeCount?: number;
    align?: "left" | "center" | "right";
  } & ComponentPropsWithoutRef<"button">
>(function HeaderFilterButton(
  { label, activeCount = 0, align = "left", className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded px-1.5 text-xs font-semibold transition-colors hover:bg-slate-100",
        align === "right" && "ml-auto justify-end",
        align === "center" && "mx-auto justify-center",
        activeCount > 0 ? "text-[#135bec]" : "text-slate-500",
        className,
      )}
      {...props}
    >
      {label}
      {activeCount > 0 && (
        <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] text-[#135bec]">
          {activeCount}
        </span>
      )}
      <ChevronDown className="h-3 w-3" />
    </button>
  );
});

function CheckboxHeaderFilter({
  label,
  options,
  selected,
  draft,
  open,
  align = "left",
  emptyText,
  onOpenChange,
  onDraftChange,
  onApply,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  draft: string[];
  open: boolean;
  align?: "left" | "center" | "right";
  emptyText: string;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: string[]) => void;
  onApply: () => void;
}) {
  const toggleDraft = (value: string) => {
    onDraftChange(
      draft.includes(value)
        ? draft.filter((item) => item !== value)
        : [...draft, value],
    );
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (nextOpen) onDraftChange(selected);
      }}
    >
      <PopoverTrigger asChild>
        <HeaderFilterButton
          label={label}
          activeCount={selected.length}
          align={align}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3"
        align={align === "right" ? "end" : "start"}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              {label}
            </span>
            {draft.length > 0 && (
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-slate-600"
                onClick={() => onDraftChange([])}
              >
                전체 해제
              </button>
            )}
          </div>
          <div className="max-h-64 space-y-1 overflow-auto">
            {options.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                {emptyText}
              </div>
            ) : (
              options.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                >
                  <span className="truncate">{option.label}</span>
                  <Checkbox
                    checked={draft.includes(option.value)}
                    onCheckedChange={() => toggleDraft(option.value)}
                  />
                </label>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={onApply}>
              확인
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DateRangeField({
  label,
  draft,
  open,
  onOpenChange,
  onDraftChange,
}: {
  label: string;
  draft: DateRangeFilterValue;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (value: DateRangeFilterValue) => void;
}) {
  const selectedFrom = parseDateInput(draft.from);
  const selectedTo = parseDateInput(draft.to);
  const selected =
    selectedFrom || selectedTo
      ? {
          from: selectedFrom,
          to: selectedTo,
        }
      : undefined;

  const hasValue = !!(draft.from || draft.to);
  const displayText = draft.from
    ? draft.to
      ? `${draft.from} ~ ${draft.to}`
      : `${draft.from} ~`
    : draft.to
      ? `~ ${draft.to}`
      : label;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 justify-start gap-2 px-3 text-sm font-normal",
            hasValue
              ? "w-auto whitespace-nowrap text-slate-700"
              : "w-40 text-slate-400",
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={(range) =>
            onDraftChange({
              from: range?.from ? formatDateInput(range.from) : undefined,
              to: range?.to ? formatDateInput(range.to) : undefined,
            })
          }
          locale={ko}
          defaultMonth={selected?.from || selected?.to}
        />
        {hasValue && (
          <div className="flex justify-end border-t border-slate-100 p-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-slate-500"
              onClick={() => onDraftChange({})}
            >
              초기화
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
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
  const initialMemberFilter = searchParams.get("member");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [typeDraft, setTypeDraft] = useState<string[]>([]);
  const [isTypePopoverOpen, setIsTypePopoverOpen] = useState(false);
  const [memberFilter, setMemberFilter] = useState<string[]>(
    initialMemberFilter ? [initialMemberFilter] : [],
  );
  const [memberDraft, setMemberDraft] = useState<string[]>(memberFilter);
  const [isMemberPopoverOpen, setIsMemberPopoverOpen] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<string[]>([]);
  const [reviewDraft, setReviewDraft] = useState<string[]>([]);
  const [isReviewPopoverOpen, setIsReviewPopoverOpen] = useState(false);
  const [descriptionSearch, setDescriptionSearch] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [notesSearch, setNotesSearch] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [usedAtRange, setUsedAtRange] = useState<DateRangeFilterValue>({});
  const [usedAtDraft, setUsedAtDraft] = useState<DateRangeFilterValue>({});
  const [isUsedAtPopoverOpen, setIsUsedAtPopoverOpen] = useState(false);
  const [createdAtRange, setCreatedAtRange] = useState<DateRangeFilterValue>(
    {},
  );
  const [createdAtDraft, setCreatedAtDraft] = useState<DateRangeFilterValue>(
    {},
  );
  const [isCreatedAtPopoverOpen, setIsCreatedAtPopoverOpen] = useState(false);
  const [amountFilter, setAmountFilter] = useState<number[]>([]);
  const [amountDraft, setAmountDraft] = useState<number[]>([]);
  const [isAmountPopoverOpen, setIsAmountPopoverOpen] = useState(false);

  // Dialog states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<UsageRecord | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editUsedAt, setEditUsedAt] = useState("");

  const [editCompanions, setEditCompanions] = useState<string[]>([]);

  // Delete confirm
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<UsageRecord | null>(
    null,
  );

  // Audit log drawer
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditRecordId, setAuditRecordId] = useState<string | undefined>(
    undefined,
  );

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  // Build query filters
  const baseQueryFilters = useMemo(
    () => ({
      types: typeFilter.length > 0 ? typeFilter : undefined,
      member_ids: memberFilter.length > 0 ? memberFilter : undefined,
      review_statuses: reviewFilter.length > 0 ? reviewFilter : undefined,
      description_search: descriptionSearch,
      notes_search: notesSearch,
      used_at_from: usedAtRange.from,
      used_at_to: usedAtRange.to,
      created_at_from: createdAtRange.from,
      created_at_to: createdAtRange.to,
    }),
    [
      typeFilter,
      memberFilter,
      reviewFilter,
      descriptionSearch,
      notesSearch,
      usedAtRange,
      createdAtRange,
    ],
  );

  const queryFilters = useMemo(
    () => ({
      ...baseQueryFilters,
      ...(amountFilter.length > 0 ? { amounts: amountFilter } : {}),
    }),
    [baseQueryFilters, amountFilter],
  );

  // Queries
  const { data: recordsData, isLoading } = useUsageRecords(queryFilters);
  const { data: amountOptionsData } = useUsageRecords(baseQueryFilters);

  const { data: members } = useQuery<Member[]>({
    queryKey: queryKeys.members.all,
    queryFn: async () => {
      const res = await fetch("/api/members");
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  const memberMap = useMemo(() => {
    const map = new Map<string, string>();
    members?.forEach((m) => map.set(m.id, m.full_name));
    return map;
  }, [members]);

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

  const amountOptionRecords: UsageRecord[] = useMemo(() => {
    if (!amountOptionsData) return [];
    return Array.isArray(amountOptionsData)
      ? amountOptionsData
      : amountOptionsData.data || [];
  }, [amountOptionsData]);

  const amountOptions = useMemo(
    () =>
      Array.from(
        new Set(
          amountOptionRecords
            .map((record) => record.amount)
            .filter((amount) => Number.isFinite(amount)),
        ),
      ).sort((a, b) => b - a),
    [amountOptionRecords],
  );

  const { data: statusMembers } = useActiveStatusMembers();

  const resignedMemberIds = useMemo(
    () =>
      new Set(
        (statusMembers || [])
          .filter((m) => m.current_status === "퇴사")
          .map((m) => m.member_id),
      ),
    [statusMembers],
  );

  const memberOptions = useMemo(
    () =>
      (members || [])
        .filter((member) => !resignedMemberIds.has(member.id))
        .map((member) => ({
          value: member.id,
          label: member.full_name,
        })),
    [members, resignedMemberIds],
  );

  const typeOptions = useMemo(
    () => [
      { value: "복지포인트", label: "복지포인트" },
      { value: "활동비", label: "활동비" },
    ],
    [],
  );

  const reviewOptions = useMemo(
    () => [
      { value: "0", label: "미확인" },
      { value: "1", label: "P&C확인완료" },
      { value: "2", label: "최종확인" },
    ],
    [],
  );

  const auditLogs: AuditLog[] = useMemo(() => {
    if (!auditLogsData) return [];
    return Array.isArray(auditLogsData)
      ? auditLogsData
      : auditLogsData.data || [];
  }, [auditLogsData]);

  const hasDetailFilters =
    typeFilter.length > 0 ||
    memberFilter.length > 0 ||
    reviewFilter.length > 0 ||
    !!descriptionSearch ||
    !!notesSearch ||
    !!usedAtRange.from ||
    !!usedAtRange.to ||
    !!createdAtRange.from ||
    !!createdAtRange.to ||
    amountFilter.length > 0;

  // Reset selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [
    typeFilter,
    memberFilter,
    reviewFilter,
    descriptionSearch,
    notesSearch,
    usedAtRange,
    createdAtRange,
    amountFilter,
  ]);

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

  const handleTypeApply = () => {
    setTypeFilter(typeDraft);
    setIsTypePopoverOpen(false);
  };

  const handleMemberApply = () => {
    setMemberFilter(memberDraft);
    setIsMemberPopoverOpen(false);
  };

  const handleReviewApply = () => {
    setReviewFilter(reviewDraft);
    setIsReviewPopoverOpen(false);
  };

  const handleSearch = () => {
    setDescriptionSearch(descriptionDraft.trim());
    setNotesSearch(notesDraft.trim());
    setUsedAtRange(usedAtDraft);
    setCreatedAtRange(createdAtDraft);
    setIsUsedAtPopoverOpen(false);
    setIsCreatedAtPopoverOpen(false);
  };

  const toggleAmountDraft = (amount: number) => {
    setAmountDraft((prev) =>
      prev.includes(amount)
        ? prev.filter((item) => item !== amount)
        : [...prev, amount].sort((a, b) => a - b),
    );
  };

  const handleAmountApply = () => {
    setAmountFilter(amountDraft);
    setIsAmountPopoverOpen(false);
  };

  const clearDetailFilters = () => {
    setTypeFilter([]);
    setTypeDraft([]);
    setMemberFilter([]);
    setMemberDraft([]);
    setReviewFilter([]);
    setReviewDraft([]);
    setDescriptionSearch("");
    setDescriptionDraft("");
    setNotesSearch("");
    setNotesDraft("");
    setUsedAtRange({});
    setUsedAtDraft({});
    setCreatedAtRange({});
    setCreatedAtDraft({});
    setAmountFilter([]);
    setAmountDraft([]);
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
    setEditCompanions(record.companions || []);
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
        companions: editCompanions,
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

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col gap-3">
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

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeField
          label="사용날짜"
          draft={usedAtDraft}
          open={isUsedAtPopoverOpen}
          onOpenChange={setIsUsedAtPopoverOpen}
          onDraftChange={setUsedAtDraft}
        />
        <DateRangeField
          label="입력날짜"
          draft={createdAtDraft}
          open={isCreatedAtPopoverOpen}
          onOpenChange={setIsCreatedAtPopoverOpen}
          onDraftChange={setCreatedAtDraft}
        />
        <Input
          value={descriptionDraft}
          onChange={(e) => setDescriptionDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
          placeholder="사용처"
          className="h-9 w-40 text-sm"
        />
        <Input
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
          placeholder="비고"
          className="h-9 w-40 text-sm"
        />
        <Button size="sm" className="h-9 gap-1.5 text-xs" onClick={handleSearch}>
          <Search className="h-3.5 w-3.5" />
          검색
        </Button>
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
                    <CheckboxHeaderFilter
                      label="이름"
                      options={memberOptions}
                      selected={memberFilter}
                      draft={memberDraft}
                      open={isMemberPopoverOpen}
                      emptyText="등록된 이름이 없습니다"
                      onOpenChange={setIsMemberPopoverOpen}
                      onDraftChange={setMemberDraft}
                      onApply={handleMemberApply}
                    />
                  </th>
                  <th className="w-[80px] whitespace-nowrap px-3 py-2 text-center text-xs font-semibold text-slate-500">
                    <CheckboxHeaderFilter
                      label="유형"
                      options={typeOptions}
                      selected={typeFilter}
                      draft={typeDraft}
                      open={isTypePopoverOpen}
                      align="center"
                      emptyText="유형이 없습니다"
                      onOpenChange={setIsTypePopoverOpen}
                      onDraftChange={setTypeDraft}
                      onApply={handleTypeApply}
                    />
                  </th>
                  <th className="min-w-[120px] whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-slate-500">
                    사용처
                  </th>
                  <th className="w-[88px] whitespace-nowrap px-3 py-2 text-right text-xs font-semibold text-slate-500">
                    <Popover
                      open={isAmountPopoverOpen}
                      onOpenChange={(open) => {
                        setIsAmountPopoverOpen(open);
                        if (open) setAmountDraft(amountFilter);
                      }}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "ml-auto inline-flex h-7 items-center justify-end gap-1 rounded px-1.5 text-xs font-semibold transition-colors hover:bg-slate-100",
                            amountFilter.length > 0
                              ? "text-[#135bec]"
                              : "text-slate-500",
                          )}
                        >
                          금액
                          {amountFilter.length > 0 && (
                            <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] text-[#135bec]">
                              {amountFilter.length}
                            </span>
                          )}
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3" align="end">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-700">
                              금액
                            </span>
                            {amountDraft.length > 0 && (
                              <button
                                type="button"
                                className="text-xs text-slate-400 hover:text-slate-600"
                                onClick={() => setAmountDraft([])}
                              >
                                전체 해제
                              </button>
                            )}
                          </div>
                          <div className="max-h-64 space-y-1 overflow-auto">
                            {amountOptions.length === 0 ? (
                              <div className="py-6 text-center text-xs text-slate-400">
                                등록된 금액이 없습니다
                              </div>
                            ) : (
                              amountOptions.map((amount) => (
                                <label
                                  key={amount}
                                  className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                                >
                                  <span className="tabular-nums">
                                    {formatCurrency(amount)}
                                  </span>
                                  <Checkbox
                                    checked={amountDraft.includes(amount)}
                                    onCheckedChange={() =>
                                      toggleAmountDraft(amount)
                                    }
                                  />
                                </label>
                              ))
                            )}
                          </div>
                          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => setIsAmountPopoverOpen(false)}
                            >
                              취소
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 text-xs"
                              onClick={handleAmountApply}
                            >
                              확인
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </th>
                  <th className="w-[150px] whitespace-nowrap px-3 py-2 text-center text-xs font-semibold text-slate-500">
                    <CheckboxHeaderFilter
                      label="P&C팀 확인"
                      options={reviewOptions}
                      selected={reviewFilter}
                      draft={reviewDraft}
                      open={isReviewPopoverOpen}
                      align="center"
                      emptyText="확인 상태가 없습니다"
                      onOpenChange={setIsReviewPopoverOpen}
                      onDraftChange={setReviewDraft}
                      onApply={handleReviewApply}
                    />
                  </th>
                  <th className="min-w-[80px] whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-slate-500">
                    비고
                  </th>
                  <th className="min-w-[100px] whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-slate-500">
                    지연 사유
                  </th>
                  <th className="w-[88px] whitespace-nowrap px-3 py-2 text-center text-xs font-semibold text-slate-500">
                    <span className="inline-flex items-center justify-center gap-1">
                      액션
                      {hasDetailFilters && (
                        <button
                          type="button"
                          className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          title="필터 초기화"
                          onClick={clearDetailFilters}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => {
                  const companionNames =
                    record.companions
                      ?.map((id: string) => memberMap.get(id) || id)
                      .join(", ") || "";
                  const noteText = record.notes || companionNames || "-";

                  return (
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
                      <td className="max-w-[180px] truncate px-3 py-1 text-slate-400">
                        <span className="inline-flex w-full items-center justify-between gap-1">
                          <span className="truncate">{noteText}</span>
                          {record.co_payers?.length ? (
                            <TooltipProvider delayDuration={0}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex h-5 w-5 shrink-0 cursor-default items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-600">
                                    +{record.co_payers.length}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  동반:{" "}
                                  {record.co_payers
                                    .map(
                                      (id: string) => memberMap.get(id) || id,
                                    )
                                    .join(", ")}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : null}
                        </span>
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-1 text-slate-400">
                        {record.delay_reason || "-"}
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
                  );
                })}
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
              <Label>비고 (대리결제자)</Label>
              {editCompanions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {editCompanions.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-xs"
                    >
                      {memberMap.get(id) || id}
                      <button
                        type="button"
                        onClick={() =>
                          setEditCompanions((prev) =>
                            prev.filter((c) => c !== id),
                          )
                        }
                        className="hover:bg-slate-200 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <Select
                onValueChange={(id) => {
                  if (!editCompanions.includes(id))
                    setEditCompanions((prev) => [...prev, id]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="멤버 선택" />
                </SelectTrigger>
                <SelectContent>
                  {members
                    ?.filter((m) => !editCompanions.includes(m.id))
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
