"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

export function useAuth() {
  const router = useRouter();
  const { user, isAuthenticated, setUser, logout: clearAuth } = useAuthStore();

  const logout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        clearAuth();
        toast.success("로그아웃되었습니다.");
        router.push("/login");
        router.refresh();
      } else {
        toast.error("로그아웃에 실패했습니다.");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("로그아웃 처리 중 오류가 발생했습니다.");
    }
  };

  const checkSession = async () => {
    try {
      const response = await fetch("/api/auth/session");
      const data = await response.json();

      if (data.authenticated) {
        setUser({
          id: data.user.id,
          fullName: data.user.fullName,
          role: data.user.role,
        });
        return true;
      } else {
        clearAuth();
        return false;
      }
    } catch (error) {
      console.error("Session check error:", error);
      clearAuth();
      return false;
    }
  };

  return {
    user,
    isAuthenticated,
    logout,
    checkSession,
  };
}
