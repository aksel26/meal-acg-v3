"use client";

import { useLunchGroupAssign } from "@/hooks/useLunchGroupAssign";
import { useLunchGroup } from "@/hooks/useLunchGroup";
import { motion } from "motion/react";
import Image from "next/image";
import React, { useCallback, useMemo, useState } from "react";

type Phase = "idle" | "shaking" | "revealed" | "error";

const SHAKE_MS = 1000;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ScratchLottery: React.FC = () => {
  const [phase, setPhase] = useState<Phase>("idle");
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

  const handleDraw = useCallback(async () => {
    if (phase !== "idle") return;

    setPhase("shaking");
    setResult(null);
    setErrorMessage(null);
    const userName = localStorage.getItem("name") || "익명";

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([80, 60, 80, 60, 120, 80, 200]);
    }

    try {
      const [response] = await Promise.all([
        assignMutation.mutateAsync({ userName }),
        delay(SHAKE_MS),
      ]);

      setResult(response.data.groupNumber);
      setPhase("revealed");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "배정에 실패했습니다.";
      setErrorMessage(message);
      setPhase("error");
    }
  }, [assignMutation, phase]);

  const handleRetry = useCallback(() => {
    setPhase("idle");
    setResult(null);
    setErrorMessage(null);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 py-1">
      <style>{`
        @keyframes lunch-tremor {
          0%, 100% { transform: translate(0,0) rotate(0); }
          10% { transform: translate(-2px, 1px) rotate(-2deg); }
          20% { transform: translate(3px,-2px) rotate(2deg) scale(1.02); }
          30% { transform: translate(-3px,2px) rotate(-3deg); }
          40% { transform: translate(4px,-1px) rotate(3deg) scale(1.04); }
          50% { transform: translate(-5px,3px) rotate(-4deg) scale(1.03); }
          60% { transform: translate(5px,-3px) rotate(4deg) scale(1.05); }
          70% { transform: translate(-6px,2px) rotate(-5deg) scale(1.04); }
          80% { transform: translate(6px,-4px) rotate(5deg) scale(1.07); }
          90% { transform: translate(-4px,3px) rotate(-3deg) scale(1.05); }
        }
        @keyframes lunch-poof {
          0% { transform: scale(1.05); opacity: 1; filter: blur(0); }
          40% { transform: scale(1.45); opacity: 0.75; filter: blur(2px); }
          100% { transform: scale(2.05); opacity: 0; filter: blur(8px); }
        }
        @keyframes lunch-burst {
          0% { transform: scale(0.2) rotate(-12deg); opacity: 0; }
          40% { transform: scale(1.25) rotate(4deg); opacity: 1; }
          60% { transform: scale(0.96) rotate(-2deg); }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        @keyframes lunch-ring {
          0% { transform: translate(-50%,-50%) scale(0.2); opacity: 0.75; }
          100% { transform: translate(-50%,-50%) scale(2.8); opacity: 0; }
        }
        .lunch-tremor { animation: lunch-tremor 0.18s linear infinite; }
        .lunch-poof { animation: lunch-poof 0.45s ease-out forwards; }
        .lunch-burst { animation: lunch-burst 0.7s cubic-bezier(.2,1.2,.4,1) forwards; }
        .lunch-ring { animation: lunch-ring 0.7s ease-out forwards; }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col items-center gap-2"
      >
        <div className="relative flex h-40 w-56 items-center justify-center overflow-visible bg-transparent">
          {phase !== "revealed" && (
            <button
              type="button"
              onClick={handleDraw}
              disabled={phase !== "idle" || assignMutation.isPending}
              className={`relative flex h-28 w-28 items-center justify-center rounded-full bg-transparent transition-transform ${
                phase === "idle"
                  ? "cursor-pointer hover:scale-105 active:scale-95"
                  : "cursor-default"
              } ${phase === "shaking" ? "lunch-tremor" : ""}`}
              aria-label="점심조 뽑기"
            >
              <Image
                src="/images/meal-sticker.webp"
                alt=""
                width={112}
                height={112}
                className="h-full w-full object-contain drop-shadow-[0_12px_24px_rgba(236,126,0,0.24)]"
                draggable={false}
              />
            </button>
          )}

          {phase === "revealed" && (
            <>
              <Image
                src="/images/meal-sticker.webp"
                alt=""
                width={112}
                height={112}
                className="lunch-poof pointer-events-none absolute h-28 w-28 object-contain drop-shadow-[0_12px_24px_rgba(236,126,0,0.24)]"
                draggable={false}
              />
              <span className="lunch-ring pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 rounded-full border-4 border-[rgba(236,126,0,0.45)]" />
              <span className="lunch-burst absolute text-5xl font-black text-[var(--ink-black)] drop-shadow-[0_6px_0_rgba(236,126,0,0.16)]">
                {result}조
              </span>
            </>
          )}
        </div>

        <p
          className={`text-xs font-medium ${
            phase === "idle"
              ? "text-[var(--granite)]"
              : phase === "shaking"
                ? "animate-pulse text-[var(--signal-orange)]"
                : phase === "revealed"
                  ? "text-[var(--ink-black)]"
                  : "text-[#d03238]"
          }`}
        >
          {phase === "idle" && "스티커를 눌러 점심조를 뽑아보세요"}
          {phase === "shaking" && "흔드는 중..."}
          {phase === "revealed" && "배정되었습니다!"}
          {phase === "error" && errorMessage}
        </p>
      </motion.div>

      {/* revealed */}
      {phase === "revealed" && result !== null && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex w-full flex-col items-center gap-3"
        >
          {/* 조원 목록 */}
          <div className="w-full max-w-[300px]">
            <div className="rounded-xl bg-[rgba(244,241,232,0.58)] p-3">
              <p className="mb-2 text-xs font-semibold text-[var(--granite)]">
                {result}조 멤버
              </p>
              {groupMembers.length > 0 ? (
                <div className="flex max-h-16 flex-wrap gap-1.5 overflow-y-auto">
                  {groupMembers.map((member, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-[var(--granite)]"
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[rgba(236,126,0,0.12)] text-[10px] font-bold text-[#9a4f00]">
                        {member.charAt(0)}
                      </span>
                      {member}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--slate-gray)]">
                  멤버 정보를 불러오는 중...
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleRetry}
            className="w-full max-w-[300px] rounded-xl bg-[var(--whisper-cream)] py-2.5 text-sm font-medium text-[var(--granite)] transition-colors hover:bg-[var(--soft-bone)]"
          >
            다시 하기
          </button>
        </motion.div>
      )}

      {/* error */}
      {phase === "error" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex h-28 w-full max-w-[300px] flex-col items-center justify-center gap-3 rounded-2xl bg-[rgba(208,50,56,0.08)]">
            <svg
              className="w-10 h-10 text-[rgba(208,50,56,0.3)]"
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
            <p className="text-sm text-[#d03238] font-medium text-center px-4">
              {errorMessage}
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="w-full max-w-[300px] rounded-2xl bg-[var(--whisper-cream)] py-3 text-sm font-medium text-[var(--granite)] transition-colors hover:bg-[var(--soft-bone)]"
          >
            다시 시도
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default ScratchLottery;
