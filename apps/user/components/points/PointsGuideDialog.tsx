"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@repo/ui/src/dialog";
import { Badge } from "@repo/ui/src/badge";
import { HelpCircle } from "@repo/ui/icons";

export function PointsGuideDialog() {
  return (
    <Dialog>
      <DialogTrigger>
        <HelpCircle className="w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors" strokeWidth={1.5} />
      </DialogTrigger>
      <DialogContent className=" max-w-sm sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader className="pb-2 flex-shrink-0">
          <DialogTitle className="text-lg text-center">복지포인트 & 활동비 가이드</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {/* 복지포인트 섹션 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-gray-800 rounded-full"></div>
              <h3 className="font-semibold text-gray-900 text-base">복지포인트</h3>
              <Badge variant="outline" className="text-xs">
                전 직원
              </Badge>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border">
                <span className="font-medium text-gray-900">지급액:</span>
                <span className="text-gray-700">반기별 20만원</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-2">특징</p>
                <ul className="space-y-1.5 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <span>본인이 자유롭게 활용 가능한 비용</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <span>개인 물품 구입 시 퇴사 시 회사 물품으로 귀속</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <span>구매한 개인 물품은 P&C팀 보고 후 물품대장 등록</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-1">•</span>
                    <span className="text-red-600">반기별 잔액은 다음 반기로 이월되지 않음</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* 활동비 섹션 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-gray-800 rounded-full"></div>
              <h3 className="font-semibold text-gray-900 text-base">활동비</h3>
              <Badge variant="outline" className="text-xs">
                팀장/본부장
              </Badge>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-gray-900 mb-2">용도</p>
                <p className="text-gray-600 mb-1">팀원들의 사기 증진을 위한 회식, 식대, 음료 구입</p>
                <p className="text-red-600 text-xs">※ 물품 구매에는 활용 불가</p>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-3">직책별 지급 기준</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded border">
                    <span className="font-medium text-gray-700">본부장</span>
                    <span className="text-gray-900 font-medium">본인 포함 1인당 20만원</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded border">
                    <span className="font-medium text-gray-700">팀장</span>
                    <span className="text-gray-900 font-medium">본인 포함 1인당 15만원</span>
                  </div>
                  <div className="p-2 bg-gray-50 rounded border">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-gray-700">P&C팀 팀장</span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p>• 본인 포함 팀원 수 1인당 15만원</p>
                      <p>• 기타 인원 당 5만원</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 사용 가이드 섹션 */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-gray-800 rounded-full"></div>
              <h3 className="font-semibold text-gray-900 text-md">사용 가이드</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded border">
                <span className="font-medium text-gray-900">운영 기간:</span>
                <span className="text-gray-700">1~6월 / 7~12월 반기별</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-2">필수 준수사항</p>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <span>1~6월, 7~12월 반기 별로 산정하여 사용하며, 반기별 잔액은 다음 반기로 이월되지 않음</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <span>본인 미참여 시 법인카드를 차선임에게 전달하여 결제</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <span>회사 업무로 필요한 물품은 People&Culture팀 승인 후 결제 가능하며, 해당 비용은 활동비와 복지포인트에서 차감되지 않음</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <span>복지포인트로 구매한 개인 물품은 People&Culture팀에게 보고 후 물품대장에 등록함</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* 문의 섹션 */}
          <div className="pt-4 border-t border-gray-200">
            <div className="bg-gray-50 rounded-lg p-3 text-center border">
              <p className="text-sm text-gray-600">
                <span className="font-medium">문의사항</span>이 있으시면
              </p>
              <p className="text-sm font-semibold text-gray-800 mt-1">People&Culture팀으로 연락해주세요</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
