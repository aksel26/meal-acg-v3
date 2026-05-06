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
import { AlertCircle, ClipboardList } from "@repo/ui/icons";

interface AllHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId?: string;
}

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
    ([drinkA, usersA], [drinkB, usersB]) => {
      if (drinkA === "미선택") return 1;
      if (drinkB === "미선택") return -1;
      return usersB.length - usersA.length;
    },
  );

  // 완료된 신청 수
  const completedCount = applications.filter(
    (app) => app.drink && app.drink !== "선택안함",
  ).length;
  const completionRate =
    applications.length > 0 ? (completedCount / applications.length) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="mx-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-[24px] border-0 bg-white p-0 shadow-2xl">
        <div className="px-5 pb-4 pt-5">
          <DialogHeader>
            <DialogTitle className="text-left text-lg font-bold text-[var(--ink-black)]">
              전체 신청 현황
            </DialogTitle>
            <DialogDescription className="mt-2 text-left text-sm text-[var(--slate-gray)]">
              {isLoading ? (
                <span className="skeleton inline-block h-4 w-28" />
              ) : (
                <>
                  <span className="font-semibold text-[var(--ink-black)]">
                    {completedCount}
                  </span>
                  /{applications.length}명 신청 완료
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {!isLoading && applications.length > 0 && (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--whisper-cream)]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-[var(--ink-black)]"
              />
            </div>
          )}
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-4 py-4">
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
                className="flex flex-col items-center justify-center rounded-[20px] bg-[rgba(244,241,232,0.58)] px-4 py-12 text-center"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--danger)]">
                  <AlertCircle className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-[var(--granite)]">
                  신청 현황을 불러오지 못했습니다
                </p>
              </motion.div>
            ) : applications.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center rounded-[20px] bg-[rgba(244,241,232,0.58)] px-4 py-12 text-center"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--slate-gray)]">
                  <ClipboardList className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-[var(--granite)]">
                  아직 신청 내역이 없습니다
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                {drinkGroups.map(([drink, users], groupIndex) => {
                  return (
                    <motion.div
                      key={drink}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: groupIndex * 0.05 }}
                      className="rounded-[20px] bg-[rgba(244,241,232,0.42)] p-3"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-sm font-semibold text-[var(--ink-black)]">
                          {drink}
                        </span>
                        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[var(--slate-gray)]">
                          {users.length}명
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {users.map((user, userIndex) => (
                          <motion.div
                            key={userIndex}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              delay: groupIndex * 0.05 + userIndex * 0.02,
                            }}
                            className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white px-3 py-1.5 transition-colors hover:bg-[var(--whisper-cream)]"
                          >
                            <span className="truncate text-sm font-medium text-[var(--granite)]">
                              {user.name}
                            </span>
                            {user.memo && (
                              <span className="truncate text-xs text-[var(--slate-gray)]">
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

        <DialogFooter className="p-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-12 w-full rounded-xl font-medium text-[var(--granite)] hover:bg-[var(--soft-bone)] hover:text-[var(--ink-black)]"
          >
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
