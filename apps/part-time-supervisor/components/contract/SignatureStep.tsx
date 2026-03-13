"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toPng } from "html-to-image";
import type { JobPosting } from "@/lib/supabase/types";
import ContractPreview from "./ContractPreview";
import SignaturePad from "./SignaturePad";

export default function SignatureStep({
  job,
  workerName,
  jobPostingId,
  assignmentId,
  workerId,
  onComplete,
  onBack,
}: {
  job: JobPosting;
  workerName: string;
  jobPostingId: string;
  assignmentId: string;
  workerId: string;
  onComplete: () => void;
  onBack: () => void;
}) {
  const contractRef = useRef<HTMLDivElement>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");

  const handleDownload = async () => {
    if (!contractRef.current) return;
    setCapturing(true);
    try {
      const dataUrl = await toPng(contractRef.current, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `계약서_${workerName}.png`;
      link.click();
      setDownloaded(true);
    } catch {
      setError("계약서 캡처에 실패했습니다.");
    } finally {
      setCapturing(false);
    }
  };

  const handleSubmit = async () => {
    if (!signatureData) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/contract/${jobPostingId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: assignmentId,
          worker_id: workerId,
          terms_agreed: true,
          signature_image: signatureData,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "제출에 실패했습니다.");
        return;
      }

      onComplete();
    } catch {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <motion.div
        className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      </motion.div>

      <motion.h2
        className="mb-1.5 text-center text-[22px] font-bold tracking-tight text-stone-900"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        계약서 서명
      </motion.h2>
      <motion.p
        className="mb-6 text-center text-[13px] text-stone-400"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        계약 내용을 확인하고 서명해주세요
      </motion.p>

      <motion.div
        ref={contractRef}
        className="mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <ContractPreview job={job} workerName={workerName} />
        <AnimatePresence>
          {signatureData && (
            <motion.div
              className="mt-4 border-t border-stone-200 pt-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              <p className="mb-1 text-[11px] text-stone-400">
                서명일: {new Date().toLocaleDateString("ko-KR")}
              </p>
              <img src={signatureData} alt="서명" className="h-20" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        className="mb-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <p className="mb-2 text-[13px] font-semibold text-stone-600">서명란</p>
        <SignaturePad
          onSave={(dataUrl) => {
            setSignatureData(dataUrl);
            setLocked(true);
          }}
          onClear={() => {
            setSignatureData(null);
            setLocked(false);
            setDownloaded(false);
          }}
          locked={locked}
        />
      </motion.div>

      <AnimatePresence>
        {signatureData && (
          <motion.div
            className="mb-4 space-y-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center justify-center gap-1.5 text-[13px] text-emerald-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              서명이 확인되었습니다
            </div>

            <div className="flex gap-2">
              <motion.button
                type="button"
                onClick={() => {
                  setSignatureData(null);
                  setLocked(false);
                  setDownloaded(false);
                }}
                className="flex-1 rounded-xl border-2 border-stone-200 py-2.5 text-[13px] font-semibold text-stone-600 hover:bg-stone-50"
                whileTap={{ scale: 0.97 }}
              >
                다시 서명
              </motion.button>
              <motion.button
                type="button"
                onClick={handleDownload}
                disabled={capturing}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-blue-400/60 bg-blue-50/80 py-2.5 text-[13px] font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                whileTap={{ scale: 0.97 }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {capturing ? "캡처 중..." : "계약서 다운로드"}
              </motion.button>
            </div>

            {!downloaded && (
              <motion.p
                className="text-center text-[12px] text-amber-600"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                계약서를 다운로드한 후 제출할 수 있습니다
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.p
            className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-600"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

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
          onClick={handleSubmit}
          disabled={!signatureData || !downloaded || submitting}
          className="flex-[2] rounded-xl bg-stone-900 py-3.5 text-sm font-semibold text-white disabled:opacity-40"
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <motion.span
            animate={submitting ? { opacity: [1, 0.5, 1] } : { opacity: 1 }}
            transition={submitting ? { duration: 1.2, repeat: Infinity } : {}}
          >
            {submitting ? "제출 중..." : "계약서 제출"}
          </motion.span>
        </motion.button>
      </div>
    </div>
  );
}
