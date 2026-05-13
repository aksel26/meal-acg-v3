"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@repo/ui/src/sonner";
import Image from "next/image";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ loginId, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "로그인에 실패했습니다.");
        return;
      }

      toast.success(`${data.user.fullName}님, 환영합니다!`);
      router.push(redirect);
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);
      toast.error("로그인 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="w-full rounded-[18px] border border-black/8 bg-white p-10"
    >
      <div className="mb-8 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex justify-center mb-6"
        >
          <Image
            src="/acg_ci_gray.png"
            alt="ACG Logo"
            width={100}
            height={40}
            quality={100}
          />
        </motion.div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          로그인
        </h2>
        <p className="mt-2 text-sm text-slate-500 font-medium">
          관리자 계정으로 접속해주세요
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Login ID Field */}
        <div className="space-y-2">
          <label
            htmlFor="loginId"
            className="block text-sm font-semibold text-slate-700 ml-1"
          >
            아이디
          </label>
          <motion.div whileFocus={{ scale: 1.01 }} className="relative">
            <input
              id="loginId"
              type="text"
              placeholder="아이디를 입력하세요"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
              disabled={isLoading}
              className="w-full rounded-full border border-black/8 bg-white px-5 py-3.5 text-[#1d1d1f] placeholder:text-[#7a7a7a] transition-all focus:border-[#1d1d1f] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </motion.div>
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-slate-700 ml-1"
          >
            비밀번호
          </label>
          <motion.div whileFocus={{ scale: 1.01 }} className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="w-full rounded-full border border-black/8 bg-white px-5 py-3.5 pr-12 text-[#1d1d1f] placeholder:text-[#7a7a7a] transition-all focus:border-[#1d1d1f] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={showPassword ? "hide" : "show"}
                  initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                  transition={{ duration: 0.15 }}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </motion.div>
              </AnimatePresence>
            </button>
          </motion.div>
        </div>

        {/* Submit Button */}
        <motion.button
          type="submit"
          disabled={isLoading}
          whileHover={{ y: -1 }}
          whileTap={{ y: 1 }}
          className="group relative w-full overflow-hidden rounded-full bg-[#1d1d1f] px-5 py-4 text-sm font-normal text-white transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                로그인 중...
              </>
            ) : (
              <>
                로그인
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </span>
        </motion.button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-xs text-slate-400">
          문제가 있으신가요?{" "}
          <a
            href="#"
            className="font-medium text-[#1d1d1f] underline-offset-2 transition-colors hover:underline"
          >
            관리자에게 문의하기
          </a>
        </p>
      </div>
    </motion.div>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="w-full rounded-[18px] border border-black/8 bg-white p-10">
      <div className="mb-8 text-center">
        <div className="mx-auto h-10 w-24 animate-pulse rounded bg-slate-100" />
        <div className="mx-auto mt-4 h-8 w-32 animate-pulse rounded bg-slate-100" />
        <div className="mx-auto mt-2 h-4 w-48 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-4 w-12 animate-pulse rounded bg-slate-100" />
          <div className="h-12 w-full animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
          <div className="h-12 w-full animate-pulse rounded-full bg-slate-100" />
        </div>
        <div className="h-12 w-full animate-pulse rounded-full bg-slate-100" />
      </div>
      <div className="mt-8 mx-auto h-4 w-32 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Login Container */}
      <div className="relative z-10 w-full max-w-[420px] px-4">
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-300 font-medium">
            © 2026 Meal Management System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
