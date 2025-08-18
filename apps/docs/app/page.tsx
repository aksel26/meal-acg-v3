"use client";

import { Alert, AlertDescription } from "@repo/ui/src/alert";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CI from "../public/images/ACG_LOGO_GRAY.png";
import LoginCharacter from "../public/images/login-character.png";
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <Image src={CI} alt="CI" width={0} height={0} style={{ width: "60px", height: "20px", position: "absolute", top: 20 }} />

      <div className="fixed border-2 border-t-amber-700 bottom-0 inset-x-0 rounded-tr-3xl rounded-tl-3xl p-8 pb-12 px-6">
        <div className="absolute right-8 -top-24 w-32 h-32">
          <Image src={LoginCharacter} alt="loginCharacter" />
        </div>
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
