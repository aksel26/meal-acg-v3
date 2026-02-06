"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { toast } from "sonner";
import {
  Pencil,
  Loader2,
  Wallet,
  Users,
  Calculator,
  DollarSign,
  ListPlus,
} from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { useBudgetSummary } from "@/hooks/useBudgetAllocations";
import {
  useUpdateAllocation,
  useBulkUpsertAllocations,
  useCalculateActivityBudget,
} from "@/hooks/useBudgetMutations";

// ── Types ──

interface BudgetSummaryItem {
  allocation_id: string;
  member_id: string;
  member_name: string;
  member_role: string;
  team_name: string | null;
  allocation_type: string;
  total_amount: number;
  used_amount: number;
  remaining_amount: number;
  reviewed_count: number;
  usage_count: number;
  description: string | null;
}

interface Member {
  id: string;
  full_name: string;
  member_role: string;
  team_name: string | null;
}

// ── Role Badge Helper ──

function roleBadgeStyle(role: string) {
  switch (role) {
    case "본부장":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "팀장":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

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

// ── Format Currency ──

function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "-";
  return amount.toLocaleString() + "원";
}

// ── Main Page ──

export default function BudgetPage() {
  // Period & filter state
  const currentYear = new Date().getFullYear();
  const [periodYear, setPeriodYear] = useState(String(currentYear));
  const [periodHalf, setPeriodHalf] = useState("H1");
  const period = periodYear && periodHalf ? `${periodYear}-${periodHalf}` : "";
  const [typeFilter, setTypeFilter] = useState("전체");

  // Dialog states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetSummaryItem | null>(
    null,
  );
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkType, setBulkType] = useState("복지포인트");
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkDescription, setBulkDescription] = useState("");

  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [calcBaseAmount, setCalcBaseAmount] = useState("");
  const [calcPerMemberAmount, setCalcPerMemberAmount] = useState("");

  // Queries
  const typeParam = typeFilter === "전체" ? undefined : typeFilter;
  const { data: summaryData, isLoading } = useBudgetSummary(period, typeParam);

  const { data: members } = useQuery<Member[]>({
    queryKey: queryKeys.members.all,
    queryFn: async () => {
      const res = await fetch("/api/members");
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  // Mutations
  const updateAllocation = useUpdateAllocation();
  const bulkUpsert = useBulkUpsertAllocations();
  const calculateActivity = useCalculateActivityBudget();

  // Derived data
  const summaryItems: BudgetSummaryItem[] = useMemo(() => {
    if (!summaryData) return [];
    return Array.isArray(summaryData) ? summaryData : summaryData.data || [];
  }, [summaryData]);

  // Leaders for auto-calculate
  const leaderMembers = useMemo(() => {
    if (!members) return [];
    return members.filter(
      (m) => m.member_role === "팀장" || m.member_role === "본부장",
    );
  }, [members]);

  // Stats
  const totalAllocated = useMemo(
    () => summaryItems.reduce((sum, item) => sum + (item.total_amount || 0), 0),
    [summaryItems],
  );
  const totalUsed = useMemo(
    () => summaryItems.reduce((sum, item) => sum + (item.used_amount || 0), 0),
    [summaryItems],
  );
  const totalRemaining = useMemo(
    () =>
      summaryItems.reduce(
        (sum, item) => sum + (item.remaining_amount || 0),
        0,
      ),
    [summaryItems],
  );

  // ── Edit Handlers ──

  const handleEditClick = (item: BudgetSummaryItem) => {
    setEditingItem(item);
    setEditAmount(String(item.total_amount));
    setEditDescription(item.description || "");
    setIsEditOpen(true);
  };

  const handleEditSave = () => {
    if (!editingItem) return;
    const amount = parseInt(editAmount, 10);
    if (isNaN(amount) || amount < 0) {
      toast.error("올바른 금액을 입력해주세요.");
      return;
    }
    updateAllocation.mutate(
      {
        id: editingItem.allocation_id,
        total_amount: amount,
        description: editDescription || undefined,
      },
      {
        onSuccess: () => {
          setIsEditOpen(false);
          setEditingItem(null);
        },
      },
    );
  };

  // ── Bulk Handlers ──

  const handleBulkOpen = () => {
    setBulkType("복지포인트");
    setBulkAmount("");
    setBulkDescription("");
    setIsBulkOpen(true);
  };

  const handleBulkSave = () => {
    if (!period) {
      toast.error("기간을 먼저 입력해주세요.");
      return;
    }
    const amount = parseInt(bulkAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      toast.error("올바른 금액을 입력해주세요.");
      return;
    }
    if (!members || members.length === 0) {
      toast.error("멤버 목록을 불러올 수 없습니다.");
      return;
    }

    // Welfare: all members. Activity: only leaders
    const targetMembers =
      bulkType === "복지포인트"
        ? members
        : members.filter(
            (m) => m.member_role === "팀장" || m.member_role === "본부장",
          );

    if (targetMembers.length === 0) {
      toast.error("대상 멤버가 없습니다.");
      return;
    }

    const allocations = targetMembers.map((m) => ({
      member_id: m.id,
      allocation_type: bulkType,
      period,
      total_amount: amount,
      description: bulkDescription || undefined,
    }));

    bulkUpsert.mutate(
      { allocations },
      {
        onSuccess: () => {
          setIsBulkOpen(false);
        },
      },
    );
  };

  // ── Auto Calculate Handlers ──

  const handleCalcOpen = () => {
    setCalcBaseAmount("");
    setCalcPerMemberAmount("");
    setIsCalcOpen(true);
  };

  const handleCalcExecute = () => {
    if (!period) {
      toast.error("기간을 먼저 입력해주세요.");
      return;
    }
    const baseAmount = parseInt(calcBaseAmount, 10);
    const perMemberAmount = parseInt(calcPerMemberAmount, 10);
    if (isNaN(baseAmount) || baseAmount < 0) {
      toast.error("기본 금액을 올바르게 입력해주세요.");
      return;
    }
    if (isNaN(perMemberAmount) || perMemberAmount < 0) {
      toast.error("인당 금액을 올바르게 입력해주세요.");
      return;
    }

    calculateActivity.mutate(
      {
        period,
        base_amount: baseAmount,
        per_member_amount: perMemberAmount,
      },
      {
        onSuccess: () => {
          setIsCalcOpen(false);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      {period && summaryItems.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 glass-panel rounded-2xl p-5 transition-all duration-300 hover:border-white/80">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#135bec]/10">
              <DollarSign className="h-5 w-5 text-[#135bec]" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">총 할당액</p>
              <p className="text-2xl font-bold text-slate-900">
                {(totalAllocated / 10000).toFixed(1)}
                <span className="ml-1 text-lg font-medium text-slate-400">
                  만원
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
                {(totalUsed / 10000).toFixed(1)}
                <span className="ml-1 text-lg font-medium text-slate-400">
                  만원
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 glass-panel rounded-2xl p-5 transition-all duration-300 hover:border-white/80">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">총 잔액</p>
              <p
                className={cn(
                  "text-2xl font-bold",
                  totalRemaining >= 0 ? "text-emerald-600" : "text-rose-600",
                )}
              >
                {(totalRemaining / 10000).toFixed(1)}
                <span className="ml-1 text-lg font-medium text-slate-400">
                  만원
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">기간</Label>
          <div className="flex items-center gap-2">
            <Select value={periodYear} onValueChange={setPeriodYear}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="연도" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(
                  (y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}년
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            <Select value={periodHalf} onValueChange={setPeriodHalf}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="반기" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="H1">상반기</SelectItem>
                <SelectItem value="H2">하반기</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">구분 필터</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="전체">전체</SelectItem>
              <SelectItem value="복지포인트">복지포인트</SelectItem>
              <SelectItem value="활동비">활동비</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={handleBulkOpen}
            size="sm"
            className="gap-1.5"
            disabled={!period}
          >
            <ListPlus className="h-4 w-4" />
            일괄 할당
          </Button>
          <Button
            onClick={handleCalcOpen}
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={!period}
          >
            <Calculator className="h-4 w-4" />
            활동비 자동 계산
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-panel overflow-hidden rounded-2xl">
        {!period ? (
          <div className="py-16 text-center">
            <Wallet className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-lg font-medium text-slate-600">
              기간을 선택해주세요
            </p>
          </div>
        ) : isLoading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-3">
                {Array.from({ length: 9 }).map((_, j) => (
                  <div
                    key={j}
                    className="h-4 flex-1 animate-pulse rounded bg-slate-100"
                  />
                ))}
              </div>
            ))}
          </div>
        ) : summaryItems.length === 0 ? (
          <div className="py-16 text-center">
            <DollarSign className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-lg font-medium text-slate-600">
              할당된 예산이 없습니다
            </p>
            <p className="mt-1 text-sm text-slate-400">
              &quot;일괄 할당&quot; 버튼으로 예산을 할당해보세요
            </p>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-420px)] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-14 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    No
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    구분
                  </TableHead>
                  <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    이름
                  </TableHead>
                  <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    팀
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    할당액
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    사용액
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    잔액
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    검토
                  </TableHead>
                  <TableHead className="w-16 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    액션
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryItems.map((item, index) => {
                  const remaining = item.remaining_amount ?? 0;
                  return (
                    <TableRow
                      key={item.allocation_id || `${item.member_id}-${index}`}
                      className="transition-colors hover:bg-slate-50/50"
                    >
                      <TableCell className="text-center text-sm text-slate-400">
                        {index + 1}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[11px] px-1.5 py-0",
                              roleBadgeStyle(item.member_role),
                            )}
                          >
                            {item.member_role}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[11px] px-1.5 py-0",
                              typeBadgeStyle(item.allocation_type),
                            )}
                          >
                            {item.allocation_type}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-900">
                        {item.member_name}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {item.team_name || "-"}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium text-sky-600">
                        {formatCurrency(item.total_amount)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium text-[#a855f7]">
                        {formatCurrency(item.used_amount)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right text-sm font-semibold",
                          remaining >= 0
                            ? "text-emerald-600"
                            : "text-rose-600",
                        )}
                      >
                        {formatCurrency(remaining)}
                      </TableCell>
                      <TableCell className="text-center text-sm text-slate-600">
                        {item.reviewed_count}/{item.usage_count}
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleEditClick(item)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[#135bec]/10 hover:text-[#135bec]"
                          title="수정"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ── Edit Allocation Dialog ── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingItem?.member_name} - 예산 수정
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">할당액</Label>
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
              <Label htmlFor="edit-desc">설명</Label>
              <textarea
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="설명을 입력하세요 (선택)"
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={updateAllocation.isPending}
            >
              {updateAllocation.isPending ? (
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

      {/* ── Bulk Allocation Dialog ── */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>일괄 예산 할당</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>유형</Label>
              <Select value={bulkType} onValueChange={setBulkType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="복지포인트">복지포인트</SelectItem>
                  <SelectItem value="활동비">활동비</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                {bulkType === "복지포인트"
                  ? "전체 멤버에게 할당됩니다."
                  : "팀장/본부장에게만 할당됩니다."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-amount">할당액 (1인당)</Label>
              <Input
                id="bulk-amount"
                type="number"
                value={bulkAmount}
                onChange={(e) => setBulkAmount(e.target.value)}
                placeholder="금액을 입력하세요"
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-desc">설명</Label>
              <textarea
                id="bulk-desc"
                value={bulkDescription}
                onChange={(e) => setBulkDescription(e.target.value)}
                placeholder="설명을 입력하세요 (선택)"
                rows={2}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <Card className="border-slate-200 bg-slate-50">
              <CardContent className="p-3">
                <p className="text-xs text-slate-500">
                  대상 인원:{" "}
                  <span className="font-semibold text-slate-700">
                    {bulkType === "복지포인트"
                      ? `${members?.length ?? 0}명 (전체)`
                      : `${leaderMembers.length}명 (팀장/본부장)`}
                  </span>
                </p>
                {bulkAmount && (
                  <p className="mt-1 text-xs text-slate-500">
                    총 예산:{" "}
                    <span className="font-semibold text-slate-700">
                      {(
                        parseInt(bulkAmount, 10) *
                        (bulkType === "복지포인트"
                          ? (members?.length ?? 0)
                          : leaderMembers.length)
                      ).toLocaleString()}
                      원
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleBulkSave}
              disabled={bulkUpsert.isPending}
            >
              {bulkUpsert.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  할당 중...
                </>
              ) : (
                "일괄 할당"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Auto Calculate Activity Budget Dialog ── */}
      <Dialog open={isCalcOpen} onOpenChange={setIsCalcOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>활동비 자동 계산</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-500">
              팀장/본부장의 활동비를 자동으로 계산합니다. 기본 금액 + (팀원 수
              x 인당 금액) 공식으로 산출됩니다.
            </p>

            <div className="space-y-2">
              <Label htmlFor="calc-base">기본 금액</Label>
              <Input
                id="calc-base"
                type="number"
                value={calcBaseAmount}
                onChange={(e) => setCalcBaseAmount(e.target.value)}
                placeholder="기본 금액을 입력하세요"
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="calc-per-member">인당 추가 금액</Label>
              <Input
                id="calc-per-member"
                type="number"
                value={calcPerMemberAmount}
                onChange={(e) => setCalcPerMemberAmount(e.target.value)}
                placeholder="팀원 1인당 추가 금액"
                min={0}
              />
            </div>

            {/* Leader preview list */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                대상 멤버 ({leaderMembers.length}명)
              </Label>
              <div className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50">
                {leaderMembers.length === 0 ? (
                  <p className="p-4 text-center text-sm text-slate-400">
                    대상 멤버가 없습니다
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {leaderMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">
                            {member.full_name}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[11px] px-1.5 py-0",
                              roleBadgeStyle(member.member_role),
                            )}
                          >
                            {member.member_role}
                          </Badge>
                        </div>
                        <span className="text-xs text-slate-400">
                          {member.team_name || "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCalcOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleCalcExecute}
              disabled={calculateActivity.isPending || leaderMembers.length === 0}
            >
              {calculateActivity.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  계산 중...
                </>
              ) : (
                "계산 및 할당"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
