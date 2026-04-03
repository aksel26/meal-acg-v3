"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { ChevronLeft } from "lucide-react";
import { Button } from "@repo/ui/src/button";
import { Badge } from "@repo/ui/src/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { cn } from "@repo/ui/lib/utils";
import { queryKeys } from "@/lib/query-keys";
import {
  useDayoffsByTarget,
  useLeaveTypes,
  type DayoffRecord,
} from "@/hooks/useDayoffs";

const LEAVE_TYPE_COLORS: Record<string, string> = {
  "지각/조퇴": "bg-orange-50 text-orange-700 border-orange-200",
  반차: "bg-purple-50 text-purple-700 border-purple-200",
  연차: "bg-yellow-50 text-yellow-700 border-yellow-200",
  대체휴무: "bg-blue-50 text-blue-700 border-blue-200",
  경조휴무: "bg-pink-50 text-pink-700 border-pink-200",
  특별휴무: "bg-teal-50 text-teal-700 border-teal-200",
  훈련: "bg-slate-50 text-slate-700 border-slate-200",
  휴무: "bg-green-50 text-green-700 border-green-200",
};

interface MemberDetail {
  id: string;
  full_name: string;
  hire_date: string | null;
  team: { name: string } | null;
  position: { name: string } | null;
}

function getLeaveTypeBadge(record: DayoffRecord) {
  const category = record.leave_type?.category || "";
  const colorClass = LEAVE_TYPE_COLORS[category] || "bg-gray-50 text-gray-700 border-gray-200";
  let label = record.leave_type?.name || "";
  if (record.leave_type_id === 1 && record.late_hour) {
    label = `지각-${record.late_hour}시${record.late_minute || "00"}분`;
  }
  return (
    <Badge variant="outline" className={`text-[11px] ${colorClass}`}>
      {label}
    </Badge>
  );
}

export default function DayoffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const currentYear = dayjs().year();
  const [year, setYear] = useState(currentYear);

  const { data: member } = useQuery<MemberDetail>({
    queryKey: queryKeys.members.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/members/${id}`);
      if (!res.ok) throw new Error("Failed to fetch member");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: dayoffs, isLoading } = useDayoffsByTarget(id, year);
  const { data: leaveTypes } = useLeaveTypes();

  const hireDate = member?.hire_date ? dayjs(member.hire_date) : null;
  const yearsOfService = hireDate ? dayjs().diff(hireDate, "year") : null;

  const years = Array.from({ length: currentYear - 2022 }, (_, i) => 2023 + i);

  // Group dayoffs by month
  const monthlyData = useMemo(() => {
    const months: { month: number; records: DayoffRecord[]; count: number }[] = [];
    let cumulative = 0;

    for (let m = 1; m <= 12; m++) {
      const records = (dayoffs || [])
        .filter((d) => dayjs(d.leave_date).month() + 1 === m)
        .sort((a, b) => a.leave_date.localeCompare(b.leave_date));

      // Count: 반차 = 0.5, others = 1
      const count = records.reduce((sum, r) => {
        const cat = r.leave_type?.category || "";
        return sum + (cat === "반차" ? 0.5 : 1);
      }, 0);

      months.push({ month: m, records, count });
      cumulative += count;
    }

    return { months, total: cumulative };
  }, [dayoffs]);

  // Previous year cumulative (before this year)
  // This would need a separate query; for now just show current year data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dayoffs">
          <Button variant="outline" size="icon" className="h-9 w-9">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            {member?.full_name || "..."} 휴가 현황
          </h1>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {member?.position?.name && <span>{member.position.name}</span>}
            {member?.team?.name && <span>{member.team.name}</span>}
          </div>
        </div>
        <div className="ml-auto">
          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="h-9 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}년</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Member Info Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">입사일</div>
          <div className="mt-1 text-sm font-semibold text-slate-800">
            {hireDate ? hireDate.format("YYYY-MM-DD") : "-"}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">근속년수</div>
          <div className="mt-1 text-sm font-semibold text-slate-800">
            {yearsOfService !== null ? `${yearsOfService}년` : "-"}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">{year}년 사용일수</div>
          <div className="mt-1 text-sm font-semibold text-red-600">
            {monthlyData.total}일
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">{year}년 총 건수</div>
          <div className="mt-1 text-sm font-semibold text-slate-800">
            {dayoffs?.length || 0}건
          </div>
        </div>
      </div>

      {/* Monthly Breakdown - Horizontal */}
      {isLoading ? (
        <div className="py-10 text-center text-sm text-slate-400">로딩 중...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <div className="grid grid-cols-12 min-w-[1200px]">
            {monthlyData.months.map((md) => {
              const prevCumulative = monthlyData.months
                .slice(0, md.month - 1)
                .reduce((sum, m) => sum + m.count, 0);
              const cumulative = prevCumulative + md.count;

              return (
                <div key={md.month} className={cn("flex flex-col", md.month < 12 && "border-r border-slate-100")}>
                  {/* Month header */}
                  <div className="border-b bg-slate-50 px-2 py-2 text-center">
                    <span className="text-xs font-semibold text-slate-700">{md.month}월</span>
                  </div>
                  {/* Records */}
                  <div className="flex-1 divide-y divide-slate-50">
                    {md.records.length > 0 ? (
                      md.records.map((record) => {
                        const date = dayjs(record.leave_date);
                        return (
                          <div key={record.id} className="px-2 py-1 hover:bg-slate-50">
                            <div className="text-xs text-slate-600">
                              {date.format("D")}일
                            </div>
                            <div className="mt-0.5 text-[10px] text-slate-500">
                              {record.leave_type_id === 1 && record.late_hour
                                ? `지각-${record.late_hour}시${record.late_minute || "00"}분`
                                : record.leave_type?.name || ""}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-2 py-3 text-center text-xs text-slate-300">-</div>
                    )}
                  </div>
                  {/* Summary */}
                  <div className="mt-auto border-t border-slate-200 bg-slate-50/70">
                    <div className="flex justify-between px-2 py-1 text-[10px] text-slate-400">
                      <span>이전</span>
                      <span>{prevCumulative > 0 ? prevCumulative : "-"}</span>
                    </div>
                    <div className="flex justify-between px-2 py-1 text-[10px] text-slate-500 border-t border-slate-100">
                      <span>합계</span>
                      <span className="font-medium">{md.count > 0 ? md.count : "-"}</span>
                    </div>
                    <div className="flex justify-between px-2 py-1 text-[10px] font-semibold text-red-600 border-t border-slate-200 bg-slate-100/70">
                      <span>누적</span>
                      <span>{cumulative > 0 ? cumulative : "-"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
