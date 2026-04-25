"use client";

import { useState, useEffect } from "react";
import { Button } from "@repo/ui/src/button";
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
    <div className="fixed left-4 right-4 top-4 z-50 animate-in fade-in-0 slide-in-from-top-6 duration-500">
      <div className="mx-auto max-w-xl">
        <div className="glass-card-elevated overflow-hidden rounded-[24px]">
          <div className="flex items-start justify-between gap-4 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--ink-black)] text-white">
                🍙
              </div>

              <div>
                <p className="eyebrow-label">Install app</p>
                <h3 className="mt-2 text-sm font-medium text-[var(--ink-black)]">
                  ACG 복지관리 앱으로 빠르게 실행하세요
                </h3>
                <p className="mt-2 text-xs leading-6 text-[var(--granite)]">
                  {isIOS
                    ? "Safari 공유 메뉴에서 '홈 화면에 추가'를 선택하면 앱처럼 실행할 수 있습니다."
                    : "홈 화면에 추가하면 더 빠르게 열리고, 앱처럼 바로 접근할 수 있습니다."}
                </p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--whisper-cream)] text-[var(--granite)] transition-colors hover:bg-[var(--soft-bone)]"
              aria-label="닫기"
            >
              <X size={16} />
            </button>
          </div>

          {!isIOS && deferredPrompt && (
            <div className="border-t border-[rgba(25,28,31,0.08)] px-5 py-4">
              <Button
                onClick={handleInstallClick}
                className="btn-primary w-full"
              >
                설치하기
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
