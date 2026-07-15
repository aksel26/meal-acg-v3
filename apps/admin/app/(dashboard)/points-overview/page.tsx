"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { cn } from "@repo/ui/lib/utils";
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
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/src/table";
import { Wallet, Loader2 } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";

// ── Types ──

interface MemberPointsData {
  member_id: string;
  member_name: string;
  member_role: string;
  team_name: string | null;
  activity: {
    total_amount: number;
    used_amount: number;
    remaining_amount: number;
    monthly: Record<number, number>;
  };
  welfare: {
    total_amount: number;
    used_amount: number;
    remaining_amount: number;
    monthly: Record<number, number>;
  };
}

// ── Helpers ──

function roleBadgeStyle(role: string) {
  switch (role) {
    case "본부장":
      return "bg-slate-50 text-slate-700 border-slate-200";
    case "팀장":
      return "bg-slate-100 text-slate-800 border-slate-300";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "-";
  return amount.toLocaleString() + "원";
}

// ── Main Page ──

export default function PointsOverviewPage() {
  const currentYear = new Date().getFullYear();
  const [periodYear, setPeriodYear] = useState(String(currentYear));
  const [periodHalf, setPeriodHalf] = useState(new Date().getMonth() < 6 ? "H1" : "H2");
  const period = periodYear && periodHalf ? `${periodYear}-${periodHalf}` : "";

  const months = useMemo(() => {
    if (periodHalf === "H1") return [1, 2, 3, 4, 5, 6];
    return [7, 8, 9, 10, 11, 12];
  }, [periodHalf]);

  const { data, isLoading } = useQuery<{ members: MemberPointsData[] }>({
    queryKey: queryKeys.pointsOverview.byPeriod(period),
    queryFn: async () => {
      const res = await fetch(`/api/points-overview?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch points overview");
      return res.json();
    },
    enabled: !!period,
  });

  const members = data?.members || [];

  // 합계 행
  const totals = useMemo(() => {
    const t = {
      activity: { total: 0, used: 0, remaining: 0, monthly: {} as Record<number, number> },
      welfare: { total: 0, used: 0, remaining: 0, monthly: {} as Record<number, number> },
    };
    for (const m of members) {
      t.activity.total += m.activity.total_amount;
      t.activity.used += m.activity.used_amount;
      t.activity.remaining += m.activity.remaining_amount;
      t.welfare.total += m.welfare.total_amount;
      t.welfare.used += m.welfare.used_amount;
      t.welfare.remaining += m.welfare.remaining_amount;
      for (const mo of months) {
        t.activity.monthly[mo] = (t.activity.monthly[mo] || 0) + (m.activity.monthly[mo] || 0);
        t.welfare.monthly[mo] = (t.welfare.monthly[mo] || 0) + (m.welfare.monthly[mo] || 0);
      }
    }
    return t;
  }, [members, months]);

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col gap-6">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">기간</Label>
          <div className="flex items-center gap-2">
            <Select value={periodYear} onValueChange={setPeriodYear}>
              <SelectTrigger className="h-10 w-28 bg-white">
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
              <SelectTrigger className="h-10 w-28 bg-white">
                <SelectValue placeholder="반기" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="H1">상반기</SelectItem>
                <SelectItem value="H2">하반기</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {period && members.length > 0 && (
          <div className="ml-auto text-sm text-slate-500">
            총 <span className="font-semibold text-slate-700">{members.length}</span>명
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl bg-white">
        {!period ? (
          <div className="py-16 text-center">
            <Wallet className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-lg font-medium text-slate-600">
              기간을 선택해주세요
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center">
            <Wallet className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-lg font-medium text-slate-600">
              데이터가 없습니다
            </p>
            <p className="mt-1 text-sm text-slate-400">
              선택한 기간에 할당된 예산이 없습니다
            </p>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <TableHeader className="sticky top-0 z-10">
                {/* 첫 번째 행: 그룹 헤더 */}
                <TableRow className="bg-slate-50 [&>th]:bg-slate-50 [&>th]:h-9 [&>th]:px-2 [&>th]:py-0">
                  <TableHead
                    rowSpan={2}
                    className="w-12 text-center text-xs font-semibold text-slate-500"
                  >
                    No
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="text-center text-xs font-semibold text-slate-500"
                  >
                    구분
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="text-center text-xs font-semibold text-slate-500"
                  >
                    이름
                  </TableHead>
                  <TableHead
                    colSpan={2}
                    className="text-center text-xs font-semibold text-slate-500"
                  >
                    사용 가능액
                  </TableHead>
                  <TableHead
                    colSpan={2}
                    className="text-center text-xs font-semibold text-slate-500"
                  >
                    잔여액
                  </TableHead>
                  <TableHead
                    colSpan={2}
                    className="text-center text-xs font-semibold text-slate-500"
                  >
                    사용 금액
                  </TableHead>
                  <TableHead
                    colSpan={months.length}
                    className="text-center text-xs font-semibold text-slate-500"
                  >
                    활동비 월별
                  </TableHead>
                  <TableHead
                    colSpan={months.length}
                    className="text-center text-xs font-semibold text-slate-600"
                  >
                    복지포인트 월별
                  </TableHead>
                </TableRow>
                {/* 두 번째 행: 세부 열 */}
                <TableRow className="bg-slate-50/80 [&>th]:bg-slate-50/80 [&>th]:h-8 [&>th]:px-2 [&>th]:py-0">
                  <TableHead className="text-center text-[11px] font-medium text-slate-500">
                    활동비
                  </TableHead>
                  <TableHead className="text-center text-[11px] font-medium text-slate-600">
                    복지
                  </TableHead>
                  <TableHead className="text-center text-[11px] font-medium text-slate-500">
                    활동비
                  </TableHead>
                  <TableHead className="text-center text-[11px] font-medium text-slate-600">
                    복지
                  </TableHead>
                  <TableHead className="text-center text-[11px] font-medium text-slate-500">
                    활동비
                  </TableHead>
                  <TableHead className="text-center text-[11px] font-medium text-slate-600">
                    복지
                  </TableHead>
                  {months.map((mo) => (
                    <TableHead
                      key={`activity-${mo}`}
                      className="text-center text-[11px] font-medium text-slate-500"
                    >
                      {mo}월
                    </TableHead>
                  ))}
                  {months.map((mo) => (
                    <TableHead
                      key={`welfare-${mo}`}
                      className="text-center text-[11px] font-medium text-slate-600"
                    >
                      {mo}월
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((row, index) => (
                  <TableRow
                    key={row.member_id}
                    className="transition-colors hover:bg-slate-50/50 [&>td]:px-2 [&>td]:py-1.5"
                  >
                    <TableCell className="text-center text-xs text-slate-400">
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
                    <TableCell className="text-center text-sm font-medium whitespace-nowrap">
                      <Link
                        href={`/review?member=${row.member_id}`}
                        className="text-slate-900 hover:text-[#1d1d1f] hover:underline"
                      >
                        {row.member_name}
                      </Link>
                    </TableCell>
                    {/* 사용 가능액 */}
                    <TableCell className="text-right text-xs tabular-nums text-slate-700">
                      {formatCurrency(row.activity.total_amount)}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-slate-700">
                      {formatCurrency(row.welfare.total_amount)}
                    </TableCell>
                    {/* 잔여액 */}
                    <TableCell
                      className={cn(
                        "text-right text-xs tabular-nums",
                        row.activity.remaining_amount < 0
                          ? "text-slate-600 font-medium"
                          : "text-slate-700",
                      )}
                    >
                      {formatCurrency(row.activity.remaining_amount)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right text-xs tabular-nums",
                        row.welfare.remaining_amount < 0
                          ? "text-slate-600 font-medium"
                          : "text-slate-700",
                      )}
                    >
                      {formatCurrency(row.welfare.remaining_amount)}
                    </TableCell>
                    {/* 사용 금액 */}
                    <TableCell className="text-right text-xs tabular-nums text-slate-700">
                      {formatCurrency(row.activity.used_amount)}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-slate-700">
                      {formatCurrency(row.welfare.used_amount)}
                    </TableCell>
                    {/* 활동비 월별 */}
                    {months.map((mo) => (
                      <TableCell
                        key={`activity-${mo}`}
                        className={cn(
                          "text-right text-xs tabular-nums",
                          row.activity.monthly[mo]
                            ? "text-slate-700"
                            : "text-slate-300",
                        )}
                      >
                        {row.activity.monthly[mo]
                          ? row.activity.monthly[mo].toLocaleString()
                          : "-"}
                      </TableCell>
                    ))}
                    {/* 복지포인트 월별 */}
                    {months.map((mo) => (
                      <TableCell
                        key={`welfare-${mo}`}
                        className={cn(
                          "text-right text-xs tabular-nums",
                          row.welfare.monthly[mo]
                            ? "text-slate-700"
                            : "text-slate-300",
                        )}
                      >
                        {row.welfare.monthly[mo]
                          ? row.welfare.monthly[mo].toLocaleString()
                          : "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {/* 합계 행 */}
                <TableRow className="bg-slate-50 font-semibold [&>td]:px-2 [&>td]:py-2">
                  <TableCell
                    colSpan={3}
                    className="text-center text-xs text-slate-600"
                  >
                    합계
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-slate-800">
                    {formatCurrency(totals.activity.total)}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-slate-800">
                    {formatCurrency(totals.welfare.total)}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-slate-800">
                    {formatCurrency(totals.activity.remaining)}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-slate-800">
                    {formatCurrency(totals.welfare.remaining)}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-slate-800">
                    {formatCurrency(totals.activity.used)}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-slate-800">
                    {formatCurrency(totals.welfare.used)}
                  </TableCell>
                  {months.map((mo) => (
                    <TableCell
                      key={`total-activity-${mo}`}
                      className="text-right text-xs tabular-nums text-slate-800"
                    >
                      {totals.activity.monthly[mo]
                        ? totals.activity.monthly[mo].toLocaleString()
                        : "-"}
                    </TableCell>
                  ))}
                  {months.map((mo) => (
                    <TableCell
                      key={`total-welfare-${mo}`}
                      className="text-right text-xs tabular-nums text-slate-800"
                    >
                      {totals.welfare.monthly[mo]
                        ? totals.welfare.monthly[mo].toLocaleString()
                        : "-"}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
