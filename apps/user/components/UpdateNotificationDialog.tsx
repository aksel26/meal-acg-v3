"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@repo/ui/src/dialog";
import { Button } from "@repo/ui/src/button";
import { Checkbox } from "@repo/ui/src/checkbox";
import { Badge } from "@repo/ui/src/badge";
import { Sparkles } from "@repo/ui/icons";
import Onigiri from "@/public/images/logo.png";
import Image from "next/image";
interface UpdateNotificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpdateNotificationDialog({ isOpen, onClose }: UpdateNotificationDialogProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    // if (dontShowAgain) {
    // localStorage에 다시 보지 않기 플래그 저장
    localStorage.setItem("hideUpdateNotification", "true");
    // }
    onClose();
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
      <DialogContent className="max-w-sm! mx-auto">
        <DialogHeader className="text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="w-32 h-18 bg-gradient-to-r from-blue-100 to-purple-200 rounded-full flex items-center justify-center mb-8 pt-4">
              <Image src={Onigiri} alt="식대 아이콘" height={240} width={180} className="scale-150" />
              {/* <Onigiri className="w-6 h-6 text-white" /> */}
            </div>
          </div>
          <DialogTitle className="sm:text-lg text-md text-center font-medium text-gray-900">새로운 기능이 추가되었습니다! 🎉</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4 max-h-80 overflow-y-auto">
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

        {/* <div className="flex items-center space-x-2 py-3 border-t">
          <Checkbox id="dontShowAgain" checked={dontShowAgain} onCheckedChange={(checked) => setDontShowAgain(checked as boolean)} />
          <label htmlFor="dontShowAgain" className="text-xs text-gray-600 cursor-pointer">
            다시 보지 않기
          </label>
        </div> */}

        <DialogFooter>
          <Button onClick={handleClose} className="w-full text-sm bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
            확인했습니다
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
