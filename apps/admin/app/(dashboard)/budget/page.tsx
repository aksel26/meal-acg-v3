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
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/src/table";
import { toast } from "sonner";
import {
  Loader2,
  Wallet,
  Calculator,
  DollarSign,
  ListPlus,
} from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { useBudgetSummary } from "@/hooks/useBudgetAllocations";
import { useActiveStatusMembers } from "@/hooks/useActiveStatusMembers";
import {
  useUpdateAllocation,
  useBulkUpsertAllocations,
} from "@/hooks/useBudgetMutations";

// ── Types ──

interface BudgetSummaryItem {
  allocation_id: string;
  member_id: string;
  member_name: string;
  member_role: string;
  team_name: string | null;
  type: string;
  total_amount: number;
  used_amount: number;
  remaining_amount: number;
  reviewed_count: number;
  usage_count: number;
  description: string | null;
}

interface MemberBudgetRow {
  member_id: string;
  member_name: string;
  member_role: string;
  team_name: string | null;
  welfare: BudgetSummaryItem | null;
  activity: BudgetSummaryItem | null;
}

interface Member {
  id: string;
  full_name: string;
  member_role: string;
  team_name: string | null;
  team_id: string | null;
  division_id: string | null;
  note: string | null;
  intern_months: number | null;
}

// ── Role Badge Helper ──

