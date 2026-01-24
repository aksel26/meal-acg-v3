"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, Calendar as CalendarIcon } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/ko";

dayjs.locale("ko");

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "대시보드", subtitle: "식대 관리 현황을 한눈에 확인하세요" },
  "/users": { title: "사용자 현황", subtitle: "팀원별 식대 사용 현황 및 정산 관리" },
  "/calendar": { title: "식대 입력", subtitle: "일별 식대 기록을 관리합니다" },
  "/holidays": { title: "공휴일 관리", subtitle: "공휴일 및 휴무일 설정" },
  "/settings": { title: "설정", subtitle: "월별 지원금 및 시스템 설정" },
  "/export": { title: "엑셀 내보내기", subtitle: "데이터 다운로드 및 보고서 생성" },
};

export default function Header() {
  const pathname = usePathname();
  const pageInfo = pageTitles[pathname] || pageTitles["/"];
  const today = dayjs();

  return (
    <header className="flex h-[72px] items-center justify-between border-b border-slate-200/60 bg-white/80 px-8 backdrop-blur-sm">
      {/* Left - Page Title */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          {pageInfo.title}
        </h2>
        <p className="text-sm text-slate-500">{pageInfo.subtitle}</p>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-4">
        {/* Date Display */}
        <div className="hidden items-center gap-2 rounded-xl bg-slate-100/80 px-4 py-2 md:flex">
          <CalendarIcon className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-slate-600">
            {today.format("YYYY년 M월 D일")}
          </span>
          <span className="text-xs text-slate-400">
            ({today.format("ddd")})
          </span>
        </div>

        {/* Search Button */}
        <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100/80 text-slate-500 transition-all hover:bg-slate-200/80 hover:text-slate-700">
          <Search className="h-[18px] w-[18px]" />
        </button>

        {/* Notifications */}
        <button className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100/80 text-slate-500 transition-all hover:bg-slate-200/80 hover:text-slate-700">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
          </span>
        </button>
      </div>
    </header>
  );
}
