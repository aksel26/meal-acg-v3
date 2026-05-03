"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/src/dialog";
import { HelpCircle } from "@repo/ui/icons";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-[12px] text-[var(--slate-gray)]">
        {label}
      </span>
      <span className="text-right text-[13px] font-medium text-[var(--ink-black)]">
        {value}
      </span>
    </div>
  );
}

function GuideBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-[13px] leading-5 text-[var(--granite)]">
      <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--slate-gray)]/35" />
      <span>{children}</span>
    </li>
  );
}

export function PointsGuideDialog() {
  return (
    <Dialog>
      <DialogTrigger>
        <HelpCircle
          className="w-6 h-6 text-[var(--slate-gray)] transition-colors hover:text-[var(--ink-black)]"
          strokeWidth={1.5}
        />
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] max-w-sm flex-col rounded-[28px] border-0 bg-white p-0 sm:max-w-lg">
        <DialogHeader className="flex-shrink-0 px-5 pb-3 pt-5">
          <DialogTitle className="text-center text-lg font-medium text-[var(--ink-black)]">
            복지포인트 & 활동비 가이드
          </DialogTitle>
          <p className="mt-1 text-center text-xs text-[var(--slate-gray)]">
            지급 기준과 사용 범위를 빠르게 확인하세요
          </p>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-5">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[18px] bg-[rgba(244,241,232,0.58)] p-3">
              <p className="text-[11px] text-[var(--granite)]">복지포인트</p>
              <p className="mt-1 text-lg font-medium text-[var(--ink-black)]">
                20만원
              </p>
              <p className="mt-1 text-[11px] text-[var(--granite)]">전 직원</p>
            </div>
            <div className="rounded-[18px] bg-[rgba(244,241,232,0.58)] p-3">
              <p className="text-[11px] text-[var(--granite)]">활동비</p>
              <p className="mt-1 text-lg font-medium text-[var(--ink-black)]">
                15만원
              </p>
              <p className="mt-1 text-[11px] text-[var(--granite)]">팀장</p>
            </div>
          </div>

          {/* 복지포인트 */}
          <section className="rounded-[22px] bg-[rgba(244,241,232,0.58)] p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <h3 className="text-[15px] font-medium text-[var(--ink-black)]">
                복지포인트
              </h3>
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] text-[var(--granite)]">
                전 직원
              </span>
            </div>
            <div className="space-y-3">
              <InfoRow label="반기 지급액" value="20만원" />
              <ul className="space-y-2">
                <GuideBullet>본인이 자유롭게 사용 가능</GuideBullet>
                <GuideBullet>
                  개인 물품 구입 시 P&C팀 보고 후 물품대장 등록
                </GuideBullet>
                <GuideBullet>퇴사 시 구매 물품은 회사에 귀속</GuideBullet>
              </ul>
              <div className="rounded-[14px] bg-[rgba(208,50,56,0.08)] px-3 py-2 text-xs font-medium text-[#d03238]">
                잔액은 다음 반기로 이월되지 않습니다
              </div>
            </div>
          </section>

          {/* 활동비 */}
          <section className="rounded-[22px] bg-[rgba(244,241,232,0.58)] p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <h3 className="text-[15px] font-medium text-[var(--ink-black)]">
                활동비
              </h3>
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] text-[var(--granite)]">
                팀장
              </span>
            </div>
            <div className="space-y-3">
              <p className="text-[13px] leading-5 text-[var(--granite)]">
                팀원 사기 증진을 위한{" "}
                <span className="font-medium text-[var(--ink-black)]">
                  회식 · 식대 · 음료
                </span>{" "}
                구입 비용
              </p>
              <div className="space-y-2 rounded-[16px] bg-white/65 p-3">
                <InfoRow label="팀장" value="본인 포함 1인당 15만원" />
                <div className="rounded-[12px] bg-[rgba(244,241,232,0.75)] px-3 py-2 text-xs leading-5 text-[var(--granite)]">
                  <span className="font-medium text-[var(--ink-black)]">
                    P&C팀 팀장
                  </span>
                  : 팀원 1인당 15만원 + 기타 인원 1인당 5만원
                </div>
              </div>
              <div className="rounded-[14px] bg-[rgba(236,126,0,0.1)] px-3 py-2 text-xs font-medium text-[#9a4f00]">
                물품 구매에는 사용할 수 없습니다
              </div>
            </div>
          </section>

          {/* 공통 안내 */}
          <section className="rounded-[22px] bg-[rgba(244,241,232,0.58)] p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <h3 className="text-[15px] font-medium text-[var(--ink-black)]">
                공통 안내
              </h3>
            </div>
            <div>
              <ul className="space-y-2.5">
                <GuideBullet>
                  운영 기간:{" "}
                  <span className="font-medium text-[var(--ink-black)]">
                    상반기 1~6월 / 하반기 7~12월
                  </span>
                </GuideBullet>
                <GuideBullet>
                  본인 부재 시 법인카드를 차선임에게 전달하여 결제
                </GuideBullet>
                <GuideBullet>
                  업무용 물품은 P&C팀 사전 승인 후 별도 결제 (포인트 차감 없음)
                </GuideBullet>
              </ul>
            </div>
          </section>

          {/* 문의 */}
          <div className="rounded-full bg-[var(--whisper-cream)] px-4 py-2 text-center text-xs text-[var(--granite)]">
            문의사항은{" "}
            <span className="font-medium text-[var(--ink-black)]">P&C팀</span>
            으로 연락해주세요
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
