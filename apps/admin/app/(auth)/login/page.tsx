"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
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
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full bg-white p-10 rounded-2xl shadow-xl border border-slate-100"
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
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 placeholder:text-slate-400 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-12 text-slate-900 placeholder:text-slate-400 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="group relative w-full overflow-hidden rounded-xl bg-indigo-600 px-4 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-600/40 disabled:opacity-70 disabled:cursor-not-allowed"
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
            className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline decoration-2 underline-offset-2 transition-colors"
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
    <div className="w-full bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
      <div className="mb-8 text-center">
        <div className="mx-auto h-10 w-24 animate-pulse rounded bg-slate-100" />
        <div className="mx-auto mt-4 h-8 w-32 animate-pulse rounded bg-slate-100" />
        <div className="mx-auto mt-2 h-4 w-48 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-4 w-12 animate-pulse rounded bg-slate-100" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-slate-100" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-slate-100" />
        </div>
        <div className="h-12 w-full animate-pulse rounded-xl bg-slate-100" />
      </div>
      <div className="mt-8 mx-auto h-4 w-32 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Animated Pastel Gradient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-100/40 blur-[100px] animate-pulse" />
        <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-purple-100/40 blur-[100px] animate-pulse delay-700" />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-pink-100/40 blur-[100px] animate-pulse delay-1000" />
      </div>

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
