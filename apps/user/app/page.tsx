"use client";

import { Alert, AlertDescription } from "@repo/ui/src/alert";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import CI from "@/public/images/ACG_LOGO_WHITE.png";
import { useUserStore } from "@/stores/userStore";

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ id: "", password: "" });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();
  const login = useUserStore((state) => state.login);

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      <div className="flex min-h-dvh bg-white">
        {/* ── Left: Login Form ── */}
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.15,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="w-full max-w-sm"
          >
            {/* Mobile Logo */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-10 md:mb-12"
            >
              <Image
                src={CI}
                alt="ACG Logo"
                width={72}
                height={24}
                className="opacity-40"
              />
            </motion.div>

            {/* Welcome Text */}
            <div className="mb-10">
              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="text-2xl font-bold tracking-tight text-[#131313]"
              >
                Intranet
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="mt-2 text-sm leading-relaxed text-slate-400"
              >
                인트라넷
              </motion.p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <Label
                  htmlFor="id"
                  className={`ml-0.5 text-xs font-medium transition-colors duration-200 ${
                    focusedField === "id"
                      ? "text-[#131313]"
                      : "text-slate-400"
                  }`}
                >
                  아이디
                </Label>
                <Input
                  id="id"
                  name="id"
                  type="text"
                  value={formData.id}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField("id")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="사용자명을 입력하세요"
                  required
                  className="h-12 rounded-lg border-slate-200 bg-slate-50/50 text-sm transition-all duration-200 placeholder:text-slate-300 focus:border-[#131313] focus:bg-white focus:ring-1 focus:ring-[#131313]/10"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-2"
              >
                <Label
                  htmlFor="password"
                  className={`ml-0.5 text-xs font-medium transition-colors duration-200 ${
                    focusedField === "password"
                      ? "text-[#131313]"
                      : "text-slate-400"
                  }`}
                >
                  비밀번호
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="비밀번호를 입력하세요"
                  required
                  className="h-12 rounded-lg border-slate-200 bg-slate-50/50 text-sm transition-all duration-200 placeholder:text-slate-300 focus:border-[#131313] focus:bg-white focus:ring-1 focus:ring-[#131313]/10"
                />
              </motion.div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Alert
                    variant="destructive"
                    className="rounded-lg border-red-100 bg-red-50"
                  >
                    <AlertDescription className="space-y-1 text-sm text-red-600">
                      <p>{error}</p>
                      <p>계정을 추가하려면 P&amp;C팀에 문의해주세요.</p>
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="pt-3"
              >
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative h-12 w-full overflow-hidden rounded-sm bg-[#131313] text-sm font-medium text-white transition-all duration-200 hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="inline-block"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
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
                      </motion.span>
                      로그인 중...
                    </span>
                  ) : (
                    "로그인"
                  )}
                </motion.button>
              </motion.div>
            </form>

            {/* Footer */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-10 text-center text-xs text-slate-300"
            >
              &copy; {new Date().getFullYear()} ACG. All rights reserved.
            </motion.p>
          </motion.div>
        </div>

        {/* ── Right: Brand Panel (desktop only) ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative shrink-0 p-5 max-md:hidden md:w-[40%] md:min-h-dvh"
        >
          <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-[#131313]">
            {/* Subtle grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }}
            />

            {/* Soft glow behind logo */}
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.12, 0.18, 0.12] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute h-64 w-64 rounded-full bg-white/10 blur-3xl"
            />

            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.8,
                delay: 0.3,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative z-10"
            >
              <Image src={CI} alt="ACG Logo" width={180} height={94} />
            </motion.div>

            {/* Tagline */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="relative z-10 mt-10 text-center"
            >
              <p className="text-lg font-bold leading-snug tracking-tight text-white/70">
                Valid Approach,
                <br />
                Valuable People
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/80">
                과학적 접근으로 사람의 가치를 이해합니다.
              </p>
            </motion.div>

            {/* Bottom decorative line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{
                duration: 1.2,
                delay: 0.6,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="absolute bottom-16 h-px w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            />
          </div>
        </motion.div>
      </div>
    </>
  );
}
