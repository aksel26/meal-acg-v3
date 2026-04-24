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

      <div className="mx-auto flex min-h-dvh max-w-7xl flex-col px-4 py-4 md:px-6 md:py-6 lg:px-8">
        <main className="flex flex-1 items-center justify-center py-4">
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card-elevated w-full overflow-hidden rounded-[30px] md:grid md:grid-cols-[minmax(360px,420px)_1fr]"
          >
            <div className="order-2 flex items-center bg-[var(--canvas-cream)] px-5 py-6 md:order-1 md:px-8 md:py-10 lg:px-10">
              <div className="mx-auto w-full max-w-sm space-y-6">
                <div className="space-y-3">
                  <p className="eyebrow-label">ACG meal welfare</p>
                  <h2 className="text-[clamp(2.25rem,4vw,3.4rem)] font-black leading-[1.05] tracking-[-0.025em] text-[var(--ink-black)]">
                    맛점,
                    <br />
                    더 똑똑하게
                  </h2>
                  <p className="text-[15px] font-semibold leading-[1.55] tracking-[-0.01em] text-[var(--granite)]">
                    식대 기록과 복지 흐름을
                    <br />
                    한 번에 시작하세요.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
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
                    <Alert variant="destructive" className="rounded-[16px] border border-[rgba(208,50,56,0.18)] bg-[rgba(208,50,56,0.06)] text-[#d03238]">
                      <AlertDescription className="text-sm">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="btn-primary h-12 w-full text-[18px]"
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

            <div className="order-1 flex min-h-full flex-col justify-between border-b border-[rgba(14,15,12,0.12)] bg-white px-5 py-6 md:order-2 md:border-b-0 md:border-l md:px-8 md:py-10 lg:px-10">
              <div className="space-y-8">
                <div className="space-y-4">
                  <p className="eyebrow-label">Money without borders</p>
                  <h1 className="max-w-[10ch] text-[clamp(3rem,7vw,6rem)] font-black leading-[1.0] tracking-[-0.03em] text-[var(--ink-black)]">
                    식대와
                    <br />
                    복지를
                    <br />
                    빠르게.
                  </h1>
                  <p className="max-w-[32rem] text-[16px] font-semibold leading-[1.6] tracking-[-0.01em] text-[var(--granite)]">
                    ACG 식대 앱에서 기록, 확인, 월간 흐름까지 자연스럽게 이어집니다.
                  </p>
                </div>

                <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-[30px] bg-[var(--soft-bone)] ring-1 ring-[rgba(14,15,12,0.12)] md:mx-0">
                  <div className="relative aspect-[4/3] w-full min-w-0">
                    <Image
                      src="/images/coffee-tea-2.png"
                      alt="Coffee Tea"
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[20px] border border-[rgba(14,15,12,0.12)] bg-[var(--lifted-cream)] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[-0.01em] text-[var(--slate-gray)]">
                    Manage
                  </p>
                  <p className="mt-2 text-[15px] font-semibold text-[var(--ink-black)]">
                    식비 내역을 쉽게
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--granite)]">
                    관리하고 분석해보세요
                  </p>
                </div>
                <div className="rounded-[20px] border border-[rgba(14,15,12,0.12)] bg-[var(--lifted-cream)] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[-0.01em] text-[var(--slate-gray)]">
                    Lunch
                  </p>
                  <p className="mt-2 text-[15px] font-semibold text-[var(--ink-black)]">
                    동료들과 함께
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--granite)]">
                    점심 시간을 즐겨보세요
                  </p>
                </div>
                <div className="rounded-[20px] border border-[rgba(14,15,12,0.12)] bg-[var(--lifted-cream)] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[-0.01em] text-[var(--slate-gray)]">
                    Meeting
                  </p>
                  <p className="mt-2 text-[15px] font-semibold text-[var(--ink-black)]">
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
