"use client";

import { use, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import type { JobPosting } from "@/lib/supabase/types";
import GreetingStep from "@/components/contract/GreetingStep";
import ContractTemplate from "@/components/contract/ContractTemplate";
import CompleteStep from "@/components/contract/CompleteStep";

type VerifiedData = {
  worker_id: string;
  assignment_id: string;
  worker_name: string;
};

type Step = "welcome" | "greeting" | "contract" | "complete";

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
        본인 확인 후 계약서에 서명하실 수 있습니다.
        <br />
        약 2~3분 정도 소요됩니다.
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

const stepVariants = {
  enter: { opacity: 0, y: 16 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

export default function ContractPage({ params }: { params: Promise<{ jobPostingId: string }> }) {
  const { jobPostingId } = use(params);
  const [step, setStep] = useState<Step>("welcome");
  const [job, setJob] = useState<JobPosting | null>(null);
  const [verified, setVerified] = useState<VerifiedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/contract/${jobPostingId}`);
        if (!res.ok) {
          setError("공고를 찾을 수 없습니다.");
          return;
        }
        setJob(await res.json());

        // 출석 플로우에서 넘어온 경우: greeting 스킵 → contract 바로 진입
        const url = new URL(window.location.href);
        const workerId = url.searchParams.get("worker_id");
        const assignmentId = url.searchParams.get("assignment_id");
        if (workerId && assignmentId) {
          const statusRes = await fetch(
            `/api/attendance/${jobPostingId}/status?assignment_id=${assignmentId}`
          );
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            setVerified({
              worker_id: workerId,
              assignment_id: assignmentId,
              worker_name: statusData.worker_name || "",
            });
            setStep("contract");
          }
        }
      } catch {
        setError("서버 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [jobPostingId]);

  const handleContractSubmit = async (data: {
    name: string;
    resident_id: string;
    signature_image: string;
    contract_image: string;
  }) => {
    if (!verified) return;
    const res = await fetch(`/api/contract/${jobPostingId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignment_id: verified.assignment_id,
        worker_id: verified.worker_id,
        signature_image: data.signature_image,
        resident_id: data.resident_id,
        contract_image: data.contract_image,
      }),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "제출에 실패했습니다.");
    }
    setStep("complete");
  };

  if (loading) {
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

  if (error || !job) {
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
          등록된 공고가 아닙니다
        </motion.h2>
        <motion.p
          className="mb-6 text-[14px] text-stone-400"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          관리자에게 문의 바랍니다.
        </motion.p>
        <motion.a
          href="tel:02-000-0000"
          className="inline-flex items-center gap-2 px-5 py-3 text-[14px] font-semibold text-stone-500"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          whileTap={{ scale: 0.97 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          02-000-0000
        </motion.a>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {step === "welcome" && (
        <motion.div
          key="welcome"
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <WelcomeScreen job={job} onStart={() => setStep("greeting")} />
        </motion.div>
      )}

      {step === "greeting" && (
        <motion.div
          key="greeting"
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <GreetingStep
            jobPostingId={jobPostingId}
            onVerified={(data) => {
              setVerified(data);
              setStep("contract");
            }}
            onBack={() => setStep("welcome")}
          />
        </motion.div>
      )}

      {step === "contract" && verified && (
        <motion.div
          key="contract"
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <ContractTemplate
            job={job}
            initialName={verified.worker_name}
            onSubmit={handleContractSubmit}
          />
        </motion.div>
      )}

      {step === "complete" && verified && (
        <motion.div
          key="complete"
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <CompleteStep />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
