"use client";
import { Button } from "@repo/ui/src/button";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useMonthlyData,
  useCollections,
  type DrinkCollectionItem,
} from "@/hooks/useMonthlyData";
import { useAssignDrink } from "@/hooks/useAssignDrink";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import QuickActionsSection from "@/components/dashboard/QuickActionsSection";
import { AllHistoryDialog } from "@/components/monthly/AllHistoryDialog";
import { Popover, PopoverTrigger, PopoverContent } from "@repo/ui/src/popover";
import { DRINKS } from "@/lib/const/const";
import {
  motion,
  AnimatePresence,
  animate,
  useAnimationControls,
  useMotionValue,
  useTransform,
} from "motion/react";
import { Check, ChevronLeft, ChevronRight } from "@repo/ui/icons";
import Image from "next/image";

// 3일 이내 생성된 취합 건은 NEW 표시
function isNewCollection(createdAt: string) {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  return diffMs < 3 * 24 * 60 * 60 * 1000;
}

const EASTER_EGG_INCREMENT = 10;
const FLOAT_DURATION_MS = 1400;

function EmptyCollectionsState() {
  const controls = useAnimationControls();
  const amount = useMotionValue(0);
  const displayAmount = useTransform(amount, (value) =>
    `${Math.round(value).toLocaleString("ko-KR")}원`,
  );
  const totalRef = useRef(0);
  const floatIdRef = useRef(0);
  const [floats, setFloats] = useState<number[]>([]);

  const handleEasterEggClick = () => {
    totalRef.current += EASTER_EGG_INCREMENT;
    animate(amount, totalRef.current, {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
    });
    controls.start({
      rotate: [0, -4, 4, -3, 3, -2, 2, 0],
      x: [0, -2, 2, -1, 1, 0],
      transition: { duration: 0.45, ease: "easeOut" },
    });

    const id = floatIdRef.current++;
    setFloats((prev) => [...prev, id]);
    window.setTimeout(() => {
      setFloats((prev) => prev.filter((f) => f !== id));
    }, FLOAT_DURATION_MS);
  };

  return (
    <div className="flex h-full flex-col items-center justify-center py-12 text-center">
      <div className="relative mb-4">
        <motion.button
          type="button"
          onClick={handleEasterEggClick}
          animate={controls}
          whileTap={{ scale: 0.96 }}
          aria-label="배고픈 숭이에게 용돈 주기"
          className="relative h-[212px] w-40 overflow-hidden rounded-[18px] cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink-black)]"
        >
          <Image
            src="/images/배고픈 숭이.jpeg"
            alt=""
            fill
            sizes="160px"
            className="object-cover pointer-events-none"
            priority={false}
            draggable={false}
          />
        </motion.button>
        <div className="pointer-events-none absolute inset-x-0 top-2 flex items-center justify-center gap-2">
          <Image
            src="/images/heart_1.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
            priority={false}
            draggable={false}
          />
          <motion.p
            className="text-lg font-bold leading-none text-white tabular-nums"
            style={{ textShadow: "0 2px 6px rgba(0,0,0,0.45)" }}
          >
            {displayAmount}
          </motion.p>
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
          <AnimatePresence>
            {floats.map((id) => (
              <motion.span
                key={id}
                initial={{ opacity: 0, y: 12, color: "#ffffff" }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  y: -40,
                  color: ["#ffffff", "#ffffff", "#ec4899", "#ec4899"],
                }}
                transition={{
                  duration: FLOAT_DURATION_MS / 1000,
                  ease: [0.16, 1, 0.3, 1],
                  times: [0, 0.2, 0.6, 1],
                }}
                className="absolute text-xl font-bold"
                style={{ textShadow: "0 2px 6px rgba(0,0,0,0.45)" }}
              >
                +10
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>
      <p className="text-sm text-[var(--slate-gray)]">
        현재 참여 가능한 취합이 없습니다
      </p>
    </div>
  );
}

// ─── 취합 건 리스트 (1단계) ───────────────────────────────────
function CollectionListView({
  collections,
  isLoading,
  onSelect,
  selectedCollectionId,
}: {
  collections: DrinkCollectionItem[];
  isLoading: boolean;
  onSelect: (collection: DrinkCollectionItem) => void;
  selectedCollectionId?: string | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="card-premium monthly-collection-card flex h-full min-h-0 flex-col overflow-hidden rounded-[24px]"
    >
      <div className="monthly-collection-scroll h-full overflow-y-auto px-5 py-5">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : collections.length === 0 ? (
          <EmptyCollectionsState />
        ) : (
          <div className="space-y-2">
            {collections.map((col, index) => (
              <motion.button
                key={col.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => onSelect(col)}
                className={`group w-full rounded-[18px] px-4 py-3 text-left transition-colors hover:bg-[var(--ink-black)] hover:text-white active:scale-[0.98] ${
                  selectedCollectionId === col.id
                    ? "bg-[var(--ink-black)] text-white"
                    : "bg-[rgba(244,241,232,0.58)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {isNewCollection(col.created_at) && (
                      <span className="w-2 h-2 rounded-full bg-[#d03238] shrink-0" />
                    )}
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          selectedCollectionId === col.id
                            ? "text-white"
                            : "text-[var(--ink-black)] group-hover:text-white"
                        }`}
                      >
                        {col.title}
                      </p>
                      <p
                        className={`mt-0.5 text-[11px] ${
                          selectedCollectionId === col.id
                            ? "text-white/68"
                            : "text-[var(--slate-gray)] group-hover:text-white/68"
                        }`}
                      >
                        {col.is_one_time
                          ? "일회성"
                          : `${col.year}년 ${col.month}월`}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    className={`h-4 w-4 ${
                      selectedCollectionId === col.id
                        ? "text-white/58"
                        : "text-[rgba(14,15,12,0.24)] group-hover:text-white/58"
                    }`}
                  />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── 음료 선택 (2단계) ────────────────────────────────────────
function DrinkSelectionView({
  collection,
  onBack,
}: {
  collection: DrinkCollectionItem;
  onBack: () => void;
}) {
  const [selectedDrink, setSelectedDrink] = useState<string>("");
  const [customDrink, setCustomDrink] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAllHistoryDialogOpen, setIsAllHistoryDialogOpen] = useState(false);

  const { data, isLoading } = useMonthlyData(collection.id);
  const { mutateAsync: assignDrink, isPending: isAssigning } = useAssignDrink();

  const drinkOptions = data?.drinkOptions || [];
  const pickupPersons = data?.pickupPersons || [];
  const collectionDrinkOptions = collection.drink_options || [];
  const availableDrinks = drinkOptions
    .filter((option) => option.available)
    .map((option) => option.name);
  const allDrinks =
    availableDrinks.length > 0
      ? availableDrinks
      : collectionDrinkOptions.length > 0
        ? collectionDrinkOptions
        : DRINKS;
  const displayDrinks = collection.is_one_time
    ? allDrinks
    : allDrinks.filter((d) => d !== "기타");
  const isOptionsLoading = isLoading && collectionDrinkOptions.length === 0;

  const [currentUserName, setCurrentUserName] = useState("");
  const myDrink =
    data?.applications.find((app) => app.name === currentUserName)?.drink ||
    null;

  useEffect(() => {
    const storedName = localStorage.getItem("name");
    if (storedName) setCurrentUserName(storedName);
  }, []);

  const handleDrinkAssign = async () => {
    if (!currentUserName) {
      alert("사용자 이름을 찾을 수 없습니다. 로그인을 확인해주세요.");
      return;
    }

    const drinkValue =
      selectedDrink === "기타" ? customDrink.trim() || "기타" : selectedDrink;

    if (!drinkValue) {
      alert("음료를 선택해주세요.");
      return;
    }

    try {
      await assignDrink({
        name: currentUserName,
        drink: drinkValue,
        collectionId: collection.id,
      });
      setIsDialogOpen(false);
      setSelectedDrink("");
      setCustomDrink("");
    } catch (error) {
      alert(
        `음료 선택 중 오류가 발생했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
      );
    }
  };

  const applications = data?.applications || [];
  const completedCount = applications.filter((app) => app.drink).length || 0;
  const totalCount = data?.totalMembers || 0;
  const pickupText = pickupPersons.map((p) => p.name).join(", ");
  const drinkButtonGridClass = "grid grid-cols-2 gap-2";

  const renderDrinkOptions = (gridClass = "space-y-2") => (
    <div className={gridClass}>
      {isOptionsLoading
        ? Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="skeleton h-11 rounded-[18px]" />
          ))
        : displayDrinks.map((drink) => {
            const isMyDrink = myDrink === drink;
            const isNoSelection = drink === "선택안함";
            const isCustom = drink === "기타";
            const isMyCustomDrink =
              isCustom &&
              myDrink &&
              !displayDrinks.includes(myDrink) &&
              myDrink !== "기타";

            return (
              <button
                key={drink}
                onClick={() => {
                  setSelectedDrink(drink);
                  setCustomDrink("");
                  setIsDialogOpen(true);
                }}
                className={`flex min-h-11 w-full items-center justify-between rounded-[18px] px-4 py-3 text-sm font-medium transition-colors ${
                  isMyDrink || isMyCustomDrink
                    ? "bg-[rgba(236,126,0,0.1)] text-[var(--ink-black)]"
                    : isNoSelection
                      ? "bg-[rgba(244,241,232,0.58)] text-[var(--slate-gray)]"
                      : "bg-[rgba(244,241,232,0.58)] text-[var(--granite)] hover:bg-[var(--whisper-cream)]"
                }`}
              >
                <span className="min-w-0 truncate text-left">
                  {drink}
                  {isMyCustomDrink && (
                    <span className="ml-1.5 text-xs text-[var(--slate-gray)]">
                      ({myDrink})
                    </span>
                  )}
                </span>
                {(isMyDrink || isMyCustomDrink) && (
                  <Check
                    className="h-4 w-4 shrink-0 text-[#9a4f00]"
                    strokeWidth={3}
                  />
                )}
              </button>
            );
          })}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="card-premium monthly-drink-card flex h-full min-h-0 flex-col overflow-hidden rounded-[24px]"
    >
      <div className="hidden">
        <button
          onClick={onBack}
          className="text-xs text-[var(--slate-gray)] font-medium flex items-center gap-1"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          목록
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-5 lg:py-5">
        <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-[var(--slate-gray)]">
              음료 선택
            </p>
            <h2 className="mt-1 truncate text-lg font-bold text-[var(--ink-black)]">
              {collection.title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--slate-gray)]">
              <span>{pickupText ? `픽업 ${pickupText}` : "픽업 미정"}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAllHistoryDialogOpen(true)}
            className="shrink-0 rounded-[16px] bg-[rgba(244,241,232,0.72)] px-3 py-2 text-right transition-colors hover:bg-[var(--whisper-cream)] active:scale-[0.98]"
          >
            <span className="block text-[10px] font-medium text-[var(--slate-gray)]">
              신청현황
            </span>
            <span className="mt-0.5 block text-sm font-bold tabular-nums text-[var(--ink-black)]">
              {isLoading ? (
                <span className="skeleton inline-block h-4 w-9" />
              ) : (
                <>
                  {completedCount}
                  <span className="text-[10px] font-medium text-[rgba(14,15,12,0.32)]">
                    /{totalCount}
                  </span>
                </>
              )}
            </span>
          </button>
        </div>

        {currentUserName && (
          <div className="mb-4 shrink-0">
            {isLoading ? (
              <div className="rounded-[18px] bg-[rgba(244,241,232,0.58)] p-3">
                <div className="skeleton mb-2 h-4 w-16" />
                <div className="skeleton h-5 w-32" />
              </div>
            ) : myDrink ? (
              <div className="rounded-[18px] bg-[rgba(236,126,0,0.1)] p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-medium text-[#9a4f00]">
                      내 선택
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-[var(--ink-black)]">
                      {myDrink}
                    </p>
                  </div>
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(236,126,0,0.18)]">
                    <Check
                      className="h-3 w-3 text-[#9a4f00]"
                      strokeWidth={3}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[18px] border border-dashed border-[rgba(14,15,12,0.08)] p-3">
                <p className="text-[11px] font-medium text-[var(--slate-gray)]">
                  내 선택
                </p>
                <p className="mt-0.5 text-sm text-[var(--slate-gray)]">
                  아래에서 음료를 선택해주세요
                </p>
              </div>
            )}
          </div>
        )}

        <div className="monthly-drink-options min-h-0 flex-1 overflow-y-auto pb-1">
          {renderDrinkOptions(drinkButtonGridClass)}
        </div>
      </div>

      {/* Status */}
      <div className="hidden">
        <div className="flex gap-2.5">
          <button
            onClick={() => setIsAllHistoryDialogOpen(true)}
            className="flex-1 rounded-[18px] bg-[rgba(244,241,232,0.58)] p-3 text-left transition-colors active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-[var(--slate-gray)] font-medium">
                신청현황
              </p>
              <p className="text-[10px] text-[var(--slate-gray)]">
                전체보기 &rsaquo;
              </p>
            </div>
            <p className="text-lg font-bold text-[var(--ink-black)] mt-1 tabular-nums">
              {isLoading ? (
                <span className="skeleton inline-block w-10 h-5" />
              ) : (
                <>
                  {completedCount}
                  <span className="text-[rgba(14,15,12,0.2)] text-xs font-medium">
                    /{totalCount}
                  </span>
                </>
              )}
            </p>
          </button>
          {pickupPersons.length > 0 ? (
            <Popover>
              <PopoverTrigger asChild>
                <div
                  className="min-w-0 flex-1 cursor-default rounded-[18px] bg-[rgba(244,241,232,0.58)] p-3"
                  onMouseEnter={(e) => {
                    const trigger = e.currentTarget;
                    trigger.click();
                  }}
                  onMouseLeave={(e) => {
                    const trigger = e.currentTarget;
                    trigger.click();
                  }}
                >
                  <p className="text-[11px] text-[var(--slate-gray)] font-medium">
                    픽업담당
                  </p>
                  {isLoading ? (
                    <p className="text-sm font-semibold text-[var(--ink-black)] mt-1.5">
                      <span className="skeleton inline-block w-14 h-5" />
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-[var(--ink-black)] mt-1.5 truncate">
                      {pickupText}
                    </p>
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto max-w-[200px] bg-[var(--ink-black)] text-white text-xs rounded-lg px-3 py-2 border-0">
                {pickupText}
              </PopoverContent>
            </Popover>
          ) : (
            <div className="min-w-0 flex-1 rounded-[18px] bg-[rgba(244,241,232,0.58)] p-3">
              <p className="text-[11px] text-[var(--slate-gray)] font-medium">
                픽업담당
              </p>
              {isLoading ? (
                <p className="text-sm font-semibold text-[var(--ink-black)] mt-1.5">
                  <span className="skeleton inline-block w-14 h-5" />
                </p>
              ) : (
                <p className="text-sm font-semibold text-[rgba(14,15,12,0.2)] mt-1.5">
                  미정
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* My Selection */}
      {currentUserName && (
        <div className="hidden">
          {isLoading ? (
            <div className="rounded-[18px] bg-[rgba(244,241,232,0.58)] p-3">
              <div className="skeleton mb-2 h-4 w-16" />
              <div className="skeleton h-5 w-32" />
            </div>
          ) : myDrink ? (
            <div className="rounded-[18px] bg-[rgba(236,126,0,0.1)] p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-[#9a4f00]">
                    내 선택
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-[var(--ink-black)]">
                    {myDrink}
                  </p>
                </div>
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(236,126,0,0.18)]">
                  <Check className="h-3 w-3 text-[#9a4f00]" strokeWidth={3} />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-[rgba(14,15,12,0.08)] p-3">
              <p className="text-[11px] font-medium text-[var(--slate-gray)]">
                내 선택
              </p>
              <p className="mt-0.5 text-sm text-[var(--slate-gray)]">
                아래에서 음료를 선택해주세요
              </p>
            </div>
          )}
        </div>
      )}

      {/* Drink Options */}
      <div className="hidden">
        <p className="mb-3 text-[11px] font-medium text-[var(--slate-gray)]">
          음료 선택
        </p>
        {renderDrinkOptions()}
      </div>

      {/* Confirm Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-xs mx-auto bg-white rounded-2xl shadow-xl border-0 p-5">
          <DialogHeader className="text-center mb-4">
            <DialogTitle className="text-lg font-bold text-[var(--ink-black)]">
              {selectedDrink === "기타" ? "기타 음료 입력" : selectedDrink}
            </DialogTitle>
            <DialogDescription className="text-[var(--granite)] text-sm mt-1">
              {selectedDrink === "기타"
                ? "원하시는 음료를 입력해주세요"
                : "이 음료를 선택하시겠습니까?"}
            </DialogDescription>
          </DialogHeader>
          {selectedDrink === "기타" && (
            <div className="mb-4">
              <input
                type="text"
                value={customDrink}
                onChange={(e) => setCustomDrink(e.target.value)}
                placeholder="예: 카페라떼"
                className="w-full px-4 py-3 rounded-xl border border-[rgba(14,15,12,0.08)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ink-black)] focus:border-transparent"
                autoFocus
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsDialogOpen(false);
                setSelectedDrink("");
                setCustomDrink("");
              }}
              className="flex-1 h-11 text-[var(--granite)] hover:text-[var(--granite)] hover:bg-[var(--whisper-cream)] font-medium rounded-xl"
            >
              취소
            </Button>
            <Button
              onClick={handleDrinkAssign}
              disabled={
                isAssigning || (selectedDrink === "기타" && !customDrink.trim())
              }
              className="flex-1 h-11 bg-[var(--ink-black)] hover:bg-[var(--ink-black)] text-white font-semibold rounded-xl disabled:opacity-40"
            >
              {isAssigning ? "저장 중..." : "확인"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AllHistoryDialog
        isOpen={isAllHistoryDialogOpen}
        onClose={() => setIsAllHistoryDialogOpen(false)}
        collectionId={collection.id}
      />
    </motion.div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────
const MonthlyDrink = () => {
  const { data: collections, isLoading: collectionsLoading } = useCollections();
  const [selectedCollection, setSelectedCollection] =
    useState<DrinkCollectionItem | null>(null);
  const visibleCollections = useMemo(() => collections || [], [collections]);
  const hasCollections = visibleCollections.length > 0;
  const showsTwoColumns = collectionsLoading || hasCollections;

  useEffect(() => {
    const firstCollection = visibleCollections[0];

    if (!firstCollection) {
      setSelectedCollection(null);
      return;
    }

    const selectedExists = visibleCollections.some(
      (collection) => collection.id === selectedCollection?.id,
    );

    if (!selectedCollection || !selectedExists) {
      setSelectedCollection(firstCollection);
    }
  }, [selectedCollection, visibleCollections]);

  if (!showsTwoColumns) {
    return (
      <div className="monthly-empty-layout grid h-full min-h-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] grid-rows-[minmax(0,1fr)_auto] gap-x-4 gap-y-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="card-premium col-span-full min-h-0 overflow-hidden rounded-[24px] rounded-t-none rounded-bl-none"
          style={{
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderBottomLeftRadius: 0,
          }}
        >
          <EmptyCollectionsState />
        </motion.div>

        <div
          className="monthly-empty-footer-card card-premium relative h-[4.25rem] overflow-visible rounded-[24px] rounded-t-none"
          style={{
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
          }}
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 20 34"
            className="absolute left-full top-0 h-1/2 w-5"
            preserveAspectRatio="none"
          >
            <path
              d="M0 0H20C4.778 0 0 15.222 0 34V0Z"
              fill="white"
            />
          </svg>
        </div>

        <div className="monthly-quick-actions col-start-2 h-[4.25rem] w-full shrink-0">
          <QuickActionsSection />
        </div>
      </div>
    );
  }

  return (
    <div className="monthly-content-layout grid h-full min-h-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] grid-rows-[minmax(0,1fr)_auto] gap-4 overflow-hidden">
      <div className="monthly-collection-pane row-span-2 min-h-0 overflow-hidden">
        <CollectionListView
          collections={visibleCollections}
          isLoading={collectionsLoading}
          onSelect={setSelectedCollection}
          selectedCollectionId={selectedCollection?.id}
        />
      </div>

      <div className="monthly-drink-pane col-start-2 row-start-1 min-h-0 overflow-hidden">
        {selectedCollection && (
          <DrinkSelectionView
            collection={selectedCollection}
            onBack={() => setSelectedCollection(null)}
          />
        )}
      </div>

      <div className="monthly-quick-actions col-start-2 row-start-2 h-[4.25rem] w-full shrink-0">
        <QuickActionsSection />
      </div>
    </div>
  );
};

export default MonthlyDrink;
