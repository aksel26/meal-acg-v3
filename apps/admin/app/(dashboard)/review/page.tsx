"use client";

import { useState, useMemo, Suspense } from "react";
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
import { SearchableDropdown } from "@repo/ui/src/searchable-dropdown";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/src/table";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@repo/ui/src/drawer";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
  Loader2,
  ClipboardList,
  History,
  AlertTriangle,
} from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/useAuth";
import { useUsageRecords } from "@/hooks/useUsageRecords";
import {
  useToggleReview,
  useUpdateUsageRecord,
  useDeleteUsageRecord,
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
  receipt_url: string | null;
  is_reviewed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  members?: {
    full_name: string;
    member_role: string;
  };
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

// ── Helpers ──

function typeBadgeStyle(type: string) {
  switch (type) {
    case "복지포인트":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "활동비":
      return "bg-amber-50 text-amber-700 border-amber-200";
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
  const [memberFilter, setMemberFilter] = useState(searchParams.get("member") || "전체");
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
    null
  );

  // Audit log drawer
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditRecordId, setAuditRecordId] = useState<string | undefined>(
    undefined
  );

  // Build query filters
  const queryFilters = useMemo(
    () => ({
      period,
      type: typeFilter !== "전체" ? typeFilter : undefined,
      member_id: memberFilter !== "전체" ? memberFilter : undefined,
      is_reviewed:
        reviewFilter === "검토 완료"
          ? "true"
          : reviewFilter === "미검토"
            ? "false"
            : undefined,
    }),
    [period, typeFilter, memberFilter, reviewFilter]
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
  const toggleReview = useToggleReview();
  const updateRecord = useUpdateUsageRecord();
  const deleteRecord = useDeleteUsageRecord();

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
  const reviewedCount = records.filter((r) => r.is_reviewed).length;
  const totalAmount = records.reduce((sum, r) => sum + (r.amount || 0), 0);

  // ── Review Toggle ──

  const handleToggleReview = (record: UsageRecord) => {
    if (!user?.id) {
      toast.error("로그인 정보를 확인할 수 없습니다.");
      return;
    }
    toggleReview.mutate({ id: record.id, reviewer_id: user.id });
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
      }
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
      }
    );
  };

  // ── Audit Log Handlers ──

  const handleAuditOpen = (recordId: string) => {
    setAuditRecordId(recordId);
    setIsAuditOpen(true);
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
            className="w-44"
          />
          <Select value={reviewFilter} onValueChange={setReviewFilter}>
            <SelectTrigger className="h-10 w-32 bg-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="전체">검토 전체</SelectItem>
              <SelectItem value="검토 완료">검토 완료</SelectItem>
              <SelectItem value="미검토">미검토</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {records.length > 0 && (
          <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
            <span>{totalCount}건</span>
            <span className="text-slate-300">·</span>
            <span>검토 {reviewedCount}/{totalCount}</span>
            <span className="text-slate-300">·</span>
            <span>{(totalAmount / 10000).toFixed(1)}만원</span>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="glass-panel min-h-0 flex-1 overflow-hidden rounded-2xl">
        {isLoading ? (
          <div className="divide-y divide-slate-100">
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
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 [&>th]:h-8 [&>th]:px-2 [&>th]:py-0">
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    날짜
                  </TableHead>
                  <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    이름
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    유형
                  </TableHead>
                  <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    사용처
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    금액
                  </TableHead>
                  <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    비고
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    P&C팀 확인
                  </TableHead>
                  <TableHead className="w-24 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    액션
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow
                    key={record.id}
                    className="transition-colors hover:bg-slate-50/50 [&>td]:px-2 [&>td]:py-1"
                  >
                    <TableCell className="text-center text-sm text-slate-600">
                      {formatDate(record.used_at)}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-slate-900">
                      {record.members?.full_name || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] px-1.5 py-0",
                          typeBadgeStyle(record.type)
                        )}
                      >
                        {record.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-slate-600">
                      {record.description || "-"}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-slate-900">
                      {formatCurrency(record.amount)}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-sm text-slate-600">
                      {record.notes || <span className="text-slate-300">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleToggleReview(record)}
                          disabled={toggleReview.isPending}
                          className={cn(
                            "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors",
                            record.is_reviewed
                              ? "text-emerald-600 hover:bg-emerald-50"
                              : "text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                          )}
                          title={
                            record.is_reviewed ? "검토 완료" : "미검토 - 클릭하여 검토"
                          }
                        >
                          {record.is_reviewed ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                        </button>
                        {record.is_reviewed && record.reviewed_at && (
                          <span className="text-[11px] tabular-nums text-slate-400">
                            {record.reviewed_at.slice(0, 10)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          onClick={() => handleAuditOpen(record.id)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                          title="변경 이력"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleEditClick(record)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-[#135bec]/10 hover:text-[#135bec]"
                          title="수정"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(record)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          title="삭제"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
            {editingRecord?.is_reviewed && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-700">
                  검토 완료된 내역을 수정합니다. 변경 이력이 기록됩니다.
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
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
            <Button
              onClick={handleEditSave}
              disabled={updateRecord.isPending}
            >
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
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
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
                    <span className="font-medium text-slate-700">
                      사용처:
                    </span>{" "}
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
                  <div key={i} className="space-y-2 rounded-lg border p-3">
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
                    className="rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] px-1.5 py-0",
                          log.action === "DELETE"
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : "border-sky-200 bg-sky-50 text-sky-700"
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

                    {log.previous_data && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-slate-500">
                          이전 데이터:
                        </p>
                        <pre className="mt-1 max-h-32 overflow-auto rounded bg-slate-50 p-2 text-xs text-slate-600">
                          {JSON.stringify(log.previous_data, null, 2)}
                        </pre>
                      </div>
                    )}

                    {log.new_data && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-slate-500">
                          변경 데이터:
                        </p>
                        <pre className="mt-1 max-h-32 overflow-auto rounded bg-slate-50 p-2 text-xs text-slate-600">
                          {JSON.stringify(log.new_data, null, 2)}
                        </pre>
                      </div>
                    )}
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
