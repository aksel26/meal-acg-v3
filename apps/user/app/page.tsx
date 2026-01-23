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
import BackgroundImage from "@/public/images/bg.jpeg";
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

      // 로그인 성공 시 Zustand 스토어에 저장 후 대시보드로 이동
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

  return (
    <>
      <PWAInstallPrompt />
      <div className="h-dvh flex sm:max-w-md items-center justify-center relative mx-auto flex-col">
        <Image src={BackgroundImage} alt="Background" fill className="object-cover" style={{ zIndex: -1 }} />
        <Image src={CI} alt="CI" width={0} height={0} style={{ width: "60px", height: "20px", position: "absolute", top: 20 }} />

        <div className="flex-1 items-center flex justify-end flex-col pb-4">
          {/* Carousel 영역 시작 */}
          <Carousel className="w-[60%] sm:w-1/2 max-w-xs cursor-pointer">
            <CarouselContent>
              <CarouselItem>
                <div className="flex items-center justify-center flex-col">
                  <motion.div
                  // animate={{
                  //   y: [0, -10, 0],
                  //   rotate: [0, 2, -2, 0],
                  // }}
                  // transition={{
                  //   duration: 3,
                  //   repeat: Infinity,
                  //   ease: "easeInOut",
                  // }}
                  >
                    <Image src={Character} alt="식대 기록 및 현황 확인" height={180} width={130} className="scale-120" />
                  </motion.div>

                  <p className="font-medium text-blue-800 text-sm text-center mt-2">
                    매일의 식비를 간편하게
                    <br />
                    기록하고 현황을 확인하세요
                  </p>
                </div>
              </CarouselItem>
              <CarouselItem>
                <div className="flex items-center justify-center flex-col">
                  <motion.div
                    animate={{
                      y: [0, -8, 0],
                      rotate: [0, -1, 1, 0],
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.5,
                    }}
                  >
                    <Image src={Calendar} alt="식대 기록 및 현황 확인" />
                  </motion.div>
                  <p className="font-medium text-blue-800 text-sm text-center mt-2">
                    식비 내역을 쉽게
                    <br />
                    관리하고 분석해보세요
                  </p>
                </div>
              </CarouselItem>
              <CarouselItem>
                <div className="flex items-center justify-center flex-col">
                  <motion.div
                    animate={{
                      y: [0, -12, 0],
                      rotate: [0, 3, -3, 0],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 1,
                    }}
                  >
                    <Image src={Lunch} alt="점심조" />
                  </motion.div>
                  <p className="font-medium text-blue-800 text-sm text-center mt-2">
                    동료들과 함께
                    <br />
                    점심 시간을 즐겨보세요
                  </p>
                </div>
              </CarouselItem>
              <CarouselItem>
                <div className="flex items-center justify-center flex-col">
                  <motion.div
                    animate={{
                      y: [0, -6, 0],
                      rotate: [5, 8, 2, 5],
                    }}
                    transition={{
                      duration: 3.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 1.5,
                    }}
                  >
                    <Image src={Coffee} alt="Monthly Meeting 음료" />
                  </motion.div>
                  <p className="font-medium text-blue-800 text-sm text-center mt-2">
                    Monthly Meeting
                    <br />
                    음료를 기록해보세요
                  </p>
                </div>
              </CarouselItem>
            </CarouselContent>
            <CarouselDots />
          </Carousel>
          {/* Carousel 영역 종료 */}
        </div>
        <div className="w-full mx-auto inset-x-0 rounded-4xl p-6 px-6 bg-white relative">
          <div className="mb-4">
            <p className="mb-3 text-sm sm:text-base">맛점 하셨나요? 🍙</p>
            <div className="text-xs sm:text-md leading-5">
              <p>알뜰한 식사관리,</p>
              <p>간편하게 시작하세요!</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm" htmlFor="id">
                아이디
              </Label>
              <Input className="text-xs" id="id" name="id" type="text" value={formData.id} onChange={handleInputChange} placeholder="사용자명을 입력하세요" required />
            </div>

            <div className="space-y-2">
              <Label className="text-xs sm:text-sm" htmlFor="password">
                비밀번호
              </Label>
              <Input className="text-xs" id="password" name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder="비밀번호를 입력하세요" required />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full text-xs sm:text-sm" disabled={loading}>
              {loading ? "로그인 중..." : "로그인"}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
