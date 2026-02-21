"use client";

import ScratchToReveal from "@/components/lunch/ScratchToReveal";
import { useLunchGroupAssign } from "@/hooks/useLunchGroupAssign";
import { useLunchGroup } from "@/hooks/useLunchGroup";
import { motion } from "motion/react";
import React, { useCallback, useMemo, useState } from "react";

type Phase = "scratch" | "assigning" | "revealed" | "error";

const ScratchLottery: React.FC = () => {
  const [phase, setPhase] = useState<Phase>("scratch");
  const [result, setResult] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const assignMutation = useLunchGroupAssign();
  const { data: lunchGroupData } = useLunchGroup();

  const groupMembers = useMemo(() => {
    if (result === null || !lunchGroupData?.groups) return [];
    const group = lunchGroupData.groups.find(
      (g) => g.groupNumber === String(result),
    );
    return group?.person?.filter((p) => p && p.trim()) || [];
  }, [result, lunchGroupData?.groups]);

  // 스크래치 완료 시 API 배정
  const handleScratchComplete = useCallback(async () => {
    setPhase("assigning");
    const userName = localStorage.getItem("name") || "익명";

    try {
      const response = await assignMutation.mutateAsync({ userName });
      setResult(response.data.groupNumber);
      setPhase("revealed");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "배정에 실패했습니다.";
      setErrorMessage(message);
      setPhase("error");
    }
  }, [assignMutation]);

  const handleRetry = useCallback(() => {
    setPhase("scratch");
    setResult(null);
    setErrorMessage(null);
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      {/* scratch */}
      {phase === "scratch" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-4"
        >
          <p className="text-sm text-gray-500 font-medium">
            카드를 긁어서 점심조를 뽑아보세요!
          </p>
          <ScratchToReveal
            width={300}
            height={200}
            minScratchPercentage={15}
            onComplete={handleScratchComplete}
            gradientColors={["#A97CF8", "#F38CB8", "#FDCC92"]}
          >
            <div className="flex flex-col items-center justify-center gap-2">
              <span className="text-6xl font-black text-purple-200">?</span>
              <span className="text-sm font-medium text-gray-300">
                긁어서 확인하기
              </span>
            </div>
          </ScratchToReveal>
        </motion.div>
      )}

      {/* assigning */}
      {phase === "assigning" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-[300px] h-[200px] bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 rounded-2xl flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
              <p className="text-sm text-purple-400 font-medium">
                배정 중...
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* revealed */}
      {phase === "revealed" && result !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-[300px] h-[200px] bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 rounded-2xl flex flex-col items-center justify-center gap-2">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 8, delay: 0.1 }}
              className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400"
            >
              {result}조
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-sm font-medium text-gray-500"
            >
              배정되었습니다!
            </motion.span>
          </div>

          {/* 조원 목록 */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-[300px]"
          >
            <div className="bg-gradient-to-br from-purple-50/50 via-pink-50/50 to-orange-50/50 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">
                {result}조 멤버
              </p>
              {groupMembers.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {groupMembers.map((member, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium"
                    >
                      <span className="w-4 h-4 rounded-full bg-purple-200 flex items-center justify-center text-[10px] font-bold text-purple-600">
                        {member.charAt(0)}
                      </span>
                      {member}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  멤버 정보를 불러오는 중...
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* error */}
      {phase === "error" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-[300px] h-[200px] bg-red-50 rounded-2xl flex flex-col items-center justify-center gap-3">
            <svg
              className="w-10 h-10 text-red-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <p className="text-sm text-red-500 font-medium text-center px-4">
              {errorMessage}
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="w-[300px] py-3 rounded-2xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            다시 시도
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default ScratchLottery;
