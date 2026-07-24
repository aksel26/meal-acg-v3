import { create } from "zustand";

type SidebarState = {
  isCollapsed: boolean;
  toggleCollapsed: () => void;
};

export const useSidebarStore = create<SidebarState>()((set) => ({
  isCollapsed: false,
  toggleCollapsed: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
}));
