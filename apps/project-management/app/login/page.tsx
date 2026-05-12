"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "@repo/ui/src/sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "로그인에 실패했습니다.");
        return;
      }

      toast.success(`${data.user.fullName}님, 환영합니다.`);
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
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-6">
      <section className="w-full max-w-md rounded-lg border border-[#dde3ea] bg-white p-8">
        <div className="mb-8 text-center">
          <Image
            src="/images/ACG_LOGO_GRAY.png"
            alt="ACG"
            width={80}
            height={32}
            className="mx-auto h-auto w-auto"
            priority
          />
          <p className="mt-5 text-xs font-medium uppercase tracking-[0.18em] text-[#667085]">
            Project Management
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-[#172033]">
            프로젝트관리 로그인
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#667085]">
            계정 정보를 입력하면 현재 페이지에서 바로 접속됩니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="loginId"
              className="block text-sm font-medium text-[#344054]"
            >
              아이디
            </label>
            <input
              id="loginId"
              type="text"
              placeholder="아이디를 입력하세요"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              required
              disabled={isLoading}
              autoComplete="username"
              className="w-full rounded-md border border-[#cfd8e3] px-3 py-2.5 text-sm text-[#172033] placeholder:text-[#98a2b3] outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15 disabled:bg-[#f2f4f7] disabled:opacity-70"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#344054]"
            >
              비밀번호
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
                className="w-full rounded-md border border-[#cfd8e3] px-3 py-2.5 pr-10 text-sm text-[#172033] placeholder:text-[#98a2b3] outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15 disabled:bg-[#f2f4f7] disabled:opacity-70"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                disabled={isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] transition hover:text-[#172033] disabled:opacity-50"
                aria-label={
                  showPassword ? "비밀번호 숨기기" : "비밀번호 보기"
                }
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex h-10 w-full items-center justify-center rounded-md bg-[#2563eb] px-4 text-sm font-medium text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                로그인 중...
              </span>
            ) : (
              "로그인"
            )}
          </button>
        </form>
      </section>
    </main>
  );
}

function LoginFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-6">
      <section className="w-full max-w-md rounded-lg border border-[#dde3ea] bg-white p-8">
        <div className="h-6 w-36 animate-pulse rounded bg-[#eef2f6]" />
        <div className="mt-5 h-8 w-56 animate-pulse rounded bg-[#eef2f6]" />
        <div className="mt-8 space-y-4">
          <div className="h-10 animate-pulse rounded bg-[#eef2f6]" />
          <div className="h-10 animate-pulse rounded bg-[#eef2f6]" />
          <div className="h-10 animate-pulse rounded bg-[#d7e3ff]" />
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