function roleBadgeStyle(role: string) {
  switch (role) {
    case "본부장":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "팀장":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "인턴":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
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
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkDescription, setBulkDescription] = useState("");

  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [calcLeaderRate, setCalcLeaderRate] = useState("200000");
  const [calcManagerRate, setCalcManagerRate] = useState("150000");
  const [calcPncExtraRate, setCalcPncExtraRate] = useState("50000");

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

  // 특이사항 인원 조회
  const { data: statusMembers } = useActiveStatusMembers();

  // Mutations
  const updateAllocation = useUpdateAllocation();
  const bulkUpsert = useBulkUpsertAllocations();

  // Derived data
  const summaryItems: BudgetSummaryItem[] = useMemo(() => {
    if (!summaryData) return [];
    return Array.isArray(summaryData) ? summaryData : summaryData.data || [];
  }, [summaryData]);

  // 멤버별 그룹화
  const memberRows: MemberBudgetRow[] = useMemo(() => {
    const map = new Map<string, MemberBudgetRow>();
    for (const item of summaryItems) {
      let row = map.get(item.member_id);
      if (!row) {
        row = {
          member_id: item.member_id,
          member_name: item.member_name,
          member_role: item.member_role,
          team_name: item.team_name,
          welfare: null,
          activity: null,
        };
        map.set(item.member_id, row);
      }
      if (item.type === "복지포인트") row.welfare = item;
      else if (item.type === "활동비") row.activity = item;
    }
    return Array.from(map.values());
  }, [summaryItems]);

  // Member note map (id → note)
  const memberNoteMap = useMemo(() => {
    const map = new Map<string, string>();
    members?.forEach((m) => {
      if (m.note) map.set(m.id, m.note);
    });
    return map;
  }, [members]);

  // 특이사항 인원 ID Set
  const statusMemberIds = useMemo(() => {
    return new Set(
      (statusMembers || []).map((m) => m.member_id).filter(Boolean)
    );
  }, [statusMembers]);

  // 복지포인트 할당 대상 인원 수 (전체 멤버, 특이사항 제외)
  const bulkTargetCount = useMemo(() => {
    if (!members) return 0;
    return members.filter((m) => !statusMemberIds.has(m.id)).length;
  }, [members, statusMemberIds]);

  // Leaders for auto-calculate (인턴은 팀장 금액에 포함)
  const leaderMembers = useMemo(() => {
    if (!members) return [];
    return members.filter(
      (m) => m.member_role === "팀장" || m.member_role === "본부장",
    );
  }, [members]);

  // Activity preview calculation
  const activityPreview = useMemo(() => {
    if (!members || !leaderMembers.length) return [];
    const leaderRate = parseInt(calcLeaderRate) || 0;
    const managerRate = parseInt(calcManagerRate) || 0;
    const pncExtraRate = parseInt(calcPncExtraRate) || 0;

    // team_id별 멤버 수 집계 (인턴 제외)
    const teamCounts = new Map<string, number>();
    members.forEach((m) => {
      if (m.team_id && m.member_role !== "인턴")
        teamCounts.set(m.team_id, (teamCounts.get(m.team_id) || 0) + 1);
    });

    // team_id별 인턴 목록 집계
    const teamInterns = new Map<string, Member[]>();
    members.forEach((m) => {
      if (m.team_id && m.member_role === "인턴" && !statusMemberIds.has(m.id)) {
        const list = teamInterns.get(m.team_id) || [];
        list.push(m);
        teamInterns.set(m.team_id, list);
      }
    });

    // P&C팀 식별
    const pncLeader = leaderMembers.find(
      (l) =>
        l.team_name?.includes("People & Culture") ||
        l.team_name?.includes("P&C"),
    );
    const pncTeamId = pncLeader?.team_id;

    // 전체 팀원급+인턴 인원 수 (특이사항 인원 제외, 팀 배정된 멤버만)
    const pncExtraCount = pncTeamId
      ? members.filter(
          (m) =>
            (m.member_role === "팀원" || m.member_role === "인턴") &&
            m.team_id &&
            !statusMemberIds.has(m.id),
        ).length
      : 0;

    return leaderMembers.map((leader) => {
      const memberCount = leader.team_id
        ? (teamCounts.get(leader.team_id) || 1)
        : 1;
      const isPnC = !!(pncTeamId && leader.team_id === pncTeamId);
      const interns = leader.team_id ? (teamInterns.get(leader.team_id) || []) : [];

      // 인턴 활동비 합산
      const internAmount = interns.reduce((sum, intern) => {
        const months = intern.intern_months || 1;
        return sum + Math.round(managerRate / 6 * months);
      }, 0);

      let amount: number;
      let basis: string;
      if (leader.member_role === "본부장") {
        amount = memberCount * leaderRate;
        basis = `${formatCurrency(leaderRate)}원 × ${memberCount}명`;
      } else if (isPnC) {
        amount = memberCount * managerRate + pncExtraCount * pncExtraRate;
        const parts: string[] = [];
        parts.push(`본인 ${formatCurrency(managerRate)}`);
        if (memberCount > 1) {
          parts.push(`${formatCurrency(managerRate)} × ${memberCount - 1}명`);
        }
        if (pncExtraCount > 0) {
          parts.push(`${formatCurrency(pncExtraRate)} × ${pncExtraCount}명 (팀원+인턴)`);
        }
        basis = parts.join(" + ");
      } else {
        amount = memberCount * managerRate;
        const parts: string[] = [];
        parts.push(`본인 ${formatCurrency(managerRate)}`);
        if (memberCount > 1) {
          parts.push(`${formatCurrency(managerRate)} × ${memberCount - 1}명`);
        }
        basis = parts.join(" + ");
      }

      // 인턴 금액 합산
      if (internAmount > 0) {
        amount += internAmount;
        const internParts = interns.map((intern) => {
          const months = intern.intern_months || 1;
          return `인턴 ${intern.full_name} ${formatCurrency(managerRate)}/6×${months}개월`;
        });
        basis += " + " + internParts.join(" + ");
      }

      return { ...leader, memberCount, amount, isPnC, pncExtraCount, basis, internCount: interns.length };
    });
  }, [members, leaderMembers, calcLeaderRate, calcManagerRate, calcPncExtraRate, statusMemberIds]);

  const activityPreviewTotal = useMemo(
    () =>
      activityPreview
        .filter((p) => !statusMemberIds.has(p.id))
        .reduce((sum, p) => sum + p.amount, 0),
    [activityPreview, statusMemberIds],
  );

  // Stats
  const totalAllocated = useMemo(
    () => summaryItems.reduce((sum, item) => sum + (item.total_amount || 0), 0),
    [summaryItems],
  );
  const welfareAllocated = useMemo(
    () =>
      summaryItems
        .filter((item) => item.type === "복지포인트")
        .reduce((sum, item) => sum + (item.total_amount || 0), 0),
    [summaryItems],
  );
  const activityAllocated = useMemo(
    () =>
      summaryItems
        .filter((item) => item.type === "활동비")
        .reduce((sum, item) => sum + (item.total_amount || 0), 0),
    [summaryItems],
  );
  const welfareRemaining = useMemo(
    () =>
      summaryItems
        .filter((item) => item.type === "복지포인트")
        .reduce((sum, item) => sum + (item.remaining_amount || 0), 0),
    [summaryItems],
  );
  const activityRemaining = useMemo(
    () =>
      summaryItems
        .filter((item) => item.type === "활동비")
        .reduce((sum, item) => sum + (item.remaining_amount || 0), 0),
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

    const allocations = members.map((m) => ({
      member_id: m.id,
      type: "복지포인트" as const,
      period,
      total_amount: statusMemberIds.has(m.id) ? 0 : amount,
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
    setCalcLeaderRate("200000");
    setCalcManagerRate("150000");
    setCalcPncExtraRate("50000");
    setIsCalcOpen(true);
  };

  const handleCalcExecute = () => {
    if (!period) {
      toast.error("기간을 먼저 입력해주세요.");
      return;
    }
    if (activityPreview.length === 0) {
      toast.error("대상 멤버가 없습니다.");
      return;
    }

    const allocations = activityPreview.map((p) => ({
      member_id: p.id,
      type: "활동비",
      period,
      total_amount: statusMemberIds.has(p.id) ? 0 : p.amount,
    }));

    bulkUpsert.mutate(
      { allocations },
      {
        onSuccess: () => {
          setIsCalcOpen(false);
        },
      },
    );
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col gap-6">
      {/* Quick Stats */}
      {period && summaryItems.length > 0 && (
        <div className="flex items-center gap-6 rounded-xl border border-slate-200/60 bg-white/50 px-6 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">총 할당액</span>
            <span className="text-lg font-semibold tabular-nums text-slate-800">
              {(totalAllocated / 10000).toFixed(1)}
              <span className="ml-0.5 text-sm font-normal text-slate-400">만원</span>
            </span>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">복지포인트</span>
            <span className="text-lg font-semibold tabular-nums text-slate-800">
              {(welfareAllocated / 10000).toFixed(1)}
              <span className="ml-0.5 text-sm font-normal text-slate-400">만원</span>
            </span>
            <span className={cn(
              "text-xs tabular-nums",
              welfareRemaining < 0 ? "text-rose-500" : "text-slate-400",
            )}>
              (잔액 {(welfareRemaining / 10000).toFixed(1)}만원)
            </span>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">활동비</span>
            <span className="text-lg font-semibold tabular-nums text-slate-800">
              {(activityAllocated / 10000).toFixed(1)}
              <span className="ml-0.5 text-sm font-normal text-slate-400">만원</span>
            </span>
            <span className={cn(
              "text-xs tabular-nums",
              activityRemaining < 0 ? "text-rose-500" : "text-slate-400",
            )}>
              (잔액 {(activityRemaining / 10000).toFixed(1)}만원)
            </span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">기간</Label>
          <div className="flex items-center gap-2">
            <Select value={periodYear} onValueChange={setPeriodYear}>
              <SelectTrigger className="h-10 w-28">
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
              <SelectTrigger className="h-10 w-28">
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
            <SelectTrigger className="h-10 w-40">
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
            복지포인트 할당
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
      <div className="glass-panel min-h-0 flex-1 overflow-hidden rounded-2xl">
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
        ) : memberRows.length === 0 ? (
          <div className="py-16 text-center">
            <DollarSign className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-lg font-medium text-slate-600">
              할당된 예산이 없습니다
            </p>
            <p className="mt-1 text-sm text-slate-400">
              &quot;복지포인트 할당&quot; 버튼으로 예산을 할당해보세요
            </p>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-slate-50 [&>th]:bg-slate-50 [&>th]:h-9 [&>th]:px-3 [&>th]:py-0">
                  <TableHead className="w-14 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    No
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    직급
                  </TableHead>
                  <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    이름
                  </TableHead>
                  <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    팀
                  </TableHead>
                  <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    활동비 기준
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    활동비
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    복지포인트
                  </TableHead>
                  <TableHead className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    비고
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberRows.map((row, index) => {
                  const preview = activityPreview.find((p) => p.id === row.member_id);
                  return (
                    <TableRow
                      key={row.member_id}
                      className="transition-colors hover:bg-slate-50/50 [&>td]:px-3 [&>td]:py-1.5"
                    >
                      <TableCell className="text-center text-sm text-slate-400">
                        {index + 1}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px] px-1.5 py-0",
                            roleBadgeStyle(row.member_role),
                          )}
                        >
                          {row.member_role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-900">
                        {row.member_name}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {row.team_name || "-"}
                      </TableCell>
                      <TableCell className="text-[11px] text-slate-500">
                        {preview?.basis || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.activity ? (
                          <button
                            onClick={() => handleEditClick(row.activity!)}
                            className="cursor-pointer rounded px-2 py-0.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:underline"
                          >
                            {formatCurrency(row.activity.total_amount)}
                          </button>
                        ) : (
                          <span className="text-sm text-slate-300">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.welfare ? (
                          <button
                            onClick={() => handleEditClick(row.welfare!)}
                            className="cursor-pointer rounded px-2 py-0.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:underline"
                          >
                            {formatCurrency(row.welfare.total_amount)}
                          </button>
                        ) : (
                          <span className="text-sm text-slate-300">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {memberNoteMap.get(row.member_id) || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </table>
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
            <DialogTitle>복지포인트 할당</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
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
                    {bulkTargetCount}명
                  </span>
                </p>
                {bulkAmount && (
                  <p className="mt-1 text-xs text-slate-500">
                    총 예산:{" "}
                    <span className="font-semibold text-slate-700">
                      {(
                        parseInt(bulkAmount, 10) * bulkTargetCount
                      ).toLocaleString()}
                      원
                    </span>
                  </p>
                )}
                {statusMembers && statusMembers.length > 0 && (
                  <p className="mt-2 text-xs text-amber-600">
                    특이사항 인원 {statusMembers.length}명은 할당액 0원으로
                    포함됩니다.
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
                "할당"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Auto Calculate Activity Budget Dialog ── */}
      <Dialog open={isCalcOpen} onOpenChange={setIsCalcOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>활동비 자동 계산</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* 직책별 단가 설정 */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700">
                직책별 단가 설정
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {/* [HIDDEN] 본부장 단가 — 본부장 직책 재활성화 시 주석 해제
                <div className="space-y-1.5">
                  <Label
                    htmlFor="calc-leader-rate"
                    className="text-xs text-slate-500"
                  >
                    본부장 (인당)
                  </Label>
                  <Input
                    id="calc-leader-rate"
                    type="number"
                    value={calcLeaderRate}
                    onChange={(e) => setCalcLeaderRate(e.target.value)}
                    min={0}
                  />
                </div>
                */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="calc-manager-rate"
                    className="text-xs text-slate-500"
                  >
                    팀장 (인당)
                  </Label>
                  <Input
                    id="calc-manager-rate"
                    type="number"
                    value={calcManagerRate}
                    onChange={(e) => setCalcManagerRate(e.target.value)}
                    min={0}
                  />
                </div>
              </div>
            </div>

            {/* P&C팀 특별 설정 */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700">
                P&C팀 특별 설정
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">기타 인원 수</Label>
                  <Input
                    value={
                      activityPreview.find((p) => p.isPnC)?.pncExtraCount ?? 0
                    }
                    disabled
                    className="bg-slate-50"
                  />
                  <p className="text-[11px] text-slate-400">
                    P&C팀 외 팀원급+인턴 (자동)
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="calc-pnc-extra"
                    className="text-xs text-slate-500"
                  >
                    기타 인당 금액
                  </Label>
                  <Input
                    id="calc-pnc-extra"
                    type="number"
                    value={calcPncExtraRate}
                    onChange={(e) => setCalcPncExtraRate(e.target.value)}
                    min={0}
                  />
                </div>
              </div>
            </div>

            {/* 미리보기 테이블 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">
                미리보기
              </Label>
              <div className="max-h-56 overflow-auto rounded-lg border border-slate-200">
                {activityPreview.length === 0 ? (
                  <p className="p-4 text-center text-sm text-slate-400">
                    대상 멤버가 없습니다
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                        <th className="px-3 py-2 text-left font-medium">이름</th>
                        <th className="px-2 py-2 text-center font-medium">직급</th>
                        <th className="px-2 py-2 text-left font-medium">팀</th>
                        <th className="px-2 py-2 text-center font-medium">인원</th>
                        <th className="px-3 py-2 text-right font-medium">계산액</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activityPreview.map((row) => {
                        const isExcluded = statusMemberIds.has(row.id);
                        return (
                          <tr
                            key={row.id}
                            className={cn(
                              isExcluded && "bg-amber-50/50 text-slate-400",
                            )}
                          >
                            <td className="px-3 py-2 font-medium">
                              {row.full_name}
                              {isExcluded && (
                                <span className="ml-1 text-[10px] text-amber-500">
                                  (특이사항)
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] px-1 py-0",
                                  roleBadgeStyle(row.member_role),
                                )}
                              >
                                {row.member_role}
                              </Badge>
                            </td>
                            <td className="px-2 py-2 text-slate-600">
                              {row.team_name || "-"}
                            </td>
                            <td className="px-2 py-2 text-center tabular-nums">
                              {row.isPnC
                                ? `${row.memberCount}+${row.pncExtraCount}`
                                : row.memberCount}
                              {row.internCount > 0 && (
                                <span className="ml-0.5 text-emerald-600">+{row.internCount}인턴</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums font-medium">
                              {isExcluded
                                ? "0원"
                                : formatCurrency(row.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-300 bg-slate-50 font-semibold">
                        <td colSpan={4} className="px-3 py-2 text-right text-slate-600">
                          합계
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-900">
                          {formatCurrency(activityPreviewTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
              {statusMembers && statusMembers.length > 0 && (
                <p className="text-xs text-amber-600">
                  특이사항 인원 {statusMembers.length}명은 할당액 0원으로
                  포함됩니다.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCalcOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleCalcExecute}
              disabled={bulkUpsert.isPending || activityPreview.length === 0}
            >
              {bulkUpsert.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  할당 중...
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
