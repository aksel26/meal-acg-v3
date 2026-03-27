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
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@repo/ui/src/tooltip";
import { DRINKS } from "@/lib/const/const";
import { motion } from "motion/react";

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
      className="card-premium rounded-2xl pb-12"
    >
      <header className="px-5 pt-10 pb-5">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
          음료 취합
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          참여할 취합을 선택하세요
        </p>
      </header>

      <div className="px-5">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-xl" />
            ))}
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">
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
                className="w-full text-left rounded-xl px-4 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {isNewCollection(col.created_at) && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold text-sm text-gray-900">
                        {col.title}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {col.is_one_time
                          ? "일회성"
                          : `${col.year}년 ${col.month}월`}
                      </p>
                    </div>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
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
  const displayDrinks = availableDrinks.length > 0 ? availableDrinks : DRINKS;

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

  const completedCount =
    data?.applications.filter((app) => app.drink).length || 0;
  const totalCount = data?.totalMembers || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="card-premium rounded-2xl pb-12"
    >
      {/* Header */}
      <header className="px-5 pt-10 pb-5">
        <button
          onClick={onBack}
          className="text-xs text-gray-400 font-medium flex items-center gap-1 mb-3"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          목록
        </button>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
          {collection.title}
        </h1>
      </header>

      {/* Status */}
      <div className="px-5 mb-5">
        <div className="flex gap-2.5">
          <button
            onClick={() => setIsAllHistoryDialogOpen(true)}
            className="flex-1 rounded-xl p-3.5 bg-gray-50 text-left transition-colors active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-gray-400 font-medium">신청현황</p>
              <p className="text-[10px] text-gray-400">전체보기 &rsaquo;</p>
            </div>
            <p className="text-lg font-bold text-gray-900 mt-1 tabular-nums">
              {isLoading ? (
                <span className="skeleton inline-block w-10 h-5" />
              ) : (
                <>
                  {completedCount}
                  <span className="text-gray-300 text-xs font-medium">
                    /{totalCount}
                  </span>
                </>
              )}
            </p>
          </button>
          <div className="flex-1 rounded-xl p-3.5 bg-gray-50 min-w-0">
            <p className="text-[11px] text-gray-400 font-medium">픽업담당</p>
            {isLoading ? (
              <p className="text-sm font-semibold text-gray-900 mt-1.5">
                <span className="skeleton inline-block w-14 h-5" />
              </p>
            ) : pickupPersons.length > 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-sm font-semibold text-gray-900 mt-1.5 truncate cursor-default">
                    {pickupPersons.map((p) => p.name).join(", ")}
                  </p>
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px] bg-gray-900 text-white text-xs rounded-lg px-3 py-2">
                  {pickupPersons.map((p) => p.name).join(", ")}
                </TooltipContent>
              </Tooltip>
            ) : (
              <p className="text-sm font-semibold text-gray-300 mt-1.5">미정</p>
            )}
          </div>
        </div>
      </div>

      {/* My Selection */}
      {currentUserName && (
        <div className="px-5 mb-5">
          {isLoading ? (
            <div className="rounded-xl p-3.5 bg-gray-50">
              <div className="skeleton h-4 w-16 mb-2" />
              <div className="skeleton h-5 w-32" />
            </div>
          ) : myDrink ? (
            <div className="rounded-xl p-3.5 bg-pink-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-pink-400 text-[11px] font-medium">
                    내 선택
                  </p>
                  <p className="text-pink-700 font-semibold text-sm mt-0.5">
                    {myDrink}
                  </p>
                </div>
                <div className="w-5 h-5 bg-pink-200 rounded-full flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-pink-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-gray-200 rounded-xl p-3.5">
              <p className="text-gray-400 text-[11px] font-medium">내 선택</p>
              <p className="text-gray-400 text-sm mt-0.5">
                아래에서 음료를 선택해주세요
              </p>
            </div>
          )}
        </div>
      )}

      {/* Drink Options */}
      <div className="px-5">
        <p className="text-[11px] text-gray-400 font-medium mb-3">
          음료 선택
        </p>
        <div className="space-y-2">
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="skeleton h-11 rounded-xl" />
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
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isMyDrink || isMyCustomDrink
                        ? "bg-pink-50 text-pink-700"
                        : isNoSelection
                          ? "bg-gray-50 text-gray-400"
                          : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span>
                      {drink}
                      {isMyCustomDrink && (
                        <span className="ml-1.5 text-gray-400 text-xs">
                          ({myDrink})
                        </span>
                      )}
                    </span>
                    {(isMyDrink || isMyCustomDrink) && (
                      <svg
                        className="w-4 h-4 text-pink-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-xs mx-auto bg-white rounded-2xl shadow-xl border-0 p-5">
          <DialogHeader className="text-center mb-4">
            <DialogTitle className="text-lg font-bold text-gray-900">
              {selectedDrink === "기타" ? "기타 음료 입력" : selectedDrink}
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-sm mt-1">
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
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
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
              className="flex-1 h-11 text-gray-500 hover:text-gray-700 hover:bg-gray-100 font-medium rounded-xl"
            >
              취소
            </Button>
            <Button
              onClick={handleDrinkAssign}
              disabled={
                isAssigning ||
                (selectedDrink === "기타" && !customDrink.trim())
              }
              className="flex-1 h-11 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl disabled:opacity-40"
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
      <DrinkSelectionView
        collection={selectedCollection}
        onBack={() => setSelectedCollection(null)}
      />
    );
  }

  return (
    <CollectionListView
      collections={collections || []}
      isLoading={collectionsLoading}
      onSelect={setSelectedCollection}
    />
  );
};

export default MonthlyDrink;
