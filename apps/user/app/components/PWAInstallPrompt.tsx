"use client";

import { useState, useEffect } from "react";
import { Button } from "@repo/ui/src/button";
import { X, Share, SquarePlus } from "@repo/ui/icons";
import Image from "next/image";

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
    // iOS 감지
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // 이미 설치된 PWA인지 확인 (standalone 모드)
    const isStandaloneMode = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // localStorage에서 dismiss 상태 확인
    const isDismissed = localStorage.getItem("pwa-install-dismissed");

    // beforeinstallprompt 이벤트 리스너 (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // 이미 설치되지 않은 경우에만 프롬프트 표시
      if (!isStandaloneMode && !isDismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 개발/테스트 환경에서 프롬프트 표시 (실제 배포 시 제거 권장)
    if (process.env.NODE_ENV === "development" && !isStandaloneMode && !isDismissed) {
      setTimeout(() => setShowPrompt(true), 2000);
    }

    // iOS에서 Safari인지 확인하고 standalone 모드가 아닌 경우 프롬프트 표시
    if (isIOSDevice && !isStandaloneMode && !isDismissed) {
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      if (isSafari) {
        setShowPrompt(true);
      }
    }
  }, []);

  // showPrompt가 true가 되면 1초 후에 애니메이션 시작
  useEffect(() => {
    if (showPrompt) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [showPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android/Chrome 설치
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      // iOS 설치 안내는 그대로 유지 (사용자가 수동으로 설치해야 함)
      // 여기서는 단순히 프롬프트를 유지하고 사용자가 직접 설치하도록 안내
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  // 이미 설치된 경우 또는 표시하지 않는 경우
  if (!showPrompt || isStandalone || !isVisible) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-in fade-in-0 slide-in-from-top-8 duration-700 ease-out">
      <div className="max-w-md mx-auto">
        {/* 카드 컨테이너 */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/50 rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-700 delay-100 ease-out">
          {/* 카드 헤더 */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-50 border-b border-slate-100/80 px-4 py-3 animate-in slide-in-from-left duration-700 delay-200 ease-out">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* 앱 아이콘 */}
                <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100/50 animate-in zoom-in-0 duration-500 delay-400 ease-out">
                  <Image src="/icons/onigiri.png" alt="ACG 식대관리" width={22} height={22} />
                </div>

                {/* 앱 정보 */}
                <div className="animate-in slide-in-from-left duration-600 delay-300 ease-out">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">ACG 식대관리</h3>
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-100/50 animate-in fade-in-0 duration-500 delay-500 ease-out">앱</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">식대 관리를 더욱 편리하게</p>
                </div>
              </div>

              {/* 닫기 버튼 */}
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors duration-200 text-slate-400 hover:text-slate-600 animate-in fade-in-0 duration-500 delay-600 ease-out"
                aria-label="닫기"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* 카드 내용 */}
          <div className="px-4 py-2 animate-in slide-in-from-bottom duration-700 delay-400 ease-out">
            <div className="flex items-start justify-between gap-4">
              {/* 설명 텍스트 */}
              <div className="flex-1 animate-in fade-in-0 duration-600 delay-500 ease-out">
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isIOS ? "Safari에서 공유 버튼을 누르고 '홈 화면에 추가'를 선택하여 앱을 설치하세요" : "홈 화면에 추가하여 네이티브 앱처럼 빠르고 편리하게 이용하세요"}
                </p>
              </div>

              {/* 설치 버튼 */}
              {!isIOS && deferredPrompt && (
                <Button
                  onClick={handleInstallClick}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md whitespace-nowrap animate-in slide-in-from-right duration-600 delay-700 ease-out"
                >
                  설치하기
                </Button>
              )}
            </div>

            {/* iOS 전용 안내 */}
            {isIOS && (
              <div className="mt-3 pt-3 border-t border-slate-100 animate-in slide-in-from-bottom duration-500 delay-800 ease-out">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="flex items-center gap-1 animate-in fade-in-0 duration-400 delay-900 ease-out">
                    <span className="w-4 h-4 bg-slate-100 rounded flex items-center justify-center">
                      <Share className="h-3 w-3 text-slate-600" />
                    </span>
                    <span>공유</span>
                  </div>
                  <span className="animate-in fade-in-0 duration-300 delay-1000 ease-out">→</span>
                  <div className="flex items-center gap-1 animate-in fade-in-0 duration-400 delay-1100 ease-out">
                    <span className="w-4 h-4 bg-slate-100 rounded flex items-center justify-center">
                      <SquarePlus className="h-3 w-3 text-slate-600" />
                    </span>
                    <span>홈 화면에 추가</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
