"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const PLEDGES = [
  {
    title: "개인정보 수집·이용 동의",
    content: `1. 수집 항목: 성명, 연락처, 서명 이미지
2. 수집 목적: 근로계약 체결 및 관리
3. 보유 기간: 근로관계 종료 후 3년
4. 동의 거부 시 계약 체결이 불가합니다.`,
    label: "위 개인정보 수집·이용에 동의합니다.",
  },
  {
    title: "근로계약 관련 동의사항",
    content: `1. 본인은 상기 근무조건을 확인하였으며, 이에 동의합니다.
2. 본인은 근무 중 안전수칙을 준수할 것을 약속합니다.
3. 본인은 업무상 알게 된 정보를 외부에 유출하지 않을 것을 약속합니다.
4. 본인은 정당한 사유 없이 무단으로 근무를 이탈하지 않을 것을 약속합니다.`,
    label: "위 근로계약 관련 사항에 동의합니다.",
  },
];

function PledgePage({
  pledge,
  pageIndex,
  total,
  workerName,
  onNext,
  onBack,
}: {
  pledge: (typeof PLEDGES)[number];
  pageIndex: number;
  total: number;
  workerName: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const [nameError, setNameError] = useState("");

  const canProceed = agreed && name.trim().length > 0 && !nameError;

  return (
    <div>
      <motion.div
        className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      </motion.div>

      <motion.h2
        className="mb-1 text-center text-[22px] font-bold tracking-tight text-stone-900"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {pledge.title}
      </motion.h2>
      <motion.p
        className="mb-6 text-center text-[13px] text-stone-400"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        서약서 {pageIndex + 1}/{total}
      </motion.p>

      <motion.div
        className="mb-5 rounded-2xl border border-stone-200 bg-stone-50/60 p-5 text-[13px] leading-[1.8] whitespace-pre-wrap text-stone-500"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {pledge.content}
      </motion.div>

      <motion.label
        className={`mb-5 flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 transition-all duration-200 ${
          agreed
            ? "border-stone-800 bg-stone-900/[0.03]"
            : "border-stone-200 hover:border-stone-300 hover:bg-stone-50/80"
        }`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 ${
            agreed ? "border-stone-800 bg-stone-800" : "border-stone-300"
          }`}
        >
          {agreed && (
            <motion.svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <polyline points="20 6 9 17 4 12" />
            </motion.svg>
          )}
        </div>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="sr-only"
        />
        <span className={`text-sm font-medium transition-colors ${agreed ? "text-stone-800" : "text-stone-500"}`}>
          {pledge.label}
        </span>
      </motion.label>

      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <label className="mb-1.5 block text-[13px] font-semibold text-stone-600">서명인 이름</label>
        <div
          className={`overflow-hidden rounded-xl border-2 transition-colors duration-200 ${
            nameFocused ? "border-stone-400 bg-white" : "border-stone-200 bg-stone-50/80"
          }`}
        >
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError("");
            }}
            onFocus={() => setNameFocused(true)}
            onBlur={() => {
              setNameFocused(false);
              if (name.trim() && name.trim() !== workerName.trim()) {
                setNameError("본인 확인된 이름과 일치하지 않습니다.");
              }
            }}
            className="w-full bg-transparent px-4 py-3.5 text-sm text-stone-800 outline-none placeholder:text-stone-300"
            placeholder="이름을 입력하세요"
          />
        </div>
        {nameError && (
          <p className="mt-1.5 text-[12px] text-red-500">{nameError}</p>
        )}
      </motion.div>

      <div className="flex gap-2">
        <motion.button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl border-2 border-stone-200 py-3.5 text-sm font-semibold text-stone-500"
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          이전
        </motion.button>
        <motion.button
          onClick={() => {
            if (name.trim() !== workerName.trim()) {
              setNameError("본인 확인된 이름과 일치하지 않습니다.");
              return;
            }
            onNext();
          }}
          disabled={!canProceed}
          className="flex-[2] rounded-xl bg-stone-900 py-3.5 text-sm font-semibold text-white"
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: canProceed ? 1 : 0.4 }}
          transition={{ delay: 0.35 }}
        >
          다음
        </motion.button>
      </div>
    </div>
  );
}

export default function TermsStep({
  onAgree,
  onBack,
  workerName,
}: {
  onAgree: () => void;
  onBack: () => void;
  workerName: string;
}) {
  const [page, setPage] = useState(0);

  const handleNext = () => {
    if (page < PLEDGES.length - 1) {
      setPage(page + 1);
    } else {
      onAgree();
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={page}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <PledgePage
          pledge={PLEDGES[page]!}
          pageIndex={page}
          total={PLEDGES.length}
          workerName={workerName}
          onNext={handleNext}
          onBack={page === 0 ? onBack : () => setPage(page - 1)}
        />
      </motion.div>
    </AnimatePresence>
  );
}
