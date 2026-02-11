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
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7일

export default function PushNotificationPrompt() {
  const { userId, isLoggedIn } = useUserStore();
  const [visible, setVisible] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [iosSafariWarning, setIosSafariWarning] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !userId) return;

    // iOS Safari (standalone 아닌 경우) 안내
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
      // 이미 허용된 경우: 기존 구독이 없을 때만 재구독
      (async () => {
        const existing = await getExistingSubscription();
        if (!existing) {
          subscribeToPush(userId);
        }
      })();
      return;
    }

    if (permission === "denied") return;

    // "default" 상태: 프롬프트 표시 (이전에 닫은 지 7일 지났는지 확인)
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed && Date.now() - Number(dismissed) < DISMISS_DURATION_MS) return;

    // permission이 "default"이면 구독이 없으므로 바로 표시
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
          exit={{ y: -80, transition: { duration: 0.4, ease: "easeIn" } }}
          transition={{ type: "spring", stiffness: 120, damping: 14 }}
          className={`fixed top-0 z-40 px-4 pt-4 max-xl:w-full max-xl:max-w-lg max-xl:inset-x-0 max-xl:mx-auto xl:left-[calc(50%_+_17rem)] xl:right-4 xl:max-w-md`}
        >
          <div className="rounded-2xl border border-white/30 bg-white/20 p-4 shadow-xl backdrop-blur-xl">
            {iosSafariWarning ? (
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/15 backdrop-blur-sm">
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 10, -10, 5, -5, 0] }}
                    transition={{ duration: 0.8, delay: 0.5, repeat: Infinity, repeatDelay: 1.5 }}
                    style={{ originX: 0.5, originY: 0.15 }}
                  >
                    <Bell className="h-5 w-5 text-blue-600" />
                  </motion.div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    알림을 받으려면 홈 화면에 추가해주세요
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Safari 하단의 공유 버튼을 누르고 &quot;홈 화면에 추가&quot;를 선택하면 푸시
                    알림을 받을 수 있습니다.
                  </p>
                </div>
                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 rounded-full p-1 text-slate-400 hover:bg-white/30 hover:text-slate-600"
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
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.3 }}
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-500/15"
                    >
                      <Check className="h-5 w-5 text-green-600" />
                    </motion.div>
                    <p className="text-sm font-semibold text-slate-900">
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
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/15 backdrop-blur-sm">
                      <motion.div
                        animate={{ rotate: [0, 15, -15, 10, -10, 5, -5, 0] }}
                        transition={{ duration: 0.8, delay: 0.5, repeat: Infinity, repeatDelay: 1.5 }}
                        style={{ originX: 0.5, originY: 0.15 }}
                      >
                        <Bell className="h-5 w-5 text-blue-600" />
                      </motion.div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        식대 알림을 받으시겠어요?
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        입력 마감 리마인더, 정산 결과 등을 푸시 알림으로 받을 수 있습니다.
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={handleAllow}
                          className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                        >
                          알림 허용
                        </button>
                        <button
                          onClick={handleDismiss}
                          className="rounded-lg bg-slate-100 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          나중에
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={handleDismiss}
                      className="flex-shrink-0 rounded-full p-1 text-slate-400 hover:bg-white/30 hover:text-slate-600"
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
