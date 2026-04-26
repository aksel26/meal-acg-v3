"use client";

import { Alert, AlertDescription } from "@repo/ui/src/alert";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      );
      setLoading(false);
    }
  };

  return (
    <>
      <PWAInstallPrompt />

      <div className="min-h-dvh bg-white">
        <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between">
            <Image
              src="/images/ACG_LOGO_GRAY.png"
              alt="ACG"
              width={88}
              height={28}
              priority
              className="h-7 w-auto"
            />
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--slate-gray)]">
              ACG 복지관리
            </p>
          </header>

          <main className="grid flex-1 items-center gap-12 py-10 md:grid-cols-2 lg:gap-20">
            <motion.section
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.55,
                delay: 0.05,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="order-2 md:order-1"
            >
              <div className="mx-auto w-full max-w-sm md:mx-0">
                <div className="mb-10 space-y-3">
                  <h1 className="font-display text-4xl font-medium leading-tight text-[var(--ink-black)]">
                    사내 복지를,
                    <br />더 똑똑하게
                  </h1>
                  <p className="text-sm leading-6 text-[var(--granite)]">
                    복지포인트, 식대, Monthly 커피, 점심조까지 한 곳에서
                    확인하고 관리하세요.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label
                      className="text-xs font-medium text-[var(--granite)]"
                      htmlFor="id"
                    >
                      아이디
                    </Label>
                    <Input
                      className="input-premium text-sm"
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
                    <Label
                      className="text-xs font-medium text-[var(--granite)]"
                      htmlFor="password"
                    >
                      비밀번호
                    </Label>
                    <Input
                      className="input-premium text-sm"
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
                    <Alert className="rounded-[16px] border border-[rgba(226,59,74,0.22)] bg-[rgba(226,59,74,0.06)] text-[var(--danger)]">
                      <AlertDescription className="text-sm">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="btn-primary h-[3.25rem] w-full text-base"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="h-4 w-4 animate-spin"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        로그인 중...
                      </span>
                    ) : (
                      "로그인"
                    )}
                  </Button>
                </form>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.55,
                delay: 0.12,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="landing-hero-panel order-1 min-h-[360px] flex-col items-center justify-center text-center md:order-2"
            >
              <div className="relative h-56 w-56 overflow-hidden bg-[var(--whisper-cream)] sm:h-64 sm:w-64">
                <Image
                  src="/images/coffee-tea-2.png"
                  alt=""
                  fill
                  priority
                  className="object-cover"
                />
              </div>

              <p className="mt-8 max-w-sm font-display text-3xl font-medium leading-tight text-[var(--ink-black)]">
                포인트부터 커피 취합까지 빠르게.
              </p>
              <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--granite)]">
                ACG 복지 앱에서 식대 기록, 복지포인트, Monthly 커피, 점심조
                흐름까지 자연스럽게 이어집니다.
              </p>
            </motion.section>
          </main>
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .landing-hero-panel {
            display: none !important;
          }
        }

        @media (min-width: 768px) {
          .landing-hero-panel {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
}
