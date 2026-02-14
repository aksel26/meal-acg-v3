"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@repo/ui/src/dialog";
import { Button } from "@repo/ui/src/button";
import { Checkbox } from "@repo/ui/src/checkbox";
import confetti from "canvas-confetti";

// 현재 공지사항 버전 - 새 공지가 있을 때 이 값을 변경하면 다시 보지 않기 해제
const NOTICE_VERSION = "v2.0";

// 모듈 레벨 변수: mount/unmount/remount 사이클에서도 유지되어 중복 표시 방지
// 페이지 새로고침 시 초기화됨
let hasShownForVersion = "";

export function UpdateNotificationDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (hasShownForVersion === NOTICE_VERSION) return;
    const savedVersion = localStorage.getItem("hideNoticeVersion");
    if (savedVersion !== NOTICE_VERSION) {
      hasShownForVersion = NOTICE_VERSION;
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.3 },
        colors: ["#f472b6", "#60a5fa", "#facc15", "#4ade80", "#c084fc", "#fb923c"],
        ticks: 120,
        gravity: 1.2,
        scalar: 0.8,
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (dontShowAgain) {
      localStorage.setItem("hideNoticeVersion", NOTICE_VERSION);
    }
    setIsOpen(false);
  }, [dontShowAgain]);

  const updateItems = [
    {
      icon: "🔔",
      title: "푸시 알림",
      description: "중요한 소식을 푸시 알림으로 받을 수 있습니다.",
    },
    {
      icon: "📊",
      title: "복지포인트 / 활동비 관리 추가",
      description: "대리결제 입력이 추가되었습니다.",
    },
    {
      icon: "🖥️",
      title: "통합 관리를 위한 어드민 페이지",
      description: "P&C용 관리 페이지가 추가되었습니다.",
    },
    {
      icon: "🍚",
      title: "사용내역 입력 개선",
      description: "단계별 입력으로 더 쉽게 식대를 등록할 수 있습니다.",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm mx-auto max-h-[85vh] flex flex-col">
        <DialogHeader className="text-center shrink-0">
          <DialogTitle className="text-base sm:text-lg text-center font-medium text-gray-900">
            새로운 기능이 추가되었습니다!
          </DialogTitle>
        </DialogHeader>

        <div className="py-3 space-y-3 overflow-y-auto flex-1 min-h-0">
          {updateItems.map((item, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <span className="text-lg shrink-0 mt-0.5">{item.icon}</span>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 mb-1">{item.title}</h4>
                <p className="text-xs text-gray-600">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-2 py-3 border-t shrink-0">
          <Checkbox
            id="dontShowAgain"
            checked={dontShowAgain}
            onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
          />
          <label htmlFor="dontShowAgain" className="text-xs text-gray-600 cursor-pointer select-none">
            다시 보지 않기
          </label>
        </div>

        <DialogFooter className="flex flex-col sm:flex-col gap-2 shrink-0">
          <Button
            onClick={handleClose}
            className="w-full text-sm"
          >
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
