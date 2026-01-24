"use client";

import { Alert, AlertDescription } from "@repo/ui/src/alert";
import { Button } from "@repo/ui/src/button";
import { Carousel, CarouselContent, CarouselDots, CarouselItem } from "@repo/ui/src/carousel";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
    } finally {
      setLoading(false);
    }
  };

  const carouselItems = [
    {
      image: Character,
      title: "매일의 식비를 간편하게",
      subtitle: "기록하고 현황을 확인하세요",
      scale: "scale-110",
      animation: {
        y: [0, -6, 0],
        rotate: [0, 1, -1, 0],
      },
      duration: 3,
    },
    {
      image: Calendar,
      title: "식비 내역을 쉽게",
      subtitle: "관리하고 분석해보세요",
      animation: {
        y: [0, -8, 0],
        rotate: [0, -1, 1, 0],
      },
      duration: 2.5,
    },
    {
      image: Lunch,
      title: "동료들과 함께",
      subtitle: "점심 시간을 즐겨보세요",
      animation: {
        y: [0, -10, 0],
        rotate: [0, 2, -2, 0],
      },
      duration: 3.5,
    },
    {
      image: Coffee,
      title: "Monthly Meeting",
      subtitle: "음료를 기록해보세요",
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

      {/* Background Gradient Mesh */}
      <div className="fixed inset-0 gradient-mesh -z-10" />

      {/* Decorative Blobs */}
      <div className="fixed top-0 right-0 w-72 h-72 bg-[oklch(0.85_0.12_280/0.3)] rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2" />
      <div className="fixed bottom-1/3 left-0 w-64 h-64 bg-[oklch(0.88_0.10_220/0.25)] rounded-full blur-3xl -z-10 -translate-x-1/2" />

      <div className="min-h-dvh flex sm:max-w-md items-center justify-center relative mx-auto flex-col px-4">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-6"
        >
          <Image src={CI} alt="ACG Logo" width={60} height={20} className="opacity-60" />
        </motion.div>

        {/* Carousel Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 flex items-end justify-center pb-6 pt-16"
        >
          <Carousel className="w-[65%] sm:w-1/2 max-w-xs cursor-pointer">
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
                      className="relative"
                    >
                      {/* Glow Effect */}
                      <div className="absolute inset-0 bg-[oklch(0.75_0.15_250/0.2)] blur-2xl rounded-full scale-75" />
                      <Image
                        src={item.image}
                        alt={item.title}
                        height={180}
                        width={item.scale ? 130 : undefined}
                        className={`relative ${item.scale || ''}`}
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="mt-4 text-center"
                    >
                      <p className="font-semibold text-[oklch(0.35_0.12_250)] text-sm leading-relaxed">
                        {item.title}
                      </p>
                      <p className="font-medium text-[oklch(0.50_0.08_250)] text-sm mt-0.5">
                        {item.subtitle}
                      </p>
                    </motion.div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselDots className="mt-4" />
          </Carousel>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full"
        >
          <div className="glass-card-elevated rounded-[2rem] p-7 relative overflow-hidden">
            {/* Card Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[oklch(0.90_0.06_250/0.4)] rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

            <div className="relative">
              {/* Welcome Text */}
              <div className="mb-6">
                <motion.h1
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-lg font-semibold text-[oklch(0.25_0.02_250)] mb-2"
                >
                  맛점 하셨나요?
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-[oklch(0.50_0.01_250)] leading-relaxed"
                >
                  알뜰한 식사관리,<br />
                  간편하게 시작하세요!
                </motion.p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-2"
                >
                  <Label className="text-xs font-medium text-[oklch(0.45_0.01_250)] ml-1" htmlFor="id">
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
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-2"
                >
                  <Label className="text-xs font-medium text-[oklch(0.45_0.01_250)] ml-1" htmlFor="password">
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
                </motion.div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Alert variant="destructive" className="border-none bg-[oklch(0.95_0.05_25)] rounded-xl">
                      <AlertDescription className="text-[oklch(0.45_0.15_25)] text-sm">
                        {error}
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="pt-2"
                >
                  <Button
                    type="submit"
                    className="btn-primary w-full h-12 text-sm font-medium relative overflow-hidden"
                    disabled={loading}
                  >
                    <span className="relative z-10">
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          로그인 중...
                        </span>
                      ) : (
                        "로그인"
                      )}
                    </span>
                  </Button>
                </motion.div>
              </form>
            </div>
          </div>

          {/* Bottom Safe Area */}
          <div className="h-8" />
        </motion.div>
      </div>
    </>
  );
}
