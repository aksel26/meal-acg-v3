"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, Calendar as CalendarIcon, Menu } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/ko";

dayjs.locale("ko");

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "대시보드", subtitle: "식대 관리 현황을 한눈에 확인하세요" },
  "/users": { title: "식대관리 - 사용현황 (인원별)", subtitle: "팀원별 식대 사용 현황 및 정산 관리" },
  "/calendar": { title: "식대 입력", subtitle: "일별 식대 기록을 관리합니다" },
  "/monthly": { title: "Monthly 음료", subtitle: "월별 음료 신청 현황 관리" },
  "/lunch-groups": { title: "점심조 관리", subtitle: "점심조 구성 및 배정 관리" },
  "/holidays": { title: "공휴일 관리", subtitle: "공휴일 및 휴무일 설정" },
  "/settings": { title: "식대 기본금 설정", subtitle: "월별 지원금 및 시스템 설정" },
  "/export": { title: "엑셀 내보내기", subtitle: "데이터 다운로드 및 보고서 생성" },
  "/import": { title: "엑셀 가져오기", subtitle: "데이터 업로드" },
  "/organization": { title: "조직 구성 관리", subtitle: "조직의 본부, 팀, 멤버를 관리합니다" },
  "/member-status": { title: "조직원 현황", subtitle: "멤버별 상태(휴직, 파견, 퇴사 등) 이력을 관리합니다" },
  "/budget": { title: "예산 할당 관리", subtitle: "기간별 복지포인트 및 활동비를 멤버에게 할당합니다" },
  "/review": { title: "사용내역 검토", subtitle: "멤버들의 포인트 사용내역을 검토하고 관리합니다" },
};

export default function Header() {
  const pathname = usePathname();
  const pageInfo = pageTitles[pathname] ?? pageTitles["/"] ?? { title: "대시보드", subtitle: "" };
  const today = dayjs();
  console.log("🔍 ~ Header ~ apps/admin/components/Header.tsx:39 ~ pageInfo:", pageInfo);
  return (
    <header className="z-10 flex w-full items-center justify-between px-6 py-4">
      {/* Mobile menu button */}
      {/* <div className="flex items-center gap-4 lg:hidden">
        <button className="flex items-center justify-center rounded-lg p-2 text-slate-500 hover:bg-white/50">
          <Menu className="h-5 w-5" />
        </button>
      </div> */}

      {/* Left - Page Title & Search */}
      <div className="flex flex-1 gap-1 md:px-4 flex-col">
        <h2 className="text-xl font-semibold tracking-tight text-slate-800 md:block">
          {pageInfo.title}
        </h2>
        <p className="text-slate-500">{pageInfo.subtitle}</p>

        {/* Search Bar */}
        {/* <div className="relative max-w-md flex-1 md:block">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="검색..."
            className="h-10 w-full rounded-xl border-none bg-white/60 pl-10 pr-4 text-sm text-slate-700 shadow-sm ring-1 ring-white/60 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#135bec]/20"
          />
        </div> */}
      </div>

    </header>
  );
}
