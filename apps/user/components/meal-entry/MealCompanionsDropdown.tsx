"use client";

import { useState } from "react";
import dayjs from "dayjs";
import { ChevronDown, Copy, Users } from "lucide-react";
import { motion, useReducedMotion, type Transition } from "motion/react";
import { formatDate } from "utils";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
import { toast } from "@repo/ui/src/sonner";
import { useMealCompanions } from "@/hooks/use-meal-companions";
import { useMealDrawerStore } from "@/stores/mealDrawerStore";
import { useUserStore } from "@/stores/userStore";

// dayjs().day() 순서 (일요일 = 0)
const WEEK_DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// 새 기능 안내: 살짝 올라가 흔들린 뒤 원위치한다. 계정별로 기기에서 한 번만 재생한다
const HINT_SEEN_KEY = "meal-companions-hint-seen-v2";
const HINT_ANIMATION = {
  y: [0, -10, -10, -10, -10, -10, -10, 0],
  scale: [1, 1.15, 1.15, 1.15, 1.15, 1.15, 1.15, 1],
  rotate: [0, 0, -16, 14, -10, 6, 0, 0],
};
const HINT_TRANSITION: Transition = {
  delay: 0.6,
  duration: 1.6,
  ease: "easeInOut",
  times: [0, 0.18, 0.32, 0.44, 0.56, 0.68, 0.8, 1],
};

// 동료 식대 내역을 보여줄 날짜. 어드민 고정 스케줄은 월~금만 설정할 수 있어 중식 평일만 해당한다
export function useMealCompanionsDate() {
  const selectedMealType = useMealDrawerStore((s) => s.selectedMealType);
  const selectedDate = useMealDrawerStore((s) => s.selectedDate);

  if (selectedMealType !== "lunch" || !selectedDate) return null;

  const date = formatDate(selectedDate);
  const dayOfWeek = dayjs(date).day();
  return dayOfWeek >= 1 && dayOfWeek <= 5 ? date : null;
}

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

export function MealCompanionsDropdown({
  date,
  variant = "full",
}: {
  date: string;
  variant?: "full" | "icon";
}) {
  const memberId = useUserStore((s) => s.userId);
  const [open, setOpen] = useState(false);
  const [activeDate, setActiveDate] = useState(date);

  const hintKey = `${HINT_SEEN_KEY}:${memberId}`;
  const reduceMotion = useReducedMotion();
  const [showHint] = useState(
    () =>
      variant === "icon" &&
      !!memberId &&
      !reduceMotion &&
      !localStorage.getItem(hintKey),
  );

  const { data, isLoading, isError } = useMealCompanions(memberId, date, open);
  const activeDay = data?.days.find((day) => day.date === activeDate);

  return (
    // 팀 인원이 많으면 목록을 스크롤한다. Dialog 안이라 자체 RemoveScroll을 쓰는 modal로 연다
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        {variant === "icon" ? (
          <motion.button
            type="button"
            aria-label="동료 식대 내역"
            title="동료 식대 내역"
            animate={showHint ? HINT_ANIMATION : undefined}
            transition={HINT_TRANSITION}
            onAnimationComplete={
              showHint ? () => localStorage.setItem(hintKey, "1") : undefined
            }
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--whisper-cream)] text-[var(--granite)] transition-[background-color,scale] hover:bg-[rgba(244,241,232,0.7)] active:scale-[0.96]"
          >
            <Users className="h-[18px] w-[18px]" />
          </motion.button>
        ) : (
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-[14px] bg-[var(--whisper-cream)] px-4 py-2.5 text-sm font-medium text-[var(--granite)] transition-colors hover:bg-[rgba(244,241,232,0.7)]"
          >
            동료 식대 내역
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align={variant === "icon" ? "end" : "start"}
        sideOffset={6}
        className={`${
          variant === "icon"
            ? "w-[min(25.5rem,calc(100vw-4.5rem))]"
            : "w-[var(--radix-popover-trigger-width)]"
        } rounded-[20px] border-0 p-3 shadow-md!`}
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

// 새로 입력할 때 단계 제목 행 우측 끝에 놓는 아이콘 버튼
export function MealCompanionsTitleButton() {
  const isEditMode = useMealDrawerStore((s) => s.isEditMode);
  const date = useMealCompanionsDate();

  if (isEditMode || !date) return null;

  return <MealCompanionsDropdown date={date} variant="icon" />;
}
