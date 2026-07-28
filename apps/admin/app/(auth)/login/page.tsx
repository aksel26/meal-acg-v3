"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { toast } from "sonner";

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
    <div className="w-full rounded-[10px] bg-white px-8 py-9 sm:px-10">
      <div className="mb-8 text-center">
        <div className="mb-6 flex justify-center">
          <Image
            src="/acg_ci_gray.png"
            alt="ACG"
            width={100}
            height={40}
            quality={100}
          />
        </div>
        <h1 className="text-[21px] font-semibold leading-tight tracking-[-0.02em] text-[#1d1d1f]">
          로그인
        </h1>
        <p className="mt-2 text-sm font-normal tracking-[-0.01em] text-[#7a7a7a]">
          관리자 계정으로 접속해주세요
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="loginId" className="text-[#333333]">
            아이디
          </Label>
          <Input
            id="loginId"
            type="text"
            autoComplete="username"
            placeholder="아이디를 입력하세요"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            required
            disabled={isLoading}
            className="h-[44px] rounded-[6px] px-3.5 text-sm text-[#1d1d1f] placeholder:text-[#8e8e93]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-[#333333]">
            비밀번호
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="h-[44px] rounded-[6px] px-3.5 pr-12 text-sm text-[#1d1d1f] placeholder:text-[#8e8e93]"
            />
            <button
              type="button"
              aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-0 top-1/2 flex size-[44px] -translate-y-1/2 items-center justify-center rounded-[6px] text-[#7a7a7a] transition-[color,scale] duration-150 ease-out hover:text-[#1d1d1f] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.96] motion-reduce:transform-none motion-reduce:transition-none"
            >
              {showPassword ? (
                <EyeOff
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="size-5"
                />
              ) : (
                <Eye aria-hidden="true" strokeWidth={1.5} className="size-5" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={isLoading}
          aria-busy={isLoading}
          className="h-[44px] w-full rounded-[6px] bg-[#1d1d1f] text-sm font-medium text-white transition-[background-color,box-shadow,scale] duration-150 ease-out hover:bg-black active:scale-[0.96] motion-reduce:transform-none motion-reduce:transition-none"
        >
          {isLoading ? (
            <>
              <Loader2
                aria-hidden="true"
                strokeWidth={2}
                className="size-4 animate-spin motion-reduce:animate-none"
              />
              로그인 중...
            </>
          ) : (
            <>
              로그인
              <ArrowRight
                aria-hidden="true"
                strokeWidth={2}
                className="size-4"
              />
            </>
          )}
        </Button>
      </form>

      <p className="mt-8 text-center text-xs text-[#7a7a7a]">
        접속에 문제가 있으면 시스템 관리자에게 문의해주세요.
      </p>
    </div>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="w-full rounded-[10px] bg-white px-8 py-9 sm:px-10">
      <div className="mb-8 text-center">
        <div className="mx-auto h-10 w-24 animate-pulse rounded-md bg-slate-100 motion-reduce:animate-none" />
        <div className="mx-auto mt-4 h-7 w-20 animate-pulse rounded-md bg-slate-100 motion-reduce:animate-none" />
        <div className="mx-auto mt-2 h-4 w-44 animate-pulse rounded-md bg-slate-100 motion-reduce:animate-none" />
      </div>
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="h-4 w-12 animate-pulse rounded-md bg-slate-100 motion-reduce:animate-none" />
          <div className="h-[44px] w-full animate-pulse rounded-[6px] bg-slate-100 motion-reduce:animate-none" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-16 animate-pulse rounded-md bg-slate-100 motion-reduce:animate-none" />
          <div className="h-[44px] w-full animate-pulse rounded-[6px] bg-slate-100 motion-reduce:animate-none" />
        </div>
        <div className="h-[44px] w-full animate-pulse rounded-[6px] bg-slate-100 motion-reduce:animate-none" />
      </div>
      <div className="mx-auto mt-8 h-4 w-48 animate-pulse rounded-md bg-slate-100 motion-reduce:animate-none" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[var(--admin-parchment)] px-4 py-8">
      <div className="relative z-10 w-full max-w-[420px]">
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>

        <p className="mt-8 text-center text-xs font-normal text-[#8e8e93]">
          © 2026 Meal Management System. All rights reserved.
        </p>
      </div>
    </main>
  );
}
