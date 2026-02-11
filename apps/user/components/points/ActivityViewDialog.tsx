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
import { ScrollArea } from "@repo/ui/src/scroll-area";
import {
  ChevronDown,
  Eye,
  Receipt,
} from "@repo/ui/icons";
import React, { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import dayjs from "dayjs";
import {
  usePointsDashboard,
  useAllocationRecords,
  type BudgetSummary,
} from "@/hooks/use-points-data";
import { motion, AnimatePresence } from "motion/react";

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

// 트랙 색상 팔레트
const HORSE_COLORS = [
  "#2563eb", // blue
  "#dc2626", // red
  "#16a34a", // green
  "#d97706", // amber
  "#9333ea", // purple
  "#0891b2", // cyan
  "#e11d48", // rose
  "#4f46e5", // indigo
  "#ca8a04", // yellow
  "#0d9488", // teal
];

// 겹침 방지를 위한 y축 오프셋 계산
function computeYOffsets(
  sortedSummaries: Array<{ percent: number }>
): number[] {
  const offsets = new Array(sortedSummaries.length).fill(0);
  const OVERLAP_THRESHOLD = 14; // % 기준 겹침 판별

  for (let i = 1; i < sortedSummaries.length; i++) {
    const prevPercent = sortedSummaries[i - 1]!.percent;
    const currPercent = sortedSummaries[i]!.percent;
    if (Math.abs(currPercent - prevPercent) < OVERLAP_THRESHOLD) {
      // 이전 말과 반대 방향으로 오프셋
      offsets[i] = offsets[i - 1] === 0 ? -36 : offsets[i - 1] === -36 ? 36 : 0;
    }
  }
  return offsets;
}

interface ActivityViewDialogProps {
  memberId: string | null;
  period: string; // "YYYY-MM"
}

export function ActivityViewDialog({
  memberId,
  period,
}: ActivityViewDialogProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(period);
  const [expandedAllocId, setExpandedAllocId] = useState<string | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // 조직 전체 활동비 대시보드 조회
  const {
    data: summaries,
    isLoading,
    error,
  } = usePointsDashboard(memberId, period, "활동비");

  // 펼쳐진 직원의 사용내역 조회
  const { data: usageRecords, isLoading: usageLoading } =
    useAllocationRecords(memberId, expandedAllocId, selectedMonth);

  const months = getCurrentHalfYearMonths();
  const currentHalfYear = getCurrentHalfYearLabel();
  const selectedYear = dayjs().year();

  // 0원 멤버 필터링 + 사용률순 정렬
  const filteredSummaries = useMemo(() => {
    if (!summaries) return [];
    return summaries
      .filter((s) => s.total_amount > 0)
      .map((s) => ({
        ...s,
        percent: Math.min(
          100,
          Math.round((s.used_amount / s.total_amount) * 100)
        ),
      }))
      .sort((a, b) => a.percent - b.percent);
  }, [summaries]);

  // 트랙 y축 오프셋 계산
  const yOffsets = useMemo(
    () => computeYOffsets(filteredSummaries),
    [filteredSummaries]
  );

  // 조직 전체 합계 (필터링된 멤버만)
  const totalBudget = filteredSummaries.reduce(
    (sum, s) => sum + s.total_amount,
    0
  );
  const totalUsed = filteredSummaries.reduce(
    (sum, s) => sum + s.used_amount,
    0
  );

  const toggleExpand = (allocId: string) => {
    setExpandedAllocId((prev) => (prev === allocId ? null : allocId));
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
          <Eye className="w-3.5 h-3.5" />
          전체 조회
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader className="space-y-3 pb-4 border-b border-gray-100">
          <SheetTitle className="text-lg font-bold">
            활동비 현황
          </SheetTitle>

          {/* 기간 & 요약 */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {selectedYear}년 {currentHalfYear}
            </span>
            {!isLoading && filteredSummaries.length > 0 && (
              <span className="text-xs text-gray-400">
                총 {totalUsed.toLocaleString()} / {totalBudget.toLocaleString()}원 사용
              </span>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
              데이터를 불러오는 중 오류가 발생했습니다.
            </div>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-4 px-4">
          <div className="py-4 space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl bg-white border border-gray-100 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredSummaries.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Receipt className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">활동비 데이터가 없습니다.</p>
              </div>
            ) : (
              <>
                {/* 레이스 트랙 섹션 */}
                <RaceTrack
                  summaries={filteredSummaries}
                  yOffsets={yOffsets}
                  hoveredIdx={hoveredIdx}
                  onHoverChange={setHoveredIdx}
                />

                {/* 월 선택 */}
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs font-medium text-gray-500">
                    사용 내역
                  </span>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-auto min-w-[90px] h-8 text-xs border-gray-200">
                      <SelectValue placeholder="월 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 범례 + 상세 목록 */}
                <div className="space-y-1.5 px-2">
                  {filteredSummaries.map((summary, idx) => (
                    <LegendRow
                      key={summary.allocation_id}
                      summary={summary}
                      color={HORSE_COLORS[idx % HORSE_COLORS.length]!}
                      isExpanded={expandedAllocId === summary.allocation_id}
                      onToggle={() => toggleExpand(summary.allocation_id)}
                      usageRecords={usageRecords || []}
                      usageLoading={usageLoading}
                      isHovered={hoveredIdx === idx}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="pt-3 border-t border-gray-100">
          <SheetClose asChild>
            <Button variant="outline" className="w-full">
              닫기
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── 레이스 트랙 ────────────────────────────────────────────

interface RaceTrackProps {
  summaries: Array<BudgetSummary & { percent: number }>;
  yOffsets: number[];
  hoveredIdx: number | null;
  onHoverChange: (idx: number | null) => void;
}

function RaceTrack({ summaries, yOffsets, hoveredIdx, onHoverChange }: RaceTrackProps) {
  const [arrivedSet, setArrivedSet] = useState<Set<number>>(new Set());

  return (
    <div className="rounded-xl bg-white border border-gray-100 p-4">
      {/* 트랙 영역 */}
      <div className="relative h-40 mx-2">
        {/* 트랙 배경 (잔디) */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-12 rounded-full bg-gradient-to-r from-emerald-50 via-emerald-100/60 to-emerald-50 border border-emerald-200/50" />

        {/* 레인 마커 (점선) */}
        {[25, 50, 75].map((tick) => (
          <div
            key={tick}
            className="absolute top-1/2 -translate-y-1/2 h-8 border-l border-dashed border-emerald-300/40"
            style={{ left: `${tick}%` }}
          />
        ))}

        {/* 출발선 */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-12 w-0.5 bg-gray-300 rounded-full" />

        {/* 결승선 */}
        <div className="absolute right-0 top-1/2 -translate-y-[60%] text-4xl leading-none -rotate-12">
          🏁
        </div>

        {/* 말 이모지 레이어 */}
        {summaries.map((s, idx) => (
          <motion.div
            key={s.allocation_id}
            className="absolute top-1/2 -translate-y-1/2 cursor-pointer select-none"
            style={{
              marginTop: yOffsets[idx],
              zIndex: hoveredIdx === idx ? 10 : 5,
            }}
            initial={{ left: "0%" }}
            animate={{ left: `${Math.min(s.percent, 95)}%` }}
            transition={{
              duration: 1.2,
              delay: idx * 0.08,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            onAnimationComplete={() =>
              setArrivedSet((prev) => new Set(prev).add(idx))
            }
            onMouseEnter={() => onHoverChange(idx)}
            onMouseLeave={() => onHoverChange(null)}
            onTouchStart={() =>
              onHoverChange(hoveredIdx === idx ? null : idx)
            }
          >
            <motion.span
              className="text-5xl leading-none inline-block -scale-x-100 origin-bottom"
              animate={
                arrivedSet.has(idx)
                  ? { y: 0, rotate: 0, scale: hoveredIdx === idx ? 1.35 : 1 }
                  : { y: [0, -6, 0], rotate: [0, -3, 0], scale: hoveredIdx === idx ? 1.35 : 1 }
              }
              transition={
                arrivedSet.has(idx)
                  ? { duration: 0.2 }
                  : {
                      duration: 0.25 + idx * 0.03,
                      repeat: Infinity,
                      repeatType: "loop",
                      ease: "easeInOut",
                      scale: { duration: 0.2, repeat: 0 },
                    }
              }
            >
              🐴
            </motion.span>
          </motion.div>
        ))}

        {/* 이름 태그 레이어 (말 이모지보다 항상 위) */}
        {summaries.map((s, idx) => (
          <motion.div
            key={`label-${s.allocation_id}`}
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              marginTop: yOffsets[idx],
              zIndex: hoveredIdx === idx ? 30 : 20,
            }}
            initial={{ left: "0%" }}
            animate={{ left: `${Math.min(s.percent, 95)}%` }}
            transition={{
              duration: 1.2,
              delay: idx * 0.08,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            {/* 이름 라벨 */}
            <span
              className="absolute left-1/2 -translate-x-1/2 -top-6 whitespace-nowrap text-[10px] font-bold text-white px-1.5 py-0.5 rounded transition-opacity duration-150"
              style={{
                backgroundColor: HORSE_COLORS[idx % HORSE_COLORS.length] + (hoveredIdx === idx ? "" : "80"),
                opacity: hoveredIdx !== null && hoveredIdx !== idx ? 0 : 1,
              }}
            >
              {s.member_name}
            </span>
            {/* 툴팁 */}
            <AnimatePresence>
              {hoveredIdx === idx && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-1/2 -translate-x-1/2 -top-14 whitespace-nowrap bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md shadow-lg"
                >
                  {s.percent}%
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* 축 라벨 */}
      <div className="flex justify-between mt-1 mx-2 text-[10px] text-gray-400 font-medium">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

// ─── 범례 행 (클릭 시 상세 펼침) ─────────────────────────────

interface LegendRowProps {
  summary: BudgetSummary & { percent: number };
  color: string;
  isExpanded: boolean;
  onToggle: () => void;
  usageRecords: Array<{
    id: string;
    description: string;
    amount: number;
    used_at: string;
  }>;
  usageLoading: boolean;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function LegendRow({
  summary,
  color,
  isExpanded,
  onToggle,
  usageRecords,
  usageLoading,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}: LegendRowProps) {
  const isOver = summary.remaining_amount < 0;

  return (
    <div
      className={`rounded-xl bg-white border overflow-hidden transition-all ${isHovered ? "border-gray-300 shadow-sm" : "border-gray-100"}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        className="w-full px-4 py-3 text-left cursor-pointer flex items-center gap-3"
        onClick={onToggle}
      >
        {/* 색상 도트 */}
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />

        {/* 이름 + % */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 truncate">
            {summary.member_name}
          </span>
          <span
            className={`text-xs font-bold ${
              isOver
                ? "text-red-600"
                : summary.percent >= 80
                  ? "text-amber-600"
                  : "text-gray-500"
            }`}
          >
            {summary.percent}%
          </span>
        </div>

        {/* 금액 */}
        <span className="text-xs text-gray-400 shrink-0">
          {summary.used_amount.toLocaleString()} / {summary.total_amount.toLocaleString()}원
        </span>

        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* 상세 펼침 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 border-t border-gray-50">
              {/* 사용 내역 리스트 */}
              {usageLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex justify-between p-2.5">
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-3.5 w-16" />
                    </div>
                  ))}
                </div>
              ) : usageRecords.length > 0 ? (
                <div className="space-y-1 max-h-60 overflow-y-auto">
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
                    const dayOfWeek = dayOfWeekMap[recordDate.day()] || "";

                    return (
                      <div
                        key={record.id}
                        className="flex justify-between items-center p-2.5 rounded-lg bg-gray-50 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">
                            {record.description}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {recordDate.month() + 1}/{recordDate.date()}(
                            {dayOfWeek})
                          </p>
                        </div>
                        <span className="font-semibold text-gray-700 shrink-0 ml-3">
                          {record.amount.toLocaleString()}원
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <p className="text-xs">이 달에 사용 내역이 없습니다.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
