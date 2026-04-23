"use client";

import { Alert, AlertDescription } from "@repo/ui/src/alert";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import { useUserStore } from "@/stores/userStore";

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    id: "",
    password: "",
  });
  const router = useRouter();
  const login = useUserStore((state) => state.login);

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login_id: formData.id,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "로그인에 실패했습니다.");
      }

      if (data.data.full_name) {
        login(data.data.user_id, data.data.full_name, data.data.role);
        router.push("/dashboard");
      } else {
        throw new Error("사용자 이름을 받아올 수 없습니다.");
      }
    } catch (err) {
      console.error("로그인 오류:", err);
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <>
      <PWAInstallPrompt />
      <div className="fixed inset-0 gradient-mesh -z-20" />
      <div className="orbit-line fixed left-[-8rem] top-20 h-80 w-80 -z-10 opacity-70" />
      <div className="orbit-line fixed right-[-7rem] top-[22rem] h-72 w-72 -z-10 opacity-55" />
      <div className="orbit-dot fixed left-12 top-24 -z-10" />
      <div className="orbit-dot fixed right-10 top-[28rem] -z-10" />

      <div className="mx-auto flex min-h-dvh max-w-xl flex-col overflow-hidden px-4 py-4 md:max-w-5xl lg:max-w-6xl">
        <main className="flex flex-1 flex-col justify-center py-2">
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card-elevated overflow-hidden rounded-[24px] md:grid md:grid-cols-[0.95fr_1.05fr]"
          >
            <div className="order-2 flex items-center bg-[var(--lifted-cream)] px-5 py-5 md:order-1 lg:px-8 lg:py-8">
              <div className="w-full space-y-5">
                <div>
                  <h2 className="mt-2 text-[1.8rem] font-medium leading-[1] tracking-[-0.04em] text-[var(--ink-black)]">
                    맛점 하셨나요?
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-[var(--granite)]">
                    알뜰한 식사관리,
                    <br />
                    간편하게 시작하세요!
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-3.5">
                <div className="space-y-2">
                  <Label className="ml-1 text-xs font-medium text-[var(--granite)]" htmlFor="id">
                    아이디
                  </Label>
                  <Input
                    className="input-premium h-12 text-sm"
                    id="id"
                    name="id"
                    type="text"
                    value={formData.id}
                    onChange={handleInputChange}
                    placeholder="사용자명을 입력하세요"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="ml-1 text-xs font-medium text-[var(--granite)]" htmlFor="password">
                    비밀번호
                  </Label>
                  <Input
                    className="input-premium h-12 text-sm"
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="비밀번호를 입력하세요"
                    required
                  />
                </div>

                {error && (
                  <Alert variant="destructive" className="rounded-[16px] border-none bg-[rgba(207,69,0,0.08)] text-[var(--clay-brown)]">
                    <AlertDescription className="text-sm">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                  <Button
                    type="submit"
                    className="btn-primary h-12 w-full text-sm font-medium"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        로그인 중...
                      </span>
                    ) : (
                      "로그인"
                    )}
                  </Button>
                </form>
              </div>
            </div>

            <div className="order-1 flex min-h-full flex-col justify-between border-b border-[rgba(20,20,19,0.08)] bg-white px-5 py-5 md:order-2 md:border-b-0 md:border-t-0 md:border-l md:px-6 md:py-6 lg:px-8 lg:py-8">
              <div className="space-y-5">
                <div className="mx-auto w-1/2 min-w-[140px] max-w-[220px] overflow-hidden rounded-[20px] bg-[var(--soft-bone)]">
                  <div className="relative aspect-square w-full min-w-0">
                    <Image
                      src="/images/coffee-tea-2.png"
                      alt="Coffee Tea"
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="max-w-[22rem] text-sm leading-6 text-[var(--granite)]">
                    기록과 확인, 월간 흐름까지 한 화면에서 정리하세요
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[16px] bg-[var(--lifted-cream)] px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--slate-gray)]">
                    Manage
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--ink-black)]">
                    식비 내역을 쉽게
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--granite)]">
                    관리하고 분석해보세요
                  </p>
                </div>
                <div className="rounded-[16px] bg-[var(--lifted-cream)] px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--slate-gray)]">
                    Lunch
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--ink-black)]">
                    동료들과 함께
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--granite)]">
                    점심 시간을 즐겨보세요
                  </p>
                </div>
                <div className="rounded-[16px] bg-[var(--lifted-cream)] px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--slate-gray)]">
                    Meeting
                  </p>
                  <p className="mt-2 text-sm font-medium text-[var(--ink-black)]">
                    Monthly Meeting
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--granite)]">
                    음료를 기록해보세요
                  </p>
                </div>
              </div>
            </div>
          </motion.section>
        </main>
      </div>
    </>
  );
}
