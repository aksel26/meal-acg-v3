"use client";

import { Fragment, use, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import Image from "next/image";
import type { JobPosting } from "@/lib/supabase/types";
import TermsStep from "@/components/contract/TermsStep";

type VerifiedData = {
  worker_name: string;
};

type Step = "loading" | "error" | "welcome" | "verify" | "terms" | "checked_in" | "already_checked_in";

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

const STEP_LABELS = ["본인 확인", "동의", "완료"];

function StepIndicator({ current, total, completed = false }: { current: number; total: number; completed?: boolean }) {
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
                  i < current || (completed && i === current)
                    ? "bg-stone-900 text-white"
                    : i === current
                      ? "border-2 border-stone-900 bg-white text-stone-900"
                      : "border border-stone-200 bg-white text-stone-300"
                }`}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                {i < current || (completed && i === current) ? (
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${i < current || completed ? "text-stone-400" : "text-stone-200"}`}><polyline points="9 18 15 12 9 6" /></svg>
            )}
          </Fragment>
        ))}
      </div>
    </motion.div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div>
      <label className="mb-2 block text-[11px] font-normal uppercase tracking-wider text-stone-300">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full border-b-2 border-stone-200 bg-transparent pb-3 pt-1 text-[16px] text-stone-500 outline-none transition-colors placeholder:text-stone-300 focus:border-stone-900"
          placeholder={placeholder}
          required={required}
        />
        <motion.div
          className="absolute bottom-0 left-0 h-[2px] bg-stone-900"
          initial={{ width: "0%" }}
          animate={{ width: focused ? "100%" : "0%" }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function WelcomeScreen({ job, onStart }: { job: JobPosting; onStart: () => void }) {
  const [showAcgText, setShowAcgText] = useState(true);
  const [showLogo, setShowLogo] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const words = [
    { text: "Assessment", delay: 0.15 },
    { text: "Consulting", delay: 0.4 },
    { text: "Group", delay: 0.65 },
  ];

  useEffect(() => {
    const timers = [
      setTimeout(() => setShowLogo(true), 900),
      setTimeout(() => setShowAcgText(false), 1400),
      setTimeout(() => setShowContent(true), 1800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950 overflow-hidden">
      <div className="flex flex-col items-center text-center px-5 w-full max-w-lg">
        {/* Assessment · Consulting · Group */}
        <AnimatePresence>
          {showAcgText && (
            <motion.div
              key="acg-text"
              className="absolute flex items-center gap-3"
              style={{ top: "calc(50% - 60px)" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {words.map(({ text, delay }, i) => (
                <span key={text} className="flex items-center gap-3">
                  <motion.span
                    className="text-[13px] font-normal tracking-widest text-white"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay, duration: 0.3, ease: "easeOut" }}
                  >
                    {text}
                  </motion.span>
                  {i < words.length - 1 && (
                    <motion.span
                      className="text-[13px] text-stone-600"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: delay + 0.15, duration: 0.15 }}
                    >
                      ·
                    </motion.span>
                  )}
                </span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Logo */}
        <motion.div
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: showLogo ? 1 : 0 }}
          transition={{
            opacity: { duration: 0.3 },
            layout: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
          }}
        >
          <Image
            src="/acg_ci_gray.png"
            alt="ACG"
            width={160}
            height={52}
            className="h-10 w-auto object-contain brightness-0 invert"
            priority
          />
        </motion.div>

        {showContent && (
          <motion.div
            className="mt-8 flex flex-col items-center w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="mb-3 h-[1px] w-8 bg-stone-600"
              initial={{ width: 0 }}
              animate={{ width: 32 }}
              transition={{ delay: 0.03, duration: 0.2 }}
            />

            <motion.h1
              className="mb-4 text-[22px] font-normal leading-tight tracking-tight text-white"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {job.title}
            </motion.h1>

            <motion.p
              className="mb-12 max-w-[280px] text-[13px] leading-relaxed text-stone-300"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              이름, 전화번호, 이메일로 본인 확인 후
              <br />
              안내가 진행됩니다.
            </motion.p>

            <motion.button
              onClick={onStart}
              className="group flex w-full max-w-xs items-center justify-center gap-2 border-2 border-white bg-white py-4 text-[13px] font-normal uppercase tracking-widest text-stone-950 transition-all hover:bg-transparent hover:text-white"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileTap={{ scale: 0.97 }}
            >
              출석하기
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-150 group-hover:translate-x-1"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </motion.button>
          </motion.div>
        )}
      </div>
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
        worker_name: data.worker_name,
      });
    } catch {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <StepIndicator current={0} total={3} />

      <div className="mb-8 text-center">
        <motion.p
          className="mb-2 text-[13px] font-medium tracking-tight text-stone-700"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
        >
          {jobTitle}
        </motion.p>
        <motion.p
          className="text-[14px] leading-relaxed text-stone-500"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          출석을 위해 아래 정보를 입력해 주세요.
        </motion.p>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        className="mx-auto max-w-sm space-y-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        <InputField
          label="이름"
          value={name}
          onChange={setName}
          placeholder="홍길동"
          required
        />

        <InputField
          label="휴대전화번호"
          value={phone}
          onChange={(v) => setPhone(formatPhoneNumber(v))}
          placeholder="010-0000-0000"
          required
        />

        <InputField
          label="이메일"
          value={email}
          onChange={setEmail}
          placeholder="example@email.com"
          type="email"
        />

        {error && (
          <motion.div
            className="border-l-2 border-red-500 bg-red-50/60 px-4 py-3"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.12 }}
          >
            <p className="text-[13px] font-normal text-red-600">{error}</p>
            {error.includes("등록되지 않은") && (
              <p className="mt-0.5 text-[12px] text-red-400">담당자에게 문의해 주세요.</p>
            )}
          </motion.div>
        )}

        <div className="pt-2">
          <motion.button
            type="submit"
            disabled={loading || !name || !phone}
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden border-2 border-stone-900 bg-stone-900 py-4 text-[13px] font-normal uppercase tracking-widest text-white transition-all hover:bg-stone-800 disabled:border-stone-200 disabled:bg-stone-200 disabled:text-stone-300"
            whileTap={{ scale: 0.97 }}
          >
            {loading && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {loading ? "확인 중..." : "본인 확인"}
              {!loading && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-150 group-hover:translate-x-1"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              )}
            </span>
          </motion.button>
        </div>
      </motion.form>
    </div>
  );
}

function CheckedInStep({
  workerName,
}: {
  workerName: string;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.6 },
        colors: ["#059669", "#34d399", "#6ee7b7", "#a7f3d0", "#404040"],
        scalar: 0.7,
        gravity: 1.2,
        ticks: 100,
      });
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-[calc(100dvh-80px)]">
      <StepIndicator current={2} total={3} completed />
      <div className="flex min-h-[calc(100dvh-80px-120px)] flex-col items-center justify-center text-center">

      {/* Success image */}
      <motion.div
        className="relative mx-auto mb-8"
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 14 }}
      >
        <Image
          src="/finish-removebg-preview.webp"
          alt="출석 완료"
          width={100}
          height={100}
          className="object-contain"
        />
      </motion.div>

      <motion.h1
        className="mb-2 text-[26px] font-normal tracking-tight text-stone-500"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        출석 완료
      </motion.h1>
      <motion.p
        className="mb-10 text-[15px] text-stone-500"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <span className="font-medium text-stone-600">{workerName}</span>님, 출석이 확인되었습니다.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-xs"
      >
        <div className="border border-stone-200 bg-white">
          <div className="border-b border-stone-200 px-5 py-3">
            <p className="text-[11px] font-normal uppercase tracking-widest text-stone-400">안내사항</p>
          </div>
          <div className="divide-y divide-stone-100">
            <div className="flex items-start gap-3 px-5 py-4">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-stone-100 text-stone-400">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </span>
              <p className="text-[13px] leading-relaxed text-stone-600">
                감독관의 안내에 따라 업무를 진행해 주세요.
              </p>
            </div>
            <div className="flex items-start gap-3 px-5 py-4">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-stone-100 text-stone-400">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </span>
              <p className="text-[13px] leading-relaxed text-stone-600">
                <span className="rounded bg-stone-900 px-1.5 py-0.5 font-light text-white">계약서 작성</span>은 업무 종료 후 진행됩니다.
                <br />
                <span className="rounded bg-stone-900 px-1.5 py-0.5 font-light text-white">업무 종료 후 대기</span>해 주세요.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
      </div>
      <motion.p
        className="-mt-4 pb-6 text-center text-[12px] text-stone-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        이 화면은 닫아도 됩니다.
      </motion.p>
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
      const statusRes = await fetch(`/api/attendance/${jobPostingId}/status`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.attendance_status === "confirmed") {
          window.location.href = `/contract/${jobPostingId}`;
          return;
        }
        if (statusData.attendance_status === "checked_in") {
          setStep("already_checked_in");
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
      const response = await fetch(`/api/attendance/${jobPostingId}/check-in`, {
        method: "POST",
      });
      if (!response.ok) {
        const result = await response.json();
        setErrorMsg(result.error || "출석 처리에 실패했습니다.");
        setStep("error");
        return;
      }
      setStep("checked_in");
    } catch {
      setErrorMsg("출석 처리 중 서버 오류가 발생했습니다.");
      setStep("error");
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
          className="h-6 w-6 border-2 border-stone-200 border-t-stone-600"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
        <p className="mt-4 text-[12px] uppercase tracking-widest text-stone-300">불러오는 중</p>
      </motion.div>
    );
  }

  if (step === "error" || !job) {
    return (
      <div className="flex min-h-[calc(100dvh-80px)] flex-col items-center justify-center text-center">
        <motion.div
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
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
          className="mb-2 text-[20px] font-normal tracking-tight text-stone-500"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          {errorMsg || "오류가 발생했습니다"}
        </motion.h2>
        <motion.p
          className="text-[14px] text-stone-300"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
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
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {step === "welcome" && (
          <WelcomeScreen job={job} onStart={() => {
            document.getElementById("attendance-layout")?.classList.replace("bg-stone-950", "bg-white");
            setStep("verify");
          }} />
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

        {step === "already_checked_in" && (
          <div className="flex min-h-[calc(100dvh-80px)] flex-col items-center justify-center text-center">
            <motion.div
              className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 16 }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-stone-500"><polyline points="20 6 9 17 4 12" /></svg>
            </motion.div>
            <motion.h1
              className="mb-2 text-[22px] font-normal tracking-tight text-stone-600"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              이미 출석이 완료되었습니다.
            </motion.h1>
            <motion.p
              className="text-[15px] text-stone-400"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              감독관의 안내에 따라 대기해 주세요.
            </motion.p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
