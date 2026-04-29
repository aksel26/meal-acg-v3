"use client";
import { Button } from "@repo/ui/src/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { useMonthlyData } from "@/hooks/useMonthlyData";
import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";

interface AllHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId?: string;
}

const getDrinkInfo = (drink: string) => {
  if (drink === "선택안함")
    return { icon: "☕", gradient: "from-[var(--whisper-cream)] to-[var(--soft-bone)]" };
  if (drink.includes("바닐라"))
    return { icon: "🍦", gradient: "from-[rgba(255,209,26,0.15)] to-[rgba(255,192,145,0.2)]" };
  if (drink.includes("자몽"))
    return { icon: "🍊", gradient: "from-[rgba(208,50,56,0.08)] to-[rgba(255,145,112,0.15)]" };
  if (drink.includes("ICE"))
    return { icon: "🧊", gradient: "from-[rgba(56,200,255,0.08)] to-[rgba(56,200,255,0.15)]" };
  if (drink.includes("HOT"))
    return { icon: "🔥", gradient: "from-[rgba(255,192,145,0.12)] to-[rgba(208,50,56,0.12)]" };
  return { icon: "☕", gradient: "from-[var(--soft-bone)] to-[var(--whisper-cream)]" };
};

export const AllHistoryDialog = ({
  isOpen,
  onClose,
  collectionId,
}: AllHistoryDialogProps) => {
  const { data, isLoading, isError } = useMonthlyData(collectionId);

  const applications = data?.applications || [];

  // 음료별 그룹핑
  const groupedByDrink = useMemo(() => {
    const groups: Record<string, typeof applications> = {};
    applications.forEach((app) => {
      const drink = app.drink || "미선택";
      if (!groups[drink]) groups[drink] = [];
      groups[drink].push(app);
    });
    return groups;
  }, [applications]);

  const drinkGroups = Object.entries(groupedByDrink).sort(
    ([, a], [, b]) => b.length - a.length
  );

  // 완료된 신청 수
  const completedCount = applications.filter(
    (app) => app.drink && app.drink !== "선택안함"
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto p-0 bg-white rounded-3xl shadow-2xl max-h-[85vh] overflow-hidden border-0">
        {/* Header */}
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center text-[var(--ink-black)]">
              전체 신청 현황
            </DialogTitle>
            <DialogDescription className="text-[var(--granite)] text-center mt-2">
              {isLoading ? (
                <span className="skeleton inline-block w-24 h-4" />
              ) : (
                <>
                  <span className="text-[var(--ink-black)] font-semibold">
                    {completedCount}
                  </span>
                  /{applications.length}명 신청 완료
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Progress bar */}
          {!isLoading && applications.length > 0 && (
            <div className="mt-4 h-2 bg-[var(--whisper-cream)] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${(completedCount / applications.length) * 100}%`,
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-[var(--ink-black)] rounded-full"
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[50vh] p-4">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-16 rounded-2xl" />
                ))}
              </motion.div>
            ) : isError ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <span className="text-4xl mb-3">😢</span>
                <p className="text-[var(--granite)]">오류가 발생했습니다</p>
              </motion.div>
            ) : applications.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <span className="text-4xl mb-3">☕</span>
                <p className="text-[var(--granite)]">아직 신청 내역이 없습니다</p>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {drinkGroups.map(([drink, users], groupIndex) => {
                  const info = getDrinkInfo(drink);
                  return (
                    <motion.div
                      key={drink}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: groupIndex * 0.05 }}
                    >
                      {/* Group Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`w-8 h-8 bg-gradient-to-br ${info.gradient} rounded-lg flex items-center justify-center`}
                        >
                          <span className="text-lg">{info.icon}</span>
                        </div>
                        <span className="text-sm font-semibold text-[var(--ink-black)]">
                          {drink}
                        </span>
                        <span className="text-xs text-[var(--slate-gray)] font-medium bg-[var(--whisper-cream)] px-2 py-0.5 rounded-full">
                          {users.length}명
                        </span>
                      </div>

                      {/* Users */}
                      <div className="ml-10 flex flex-wrap gap-2">
                        {users.map((user, userIndex) => (
                          <motion.div
                            key={userIndex}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              delay: groupIndex * 0.05 + userIndex * 0.02,
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--soft-bone)] hover:bg-[var(--whisper-cream)] rounded-full border border-[rgba(14,15,12,0.08)] transition-colors"
                          >
                            <span className="text-sm font-medium text-[var(--granite)]">
                              {user.name}
                            </span>
                            {user.memo && (
                              <span className="text-xs text-[var(--slate-gray)]">
                                ({user.memo})
                              </span>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-[rgba(14,15,12,0.06)]">
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full h-12 text-[var(--granite)] hover:text-[var(--ink-black)] hover:bg-[var(--soft-bone)] font-medium rounded-xl"
          >
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
