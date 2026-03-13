"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@repo/ui/src/sonner";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "로그인에 실패했습니다.");
        return;
      }

      toast.success(`${data.user.fullName}님, 환영합니다!`);
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);
      toast.error("로그인 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="w-full max-w-[420px] px-4">
        <div className="w-full bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              감독관 관리
            </h2>
            <p className="mt-2 text-sm text-slate-500 font-medium">
              계정으로 로그인해주세요
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="loginId"
                className="block text-sm font-semibold text-slate-700 ml-1"
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
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 placeholder:text-slate-400 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-700 ml-1"
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
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 pr-12 text-slate-900 placeholder:text-slate-400 transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group w-full rounded-xl bg-indigo-600 px-4 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-600/40 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <span className="flex items-center justify-center gap-2">
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
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-300 font-medium">
            © 2026 ACG 감독관 관리 시스템
          </p>
        </div>
      </div>
    </div>
  );
}
