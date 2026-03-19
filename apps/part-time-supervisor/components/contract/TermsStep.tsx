"use client";

import { Fragment, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const STEP_LABELS = ["본인 확인", "동의", "완료"];

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

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <motion.div
      className="mb-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.03 }}
    >
      <div className="flex items-center justify-around">
        {STEP_LABELS.map((label, i) => (
          <Fragment key={label}>
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-medium transition-colors duration-150 ${
                  i < current
                    ? "bg-stone-900 text-white"
                    : i === current
                      ? "border-2 border-stone-900 bg-white text-stone-900"
                      : "border border-stone-200 bg-white text-stone-300"
                }`}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                {i < current ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                ) : (
                  i + 1
                )}
              </motion.div>
              <span
                className={`whitespace-nowrap text-[11px] tracking-tight transition-colors duration-150 ${
                  i <= current ? "font-medium text-stone-600" : "font-normal text-stone-300"
                }`}
              >
                {label}
              </span>
            </div>
            {i < total - 1 && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${i < current ? "text-stone-400" : "text-stone-200"}`}><polyline points="9 18 15 12 9 6" /></svg>
            )}
          </Fragment>
        ))}
      </div>
    </motion.div>
  );
}

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
      <StepIndicator current={1} total={3} />

      <div className="mb-6 text-center">
        <motion.h2
          className="mb-2 text-[22px] font-normal tracking-tight text-stone-500"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          {pledge.title}
        </motion.h2>
        <motion.div
          className="flex items-center justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08 }}
        >
          {Array.from({ length: total }, (_, i) => (
            <div
              key={i}
              className={`h-[2px] transition-all duration-150 ${
                i === pageIndex ? "w-5 bg-stone-800" : "w-2 bg-stone-200"
              }`}
            />
          ))}
        </motion.div>
      </div>

      {/* Content card */}
      <motion.div
        className="mb-5 border border-stone-200 bg-white"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="border-b border-stone-100 px-5 py-2.5">
          <p className="text-[11px] font-normal uppercase tracking-widest text-stone-400">
            서약서 {pageIndex + 1} / {total}
          </p>
        </div>
        <div className="p-5 text-[13px] leading-[1.9] whitespace-pre-wrap text-stone-600">
          {pledge.content}
        </div>
      </motion.div>

      {/* Checkbox */}
      <motion.label
        className={`mb-5 flex cursor-pointer items-center gap-3 border-2 p-4 transition-all duration-200 ${
          agreed
            ? "border-stone-900 bg-stone-900/[0.02]"
            : "border-stone-200 hover:border-stone-300"
        }`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        <div
          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center border-2 transition-all duration-150 ${
            agreed ? "border-stone-900 bg-stone-900" : "border-stone-400"
          }`}
        >
          {agreed && (
            <motion.svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 12 }}
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
        <span className={`text-sm font-normal transition-colors ${agreed ? "text-stone-700" : "text-stone-500"}`}>
          {pledge.label}
        </span>
      </motion.label>

      {/* Name input */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <label className="mb-2 block text-[11px] font-normal uppercase tracking-wider text-stone-400">
          서명인 이름
        </label>
        <div className="relative">
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
            className={`w-full border-b-2 bg-transparent pb-3 pt-1 text-[16px] text-stone-500 outline-none transition-colors placeholder:text-stone-300 ${
              nameError ? "border-red-400" : "border-stone-200 focus:border-stone-900"
            }`}
            placeholder="이름을 입력하세요"
          />
          <motion.div
            className="absolute bottom-0 left-0 h-[2px] bg-stone-900"
            initial={{ width: "0%" }}
            animate={{ width: nameFocused && !nameError ? "100%" : "0%" }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          />
        </div>
        {nameError && (
          <motion.div
            className="mt-2 border-l-2 border-red-500 pl-3"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <p className="text-[12px] text-red-500">{nameError}</p>
          </motion.div>
        )}
      </motion.div>

      {/* Buttons */}
      <div className="flex gap-3">
        <motion.button
          type="button"
          onClick={onBack}
          className="group flex flex-1 items-center justify-center gap-1.5 border-2 border-stone-300 py-3.5 text-[13px] font-normal uppercase tracking-wider text-stone-500 transition-all hover:border-stone-400 hover:text-stone-600"
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.18 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-150 group-hover:-translate-x-1"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
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
          className="group flex flex-[2] items-center justify-center gap-2 border-2 border-stone-900 bg-stone-900 py-3.5 text-[13px] font-normal uppercase tracking-wider text-white transition-all hover:bg-stone-800 disabled:border-stone-200 disabled:bg-stone-200 disabled:text-stone-300"
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.18 }}
        >
          {pageIndex === total - 1 ? "동의 완료" : "다음"}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-150 group-hover:translate-x-1 group-disabled:hidden"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
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
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
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
