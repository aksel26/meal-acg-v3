"use client";

import { useState, useEffect } from "react";
import { X } from "@repo/ui/icons";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    const isStandaloneMode = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(isStandaloneMode);

    const isDismissed = localStorage.getItem("pwa-install-dismissed");

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      if (!isStandaloneMode && !isDismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (process.env.NODE_ENV === "development" && !isStandaloneMode && !isDismissed) {
      setTimeout(() => setShowPrompt(true), 2000);
    }

    if (isIOSDevice && !isStandaloneMode && !isDismissed) {
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      if (isSafari) {
        setShowPrompt(true);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (showPrompt) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [showPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!showPrompt || isStandalone || !isVisible) {
    return null;
  }

  return (
    <div className="fixed left-3 right-3 top-3 z-50 animate-in fade-in-0 slide-in-from-top-6 duration-500">
      <div className="mx-auto max-w-sm">
        <div className="overflow-hidden rounded-[18px] bg-white/95 shadow-[0_8px_24px_rgba(25,28,31,0.12)] backdrop-blur-md">
          <div className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="eyebrow-label text-[9px]">Install app</p>
              <h3 className="mt-1 text-sm font-medium leading-5 text-[var(--ink-black)]">
                ACG 복지관리 앱으로 빠르게 실행하세요
              </h3>
              <p className="mt-1 text-[11px] leading-4 text-[var(--granite)]">
                {isIOS || !deferredPrompt
                  ? "Safari 공유 메뉴에서 '홈 화면에 추가'를 선택하면 앱처럼 실행할 수 있습니다."
                  : "홈 화면에 추가하면 더 빠르게 열리고, 앱처럼 바로 접근할 수 있습니다."}
              </p>
            </div>

            <button
              onClick={handleDismiss}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--whisper-cream)] text-[var(--granite)] transition-colors hover:bg-[var(--soft-bone)]"
              aria-label="닫기"
            >
              <X size={14} />
            </button>
          </div>

          {!isIOS && deferredPrompt && (
            <div className="flex justify-end px-4 pb-2.5">
              <button
                type="button"
                onClick={handleInstallClick}
                className="h-8 rounded-full bg-[var(--ink-black)] px-4 text-xs font-medium text-white transition-opacity hover:opacity-85"
              >
                설치하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
