"use client";

import { useState } from "react";
import dayjs from "dayjs";
import { ChevronDown, Copy } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
import { toast } from "@repo/ui/src/sonner";
import { useLunchGroupMatesMeals } from "@/hooks/use-lunch-group-mates-meals";
import { useUserStore } from "@/stores/userStore";

const WEEK_DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function copyStore(store: string) {
  navigator.clipboard
    .writeText(store)
    .then(() => toast.success(`${store} 복사했습니다.`))
    .catch(() => toast.error("복사에 실패했습니다."));
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-4 text-center text-xs text-[var(--slate-gray)]">{children}</p>
  );
}

export function LunchGroupMatesDropdown({ date }: { date: string }) {
  const memberId = useUserStore((s) => s.userId);
  const [open, setOpen] = useState(false);
  const [activeDate, setActiveDate] = useState(date);

  const { data, isLoading, isError } = useLunchGroupMatesMeals(memberId, date, open);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-[14px] bg-[var(--whisper-cream)] px-4 py-2.5 text-sm font-medium text-[var(--granite)] transition-colors hover:bg-[rgba(244,241,232,0.7)]"
        >
          같은 조 식대 내역
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[var(--radix-popover-trigger-width)] rounded-[20px] border-0 p-3"
      >
        {isLoading ? (
          <Message>불러오는 중...</Message>
        ) : isError ? (
          <Message>내역을 불러오지 못했습니다.</Message>
        ) : !data || data.groupNumber === null ? (
          <Message>이 주에 배정된 점심조가 없습니다.</Message>
        ) : (
          <>
            <p className="mb-2 text-xs text-[var(--slate-gray)]">
              {data.groupNumber}조 · 가게명을 누르면 복사됩니다
            </p>

            <div className="mb-2 flex gap-1">
              {WEEK_DAY_LABELS.map((label, index) => {
                const day = dayjs(data.weekStartDate).add(index, "day");
                const dayKey = day.format("YYYY-MM-DD");
                const isActive = dayKey === activeDate;
                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => setActiveDate(dayKey)}
                    className={`flex-1 rounded-[10px] py-1 text-center text-[11px] leading-tight transition-colors ${
                      isActive
                        ? "bg-[var(--ink-black)] text-white"
                        : "bg-[var(--whisper-cream)] text-[var(--granite)]"
                    }`}
                  >
                    {label}
                    <br />
                    {day.date()}
                  </button>
                );
              })}
            </div>

            {data.mates.length === 0 ? (
              <Message>같은 조 조원이 없습니다.</Message>
            ) : (
              <ul className="space-y-1.5">
                {data.mates.map((mate) => {
                  const meal = mate.meals[activeDate];
                  return (
                    <li
                      key={mate.name}
                      className="rounded-[14px] bg-[rgba(244,241,232,0.58)] px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-[var(--granite)]">
                          {mate.name}
                        </span>
                        {meal?.payer && (
                          <span className="shrink-0 text-[11px] text-[var(--slate-gray)]">
                            결제 {meal.payer}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        {meal?.store ? (
                          <button
                            type="button"
                            onClick={() => {
                              copyStore(meal.store as string);
                              // 드롭다운이 입력란을 가리므로 닫아서 바로 붙여넣게 한다
                              setOpen(false);
                            }}
                            className="flex min-w-0 items-center gap-1 text-left text-sm font-medium text-[var(--ink-black)] hover:underline"
                          >
                            <span className="truncate">{meal.store}</span>
                            <Copy className="h-3 w-3 shrink-0 text-[var(--slate-gray)]" />
                          </button>
                        ) : (
                          <span className="text-xs text-[var(--slate-gray)]">
                            {meal ? "가게 미입력" : "입력 내역 없음"}
                          </span>
                        )}
                        {meal && meal.amount > 0 && (
                          <span className="shrink-0 text-sm tabular-nums text-[var(--ink-black)]">
                            {meal.amount.toLocaleString()}원
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
