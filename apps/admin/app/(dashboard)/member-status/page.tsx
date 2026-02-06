"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@repo/ui/lib/utils";
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
import {
  Dialog,
  DialogContent,
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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@repo/ui/src/drawer";
import {
  AlertTriangle,
  History,
  Loader2,
  Pencil,
  Plus,
  Search,
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
import type { MemberCurrentStatus, MemberStatusType } from "@/lib/supabase/types";

// ── Constants ──

const STATUS_TYPES: MemberStatusType[] = [
  "육아휴직",
  "병가",
  "재택근무",
  "파견",
  "휴직",
  "퇴사",
];

const STATUS_COLORS: Record<string, string> = {
  정상: "bg-emerald-50 text-emerald-700 border-emerald-200",
  육아휴직: "bg-pink-50 text-pink-700 border-pink-200",
  병가: "bg-red-50 text-red-700 border-red-200",
  재택근무: "bg-cyan-50 text-cyan-700 border-cyan-200",
  파견: "bg-indigo-50 text-indigo-700 border-indigo-200",
  휴직: "bg-amber-50 text-amber-700 border-amber-200",
  퇴사: "bg-slate-100 text-slate-500 border-slate-300",
};

interface MemberOption {
  id: string;
  full_name: string;
}

// ── Main Page ──

export default function MemberStatusPage() {
  // Filter state
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // History drawer
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
    name: string;
    status: string;
  } | null>(null);

  // Build query filters
  const queryFilters = useMemo(
    () => ({
      status: statusFilter !== "전체" ? statusFilter : undefined,
      search: searchInput || undefined,
    }),
    [statusFilter, searchInput]
  );

  // Queries
  const { data: membersData, isLoading } = useMemberStatuses(queryFilters);
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

  const members: MemberCurrentStatus[] = membersData ?? [];

  // Stats
  const totalCount = members.length;
  const activeStatusCount = members.filter((m) => m.current_status).length;
  const normalCount = members.filter((m) => !m.current_status).length;

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
      }
    );
  };

  // ── Edit Handlers ──

  const handleEditOpen = (row: MemberCurrentStatus) => {
    if (!row.status_id) return;
    setEditingId(row.status_id);
    setFormMemberId(row.member_id || "");
    setFormStatus(row.current_status || "");
    setFormStartDate(row.status_start_date || "");
    setFormEndDate(row.status_end_date || "");
    setFormNote(row.status_note || "");
    setIsEditOpen(true);
  };

  const handleEditSubmit = () => {
    if (!editingId) return;
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
      }
    );
  };

  // ── Delete Handlers ──

  const handleDeleteOpen = (row: MemberCurrentStatus) => {
    if (!row.status_id) return;
    setDeletingItem({
      id: row.status_id,
      name: row.full_name || "",
      status: row.current_status || "",
    });
    setIsDeleteOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deletingItem) return;
    deleteStatus.mutate(deletingItem.id, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        setDeletingItem(null);
      },
    });
  };

  // ── History Handlers ──

  const handleHistoryOpen = (memberId: string, memberName: string) => {
    setHistoryMemberId(memberId);
    setHistoryMemberName(memberName);
    setIsHistoryOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 glass-panel rounded-2xl p-5 transition-all duration-300 hover:border-white/80">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#135bec]/10">
            <Users className="h-5 w-5 text-[#135bec]" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">전체 인원</p>
            <p className="text-2xl font-bold text-slate-900">
              {totalCount}
              <span className="ml-1 text-lg font-medium text-slate-400">명</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 glass-panel rounded-2xl p-5 transition-all duration-300 hover:border-white/80">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
            <Users className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">정상 근무</p>
            <p className="text-2xl font-bold text-emerald-600">
              {normalCount}
              <span className="ml-1 text-lg font-medium text-slate-400">명</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 glass-panel rounded-2xl p-5 transition-all duration-300 hover:border-white/80">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">특이사항</p>
            <p className="text-2xl font-bold text-amber-600">
              {activeStatusCount}
              <span className="ml-1 text-lg font-medium text-slate-400">명</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">이름 검색</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="이름 검색..."
              className="w-48 pl-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">특이사항</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
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
        </div>

        <div className="ml-auto">
          <Button onClick={handleCreateOpen}>
            <Plus className="mr-1.5 h-4 w-4" />
            특이사항 등록
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-panel overflow-hidden rounded-2xl">
        {isLoading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-3">
                {Array.from({ length: 7 }).map((_, j) => (
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
            <p className="mt-1 text-sm text-slate-400">
              필터를 조정해보세요.
            </p>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-420px)] overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-slate-50">
                  <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    이름
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    역할
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    본부
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    팀
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    특이사항
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    기간
                  </TableHead>
                  <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    비고
                  </TableHead>
                  <TableHead className="w-28 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    액션
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((row) => {
                  const displayStatus = row.current_status || "정상";
                  const colorClass =
                    STATUS_COLORS[displayStatus] || STATUS_COLORS["정상"];
                  return (
                    <TableRow
                      key={`${row.member_id}-${row.status_id || "normal"}`}
                      className="transition-colors hover:bg-slate-50/50"
                    >
                      <TableCell className="text-sm font-medium text-slate-900">
                        {row.full_name}
                      </TableCell>
                      <TableCell className="text-center text-sm text-slate-600">
                        {row.member_role || "-"}
                      </TableCell>
                      <TableCell className="text-center text-sm text-slate-600">
                        {row.division_name || "-"}
                      </TableCell>
                      <TableCell className="text-center text-sm text-slate-600">
                        {row.team_name || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn("px-2 py-0.5 text-[11px]", colorClass)}
                        >
                          {displayStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm text-slate-600">
                        {row.status_start_date
                          ? `${row.status_start_date} ~ ${row.status_end_date || "진행중"}`
                          : "-"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-slate-600">
                        {row.status_note || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() =>
                              handleHistoryOpen(
                                row.member_id!,
                                row.full_name || ""
                              )
                            }
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            title="이력"
                          >
                            <History className="h-3.5 w-3.5" />
                          </button>
                          {row.status_id && (
                            <>
                              <button
                                onClick={() => handleEditOpen(row)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[#135bec]/10 hover:text-[#135bec]"
                                title="수정"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteOpen(row)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                                title="삭제"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
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

      {/* ── Create Dialog ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>특이사항 등록</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>멤버</Label>
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
            </div>

            <div className="space-y-2">
              <Label>특이사항</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label>시작일</Label>
              <Input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>종료일 (미입력 시 진행중)</Label>
              <Input
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>비고</Label>
              <textarea
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="특이사항을 입력하세요"
                rows={2}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label>시작일</Label>
              <Input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>종료일 (미입력 시 진행중)</Label>
              <Input
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>비고</Label>
              <textarea
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="특이사항을 입력하세요"
                rows={2}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? (
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
            <DialogTitle>특이사항 삭제</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <p className="text-sm text-rose-700">
                이 작업은 되돌릴 수 없습니다. 해당 특이사항 기록이 삭제됩니다.
              </p>
            </div>

            {deletingItem && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
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
              disabled={deleteStatus.isPending}
            >
              {deleteStatus.isPending ? (
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

      {/* ── History Drawer ── */}
      <Drawer
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        direction="right"
      >
        <DrawerContent className="sm:max-w-md">
          <DrawerHeader>
            <DrawerTitle>{historyMemberName} - 특이사항 이력</DrawerTitle>
            <DrawerDescription>
              해당 멤버의 전체 특이사항 변경 이력을 확인합니다
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-auto px-4 pb-4">
            {isHistoryLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2 rounded-lg border p-3">
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
                      className="rounded-lg border border-slate-200 bg-white p-3"
                    >
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className={cn("px-2 py-0.5 text-[11px]", colorClass)}
                        >
                          {record.status}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {record.start_date} ~ {record.end_date || "진행중"}
                        </span>
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

          <DrawerFooter className="border-t p-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsHistoryOpen(false)}
            >
              닫기
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
