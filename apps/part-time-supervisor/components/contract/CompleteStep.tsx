"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";

export default function CompleteStep() {
  useEffect(() => {
    const timer = setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 55,
        origin: { y: 0.65 },
        colors: ["#059669", "#34d399", "#6ee7b7", "#a7f3d0", "#404040"],
        scalar: 0.8,
        gravity: 1.2,
        ticks: 120,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="py-8 text-center">
      <motion.div
        className="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-emerald-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
      >
        <motion.svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#059669"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <polyline points="20 6 9 17 4 12" />
        </motion.svg>
      </motion.div>

      <motion.h2
        className="mb-2 text-[22px] font-bold tracking-tight text-stone-900"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        표준근로계약서 작성이 완료되었습니다
      </motion.h2>

      <motion.div
        className="mt-3 space-y-3 text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <p className="text-[14px] leading-relaxed text-stone-600">
          관리자 검토 후 승인이 완료되면, <br/>근로자 보관용 계약서(1부)가 회원가입시
          <br/>등록하신 이메일 주소로 발송됩니다.
        </p>
        <p className="text-[14px] leading-relaxed text-stone-600">
          문의 사항이 있으신 경우에는 해당 근로 <br/>장소의 담당자에게 문의하시기
          바랍니다.
        </p>
        <p className="text-[14px] leading-relaxed text-stone-600">
          참여해 주셔서 감사합니다.
        </p>
      </motion.div>

      <motion.button
        className="mt-8 rounded-lg bg-stone-900 px-8 py-3 text-[14px] font-semibold text-white"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => window.close()}
      >
        닫기
      </motion.button>
    </div>
  );
}
