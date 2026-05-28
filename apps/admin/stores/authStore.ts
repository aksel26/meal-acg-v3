import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AdminPermission } from "@/lib/rbac";

export interface User {
  id: string;
  fullName: string;
  role: "user" | "admin";
  adminRole?: "대표" | "팀장" | "일반" | null;
  userAuthority?: "팀장/본부장" | "팀장" | null;
  permissions?: AdminPermission[];
  hireDate?: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) =>
        set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: "admin-auth-storage",
    }
  )
);
