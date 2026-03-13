"use client";

import { create } from "zustand";

type AuthState = {
  user: { id: string; fullName: string; role: string } | null;
  setUser: (user: AuthState["user"]) => void;
  clearUser: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
