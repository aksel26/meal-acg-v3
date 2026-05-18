import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  fullName: string;
  role: "user" | "admin";
  adminRole?: "대표" | "P&C 팀장" | "P&C 일반" | null;
  userAuthority?: "팀장/본부장" | "팀장" | null;
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
