import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/ui/src/sheet";
import { Button } from "@repo/ui/src/button";
import { Card, CardContent } from "@repo/ui/src/card";
import { ScrollArea } from "@repo/ui/src/scroll-area";
import { Eye, Info } from "@repo/ui/icons";
import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/src/popover";
import dayjs from "dayjs";
import {
  usePointsDashboard,
  useAllocationRecords,
  type BudgetSummary,
} from "@/hooks/use-points-data";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

// 현재 상반기/하반기에 해당하는 월들을 반환
const getCurrentHalfYearMonths = () => {
  const currentMonth = dayjs().month() + 1;
  const isSecondHalf = currentMonth >= 7;
  const currentYear = dayjs().year();

  return Array.from({ length: 6 }, (_, i) => {
    const monthNum = isSecondHalf ? i + 7 : i + 1;
    return {
      value: `${currentYear}-${String(monthNum).padStart(2, "0")}`,
      label: `${monthNum}월`,
    };
  });
};

const getCurrentHalfYearLabel = (): string => {
  const currentMonth = dayjs().month() + 1;
  return currentMonth >= 7 ? "하반기" : "상반기";
};

interface ActivityViewDialogProps {
  memberId: string | null;
  period: string; // "YYYY-MM"
}

export function ActivityViewDialog({
  memberId,
  period,
}: ActivityViewDialogProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(period);
  const [selectedEmployeeAllocId, setSelectedEmployeeAllocId] = useState<
    string | null
  >(null);

  // 조직 전체 활동비 대시보드 조회
  const {
    data: summaries,
    isLoading,
    error,
  } = usePointsDashboard(memberId, period, "활동비");

  // 선택된 직원의 사용내역 조회
  const { data: usageRecords, isLoading: usageLoading } =
    useAllocationRecords(
      memberId,
      selectedEmployeeAllocId,
      selectedMonth
    );

  const months = getCurrentHalfYearMonths();
  const currentHalfYear = getCurrentHalfYearLabel();
  const selectedYear = dayjs().year();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-xs">
          <Eye className="w-3 h-3" />
          활동비 전체 조회
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">
              활동비 전체 현황
            </SheetTitle>
          </div>

          <h2 className="text-lg font-bold text-gray-900">
            {selectedYear}년 {currentHalfYear}
          </h2>
          <p className="text-sm text-gray-600">
            팀의 활동비 사용 현황을 상세히 확인할 수 있습니다.
          </p>
          {isLoading && (
            <div className="text-sm text-gray-500">
              활동비 데이터를 불러오는 중...
            </div>
          )}
          {error && (
            <div className="text-sm text-red-500">
              활동비 데이터 로딩 중 오류가 발생했습니다.
            </div>
          )}
        </SheetHeader>

        {/* Employee List */}
        <div className="flex-1 overflow-y-auto px-4">
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 h-32 rounded-xl"></div>
                  </div>
                ))}
              </div>
            ) : !summaries || summaries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                활동비 데이터가 없습니다.
              </div>
            ) : (
              summaries.map((summary: BudgetSummary) => (
                <EmployeeCard
                  key={summary.allocation_id}
                  summary={summary}
                  months={months}
                  selectedMonth={selectedMonth}
                  onSelectMonth={setSelectedMonth}
                  selectedAllocId={selectedEmployeeAllocId}
                  onSelectAllocId={setSelectedEmployeeAllocId}
                  usageRecords={usageRecords || []}
                  usageLoading={usageLoading}
                />
              ))
            )}
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">닫기</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface EmployeeCardProps {
  summary: BudgetSummary;
  months: { value: string; label: string }[];
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  selectedAllocId: string | null;
  onSelectAllocId: (allocId: string) => void;
  usageRecords: Array<{
    id: string;
    description: string;
    amount: number;
    used_at: string;
  }>;
  usageLoading: boolean;
}

function EmployeeCard({
  summary,
  months,
  selectedMonth,
  onSelectMonth,
  selectedAllocId,
  onSelectAllocId,
  usageRecords,
  usageLoading,
}: EmployeeCardProps) {
  const isSelected = selectedAllocId === summary.allocation_id;

  return (
    <Card className="border border-gray-200 rounded-xl shadow-none hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-md font-semibold text-gray-900">
              {summary.member_name}
            </h3>
            <span>·</span>
            <p className="text-xs py-1 text-gray-500">
              {summary.member_role}
            </p>
          </div>
        </div>

        <div>
          <div className="px-2 flex items-center justify-between mb-3">
            <p className="text-sm text-gray-400 font-light">총 금액</p>
            <p className="font-bold text-sm text-gray-700">
              {summary.total_amount.toLocaleString()}원
            </p>
          </div>
          <div className="px-2 flex items-center justify-between mb-3">
            <p className="text-sm text-gray-400 font-light">사용금액</p>
            <Popover modal>
              <PopoverTrigger asChild>
                <button
                  className="font-bold text-sm hover:text-red-700 cursor-pointer transition-all duration-200 hover:scale-105 group flex items-center gap-2 justify-center"
                  onClick={() => onSelectAllocId(summary.allocation_id)}
                >
                  <Info className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
                  {summary.used_amount.toLocaleString()}원
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 shadow-xl border rounded-xl">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">사용 내역</h4>
                    <Select
                      value={selectedMonth}
                      onValueChange={onSelectMonth}
                    >
                      <SelectTrigger className="w-auto min-w-[120px] h-10">
                        <SelectValue placeholder="월을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem
                            key={month.value}
                            value={month.value}
                          >
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {isSelected && usageLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-4/5" />
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-6 w-5/6" />
                    </div>
                  ) : (
                    <ScrollArea className="max-h-74 overflow-y-auto">
                      {isSelected && usageRecords.length > 0 ? (
                        <div className="space-y-2">
                          {usageRecords.map((record) => {
                            const recordDate = dayjs(record.used_at);
                            const dayOfWeekMap: Record<number, string> = {
                              0: "일",
                              1: "월",
                              2: "화",
                              3: "수",
                              4: "목",
                              5: "금",
                              6: "토",
                            };
                            const dayOfWeek =
                              dayOfWeekMap[recordDate.day()] || "";

                            return (
                              <div
                                key={record.id}
                                className="flex justify-between items-start p-3 bg-gray-50 rounded-md text-xs"
                              >
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">
                                    {record.description}
                                  </div>
                                  <div className="text-gray-500 text-xs mt-0.5">
                                    {recordDate.month() + 1}/
                                    {recordDate.date()}({dayOfWeek})
                                  </div>
                                </div>
                                <div className="font-semibold">
                                  {record.amount.toLocaleString()}원
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm text-center py-4">
                          사용 내역이 없습니다.
                        </p>
                      )}
                    </ScrollArea>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <hr className="mb-3" />
          <div className="px-2 flex items-center justify-between">
            <p className="text-sm text-gray-400 font-light">잔여금액</p>
            <p className="font-bold text-md transition-all duration-200 hover:scale-105 cursor-default">
              {summary.remaining_amount.toLocaleString()}원
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
