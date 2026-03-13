"use client";

import { use, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import type { JobPosting } from "@/lib/supabase/types";
import TermsStep from "@/components/contract/TermsStep";

type VerifiedData = {
  worker_id: string;
  assignment_id: string;
  worker_name: string;
};

type Step = "loading" | "error" | "welcome" | "verify" | "terms" | "checked_in";

function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.startsWith("02")) {
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function WelcomeScreen({ job, onStart }: { job: JobPosting; onStart: () => void }) {
  return (
    <div className="flex min-h-[calc(100dvh-80px)] flex-col items-center justify-center text-center">
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.15 }}
      >
        <Image
          src="/acg_ci_gray.png"
          alt="ACG"
          width={160}
          height={52}
          className="h-12 w-auto object-contain"
          priority
        />
      </motion.div>

      <motion.h1
        className="mb-1.5 text-[24px] font-bold leading-tight tracking-tight text-stone-900"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        방문을 환영합니다!
      </motion.h1>

      <motion.p
        className="mb-3 text-[15px] font-semibold text-stone-600"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38 }}
      >
        {job.title}
      </motion.p>

      <motion.p
        className="mb-10 max-w-[280px] text-[14px] leading-relaxed text-stone-400"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.46 }}
      >
        본인 확인 후 출석이 완료됩니다.
        <br />
        이름과 전화번호를 준비해 주세요.
      </motion.p>

      <motion.button
        onClick={onStart}
        className="w-full max-w-xs rounded-xl bg-stone-900 py-3.5 text-sm font-semibold text-white"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.54 }}
        whileTap={{ scale: 0.98 }}
      >
        시작하기
      </motion.button>
    </div>
  );
}

function VerifyStep({
  jobPostingId,
  jobTitle,
  onVerified,
}: {
  jobPostingId: string;
  jobTitle: string;
  onVerified: (data: VerifiedData) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/contract/${jobPostingId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim() || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "확인에 실패했습니다.");
        return;
      }

      onVerified({
        worker_id: data.worker_id,
        assignment_id: data.assignment_id,
        worker_name: data.worker_name,
      });
    } catch {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center">
      <motion.div
        className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </motion.div>

      <motion.h1
        className="mb-1.5 text-[22px] font-bold tracking-tight text-stone-900"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        출석 확인
      </motion.h1>
      <motion.p
        className="mb-2 text-[14px] font-semibold text-stone-600"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {jobTitle}
      </motion.p>
      <motion.p
        className="mb-8 text-[13px] leading-relaxed text-stone-400"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        이름과 전화번호로 본인 확인을 진행합니다
      </motion.p>

      <motion.form
        onSubmit={handleSubmit}
        className="mx-auto max-w-sm space-y-5 text-left"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-stone-600">이름</label>
          <div
            className={`overflow-hidden rounded-xl border-2 transition-colors duration-200 ${
              nameFocused ? "border-stone-400 bg-white" : "border-stone-200 bg-stone-50/80"
            }`}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              className="w-full bg-transparent px-4 py-3.5 text-sm text-stone-800 outline-none placeholder:text-stone-300"
              placeholder="홍길동"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-stone-600">휴대전화번호</label>
          <div
            className={`overflow-hidden rounded-xl border-2 transition-colors duration-200 ${
              phoneFocused ? "border-stone-400 bg-white" : "border-stone-200 bg-stone-50/80"
            }`}
          >
            <input
              value={phone}
              onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
              onFocus={() => setPhoneFocused(true)}
              onBlur={() => setPhoneFocused(false)}
              className="w-full bg-transparent px-4 py-3.5 text-sm text-stone-800 outline-none placeholder:text-stone-300"
              placeholder="010-0000-0000"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-semibold text-stone-600">이메일</label>
          <div
            className={`overflow-hidden rounded-xl border-2 transition-colors duration-200 ${
              emailFocused ? "border-stone-400 bg-white" : "border-stone-200 bg-stone-50/80"
            }`}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              className="w-full bg-transparent px-4 py-3.5 text-sm text-stone-800 outline-none placeholder:text-stone-300"
              placeholder="example@email.com"
            />
          </div>
        </div>

        {error && (
          <motion.div
            className="rounded-xl bg-red-50 px-4 py-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-[13px] text-red-600">{error}</p>
            {error.includes("등록되지 않은") && (
              <p className="mt-1 text-[12px] text-red-400">담당자에게 문의해 주세요.</p>
            )}
          </motion.div>
        )}

        <motion.button
          type="submit"
          disabled={loading || !name || !phone}
          className="relative w-full overflow-hidden rounded-xl bg-stone-900 py-3.5 text-sm font-semibold text-white disabled:opacity-40"
          whileTap={{ scale: 0.98 }}
        >
          <motion.span
            className="relative z-10"
            animate={loading ? { opacity: [1, 0.5, 1] } : { opacity: 1 }}
            transition={loading ? { duration: 1.2, repeat: Infinity } : {}}
          >
            {loading ? "확인 중..." : "본인 확인"}
          </motion.span>
        </motion.button>
      </motion.form>
    </div>
  );
}

