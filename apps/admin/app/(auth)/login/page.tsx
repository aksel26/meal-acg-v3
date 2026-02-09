"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@repo/ui/src/sonner";
import Image from "next/image";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

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
    <div className="rounded-2xl border border-slate-800/50 bg-slate-800/50 p-8 shadow-2xl backdrop-blur-xl">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-white">로그인</h2>
        <p className="mt-1 text-sm text-slate-400">
          관리자 계정으로 로그인하세요
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Login ID Field */}
        <div className="space-y-2">
          <label
            htmlFor="loginId"
            className="block text-sm font-medium text-slate-300"
          >
            아이디
          </label>
          <input
            id="loginId"
            type="text"
            placeholder="아이디를 입력하세요"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            required
            disabled={isLoading}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-white placeholder:text-slate-500 transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
          />
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-slate-300"
          >
            비밀번호
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 pr-12 text-white placeholder:text-slate-500 transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:from-amber-400 hover:to-amber-500 hover:shadow-amber-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
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
        </button>
      </form>
    </div>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-800/50 bg-slate-800/50 p-8 shadow-2xl backdrop-blur-xl">
      <div className="mb-6 text-center">
        <div className="mx-auto h-6 w-20 animate-pulse rounded bg-slate-700" />
        <div className="mx-auto mt-2 h-4 w-40 animate-pulse rounded bg-slate-700" />
      </div>
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="h-4 w-12 animate-pulse rounded bg-slate-700" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-slate-700" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-16 animate-pulse rounded bg-slate-700" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-slate-700" />
        </div>
        <div className="h-12 w-full animate-pulse rounded-xl bg-slate-700" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900 px-4">
      {/* Background Pattern */}
      <div className="pointer-events-none absolute inset-0">
        {/* Gradient Orbs */}
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/10 blur-2xl" />

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-y-3">
            <Image
              src="/acg_ci_white.png"
              alt="ACG Logo"
              width={80}
              height={32}
              // className="h-8 w-8"
            />
          <h1 className="text-2xl font-bold tracking-tight text-white">
            
          </h1>
          <p className="text-md text-slate-400">식대 관리 Admin</p>
        </div>

        {/* Form with Suspense */}
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          문제가 있으신가요?{" "}
          <a href="#" className="text-amber-500 hover:text-amber-400">
            관리자에게 문의
          </a>
        </p>
      </div>
    </div>
  );
}
