"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@repo/ui/src/dialog";
import { Button } from "@repo/ui/src/button";
import { Checkbox } from "@repo/ui/src/checkbox";
import { Badge } from "@repo/ui/src/badge";
import Onigiri from "@/public/images/logo.png";
import Image from "next/image";

// 현재 공지사항 버전 - 새 공지가 있을 때 이 값을 변경하면 다시 보지 않기 해제
const NOTICE_VERSION = "v1.3";

interface UpdateNotificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpdateNotificationDialog({ isOpen, onClose }: UpdateNotificationDialogProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    if (dontShowAgain) {
      // localStorage에 다시 보지 않기 플래그와 버전 저장
      localStorage.setItem("hideNoticeVersion", NOTICE_VERSION);
    }
    onClose();
  };

  const handleOpenNotice = () => {
    window.open("https://aksel26.notion.site/v1-3-25dc8e16fda88016a7b0cf0d12bcbc80?pvs=74", "_blank");
  };

  const updateItems = [
    {
      title: "복지포인트/활동비 통합 관리",
      description: "복지포인트와 활동비를 한 곳에서 편리하게 관리할 수 있습니다.",
      isNew: true,
    },
    {
      title: "실시간 데이터 연동",
      description: "Google Sheets와 실시간으로 연동되어 최신 데이터를 확인할 수 있습니다.",
      isNew: true,
    },
    {
      title: "내역 추가/수정/삭제",
      description: "포인트 사용 내역을 직접 추가, 수정, 삭제할 수 있습니다.",
      isNew: true,
    },
    {
      title: "권한별 UI 분기",
      description: "팀장/본부장은 활동비까지, 일반 직원은 복지포인트만 확인 가능합니다.",
      isNew: true,
    },
    {
      title: "다양한 정렬 옵션",
      description: "최신순, 오래된순, 금액순으로 내역을 정렬할 수 있습니다.",
      isNew: true,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm mx-auto max-h-[85vh] flex flex-col">
        <DialogHeader className="text-center shrink-0">
          <div className="flex items-center justify-center mb-2">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-200 rounded-full flex items-center justify-center">
              <Image src={Onigiri} alt="식대 아이콘" height={48} width={48} />
            </div>
          </div>
          <DialogTitle className="text-base sm:text-lg text-center font-medium text-gray-900">
            새로운 기능이 추가되었습니다! 🎉
          </DialogTitle>
        </DialogHeader>

        <div className="py-3 space-y-3 overflow-y-auto flex-1 min-h-0">
          {updateItems.map((item, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="text-sm font-medium text-gray-900">{item.title}</h4>
                  {item.isNew && <Badge className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5">NEW</Badge>}
                </div>
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
            className="w-full text-sm bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
          >
            확인
          </Button>
          <Button
            variant="ghost"
            onClick={handleOpenNotice}
            className="w-full text-xs text-gray-500 hover:text-gray-700"
          >
            자세히 보기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
