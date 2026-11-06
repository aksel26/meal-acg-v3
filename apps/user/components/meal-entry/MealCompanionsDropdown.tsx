"use client";

import { useState } from "react";
import dayjs from "dayjs";
import { ChevronDown, Copy, Users, X } from "lucide-react";
import { motion, useReducedMotion, type Transition } from "motion/react";
import { formatDate } from "utils";
import { Button } from "@repo/ui/src/button";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
import { toast } from "@repo/ui/src/sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/src/tooltip";
import { useMealCompanions } from "@/hooks/use-meal-companions";
import { useMealDrawerStore } from "@/stores/mealDrawerStore";
import { useUserStore } from "@/stores/userStore";

// dayjs().day() 순서 (일요일 = 0)
const WEEK_DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// 새 기능 안내: 살짝 올라가 흔들린 뒤 원위치한다
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

// 안내(툴팁·애니메이션)는 닫을 때까지 보여주고, 닫으면 계정별로 기기에서 다시 보여주지 않는다
const GUIDE_CLOSED_KEY = "meal-companions-guide-closed";

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
  hint = false,
  onOpen,
}: {
  date: string;
  variant?: "full" | "icon";
  hint?: boolean;
  onOpen?: () => void;
}) {
  const memberId = useUserStore((s) => s.userId);
  const [open, setOpen] = useState(false);
  const [activeDate, setActiveDate] = useState(date);

  const reduceMotion = useReducedMotion();
  // 재생 중에 안내를 닫아도 끊기지 않도록 마운트 시점 값으로 고정한다
  const [playHint] = useState(hint && !reduceMotion);

  const { data, isLoading, isError } = useMealCompanions(memberId, date, open);
  const activeDay = data?.days.find((day) => day.date === activeDate);

  return (
    // 팀 인원이 많으면 목록을 스크롤한다. Dialog 안이라 자체 RemoveScroll을 쓰는 modal로 연다
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) onOpen?.();
      }}
      modal
    >
      {variant === "icon" ? (
        <motion.span
          className="inline-flex"
          animate={playHint ? HINT_ANIMATION : undefined}
          transition={HINT_TRANSITION}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="동료 식대 내역"
              title="동료 식대 내역"
              className="size-10 rounded-full bg-[var(--whisper-cream)] text-[var(--granite)] hover:bg-[rgba(244,241,232,0.7)] active:scale-[0.96]"
            >
              <Users className="size-[18px]" />
            </Button>
          </PopoverTrigger>
        </motion.span>
      ) : (
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            className="h-auto w-full justify-between rounded-[14px] bg-[var(--whisper-cream)] px-4 py-2.5 text-[var(--granite)] hover:bg-[rgba(244,241,232,0.7)] has-[>svg]:px-4"
          >
            동료 식대 내역
            <ChevronDown
              className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </Button>
        </PopoverTrigger>
      )}
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
                  <Button
                    key={day.date}
                    type="button"
                    variant="secondary"
                    onClick={() => setActiveDate(day.date)}
                    className={`h-auto min-w-0 flex-1 flex-col gap-0 rounded-[10px] px-0 py-1 text-[11px] font-normal leading-tight ${
                      day.date === activeDate
                        ? "bg-[var(--ink-black)] text-white hover:bg-[var(--ink-black)]"
                        : "bg-[var(--whisper-cream)] text-[var(--granite)] hover:bg-[var(--whisper-cream)]"
                    }`}
                  >
                    <span>{WEEK_DAY_LABELS[dayOfDate.day()]}</span>
                    <span>{dayOfDate.date()}</span>
                  </Button>
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
                            <Button
                              type="button"
                              variant="link"
                              onClick={() => {
                                copyStore(meal.store as string);
                                // 드롭다운이 입력란을 가리므로 닫아서 바로 붙여넣게 한다
                                setOpen(false);
                              }}
                              className="h-auto min-w-0 shrink justify-start gap-1 p-0 text-left text-[var(--ink-black)] has-[>svg]:px-0"
                            >
                              <span className="truncate">{meal.store}</span>
                              <Copy className="size-3 shrink-0 text-[var(--slate-gray)]" />
                            </Button>
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

// 새로 입력할 때 단계 제목 행 우측 끝에 놓는 아이콘 버튼. hint는 첫 단계에서만 켠다
export function MealCompanionsTitleButton({ hint = false }: { hint?: boolean }) {
  const isEditMode = useMealDrawerStore((s) => s.isEditMode);
  const date = useMealCompanionsDate();
  const memberId = useUserStore((s) => s.userId);
  const guideKey = `${GUIDE_CLOSED_KEY}:${memberId}`;
  const [showGuide, setShowGuide] = useState(
    () => !localStorage.getItem(guideKey),
  );
  // 자동완성 목록(z-50)보다 앞에 나오지 않도록 Dialog 안쪽에 렌더링한다
  const [tooltipContainer, setTooltipContainer] = useState<HTMLElement | null>(null);

  const closeGuide = () => {
    localStorage.setItem(guideKey, "1");
    setShowGuide(false);
  };

  if (isEditMode || !date) return null;

  return (
    <div ref={setTooltipContainer} className="shrink-0">
      {/* onOpenChange 없이 제어해 호버나 바깥 클릭으로 닫히지 않게 한다 */}
      <Tooltip open={showGuide}>
        <TooltipTrigger asChild>
          <div className="size-10">
            <MealCompanionsDropdown
              date={date}
              variant="icon"
              hint={hint && showGuide}
              onOpen={closeGuide}
            />
          </div>
        </TooltipTrigger>
        {tooltipContainer && (
          <TooltipContent
            container={tooltipContainer}
            side="left"
            sideOffset={8}
            aria-label="점심조"
            className="flex items-center gap-1 whitespace-nowrap py-1 pl-2.5 pr-1"
          >
            점심조
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="점심조 안내 닫기"
              onClick={closeGuide}
              className="relative size-4 rounded-full text-primary-foreground after:absolute after:-inset-3 after:content-[''] hover:bg-white/20 hover:text-primary-foreground"
            >
              <X className="size-3" />
            </Button>
          </TooltipContent>
        )}
      </Tooltip>
    </div>
  );
}
