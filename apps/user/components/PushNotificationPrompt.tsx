"use client";

import { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useUserStore } from "@/stores/userStore";
import {
  isPushSupported,
  isIOSSafari,
  subscribeToPush,
  getExistingSubscription,
} from "@/lib/push-notifications";
import { toast } from "@repo/ui/src/sonner";

const DISMISS_KEY = "push-prompt-dismissed-at";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export default function PushNotificationPrompt() {
  const { userId, isLoggedIn } = useUserStore();
  const [visible, setVisible] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [iosSafariWarning, setIosSafariWarning] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !userId) return;

    if (isIOSSafari()) {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed && Date.now() - Number(dismissed) < DISMISS_DURATION_MS) return;
      setIosSafariWarning(true);
      setVisible(true);
      return;
    }

    if (!isPushSupported()) return;

    const permission = Notification.permission;

    if (permission === "granted") {
      (async () => {
        const existing = await getExistingSubscription();
        if (!existing) {
          subscribeToPush(userId);
        }
      })();
      return;
    }

    if (permission === "denied") return;

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed && Date.now() - Number(dismissed) < DISMISS_DURATION_MS) return;

    setVisible(true);
  }, [isLoggedIn, userId]);

  const handleAllow = useCallback(async () => {
    if (!userId) return;

    const result = await Notification.requestPermission();
    if (result === "granted") {
      const success = await subscribeToPush(userId);
      if (!success) {
        toast.error("알림 등록에 실패했습니다. 다시 시도해주세요.");
        setVisible(false);
        return;
      }
      setSubscribed(true);
      setTimeout(() => setVisible(false), 2000);
    } else {
      setVisible(false);
    }
  }, [userId]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -80 }}
          animate={{ y: 0 }}
          exit={{ y: -80, transition: { duration: 0.35, ease: "easeIn" } }}
          transition={{ type: "spring", stiffness: 120, damping: 16 }}
          className="fixed left-3 right-3 top-3 z-40 mx-auto max-w-sm"
        >
          <div className="overflow-hidden rounded-[18px] bg-white/95 shadow-[0_8px_24px_rgba(25,28,31,0.12)] backdrop-blur-md">
            {iosSafariWarning ? (
              <div className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-5 text-[var(--ink-black)]">
                    알림을 받으려면 홈 화면에 추가해주세요
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-[var(--granite)]">
                    Safari의 공유 메뉴에서 &quot;홈 화면에 추가&quot;를 선택하면 푸시 알림을 받을 수 있습니다.
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
            ) : (
              <AnimatePresence mode="wait">
                {subscribed ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="px-4 py-3"
                  >
                    <p className="text-sm font-medium leading-5 text-[var(--ink-black)]">
                      알림이 설정되었습니다
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="prompt"
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-start justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-5 text-[var(--ink-black)]">
                        복지 알림을 받으시겠어요?
                      </p>
                      <p className="mt-1 text-[11px] leading-4 text-[var(--granite)]">
                        입력 마감 리마인더와 정산 결과를 푸시 알림으로 받을 수 있습니다.
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={handleAllow}
                          className="h-8 rounded-full bg-[var(--ink-black)] px-4 text-xs font-medium text-white transition-opacity hover:opacity-85"
                        >
                          알림 허용
                        </button>
                        <button
                          onClick={handleDismiss}
                          className="h-8 rounded-full bg-[var(--whisper-cream)] px-4 text-xs font-medium text-[var(--granite)] transition-colors hover:bg-[var(--soft-bone)]"
                        >
                          나중에
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={handleDismiss}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--whisper-cream)] text-[var(--granite)] transition-colors hover:bg-[var(--soft-bone)]"
                      aria-label="닫기"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
