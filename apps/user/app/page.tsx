"use client";

import { Alert, AlertDescription } from "@repo/ui/src/alert";
import { Button } from "@repo/ui/src/button";
import { Carousel, CarouselContent, CarouselDots, CarouselItem } from "@repo/ui/src/carousel";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import CI from "@/public/images/ACG_LOGO_GRAY.png";
import Character from "@/public/images/login-character.png";
import Calendar from "@/public/images/Calendar.png";
import Coffee from "@/public/images/Coffee.png";
import Lunch from "@/public/images/lunch.png";
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

  const carouselItems = [
    {
      image: Character,
      title: "매일의 식비를 간편하게",
      subtitle: "기록과 확인이 같은 흐름으로 이어집니다",
      scale: "scale-110",
      animation: {
        y: [0, -6, 0],
        rotate: [0, 1, -1, 0],
      },
      duration: 3,
    },
    {
      image: Calendar,
      title: "식비 내역을 한눈에",
      subtitle: "월간 흐름과 잔액을 바로 점검하세요",
      animation: {
        y: [0, -8, 0],
        rotate: [0, -1, 1, 0],
      },
      duration: 2.5,
    },
    {
      image: Lunch,
      title: "동료들과 함께",
      subtitle: "점심조 편성과 식사 기록을 자연스럽게",
      animation: {
        y: [0, -10, 0],
        rotate: [0, 2, -2, 0],
      },
      duration: 3.5,
    },
    {
      image: Coffee,
      title: "Monthly Meeting",
      subtitle: "음료 취합도 같은 화면 톤으로 정리합니다",
      animation: {
        y: [0, -6, 0],
        rotate: [3, 6, 0, 3],
      },
      duration: 4,
    },
  ];

  return (
    <>
      <PWAInstallPrompt />
      <div className="fixed inset-0 gradient-mesh -z-20" />
      <div className="orbit-line fixed left-[-8rem] top-20 h-80 w-80 -z-10 opacity-70" />
      <div className="orbit-line fixed right-[-7rem] top-[22rem] h-72 w-72 -z-10 opacity-55" />
      <div className="orbit-dot fixed left-12 top-24 -z-10" />
      <div className="orbit-dot fixed right-10 top-[28rem] -z-10" />

      <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 pb-10 pt-5">
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card-elevated flex items-center justify-between rounded-[999px] px-5 py-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--canvas-cream)]">
              <Image src={CI} alt="ACG Logo" width={42} height={14} className="opacity-80" />
            </div>
            <div>
              <p className="eyebrow-label text-[11px]">User App</p>
              <p className="text-sm font-medium tracking-[-0.03em] text-[var(--ink-black)]">
                ACG Meal Service
              </p>
            </div>
          </div>
          <span className="rounded-[999px] bg-[var(--ink-black)] px-3 py-2 text-xs font-medium text-[var(--canvas-cream)]">
            Sign in
          </span>
        </motion.header>

        <main className="flex flex-1 flex-col justify-center gap-6 py-6">
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="card-premium relative overflow-hidden px-6 py-7"
          >
            <div className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-[var(--whisper-cream)]" />
            <div className="orbit-line -left-12 bottom-2 h-48 w-48 opacity-70" />

            <div className="relative grid gap-8 md:grid-cols-[1.05fr_0.95fr] md:items-center">
              <div className="space-y-4">
                <p className="eyebrow-label">For You</p>
                <h1 className="text-[2.25rem] font-medium leading-[0.95] tracking-[-0.045em] text-[var(--ink-black)]">
                  맛점의 리듬을
                  <br />
                  더 부드럽게 관리하세요.
                </h1>
                <p className="max-w-[18rem] text-sm leading-6 text-[var(--granite)]">
                  식비 기록, 잔액 확인, 점심조 편성까지 한 앱 안에서 일관된 흐름으로 연결했습니다.
                </p>
              </div>

              <div className="relative mx-auto w-[82%] max-w-xs">
                <div className="absolute inset-0 scale-90 rounded-full bg-[var(--whisper-cream)]" />
                <Carousel className="relative">
                  <CarouselContent>
                    {carouselItems.map((item, index) => (
                      <CarouselItem key={index}>
                        <div className="flex items-center justify-center flex-col">
                          <motion.div
                            animate={item.animation}
                            transition={{
                              duration: item.duration,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: index * 0.3,
                            }}
                            className="relative flex h-60 w-60 items-center justify-center overflow-hidden rounded-full bg-[var(--ink-black)]"
                          >
                            <Image
                              src={item.image}
                              alt={item.title}
                              height={180}
                              width={item.scale ? 130 : undefined}
                              className={`relative z-10 ${item.scale || ""}`}
                            />
                            <div className="absolute -bottom-1 -right-1 flex h-14 w-14 items-center justify-center rounded-full bg-white text-xl text-[var(--ink-black)] shadow-[var(--shadow-sm)]">
                              →
                            </div>
                          </motion.div>

                          <div className="mt-5 text-center">
                            <p className="text-base font-medium tracking-[-0.03em] text-[var(--ink-black)]">
                              {item.title}
                            </p>
                            <p className="mt-1 text-sm text-[var(--granite)]">
                              {item.subtitle}
                            </p>
                          </div>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselDots className="mt-5" />
                </Carousel>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card-elevated overflow-hidden rounded-[40px] px-6 py-7"
          >
            <div className="space-y-6">
              <div>
                <p className="eyebrow-label">Sign In</p>
                <h2 className="mt-2 text-[1.8rem] font-medium leading-[1] tracking-[-0.04em] text-[var(--ink-black)]">
                  식대 기록을 시작할 준비가 됐나요?
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--granite)]">
                  사내 계정으로 로그인하면 오늘의 기록과 월간 현황을 바로 이어서 확인할 수 있습니다.
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
                  <Alert variant="destructive" className="rounded-[24px] border-none bg-[rgba(207,69,0,0.08)] text-[var(--clay-brown)]">
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
          </motion.section>
        </main>
      </div>
    </>
  );
}
