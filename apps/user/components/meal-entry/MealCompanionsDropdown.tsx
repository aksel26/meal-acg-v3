"use client";

import { useState } from "react";
import dayjs from "dayjs";
import { ChevronDown, Copy } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
import { toast } from "@repo/ui/src/sonner";
import { useMealCompanions } from "@/hooks/use-meal-companions";
import { useUserStore } from "@/stores/userStore";

// dayjs().day() 순서 (일요일 = 0)
const WEEK_DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

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

export function MealCompanionsDropdown({ date }: { date: string }) {
  const memberId = useUserStore((s) => s.userId);
  const [open, setOpen] = useState(false);
  const [activeDate, setActiveDate] = useState(date);

  const { data, isLoading, isError } = useMealCompanions(memberId, date, open);
  const activeDay = data?.days.find((day) => day.date === activeDate);

  return (
    // 팀 인원이 많으면 목록을 스크롤한다. Dialog 안이라 자체 RemoveScroll을 쓰는 modal로 연다
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-[14px] bg-[var(--whisper-cream)] px-4 py-2.5 text-sm font-medium text-[var(--granite)] transition-colors hover:bg-[rgba(244,241,232,0.7)]"
        >
          동료 식대 내역
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[var(--radix-popover-trigger-width)] rounded-[20px] border-0 p-3 shadow-md!"
      >
        {isLoading ? (
          <Message>불러오는 중...</Message>
        ) : isError ? (
          <Message>내역을 불러오지 못했습니다.</Message>
        ) : (
          <>
            <div className="mb-2 flex gap-1">
              {data?.days.map((day) => {
                const dayOfDate = dayjs(day.date);
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setActiveDate(day.date)}
                    className={`flex-1 rounded-[10px] py-1 text-center text-[11px] leading-tight transition-colors ${
                      day.date === activeDate
                        ? "bg-[var(--ink-black)] text-white"
                        : "bg-[var(--whisper-cream)] text-[var(--granite)]"
                    }`}
                  >
                    {WEEK_DAY_LABELS[dayOfDate.day()]}
                    <br />
                    {dayOfDate.date()}
                  </button>
                );
              })}
            </div>

            {!activeDay ? (
              <Message>이 날은 설정된 식사 유형이 없습니다.</Message>
            ) : (
              <>
                <p className="mb-2 text-xs text-[var(--slate-gray)]">
                  {activeDay.label}
                  {activeDay.subtitle && ` · ${activeDay.subtitle}`}
                  {activeDay.people.length > 0 && " · 가게명을 누르면 복사됩니다"}
                </p>

                {activeDay.people.length === 0 ? (
                  <Message>{activeDay.emptyMessage}</Message>
                ) : (
                  <ul className="max-h-[min(16rem,calc(var(--radix-popover-content-available-height)-8rem))] space-y-1.5 overflow-y-auto">
                    {activeDay.people.map(({ name, meal }) => (
                      <li
                        key={name}
                        className="rounded-[14px] bg-[rgba(244,241,232,0.58)] px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-[var(--granite)]">
                            {name}
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
                    ))}
                  </ul>
                )}
              </>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
