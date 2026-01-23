"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/src/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/src/table";
import { Skeleton } from "@repo/ui/src/skeleton";
import { Input } from "@repo/ui/src/input";
import { Badge } from "@repo/ui/src/badge";
import { Button } from "@repo/ui/src/button";
import { FileSpreadsheet, Check, X, Loader2 } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

interface UserStats {
  user_id: string;
  full_name: string;
  login_id: string;
  work_days: number;
  holiday_count: number;
  weekend_work_days: number;
  individual_meals: number;
  remote_work_days: number;
  total_allowance: number;
  total_used: number;
  balance: number;
  has_excel_file: boolean;
  is_settled: boolean;
}

export default function UsersPage() {
  const currentDate = dayjs();
  const [selectedYear, setSelectedYear] = useState(currentDate.year());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.month() + 1);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery<UserStats[]>({
    queryKey: queryKeys.stats.monthly(selectedYear, selectedMonth),
    queryFn: async () => {
      const response = await fetch(
        `/api/stats/monthly?year=${selectedYear}&month=${selectedMonth}`
      );
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const toggleSettlementMutation = useMutation({
    mutationFn: async ({
      userId,
      isSettled,
    }: {
      userId: string;
      isSettled: boolean;
    }) => {
      const response = await fetch("/api/settlement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          year: selectedYear,
          month: selectedMonth,
          isSettled,
        }),
      });
      if (!response.ok) throw new Error("Failed to update settlement status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.stats.monthly(selectedYear, selectedMonth),
      });
      toast.success("정산 상태가 변경되었습니다.");
    },
    onError: () => {
      toast.error("정산 상태 변경에 실패했습니다.");
    },
  });

  const handleToggleSettlement = (userId: string, currentStatus: boolean) => {
    toggleSettlementMutation.mutate({
      userId,
      isSettled: !currentStatus,
    });
  };

  const filteredUsers = users?.filter((user) =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "-";
    return new Intl.NumberFormat("ko-KR").format(amount);
  };

  const years = Array.from({ length: 5 }, (_, i) => currentDate.year() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <Select
          value={selectedYear.toString()}
          onValueChange={(value) => setSelectedYear(parseInt(value))}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}년
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedMonth.toString()}
          onValueChange={(value) => setSelectedMonth(parseInt(value))}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem key={month} value={month.toString()}>
                {month}월
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="text"
          placeholder="이름 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-48"
        />
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>사용자별 정산 현황</CardTitle>
          <CardDescription>
            {selectedYear}년 {selectedMonth}월 기준 ({filteredUsers?.length || 0}명)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">No.</TableHead>
                  <TableHead>성명</TableHead>
                  <TableHead className="text-center">근무일</TableHead>
                  <TableHead className="text-center">휴일</TableHead>
                  <TableHead className="text-center">주말근무</TableHead>
                  <TableHead className="text-center">개별식사</TableHead>
                  <TableHead className="text-center">재택근무</TableHead>
                  <TableHead className="text-right">총금액</TableHead>
                  <TableHead className="text-right">사용금액</TableHead>
                  <TableHead className="text-right">잔여금액</TableHead>
                  <TableHead className="text-center">엑셀파일</TableHead>
                  <TableHead className="text-center">정산여부</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: 12 }).map((_, cellIndex) => (
                        <TableCell key={cellIndex}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredUsers && filteredUsers.length > 0 ? (
                  filteredUsers.map((user, index) => {
                    const balance = user.balance ?? 0;

                    return (
                      <TableRow key={user.user_id || index}>
                        <TableCell className="text-center text-gray-500">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {user.full_name}
                        </TableCell>
                        <TableCell className="text-center">
                          {user.work_days ?? 0}일
                        </TableCell>
                        <TableCell className="text-center">
                          {user.holiday_count ?? 0}일
                        </TableCell>
                        <TableCell className="text-center">
                          {user.weekend_work_days ?? 0}일
                        </TableCell>
                        <TableCell className="text-center">
                          {user.individual_meals ?? 0}회
                        </TableCell>
                        <TableCell className="text-center">
                          {user.remote_work_days ?? 0}일
                        </TableCell>
                        <TableCell className="text-right text-blue-600">
                          {formatCurrency(user.total_allowance)}
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          {formatCurrency(user.total_used)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            balance >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {formatCurrency(balance)}
                        </TableCell>
                        <TableCell className="text-center">
                          {user.has_excel_file ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <FileSpreadsheet className="h-4 w-4 text-green-600" />
                            </Button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            onClick={() =>
                              handleToggleSettlement(user.user_id, user.is_settled)
                            }
                            disabled={toggleSettlementMutation.isPending}
                            className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {toggleSettlementMutation.isPending &&
                            toggleSettlementMutation.variables?.userId ===
                              user.user_id ? (
                              <Badge variant="outline">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                처리중
                              </Badge>
                            ) : user.is_settled ? (
                              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                <Check className="h-3 w-3 mr-1" />
                                완료
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="hover:bg-gray-300">
                                <X className="h-3 w-3 mr-1" />
                                미정산
                              </Badge>
                            )}
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={12}
                      className="text-center text-gray-500"
                    >
                      데이터가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
