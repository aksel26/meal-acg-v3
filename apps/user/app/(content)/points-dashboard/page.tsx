"use client";

import { Badge } from "@repo/ui/src/badge";
import { Card, CardContent } from "@repo/ui/src/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/src/tabs";
import React, { useState, useMemo, useEffect } from "react";
import {
  useMemberIdLookup,
  usePointsDashboard,
  type BudgetSummary,
} from "@/hooks/use-points-data";
import { useUserStore } from "@/stores/userStore";
import dayjs from "dayjs";

export default function PointsDashboard() {
  const currentDate = dayjs();
  const currentYear = currentDate.year();
  const currentMonth = currentDate.month() + 1;
  const isSecondHalf = currentMonth >= 7;

  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    currentDate.format("YYYY-MM"),
  );
  const [selectedType, setSelectedType] = useState<string>("all");

  const { userName, memberId, setMemberInfo } = useUserStore();
  const { data: memberLookup } = useMemberIdLookup(!memberId ? userName : null);

  useEffect(() => {
    if (memberLookup && !memberId) {
      setMemberInfo(
        memberLookup.id,
        memberLookup.member_role,
        memberLookup.hire_date,
      );
    }
  }, [memberLookup, memberId, setMemberInfo]);

  const currentMemberId = memberId || memberLookup?.id || null;

  const typeFilter = selectedType === "all" ? undefined : selectedType;
  const { data: dashboardData, isLoading } = usePointsDashboard(
    currentMemberId,
    selectedPeriod,
    typeFilter,
  );

  const months = Array.from({ length: 6 }, (_, i) => {
    const monthNum = isSecondHalf ? i + 7 : i + 1;
    const date = dayjs()
      .year(currentYear)
      .month(monthNum - 1)
      .date(1);
    return {
      value: date.format("YYYY-MM"),
      label: `${monthNum}월`,
    };
  });

  // 전체 통계
  const stats = useMemo(() => {
    if (!dashboardData?.length)
      return {
        totalBudget: 0,
        totalUsed: 0,
        totalRemaining: 0,
        memberCount: 0,
      };

    const uniqueMembers = new Set(
      dashboardData.map((d: BudgetSummary) => d.member_id),
    );
    return {
      totalBudget: dashboardData.reduce(
        (sum: number, d: BudgetSummary) => sum + d.total_amount,
        0,
      ),
      totalUsed: dashboardData.reduce(
        (sum: number, d: BudgetSummary) => sum + d.used_amount,
        0,
      ),
      totalRemaining: dashboardData.reduce(
        (sum: number, d: BudgetSummary) => sum + d.remaining_amount,
        0,
      ),
      memberCount: uniqueMembers.size,
    };
  }, [dashboardData]);

  // 팀별 그룹핑
  const groupedByTeam = useMemo(() => {
    if (!dashboardData?.length) return {};

    const groups: Record<string, BudgetSummary[]> = {};
    dashboardData.forEach((item: BudgetSummary) => {
      const team = item.team_name || "미배정";
      if (!groups[team]) groups[team] = [];
      groups[team].push(item);
    });
    return groups;
  }, [dashboardData]);

  const usageRate =
    stats.totalBudget > 0
      ? Math.round((stats.totalUsed / stats.totalBudget) * 100)
      : 0;

  return (
    <React.Fragment>
      {/* Filters */}
      <div className="flex gap-2 mb-6">
        <Tabs
          defaultValue="all"
          className="flex-1"
          onValueChange={setSelectedType}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="text-xs">
              전체
            </TabsTrigger>
            <TabsTrigger value="복지포인트" className="text-xs">
              복지포인트
            </TabsTrigger>
            <TabsTrigger value="활동비" className="text-xs">
              활동비
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-auto min-w-[80px] h-10 border-0 bg-white shadow-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="border-0 shadow-none bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">총 예산</p>
            <p className="text-lg font-bold text-slate-900">
              {stats.totalBudget.toLocaleString()}원
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">총 사용</p>
            <p className="text-lg font-bold text-slate-900">
              {stats.totalUsed.toLocaleString()}원
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">총 잔액</p>
            <p
              className={`text-lg font-bold ${stats.totalRemaining < 0 ? "text-red-600" : "text-slate-900"}`}
            >
              {stats.totalRemaining.toLocaleString()}원
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500 mb-1">사용률</p>
            <p className="text-lg font-bold text-slate-900">{usageRate}%</p>
            <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(usageRate, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Breakdown */}
      <div className="space-y-4">
        <h2 className="text-md font-semibold text-slate-900">팀별 현황</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-0 shadow-none bg-white">
                <CardContent className="p-4">
                  <div className="animate-pulse space-y-3">
                    <div className="bg-slate-200 rounded h-4 w-24"></div>
                    <div className="bg-slate-200 rounded h-12 w-full"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : Object.keys(groupedByTeam).length === 0 ? (
          <Card className="border-0 shadow-none bg-white">
            <CardContent className="p-8 text-center">
              <p className="text-slate-500 text-sm">
                해당 기간에 예산 데이터가 없습니다.
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedByTeam).map(([teamName, members]) => (
            <Card key={teamName} className="border-0 shadow-none bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {teamName}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {members.length}건
                  </Badge>
                </div>
                <div className="space-y-2">
                  {members.map((member) => {
                    const rate =
                      member.total_amount > 0
                        ? Math.round(
                            (member.used_amount / member.total_amount) * 100,
                          )
                        : 0;
                    return (
                      <div
                        key={`${member.member_id}-${member.type}`}
                        className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-900">
                            {member.member_name}
                          </span>
                          <Badge
                            variant={
                              member.type === "활동비" ? "secondary" : "outline"
                            }
                            className="text-[10px] px-1.5"
                          >
                            {member.type}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {member.used_amount.toLocaleString()} /{" "}
                            {member.total_amount.toLocaleString()}원
                          </p>
                          <p
                            className={`text-xs ${rate > 80 ? "text-red-500" : "text-slate-400"}`}
                          >
                            {rate}% 사용
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </React.Fragment>
  );
}
