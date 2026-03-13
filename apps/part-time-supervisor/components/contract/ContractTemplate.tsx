"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toPng } from "html-to-image";
import type { JobPosting } from "@/lib/supabase/types";
import SignaturePad from "./SignaturePad";

const payTypeLabel: Record<string, string> = { hourly: "시급", daily: "일급" };

function formatResidentId(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
}

export default function ContractTemplate({
  job,
  initialName,
  onSubmit,
}: {
  job: JobPosting;
  initialName: string;
  onSubmit: (data: { name: string; resident_id: string; signature_image: string; contract_image: string }) => Promise<void>;
}) {
  const contractRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(initialName);
  const [residentId, setResidentId] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [contractImage, setContractImage] = useState<string | null>(null);

  const isValid = name.trim() && residentId.replace(/\D/g, "").length === 13 && signatureData && downloaded && contractImage;

  const workPeriod = `${job.start_date} ~ ${job.end_date}`;
  const workTime =
    job.work_start && job.work_end
      ? `${job.work_start.slice(0, 5)} ~ ${job.work_end.slice(0, 5)}`
      : "-";
  const lunchTime =
    job.lunch_start && job.lunch_end
      ? `${job.lunch_start.slice(0, 5)} ~ ${job.lunch_end.slice(0, 5)}`
      : null;

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
      link.download = `표준근로계약서_${name.trim() || "계약서"}.png`;
      link.click();
      setContractImage(dataUrl);
      setDownloaded(true);
    } catch {
      setError("계약서 캡처에 실패했습니다.");
    } finally {
      setCapturing(false);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!isValid || !signatureData || !contractImage) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit({
        name: name.trim(),
        resident_id: residentId.replace(/\D/g, ""),
        signature_image: signatureData,
        contract_image: contractImage,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "제출에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }, [isValid, signatureData, contractImage, name, residentId, onSubmit]);

  return (
    <div>
      {/* 계약서 본문 (캡처 영역) */}
      <motion.div
        ref={contractRef}
        className="rounded-xl border bg-white p-5 text-[13px] leading-[1.9] text-stone-700"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="mb-5 text-center text-[17px] font-bold tracking-tight text-stone-900">
          표준근로계약서
        </h2>
        <p className="mb-1 text-center text-[11px] text-stone-400">(기간제 근무자용)</p>

        <div className="mt-4 space-y-0.5">
          <p>
            <span className="font-semibold text-stone-800">(이하 &quot;사업주&quot;라 함)</span>과(와){" "}
            근로자{" "}
            <span className="inline-flex items-baseline">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mx-0.5 w-24 border-b-2 border-stone-300 bg-transparent px-1 py-0.5 text-center text-[13px] font-semibold text-stone-900 outline-none transition-colors focus:border-stone-600"
                placeholder="이름"
              />
            </span>
            (이하 &quot;근로자&quot;라 함)은 다음과 같이 근로계약을 체결한다.
          </p>
        </div>

        <div className="mt-5 space-y-3 border-t border-stone-200 pt-4">
          <div className="flex">
            <span className="w-20 shrink-0 font-semibold text-stone-800">1. 근로기간</span>
            <span>{workPeriod}</span>
          </div>

          <div className="flex">
            <span className="w-20 shrink-0 font-semibold text-stone-800">2. 근무장소</span>
            <span>{job.location || "-"}</span>
          </div>

          <div className="flex">
            <span className="w-20 shrink-0 font-semibold text-stone-800">3. 업무내용</span>
            <span>{job.title}</span>
          </div>

          <div className="flex">
            <span className="w-20 shrink-0 font-semibold text-stone-800">4. 근무시간</span>
            <span>
              {workTime}
              {lunchTime && (
                <span className="ml-1 text-stone-400">(점심 {lunchTime})</span>
              )}
            </span>
          </div>

          <div className="flex">
            <span className="w-20 shrink-0 font-semibold text-stone-800">5. 급여</span>
            <span>
              {payTypeLabel[job.pay_type]} {job.pay_rate.toLocaleString()}원
            </span>
          </div>

          <div className="flex">
            <span className="w-20 shrink-0 font-semibold text-stone-800">6. 지급일</span>
            <span>근무 종료 후 익월 10일 이내</span>
          </div>
        </div>

        <div className="mt-5 space-y-1 border-t border-stone-200 pt-4 text-[12px] text-stone-500">
          <p>7. 근로자는 위 근무조건에 따라 성실히 업무를 수행한다.</p>
          <p>8. 사용자는 근로기준법 등 관련 법령을 준수하여 근로자를 보호한다.</p>
          <p>9. 본 계약에 명시되지 않은 사항은 근로기준법 및 관련 법령에 따른다.</p>
        </div>

        {/* 주민등록번호 & 서명란 (계약서 내부) */}
        <div className="mt-6 border-t border-stone-200 pt-4">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-[12px] font-semibold text-stone-600">주민등록번호</span>
            <input
              type="text"
              value={residentId}
              onChange={(e) => setResidentId(formatResidentId(e.target.value))}
              className="w-40 border-b-2 border-stone-300 bg-transparent px-1 py-0.5 text-center text-[13px] tracking-wider text-stone-900 outline-none transition-colors focus:border-stone-600"
              placeholder="000000-0000000"
              inputMode="numeric"
            />
          </div>

          <div className="flex items-end justify-between text-[12px] text-stone-500">
            <span>{new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</span>
            <span className="font-semibold text-stone-600">근로자 (서명)</span>
          </div>

          <AnimatePresence>
            {signatureData && (
              <motion.div
                className="mt-2 flex justify-end"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                <img src={signatureData} alt="서명" className="h-16" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* 서명 패드 (캡처 영역 밖) */}
      <motion.div
        className="mt-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
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

      {/* 서명 후 액션 */}
      <AnimatePresence>
        {signatureData && (
          <motion.div
            className="mt-4 space-y-3"
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

      {/* 에러 */}
      <AnimatePresence>
        {error && (
          <motion.p
            className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-600"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* 제출 버튼 */}
      <motion.button
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        className="mt-5 w-full rounded-xl bg-stone-900 py-3.5 text-sm font-semibold text-white disabled:opacity-40"
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <motion.span
          animate={submitting ? { opacity: [1, 0.5, 1] } : { opacity: 1 }}
          transition={submitting ? { duration: 1.2, repeat: Infinity } : {}}
        >
          {submitting ? "제출 중..." : "계약서 제출"}
        </motion.span>
      </motion.button>
    </div>
  );
}
