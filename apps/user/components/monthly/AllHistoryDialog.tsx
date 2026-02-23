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
}

const getDrinkInfo = (drink: string) => {
  if (drink === "선택안함")
    return { icon: "☕", gradient: "from-slate-100 to-slate-200" };
  if (drink.includes("바닐라"))
    return { icon: "🍦", gradient: "from-amber-50 to-orange-100" };
  if (drink.includes("자몽"))
    return { icon: "🍊", gradient: "from-rose-50 to-pink-100" };
  if (drink.includes("ICE"))
    return { icon: "🧊", gradient: "from-sky-50 to-blue-100" };
  if (drink.includes("HOT"))
    return { icon: "🔥", gradient: "from-orange-50 to-red-100" };
  return { icon: "☕", gradient: "from-gray-50 to-gray-100" };
};

export const AllHistoryDialog = ({ isOpen, onClose }: AllHistoryDialogProps) => {
  const { data, isLoading, isError } = useMonthlyData();
  // TanStack Query가 자동으로 캐시된 데이터를 공유하므로 별도 fetch 불필요

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
            <DialogTitle className="text-xl font-bold text-center text-gray-900">
              전체 신청 현황
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-center mt-2">
              {isLoading ? (
                <span className="skeleton inline-block w-24 h-4" />
              ) : (
                <>
                  <span className="text-gray-900 font-semibold">
                    {completedCount}
                  </span>
                  /{applications.length}명 신청 완료
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Progress bar */}
          {!isLoading && applications.length > 0 && (
            <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${(completedCount / applications.length) * 100}%`,
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-[oklch(0.55_0.18_250)] to-[oklch(0.48_0.20_270)] rounded-full"
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
                  <div
                    key={i}
                    className="skeleton h-16 rounded-2xl"
                  />
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
                <p className="text-gray-500">오류가 발생했습니다</p>
              </motion.div>
            ) : applications.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <span className="text-4xl mb-3">☕</span>
                <p className="text-gray-500">아직 신청 내역이 없습니다</p>
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
                        <span className="text-sm font-semibold text-gray-800">
                          {drink}
                        </span>
                        <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-full border border-gray-200 transition-colors"
                          >
                            <span className="text-sm font-medium text-gray-700">
                              {user.name}
                            </span>
                            {user.memo && (
                              <span className="text-xs text-gray-400">
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
        <DialogFooter className="p-4 border-t border-gray-100">
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full h-12 text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium rounded-xl"
          >
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
