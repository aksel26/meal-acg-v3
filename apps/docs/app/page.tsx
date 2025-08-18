"use client";

import { Alert, AlertDescription } from "@repo/ui/src/alert";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CI from "../public/images/ACG_LOGO_GRAY.png";
import LoginCharacter from "../public/images/character.png";
import BackgroundImage from "../public/images/bg.jpeg";
import Calendar from "../public/images/Calendar.png";
import ThinkBubble from "../public/images/thinkBubble.png";
export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    id: "",
    password: "",
  });
  const router = useRouter();

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
      const authUrl = `${process.env.NEXT_PUBLIC_AUTH_URL}/login`;
      if (!authUrl) {
        throw new Error("AUTH_URL이 설정되지 않았습니다.");
      }

      const response = await fetch(authUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: formData.id,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "로그인에 실패했습니다.");
      }

      // 로그인 성공 시 checkAuth페이지로 이동
      if (data.data.userName) {
        localStorage.setItem("token", data.data.accessToken);
        localStorage.setItem("name", data.data.userName);
        // router.push("/checkAuth");
        router.push("/dashboard");
        // setLoginData(data.data);
        // setShowSuccessModal(true);
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
    <div className="min-h-screen flex items-center justify-center p-4 relative max-w-md mx-auto flex-col">
      <Image 
        src={BackgroundImage} 
        alt="Background" 
        fill 
        className="object-cover"
        style={{ zIndex: -1 }}
      />
      <Image src={CI} alt="CI" width={0} height={0} style={{ width: "60px", height: "20px", position: "absolute", top: 20 }} />
      


        <div className="flex-1 items-center flex justify-end flex-col pb-12"><div className="w-[60%] sm:w-1/2 ">
          <Image src={Calendar} alt="loginCharacter" />
          </div>
          <p className="font-medium text-blue-800 text-lg">식대 기록 및 현황 확인</p>
          </div>
{/* <div className="flex-1 items-center flex justify-center">
          <div className="w-1/2">
          
          
          <Image src={LoginCharacter} alt="loginCharacter" />
        </div>
        </div> */}
      <div className="w-full mx-auto inset-x-0 rounded-4xl p-6 px-6 bg-white relative">
        {/* <div className="absolute right-8 -top-24 w-32 h-32">
          
          <Image src={LoginCharacter} alt="loginCharacter" />
        </div> */}


        {/* <div className="absolute right-42 -top-12 w-5 h-5 bg-white opacity-75 rounded-full">


        </div>
        <div className="absolute right-48 -top-20 w-7 h-7 bg-white opacity-75 rounded-full">


        </div>
        <div className="absolute inset-x-6 -top-42 h-42 bg-white opacity-75 rounded-lg max-w-md">


        </div> */}
        
        <div className="mb-4">
          <p className="mb-3">맛점 하셨나요? 🍙</p>
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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </form>
      </div>
    </div>
  );
}
