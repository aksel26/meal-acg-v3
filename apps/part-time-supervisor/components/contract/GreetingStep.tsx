"use client";

import { useState } from "react";
import { motion } from "motion/react";

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

export default function GreetingStep({
  jobPostingId,
  onVerified,
  onBack,
}: {
  jobPostingId: string;
  onVerified: (data: { worker_id: string; assignment_id: string; worker_name: string }) => void;
  onBack: () => void;
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

      if (data.already_signed) {
        setError("이미 서명이 완료되었습니다.");
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
        본인 확인
      </motion.h1>
      <motion.p
        className="mb-8 text-[13px] leading-relaxed text-stone-400"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
      >
        등록된 정보와 일치하는지 확인합니다
      </motion.p>

      <motion.form
        onSubmit={handleSubmit}
        className="mx-auto max-w-sm space-y-5 text-left"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
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

        <div className="flex gap-2">
          <motion.button
            type="button"
            onClick={onBack}
            className="flex-1 rounded-xl border-2 border-stone-200 py-3.5 text-sm font-semibold text-stone-500"
            whileTap={{ scale: 0.98 }}
          >
            이전
          </motion.button>
          <motion.button
            type="submit"
            disabled={loading || !name || !phone}
            className="relative flex-[2] overflow-hidden rounded-xl bg-stone-900 py-3.5 text-sm font-semibold text-white disabled:opacity-40"
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.1 }}
          >
            <motion.span
              className="relative z-10"
              animate={loading ? { opacity: [1, 0.5, 1] } : { opacity: 1 }}
              transition={loading ? { duration: 1.2, repeat: Infinity } : {}}
            >
              {loading ? "확인 중..." : "본인 확인"}
            </motion.span>
          </motion.button>
        </div>
      </motion.form>
    </div>
  );
}
