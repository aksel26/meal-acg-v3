"use client";

import { motion } from "motion/react";
import type { JobPosting } from "@/lib/supabase/types";

const workTypeLabel: Record<string, string> = { online: "온라인", offline: "오프라인" };
const shiftTypeLabel: Record<string, string> = { day: "주간", night: "야간" };
const payTypeLabel: Record<string, string> = { hourly: "시급", daily: "일급" };

function InfoRow({ label, value, delay }: { label: string; value: string | null | undefined; delay: number }) {
  return (
    <motion.div
      className="flex items-start gap-3 border-b border-stone-100 py-3 last:border-0"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.25 }}
    >
      <span className="w-[72px] shrink-0 text-[12px] font-semibold tracking-tight text-stone-400">{label}</span>
      <span className="text-[13px] font-medium text-stone-700">{value || "-"}</span>
    </motion.div>
  );
}

export default function JobInfoStep({
  job,
  onNext,
  onBack,
}: {
  job: JobPosting;
  onNext: () => void;
  onBack: () => void;
}) {
  const rows = [
    { label: "형태", value: workTypeLabel[job.work_type] },
    { label: "시간대", value: shiftTypeLabel[job.shift_type] },
    { label: "장소", value: job.location },
    { label: "플랫폼", value: job.platform },
    { label: "기간", value: `${job.start_date} ~ ${job.end_date}` },
    {
      label: "근무시간",
      value: job.work_start && job.work_end ? `${job.work_start.slice(0, 5)} ~ ${job.work_end.slice(0, 5)}` : null,
    },
    { label: "급여", value: `${payTypeLabel[job.pay_type]} ${job.pay_rate.toLocaleString()}원` },
    { label: "모집인원", value: `${job.headcount}명` },
    ...(job.description ? [{ label: "내용", value: job.description }] : []),
  ];

  return (
    <div>
      <motion.div
        className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      </motion.div>

      <motion.h2
        className="mb-1.5 text-center text-[22px] font-bold tracking-tight text-stone-900"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        공고 정보
      </motion.h2>
      <motion.p
        className="mb-6 text-center text-[13px] text-stone-400"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        참석하신 공고 정보를 확인해주세요
      </motion.p>

      <motion.div
        className="mb-6 rounded-2xl border border-stone-200 bg-white p-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        <motion.h3
          className="mb-3 text-[15px] font-bold text-stone-900"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.22 }}
        >
          {job.title}
        </motion.h3>
        <div className="border-t border-stone-100 pt-1">
          {rows.map((row, i) => (
            <InfoRow key={row.label} label={row.label} value={row.value} delay={0.22 + i * 0.04} />
          ))}
        </div>
      </motion.div>

      <div className="flex gap-2">
        <motion.button
          onClick={onBack}
          className="flex-1 rounded-xl border-2 border-stone-200 py-3.5 text-sm font-semibold text-stone-500"
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          이전
        </motion.button>
        <motion.button
          onClick={onNext}
          className="flex-[2] rounded-xl bg-stone-900 py-3.5 text-sm font-semibold text-white"
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          다음
        </motion.button>
      </div>
    </div>
  );
}
