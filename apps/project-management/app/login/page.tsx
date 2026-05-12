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
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <section className="w-full max-w-sm">
        <div className="mb-10">
          <Image
            src="/images/ACG_LOGO_GRAY.png"
            alt="ACG"
            width={72}
            height={28}
            className="h-auto w-auto"
            priority
          />
          <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
            Project Management
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[#111111]">
            프로젝트관리 로그인
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            계정 정보를 입력하면 바로 접속됩니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="loginId"
              className="block text-sm font-medium text-slate-700"
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
              className="w-full border-b border-slate-200 bg-transparent py-2.5 text-sm text-[#111111] placeholder:text-slate-400 outline-none transition-colors focus:border-[#111111] disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700"
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
                className="w-full border-b border-slate-200 bg-transparent py-2.5 pr-8 text-sm text-[#111111] placeholder:text-slate-400 outline-none transition-colors focus:border-[#111111] disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                disabled={isLoading}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#111111] disabled:opacity-50"
                aria-label={
                  showPassword ? "비밀번호 숨기기" : "비밀번호 보기"
                }
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 flex h-11 w-full items-center justify-center rounded-md bg-[#111111] px-4 text-sm font-medium text-white transition-colors hover:bg-[#222222] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                로그인 중
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
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <section className="w-full max-w-sm">
        <div className="h-7 w-20 bg-slate-100" />
        <div className="mt-6 h-3 w-32 bg-slate-100" />
        <div className="mt-3 h-7 w-48 bg-slate-100" />
        <div className="mt-10 space-y-6">
          <div className="h-10 bg-slate-100" />
          <div className="h-10 bg-slate-100" />
          <div className="h-11 bg-[#111111]" />
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
