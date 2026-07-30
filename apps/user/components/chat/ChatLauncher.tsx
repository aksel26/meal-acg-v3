"use client";

import React, { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@repo/ui/src/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@repo/ui/src/drawer";
import { ChatPanel } from "./ChatPanel";

// md(768px) 기준으로 Sheet/Drawer 전환. SSR 첫 렌더는 모바일로 가정 후 마운트 시 보정.
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

const launcherClass =
  "fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition hover:bg-slate-700 md:bottom-6 md:right-6";

export function ChatLauncher() {
  const isDesktop = useIsDesktop();

  const launcherButton = (
    <button
      type="button"
      aria-label="ACG 도우미 열기"
      className={launcherClass}
    >
      <MessageCircle className="h-5 w-5" aria-hidden />
    </button>
  );

  if (isDesktop) {
    return (
      <Sheet>
        <SheetTrigger asChild>{launcherButton}</SheetTrigger>
        <SheetContent
          side="right"
          className="flex w-[400px] flex-col gap-0 p-0 sm:max-w-[400px]"
        >
          <SheetHeader className="border-b border-slate-100 px-4 py-3">
            <SheetTitle>ACG 도우미</SheetTitle>
          </SheetHeader>
          <ChatPanel />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>{launcherButton}</DrawerTrigger>
      <DrawerContent className="flex max-h-[85dvh] flex-col">
        <DrawerHeader className="border-b border-slate-100">
          <DrawerTitle>ACG 도우미</DrawerTitle>
        </DrawerHeader>
        <ChatPanel />
      </DrawerContent>
    </Drawer>
  );
}
