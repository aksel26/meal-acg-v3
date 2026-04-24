"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Check, X } from "lucide-react";
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
          className="fixed top-0 z-40 px-4 pt-4 max-xl:inset-x-0 max-xl:mx-auto max-xl:w-full max-xl:max-w-lg xl:left-[calc(50%_+_17rem)] xl:right-4 xl:max-w-md"
        >
          <div className="glass-card-elevated rounded-[24px] border border-[rgba(25,28,31,0.1)] p-4">
            {iosSafariWarning ? (
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--ink-black)] text-white">
                  <Bell className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--ink-black)]">
                    알림을 받으려면 홈 화면에 추가해주세요
                  </p>
                  <p className="mt-1 text-xs leading-6 text-[var(--granite)]">
                    Safari의 공유 메뉴에서 &quot;홈 화면에 추가&quot;를 선택하면 푸시 알림을 받을 수 있습니다.
                  </p>
                </div>
                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 rounded-full bg-[var(--whisper-cream)] p-1.5 text-[var(--granite)] hover:bg-[var(--soft-bone)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {subscribed ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(0,168,126,0.1)] text-[var(--teal)]">
                      <Check className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-[var(--ink-black)]">
                      알림이 설정되었습니다
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="prompt"
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-start gap-3"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--ink-black)] text-white">
                      <Bell className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--ink-black)]">
                        복지 알림을 받으시겠어요?
                      </p>
                      <p className="mt-1 text-xs leading-6 text-[var(--granite)]">
                        입력 마감 리마인더와 정산 결과를 푸시 알림으로 받을 수 있습니다.
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={handleAllow}
                          className="btn-primary px-4 py-2 text-xs"
                        >
                          알림 허용
                        </button>
                        <button
                          onClick={handleDismiss}
                          className="btn-secondary px-4 py-2 text-xs"
                        >
                          나중에
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={handleDismiss}
                      className="flex-shrink-0 rounded-full bg-[var(--whisper-cream)] p-1.5 text-[var(--granite)] hover:bg-[var(--soft-bone)]"
                    >
                      <X className="h-4 w-4" />
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
