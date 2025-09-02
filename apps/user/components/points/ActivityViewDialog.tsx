import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@repo/ui/src/sheet";
import { Button } from "@repo/ui/src/button";
import { Card, CardContent } from "@repo/ui/src/card";
import { ScrollArea } from "@repo/ui/src/scroll-area";
import { Eye, Info } from "@repo/ui/icons";
import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/src/select";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
import dayjs from "dayjs";
import { useActivityPoints } from "@/hooks/use-activity-points";
import { useActivityPointUsage } from "@/hooks/use-activity-point-usage";
import { useActivityPointDetails } from "@/hooks/use-activity-point-details";

// 타입은 hooks에서 가져와서 사용하므로 여기서는 제거

// Simple Skeleton component
const Skeleton = ({ className }: { className?: string }) => <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;

// 현재 하반기인지 상반기인지 판단하는 함수
const isSecondHalf = (date?: dayjs.Dayjs): boolean => {
  const currentDate = date || dayjs();
  const month = currentDate.month() + 1; // dayjs는 0부터 시작하므로 +1
  return month >= 7; // 7월~12월은 하반기
};

// 현재 기준 상반기/하반기에 해당하는 월들을 반환하는 함수
const getCurrentHalfYearMonths = (date?: dayjs.Dayjs) => {
  const currentDate = date || dayjs();
  const isSecondHalfYear = isSecondHalf(currentDate);

  if (isSecondHalfYear) {
    // 하반기: 7월~12월
    return Array.from({ length: 6 }, (_, i) => ({
      value: i + 7,
      label: `${i + 7}월`,
    }));
  } else {
    // 상반기: 1월~6월
    return Array.from({ length: 6 }, (_, i) => ({
      value: i + 1,
      label: `${i + 1}월`,
    }));
  }
};

// 현재가 상반기인지 하반기인지 반환하는 함수
const getCurrentHalfYearLabel = (date?: dayjs.Dayjs): string => {
  return isSecondHalf(date) ? "하반기" : "상반기";
};

