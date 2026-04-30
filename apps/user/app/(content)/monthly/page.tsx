"use client";
import { Button } from "@repo/ui/src/button";
import { useEffect, useState } from "react";
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
import { AllHistoryDialog } from "@/components/monthly/AllHistoryDialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@repo/ui/src/popover";
import { DRINKS } from "@/lib/const/const";
import { motion } from "motion/react";
import QuickActionsSection from "@/components/dashboard/QuickActionsSection";
import { Check, ChevronLeft, ChevronRight, Coffee } from "@repo/ui/icons";

// 3일 이내 생성된 취합 건은 NEW 표시
function isNewCollection(createdAt: string) {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  return diffMs < 3 * 24 * 60 * 60 * 1000;
}

// ─── 취합 건 리스트 (1단계) ───────────────────────────────────
function CollectionListView({
  collections,
  isLoading,
  onSelect,
}: {
  collections: DrinkCollectionItem[];
  isLoading: boolean;
  onSelect: (collection: DrinkCollectionItem) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="card-premium overflow-hidden rounded-[24px]"
    >
      <header className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-[var(--whisper-cream)] text-[var(--ink-black)]">
            <Coffee className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-medium text-[var(--ink-black)]">
              Monthly 커피
            </h1>
            <p className="mt-0.5 text-xs text-[var(--granite)]">
              참여할 음료 취합을 선택하세요
            </p>
          </div>
        </div>
      </header>

      <div className="px-5 pb-5">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : collections.length === 0 ? (
          <div className="rounded-[18px] bg-[rgba(244,241,232,0.58)] py-10 text-center">
            <p className="text-[var(--slate-gray)] text-sm">
              현재 참여 가능한 취합이 없습니다
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {collections.map((col, index) => (
              <motion.button
                key={col.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => onSelect(col)}
                className="w-full rounded-[18px] bg-[rgba(244,241,232,0.58)] px-4 py-3 text-left transition-colors hover:bg-[var(--whisper-cream)] active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {isNewCollection(col.created_at) && (
                      <span className="w-2 h-2 rounded-full bg-[#d03238] shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold text-sm text-[var(--ink-black)]">
                        {col.title}
                      </p>
                      <p className="text-[11px] text-[var(--slate-gray)] mt-0.5">
                        {col.is_one_time
                          ? "일회성"
                          : `${col.year}년 ${col.month}월`}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[rgba(14,15,12,0.24)]" />
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
  const { mutateAsync: assignDrink, isPending: isAssigning } =
    useAssignDrink();

  const drinkOptions = data?.drinkOptions || [];
  const pickupPersons = data?.pickupPersons || [];

  const availableDrinks = drinkOptions
    .filter((option) => option.available)
    .map((option) => option.name);
  const allDrinks = availableDrinks.length > 0 ? availableDrinks : DRINKS;
  const displayDrinks = collection.is_one_time
    ? allDrinks
    : allDrinks.filter((d) => d !== "기타");

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
      selectedDrink === "기타"
        ? customDrink.trim() || "기타"
        : selectedDrink;

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
        `음료 선택 중 오류가 발생했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`
      );
    }
  };

  const applications = data?.applications || [];
  const completedCount = applications.filter((app) => app.drink).length || 0;
  const totalCount = data?.totalMembers || 0;
  const pickupText = pickupPersons.map((p) => p.name).join(", ");
  const drinkButtonGridClass = "grid grid-cols-4 gap-2";

  const renderDrinkOptions = (gridClass = "space-y-2") => (
    <div className={gridClass}>
      {isLoading
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
                  <Check className="h-4 w-4 shrink-0 text-[#9a4f00]" strokeWidth={3} />
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
      className="card-premium overflow-hidden rounded-[24px]"
    >
      {/* Header */}
      <header className="px-5 py-4">
        <button
          onClick={onBack}
          className="mb-3 flex items-center gap-1 text-xs font-medium text-[var(--slate-gray)] transition-colors hover:text-[var(--ink-black)]"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          목록
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-[var(--whisper-cream)] text-[var(--ink-black)]">
            <Coffee className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-medium text-[var(--ink-black)]">
              {collection.title}
            </h1>
            <p className="mt-0.5 text-xs text-[var(--granite)]">
              {collection.is_one_time
                ? "일회성 음료 취합"
                : `${collection.year}년 ${collection.month}월 음료 취합`}
            </p>
          </div>
        </div>
      </header>

      <div className="hidden grid-cols-[minmax(260px,0.78fr)_minmax(0,1.22fr)] gap-3 px-5 pb-5 lg:grid lg:h-[min(560px,calc(100dvh-18rem))] lg:min-h-[360px]">
        <div className="flex min-h-0 flex-col gap-3">
          <div className="rounded-[18px] bg-[rgba(244,241,232,0.58)] p-3">
            <p className="text-[11px] font-medium text-[var(--slate-gray)]">
              픽업담당
            </p>
            {isLoading ? (
              <p className="mt-1.5 text-sm font-semibold text-[var(--ink-black)]">
                <span className="skeleton inline-block h-5 w-16" />
              </p>
            ) : (
              <p className="mt-1.5 text-sm font-semibold text-[var(--ink-black)]">
                {pickupText || "미정"}
              </p>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] bg-[rgba(244,241,232,0.58)]">
            <div className="shrink-0 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-medium text-[var(--slate-gray)]">
                  신청현황
                </p>
                <p className="text-xs font-semibold text-[var(--ink-black)] tabular-nums">
                  {completedCount}
                  <span className="font-medium text-[rgba(14,15,12,0.28)]">
                    /{totalCount}
                  </span>
                </p>
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="skeleton h-10 rounded-[14px]" />
                ))
              ) : applications.length === 0 ? (
                <p className="py-8 text-center text-xs text-[var(--slate-gray)]">
                  아직 신청 내역이 없습니다
                </p>
              ) : (
                applications.map((app, index) => (
                  <div
                    key={`${app.name}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-[14px] bg-white px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-xs font-medium text-[var(--granite)]">
                      {app.name}
                    </span>
                    <span
                      className={`max-w-[52%] truncate text-right text-xs font-semibold ${
                        app.drink
                          ? "text-[var(--ink-black)]"
                          : "text-[rgba(14,15,12,0.28)]"
                      }`}
                    >
                      {app.drink || "미선택"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] rounded-[18px] border border-[rgba(14,15,12,0.06)] bg-white/55 p-3">
          <p className="mb-3 text-[11px] font-medium text-[var(--slate-gray)]">
            음료 선택
          </p>

          {currentUserName && (
            <div className="mb-3 shrink-0">
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

          <div className="min-h-0 flex-1 overflow-y-auto pb-1">
            {renderDrinkOptions(drinkButtonGridClass)}
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="mb-5 px-5 lg:hidden">
        <div className="flex gap-2.5">
          <button
            onClick={() => setIsAllHistoryDialogOpen(true)}
            className="flex-1 rounded-[18px] bg-[rgba(244,241,232,0.58)] p-3 text-left transition-colors active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-[var(--slate-gray)] font-medium">신청현황</p>
              <p className="text-[10px] text-[var(--slate-gray)]">전체보기 &rsaquo;</p>
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
                  <p className="text-[11px] text-[var(--slate-gray)] font-medium">픽업담당</p>
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
              <p className="text-[11px] text-[var(--slate-gray)] font-medium">픽업담당</p>
              {isLoading ? (
                <p className="text-sm font-semibold text-[var(--ink-black)] mt-1.5">
                  <span className="skeleton inline-block w-14 h-5" />
                </p>
              ) : (
                <p className="text-sm font-semibold text-[rgba(14,15,12,0.2)] mt-1.5">미정</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* My Selection */}
      {currentUserName && (
        <div className="mb-5 px-5 lg:hidden">
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
              <p className="text-[11px] font-medium text-[var(--slate-gray)]">내 선택</p>
              <p className="mt-0.5 text-sm text-[var(--slate-gray)]">
                아래에서 음료를 선택해주세요
              </p>
            </div>
          )}
        </div>
      )}

      {/* Drink Options */}
      <div className="px-5 pb-5 lg:hidden">
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
                isAssigning ||
                (selectedDrink === "기타" && !customDrink.trim())
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
  const { data: collections, isLoading: collectionsLoading } =
    useCollections();
  const [selectedCollection, setSelectedCollection] =
    useState<DrinkCollectionItem | null>(null);

  if (selectedCollection) {
    return (
      <div className="flex flex-col gap-3 lg:h-[calc(100dvh-10rem)] lg:overflow-hidden">
        <DrinkSelectionView
          collection={selectedCollection}
          onBack={() => setSelectedCollection(null)}
        />
        <div className="shrink-0">
          <QuickActionsSection excludeIds={["monthly"]} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100dvh-10rem)] lg:overflow-hidden">
      <CollectionListView
        collections={collections || []}
        isLoading={collectionsLoading}
        onSelect={setSelectedCollection}
      />
      <div className="shrink-0">
        <QuickActionsSection excludeIds={["monthly"]} />
      </div>
    </div>
  );
};

export default MonthlyDrink;
