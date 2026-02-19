import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserState {
  userId: string | null;
  userName: string | null;
  role: string | null;
  memberId: string | null;
  memberRole: string | null;
  isLoggedIn: boolean;
  hasHydrated: boolean;
  login: (userId: string, userName: string, role: string | null) => void;
  logout: () => void;
  hydrate: () => void;
  setHasHydrated: (state: boolean) => void;
  setMemberInfo: (memberId: string, memberRole: string) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userId: null,
      userName: null,
      role: null,
      memberId: null,
      memberRole: null,
      isLoggedIn: false,
      hasHydrated: false,

      setHasHydrated: (state: boolean) => {
        set({ hasHydrated: state });
      },

      login: (userId: string, userName: string, role: string | null) => {
        set({
          userId,
          userName,
          role,
          isLoggedIn: true,
        });
        // localStorage 동기화 (기존 코드와의 호환성)
        if (typeof window !== "undefined") {
          localStorage.setItem("user_id", userId);
          localStorage.setItem("name", userName);
          if (role) localStorage.setItem("role", role);
        }
      },

      setMemberInfo: (memberId: string, memberRole: string) => {
        set({ memberId, memberRole });
      },

      logout: () => {
        set({
          userId: null,
          userName: null,
          role: null,
          memberId: null,
          memberRole: null,
          isLoggedIn: false,
        });
        // localStorage 정리
        if (typeof window !== "undefined") {
          localStorage.removeItem("user_id");
          localStorage.removeItem("name");
          localStorage.removeItem("role");
          localStorage.removeItem("token");
          localStorage.removeItem("grade");
        }
      },

      hydrate: () => {
        // 클라이언트에서 localStorage 값으로 상태 복원
        if (typeof window !== "undefined") {
          const userId = localStorage.getItem("user_id");
          const userName = localStorage.getItem("name");
          const role = localStorage.getItem("role");
          if (userId && userName) {
            set({
              userId,
              userName,
              role,
              isLoggedIn: true,
            });
          }
        }
      },
    }),
    {
      name: "user-storage",
      partialize: (state) => ({
        userId: state.userId,
        userName: state.userName,
        role: state.role,
        memberId: state.memberId,
        memberRole: state.memberRole,
        isLoggedIn: state.isLoggedIn,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