export function ActivityViewDialog() {
  const [selectedMonth, setSelectedMonth] = useState<number>(dayjs().month() + 1); // 1~12월
  const selectedYear = dayjs().year(); // 현재는 고정값으로 사용
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string | null>(null);
  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState<string | null>(null);

  // 활동비 통계 데이터 조회
  const { data: activityPointsResponse, isLoading, error } = useActivityPoints();
  const employees = activityPointsResponse?.data || [];

  // 사용 내역 조회 (선택된 직원만)
  const { data: usageResponse, isLoading: usageLoading } = useActivityPointUsage(selectedEmployeeName || "", selectedYear, selectedMonth, !!selectedEmployeeName);
  const usageDetails = usageResponse?.data || [];

  // 활동비 상세 정보 조회 (선택된 직원만)
  const { data: detailsResponse, isLoading: detailsLoading } = useActivityPointDetails(selectedEmployeeForDetails || "", !!selectedEmployeeForDetails);
  const employeeDetails = detailsResponse?.data;
  // 현재 상반기/하반기에 해당하는 월별 선택 옵션
  const months = getCurrentHalfYearMonths();
  const currentHalfYear = getCurrentHalfYearLabel();

  // 선택된 월의 데이터를 필터링하여 보여줄 직원들 계산
  const displayedEmployees = employees.map((employee) => {
    const monthlyUsed = employee.monthlyUsage[selectedMonth - 1] || 0;
    const totalUsed = employee.usedAmount;
    const remaining = employee.remainingAmount;

    return {
      ...employee,
      currentMonthUsed: monthlyUsed,
      usedAmount: totalUsed,
      remainingAmount: remaining,
    };
  });

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
            <SheetTitle className="text-lg font-semibold">활동비 전체 현황</SheetTitle>
          </div>

          <h2 className="text-lg font-bold text-gray-900">
            {selectedYear}년 {currentHalfYear}
          </h2>
          <p className="text-sm text-gray-600">팀의 활동비 사용 현황을 상세히 확인할 수 있습니다.</p>
          {isLoading && <div className="text-sm text-gray-500">활동비 데이터를 불러오는 중...</div>}
          {error && <div className="text-sm text-red-500">활동비 데이터 로딩 중 오류가 발생했습니다.</div>}
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
            ) : displayedEmployees.length === 0 ? (
              <div className="text-center py-8 text-gray-500">활동비 데이터가 없습니다.</div>
            ) : (
              displayedEmployees.map((employee, index) => (
                <Card key={employee.name + index} className="border border-gray-200 rounded-xl shadow-none hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-md font-semibold text-gray-900">{employee.name}</h3>
                        <span>·</span>
                        <p className="text-xs py-1 text-gray-500">{employee.position}</p>
                      </div>
                    </div>

                    <div>
                      <div className=" px-2  flex items-center justify-between mb-3">
                        <p className="text-sm text-gray-400 font-light">총 금액</p>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="font-bold text-sm text-gray-700 hover:text-blue-800 cursor-pointer transition-all duration-200 hover:scale-105 group flex items-center gap-2 justify-center"
                              onClick={() => setSelectedEmployeeForDetails(employee.name)}
                            >
                              <Info className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
                              {employee.totalAmount.toLocaleString()}원
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 shadow-xl border rounded-xl">
                            <div className="space-y-3">
                              <h4 className="font-medium text-sm ">활동비 산정 기준</h4>
                              {selectedEmployeeForDetails === employee.name && detailsLoading ? (
                                <div className="space-y-2">
                                  <Skeleton className="h-4 w-full" />
                                  <Skeleton className="h-4 w-3/4" />
                                  <Skeleton className="h-4 w-5/6" />
                                </div>
                              ) : selectedEmployeeForDetails === employee.name && employeeDetails ? (
                                <div className="space-y-3 text-sm">
                                  <div className="bg-gray-100 rounded-lg p-3">
                                    <span className="font-medium ">{employeeDetails.personalAmount}</span>
                                  </div>
                                  <div className="border-t pt-3">
                                    <div className="flex justify-between">
                                      <span className="text-sm text-gray-400 font-light">총 금액</span>
                                      <span className="text-sm font-medium">{employeeDetails.teamAmount}원</span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3 text-sm">
                                  <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                                    <div className="flex justify-between items-center ">
                                      <span className="text-gray-500">본인 활동비</span>
                                      <span className="font-semibold">{(employee.totalAmount / 14).toLocaleString()}원</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-500">팀원 13명</span>
                                      <span className="font-semibold">{((employee.totalAmount / 14) * 13).toLocaleString()}원</span>
                                    </div>
                                  </div>
                                  <div className="border-t pt-3">
                                    <div className="flex justify-between items-center font-bold text-base">
                                      <span className="text-sm text-gray-400 font-medium">총 금액</span>
                                      <span className="">{employee.totalAmount.toLocaleString()}원</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className=" px-2  flex items-center justify-between mb-3">
                        <p className="text-sm text-gray-400 font-light">사용금액</p>
                        <Popover modal>
                          <PopoverTrigger asChild>
                            <button
                              className="font-bold text-sm hover:text-red-700 cursor-pointer transition-all duration-200 hover:scale-105 group flex items-center gap-2 justify-center"
                              onClick={() => setSelectedEmployeeName(employee.name)}
                            >
                              <Info className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
                              {employee.usedAmount.toLocaleString()}원
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 shadow-xl border rounded-xl">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm ">사용 내역</h4>
                                <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                                  <SelectTrigger className="w-auto min-w-[120px] h-10">
                                    <SelectValue placeholder="월을 선택하세요" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {months.map((month) => (
                                      <SelectItem key={month.value} value={month.value.toString()}>
                                        {month.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {selectedEmployeeName === employee.name && usageLoading ? (
                                <div className="space-y-3">
                                  <Skeleton className="h-6 w-full" />
                                  <Skeleton className="h-6 w-4/5" />
                                  <Skeleton className="h-6 w-3/4" />
                                  <Skeleton className="h-6 w-5/6" />
                                </div>
                              ) : (
                                <ScrollArea className="max-h-74 overflow-y-auto">
                                  {selectedEmployeeName === employee.name && usageDetails.length > 0 ? (
                                    <div className="space-y-2">
                                      {usageDetails.map((usage, index) => (
                                        <div key={index} className="flex justify-between items-start p-3 bg-gray-50 rounded-md text-xs">
                                          <div className="flex-1">
                                            <div className="font-medium text-gray-900">{usage.vendor}</div>
                                            <div className="text-gray-500 text-xs mt-0.5">
                                              {usage.month}/{usage.day}({usage.dayOfWeek})
                                            </div>
                                          </div>
                                          <div className="font-semibold">{usage.amount}원</div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-gray-500 text-sm text-center py-4">사용 내역이 없습니다.</p>
                                  )}
                                </ScrollArea>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <hr className="mb-3" />
                      <div className=" px-2  flex items-center justify-between">
                        <p className="text-sm text-gray-400 font-light">잔여금액</p>
                        <p className="font-bold text-md transition-all duration-200 hover:scale-105 cursor-default">{employee.remainingAmount.toLocaleString()}원</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
