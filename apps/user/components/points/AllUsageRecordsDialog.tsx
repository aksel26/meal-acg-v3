"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@repo/ui/src/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { Button } from "@repo/ui/src/button";
import { ScrollArea } from "@repo/ui/src/scroll-area";
import { AutoCompleteInput } from "@repo/ui/src/autocomplete-input";
import { Check, Loader2 } from "@repo/ui/icons";
import { motion } from "motion/react";
import { useState, useMemo, useEffect } from "react";
import dayjs from "dayjs";
import {
  useAllUsageRecords,
  type AllRecordItem,
} from "@/hooks/use-all-usage-records";
import { usePointsMembers } from "@/hooks/use-points-data";
import { useMemberIdLookup } from "@/hooks/use-points-data";

interface AllUsageRecordsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string | null;
}

export function AllUsageRecordsDialog({
  open,
  onOpenChange,
  memberId,
}: AllUsageRecordsDialogProps) {
  const [period, setPeriod] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [memberFilter, setMemberFilter] = useState<string>("");
  const [memberSearchValue, setMemberSearchValue] = useState<string>("");
  const [reviewStatus, setReviewStatus] = useState<string>("all");
  const [offset, setOffset] = useState(0);
  const [allRecords, setAllRecords] = useState<AllRecordItem[]>([]);

  const LIMIT = 50;

  // 조직원 목록 조회 (autocomplete용)
  const { data: membersData } = usePointsMembers(memberId);
  const memberNames = useMemo(
    () => membersData?.map((m) => m.full_name) || [],
    [membersData]
  );

  // memberFilter (이름)을 member_id로 변환
  const { data: filterMemberData } = useMemberIdLookup(
    memberFilter || null
  );
  const filterMemberId = memberFilter && filterMemberData?.id ? filterMemberData.id : undefined;

  // 필터 변경 시 offset 초기화 및 누적 레코드 리셋
  useEffect(() => {
    setOffset(0);
    setAllRecords([]);
  }, [period, typeFilter, memberFilter, reviewStatus]);

  // 데이터 조회
  const filters = useMemo(() => {
    if (!memberId) return null;
    return {
      memberId,
      period: period !== "all" ? period : undefined,
      type: typeFilter !== "all" ? typeFilter : undefined,
      filterMemberId,
      reviewStatus: reviewStatus !== "all" ? reviewStatus : undefined,
      limit: LIMIT,
      offset,
    };
  }, [memberId, period, typeFilter, filterMemberId, reviewStatus, offset]);

  const { data, isLoading, error } = useAllUsageRecords(filters, open);

  // 데이터 로드 시 레코드 누적
  useEffect(() => {
    if (data?.records) {
      if (offset === 0) {
        // 첫 로드 또는 필터 변경 시
        setAllRecords(data.records);
      } else {
        // 더보기 시 기존 레코드에 추가 (중복 제거)
        setAllRecords((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const newRecords = data.records.filter((r) => !existingIds.has(r.id));
          return [...prev, ...newRecords];
        });
      }
    }
  }, [data?.records, offset]);

  const totalCount = data?.total_count || 0;
  const totalAmount = data?.total_amount || 0;
  const hasMore = data?.has_more || false;

  // 월 목록 (현재 반기의 6개월)
  const currentDate = dayjs();
  const currentYear = currentDate.year();
  const currentMonth = currentDate.month() + 1;
  const isSecondHalf = currentMonth >= 7;

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

  const handleLoadMore = () => {
    setOffset((prev) => prev + LIMIT);
  };

  const handleMemberSelect = (name: string) => {
    setMemberFilter(name);
    setMemberSearchValue(name);
  };

  const handleMemberClear = () => {
    setMemberFilter("");
    setMemberSearchValue("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[calc(100%-2rem)] max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>전체 사용 내역</DialogTitle>
          <DialogDescription>
            조직 전체의 복지포인트 및 활동비 사용 내역
          </DialogDescription>
        </DialogHeader>

        {/* Filters - Single Row */}
        <div className="flex items-center gap-1.5 px-6 pb-3">
          {/* Month Select */}
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="data-[size=default]:h-9 w-[72px] shrink-0 border border-gray-300 rounded-xl text-xs bg-white">
              <SelectValue placeholder="기간" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="data-[size=default]:h-9 w-[72px] shrink-0 border border-gray-300 rounded-xl text-xs bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="복지포인트">복지</SelectItem>
              <SelectItem value="활동비">활동</SelectItem>
            </SelectContent>
          </Select>

          {/* Member Autocomplete */}
          <div className="relative flex-1 min-w-0">
            <AutoCompleteInput
              suggestions={memberNames}
              value={memberSearchValue}
              onValueChange={setMemberSearchValue}
              onSuggestionSelect={handleMemberSelect}
              placeholder="조직원"
              allowFreeText={true}
              maxSuggestions={memberNames.length}
              emptyText="조직원을 찾을 수 없습니다"
              className="h-9 text-xs rounded-xl border border-gray-300 bg-white"
            />
            {memberFilter && (
              <button
                onClick={handleMemberClear}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Review Status Filter */}
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => setReviewStatus("all")}
              className={`h-9 px-3 text-xs rounded-xl transition-all whitespace-nowrap ${
                reviewStatus === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setReviewStatus("0")}
              className={`h-9 px-3 text-xs rounded-xl transition-all whitespace-nowrap ${
                reviewStatus === "0"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              미확인
            </button>
            <button
              onClick={() => setReviewStatus("3")}
              className={`h-9 px-3 text-xs rounded-xl transition-all whitespace-nowrap ${
                reviewStatus === "3"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              완료
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="mx-6 mb-3 bg-gray-50 rounded-xl p-3 flex justify-between text-sm">
          <span className="text-gray-600">총 {totalCount}건</span>
          <span className="font-semibold text-gray-900">
            {totalAmount.toLocaleString()}원
          </span>
        </div>

        {/* Records List */}
        <ScrollArea style={{ maxHeight: "calc(90vh - 280px)" , overflow:"auto"}}>
          <div className="px-6">
            {isLoading && offset === 0 ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-20 bg-gray-100 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="py-12 text-center text-sm text-red-500">
                오류가 발생했습니다: {error.message}
              </div>
            ) : allRecords.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">
                조회 결과가 없습니다
              </div>
            ) : (
              <div className="space-y-2 pb-4">
                {allRecords.map((record, index) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    className="bg-white border border-gray-100 rounded-xl p-3 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {record.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {record.member_name}
                          </span>
                          {record.team_name && (
                            <span className="text-xs text-gray-400">
                              · {record.team_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {record.amount.toLocaleString()}원
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs text-gray-400">
                            {dayjs(record.used_at).format("M.DD")}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              record.type === "활동비"
                                ? "bg-amber-50 text-amber-500"
                                : "bg-blue-50/60 text-blue-600"
                            }`}
                          >
                            {record.type === "활동비" ? "활동비" : "복지"}
                          </span>
                        </div>
                      </div>
                    </div>
                    {record.is_reviewed && (
                      <div className="mt-2 flex items-center gap-1 text-emerald-500">
                        <Check className="w-3 h-3" />
                        <span className="text-[10px]">P&C 확인</span>
                      </div>
                    )}
                  </motion.div>
                ))}
                {hasMore && (
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    className="w-full py-3 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading && offset > 0 && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {isLoading && offset > 0 ? "로딩 중..." : "더 보기"}
                  </button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-gray-100">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
