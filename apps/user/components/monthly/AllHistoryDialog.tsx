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
import {
  Coffee,
  IceCreamCone,
  Citrus,
  Snowflake,
  Flame,
  TriangleAlert,
} from "@repo/ui/icons";

interface AllHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId?: string;
}

const getDrinkInfo = (drink: string) => {
  if (drink === "선택안함")
    return { icon: Coffee, bg: "bg-slate-100", fg: "text-slate-500" };
  if (drink.includes("바닐라"))
    return { icon: IceCreamCone, bg: "bg-amber-50", fg: "text-amber-600" };
  if (drink.includes("자몽"))
    return { icon: Citrus, bg: "bg-rose-50", fg: "text-rose-500" };
  if (drink.includes("ICE"))
    return { icon: Snowflake, bg: "bg-blue-50", fg: "text-blue-500" };
  if (drink.includes("HOT"))
    return { icon: Flame, bg: "bg-orange-50", fg: "text-orange-500" };
  return { icon: Coffee, bg: "bg-slate-50", fg: "text-slate-500" };
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
            <DialogTitle className="text-xl font-bold text-center text-slate-900">
              전체 신청 현황
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-center mt-2">
              {isLoading ? (
                <span className="skeleton inline-block w-24 h-4" />
              ) : (
                <>
                  <span className="text-slate-900 font-semibold">
                    {completedCount}
                  </span>
                  /{applications.length}명 신청 완료
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Progress bar */}
          {!isLoading && applications.length > 0 && (
            <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${(completedCount / applications.length) * 100}%`,
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full bg-blue-500 rounded-full"
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
                <TriangleAlert className="h-10 w-10 mb-3 text-slate-300" />
                <p className="text-slate-500">오류가 발생했습니다</p>
              </motion.div>
            ) : applications.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <Coffee className="h-10 w-10 mb-3 text-slate-300" />
                <p className="text-slate-500">아직 신청 내역이 없습니다</p>
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
                  const DrinkIcon = info.icon;
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
                          className={`w-8 h-8 ${info.bg} rounded-lg flex items-center justify-center`}
                        >
                          <DrinkIcon className={`h-4 w-4 ${info.fg}`} />
                        </div>
                        <span className="text-sm font-semibold text-slate-800">
                          {drink}
                        </span>
                        <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-full border border-slate-200 transition-colors"
                          >
                            <span className="text-sm font-medium text-slate-700">
                              {user.name}
                            </span>
                            {user.memo && (
                              <span className="text-xs text-slate-400">
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
        <DialogFooter className="p-4 border-t border-slate-100">
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full h-12 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium rounded-xl"
          >
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
