"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/src/dialog";
import { HelpCircle } from "@repo/ui/icons";

export function PointsGuideDialog() {
  return (
    <Dialog>
      <DialogTrigger>
        <HelpCircle
          className="w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors"
          strokeWidth={1.5}
        />
      </DialogTrigger>
      <DialogContent className="max-w-sm sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader className="pb-2 flex-shrink-0">
          <DialogTitle className="text-lg text-center">
            복지포인트 & 활동비 가이드
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2 space-y-5">
          {/* 복지포인트 */}
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-base">💳</span>
              <h3 className="font-semibold text-gray-900 text-[15px]">
                복지포인트
              </h3>
              <span className="text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                전 직원
              </span>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3.5 space-y-3 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">반기 지급액</span>
                <span className="font-semibold text-gray-900">20만원</span>
              </div>
              <hr className="border-gray-200" />
              <ul className="space-y-2 text-gray-600">
                <li className="flex gap-2">
                  <span className="text-gray-300">•</span>
                  본인이 자유롭게 사용 가능
                </li>
                <li className="flex gap-2">
                  <span className="text-gray-300">•</span>
                  개인 물품 구입 시 → P&C팀 보고 → 물품대장 등록
                </li>
                <li className="flex gap-2">
                  <span className="text-gray-300">•</span>
                  퇴사 시 구매 물품은 회사에 귀속
                </li>
              </ul>
              <div className="flex items-center gap-1.5 text-red-500 bg-red-50 rounded px-2.5 py-1.5 text-xs font-medium">
                <span>⚠️</span>
                잔액은 다음 반기로 이월되지 않습니다
              </div>
            </div>
          </section>

          {/* 활동비 */}
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-base">🍽️</span>
              <h3 className="font-semibold text-gray-900 text-[15px]">
                활동비
              </h3>
              <span className="text-[11px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                팀장 · 본부장
              </span>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3.5 space-y-3 text-[13px]">
              <p className="text-gray-600">
                팀원 사기 증진을 위한{" "}
                <span className="font-medium text-gray-900">
                  회식 · 식대 · 음료
                </span>{" "}
                구입 비용
              </p>
              <hr className="border-gray-200" />
              {/* 지급 기준 표 */}
              <div className="space-y-1.5">
                <p className="text-xs text-gray-400 font-medium">
                  직책별 반기 지급액
                </p>
                <div className="grid grid-cols-[1fr_auto] gap-y-1.5 gap-x-4">
                  <span className="text-gray-600">본부장</span>
                  <span className="font-semibold text-gray-900 text-right">
                    본인 포함 1인당 20만원
                  </span>
                  <span className="text-gray-600">팀장</span>
                  <span className="font-semibold text-gray-900 text-right">
                    본인 포함 1인당 15만원
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-500 bg-white border border-gray-100 rounded px-2.5 py-2">
                  <span className="font-medium text-gray-700">P&C팀 팀장</span>
                  : 팀원 1인당 15만원 + 기타 인원 1인당 5만원
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 rounded px-2.5 py-1.5 text-xs font-medium">
                <span>📌</span>
                물품 구매에는 사용할 수 없습니다
              </div>
            </div>
          </section>

          {/* 공통 안내 */}
          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-base">📋</span>
              <h3 className="font-semibold text-gray-900 text-[15px]">
                공통 안내
              </h3>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3.5 text-[13px]">
              <ul className="space-y-2.5 text-gray-600">
                <li className="flex gap-2">
                  <span className="text-gray-300">•</span>
                  <span>
                    운영 기간:{" "}
                    <span className="font-medium text-gray-900">
                      상반기 1~6월 / 하반기 7~12월
                    </span>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-gray-300">•</span>
                  본인 부재 시 법인카드를 차선임에게 전달하여 결제
                </li>
                <li className="flex gap-2">
                  <span className="text-gray-300">•</span>
                  업무용 물품은 P&C팀 사전 승인 후 별도 결제 (포인트 차감 없음)
                </li>
              </ul>
            </div>
          </section>

          {/* 문의 */}
          <div className="text-center text-xs text-gray-400 pb-1">
            문의사항은{" "}
            <span className="font-medium text-gray-600">P&C팀</span>으로
            연락해주세요
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