function CheckedInStep({
  workerName,
}: {
  workerName: string;
}) {

  return (
    <div className="flex min-h-[calc(100dvh-80px)] flex-col items-center justify-center text-center">
      <motion.div
        className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 16 }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </motion.div>

      <motion.h1
        className="mb-2 text-[22px] font-bold tracking-tight text-stone-900"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        출석 완료!
      </motion.h1>
      <motion.p
        className="mb-1 text-[15px] font-semibold text-stone-600"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
      >
        {workerName}님, 출석이 확인되었습니다.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 w-full max-w-xs"
      >
        <motion.div
          className="rounded-xl bg-stone-50 px-5 py-4 text-left"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <p className="mb-2 text-[14px] font-semibold text-stone-700">
            출석이 완료되었습니다.
          </p>
          <p className="text-[13px] leading-relaxed text-stone-500">
            감독관의 안내에 따라 업무를 진행해 주세요.
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-stone-500">
            계약서 작성은 업무 종료 후 진행되오니,
            <br />
            업무 종료 후 대기해 주세요.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function AttendancePage({
  params,
}: {
  params: Promise<{ jobPostingId: string }>;
}) {
  const { jobPostingId } = use(params);
  const [step, setStep] = useState<Step>("loading");
  const [job, setJob] = useState<JobPosting | null>(null);
  const [verified, setVerified] = useState<VerifiedData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/contract/${jobPostingId}`);
        if (!res.ok) {
          setErrorMsg("공고를 찾을 수 없습니다.");
          setStep("error");
          return;
        }
        setJob(await res.json());
        setStep("welcome");
      } catch {
        setErrorMsg("서버 오류가 발생했습니다.");
        setStep("error");
      }
    };
    fetchJob();
  }, [jobPostingId]);

  const handleVerified = async (data: VerifiedData) => {
    setVerified(data);

    // 출석 상태 확인 — confirmed면 계약서 페이지로 리다이렉트
    try {
      const statusRes = await fetch(
        `/api/attendance/${jobPostingId}/status?assignment_id=${data.assignment_id}`
      );
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.attendance_status === "confirmed") {
          window.location.href = `/contract/${jobPostingId}?worker_id=${data.worker_id}&assignment_id=${data.assignment_id}`;
          return;
        }
      }
    } catch {
      // 상태 확인 실패 시 기본 플로우 진행
    }

    setStep("terms");
  };

  const handleTermsAgreed = async () => {
    if (!verified) return;

    // 체크인 API 호출
    try {
      await fetch(`/api/attendance/${jobPostingId}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: verified.assignment_id,
          worker_id: verified.worker_id,
        }),
      });

      setStep("checked_in");
    } catch {
      // 체크인 실패해도 일단 대기 화면으로
      setStep("checked_in");
    }
  };

  if (step === "loading") {
    return (
      <motion.div
        className="flex flex-col items-center justify-center py-24"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="h-8 w-8 rounded-full border-2 border-stone-200 border-t-stone-600"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
        <p className="mt-4 text-sm text-stone-400">불러오는 중...</p>
      </motion.div>
    );
  }

  if (step === "error" || !job) {
    return (
      <div className="flex min-h-[calc(100dvh-80px)] flex-col items-center justify-center text-center">
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 16 }}
        >
          <Image
            src="/acg_ci_gray.png"
            alt="ACG"
            width={160}
            height={52}
            className="h-7 w-auto object-contain"
            priority
          />
        </motion.div>
        <motion.h2
          className="mb-2 text-[20px] font-bold tracking-tight text-stone-900"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {errorMsg || "오류가 발생했습니다"}
        </motion.h2>
        <motion.p
          className="text-[14px] text-stone-400"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          관리자에게 문의 바랍니다.
        </motion.p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {step === "welcome" && (
          <WelcomeScreen job={job} onStart={() => setStep("verify")} />
        )}

        {step === "verify" && (
          <VerifyStep
            jobPostingId={jobPostingId}
            jobTitle={job.title}
            onVerified={handleVerified}
          />
        )}

        {step === "terms" && verified && (
          <TermsStep
            onAgree={handleTermsAgreed}
            onBack={() => setStep("verify")}
            workerName={verified.worker_name}
          />
        )}

        {step === "checked_in" && verified && (
          <CheckedInStep workerName={verified.worker_name} />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
