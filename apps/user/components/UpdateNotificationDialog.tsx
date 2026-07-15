"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@repo/ui/src/dialog";
import { Button } from "@repo/ui/src/button";
import { Checkbox } from "@repo/ui/src/checkbox";
// 현재 공지사항 버전 - 새 공지가 있을 때 이 값을 변경하면 다시 보지 않기 해제
const NOTICE_VERSION = "v2.3";

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

  const handleClose = useCallback(() => {
    if (dontShowAgain) {
      localStorage.setItem("hideNoticeVersion", NOTICE_VERSION);
    }
    setIsOpen(false);
  }, [dontShowAgain]);

  const guideItems: Array<{
    icon: string;
    title: string;
    steps: string[];
  }> = [
    {
      icon: "",
      title: "본인 카드로 결제한 경우",
      steps: [
        "결제자 → 본인 선택",
        "혼자 결제 → 동반 결제자는 빈칸으로 두고 진행",
        "같이 결제 → 동반 결제자에서 본인 제외 인원 선택",
      ],
    },
    {
      icon: "",
      title: "타인 카드로 결제한 경우",
      steps: [
        "결제자 → 카드 명의자(결제해 준 사람) 선택",
        "이후 안내에 따라 진행",
      ],
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose} modal={true}>
      <DialogContent className="max-w-sm mx-auto max-h-[85vh] flex flex-col">
        <DialogHeader className="text-center shrink-0">
          <DialogTitle className="text-lg sm:text-xl text-center font-medium text-slate-900">
            복지포인트 입력 안내
          </DialogTitle>
        </DialogHeader>

        <div className="py-3 space-y-3 overflow-y-auto flex-1 min-h-0">
          {guideItems.map((item, index) => (
            <div key={index} className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg shrink-0">{item.icon}</span>
                <h4 className="text-base font-medium text-slate-900">{item.title}</h4>
              </div>
              <ol className="space-y-1.5 pl-6">
                {item.steps.map((step, stepIndex) => (
                  <li key={stepIndex} className="text-sm text-slate-600 leading-relaxed list-decimal">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        <div className="px-3 py-3 bg-blue-50 rounded-lg shrink-0 space-y-1">
          <p className="text-sm text-blue-800 leading-relaxed">
            · 동반 결제자도 <span className="font-semibold">각자 별도로</span> 내역을 입력해야 합니다.
          </p>
          <p className="text-sm text-blue-800 leading-relaxed">
            · 동반 결제자에게는 <span className="font-semibold">입력 안내 푸시 알림</span>이 자동 전송됩니다.
          </p>
        </div>

        <div className="px-1 pb-2 shrink-0">
          <p className="text-sm text-slate-500 text-center">
            입력이 어려우시거나 궁금한 점이 있으시면
            <br />
            <span className="font-semibold">P&C팀</span> 또는 <span className="font-semibold">HR Tech팀 김현민 선임</span>에게 문의해 주세요.
          </p>
        </div>
        <div className="flex items-center space-x-2 py-3 border-t shrink-0">
          <Checkbox
            id="dontShowAgain"
            checked={dontShowAgain}
            onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
          />
          <label htmlFor="dontShowAgain" className="text-sm text-slate-600 cursor-pointer select-none">
            다시 보지 않기
          </label>
        </div>

        

        <DialogFooter className="flex flex-col sm:flex-col gap-2 shrink-0">
          <Button
            onClick={handleClose}
            className="w-full text-base"
          >
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
