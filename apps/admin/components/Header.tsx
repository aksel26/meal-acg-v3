"use client";

import { usePathname } from "next/navigation";
import dayjs from "dayjs";
import "dayjs/locale/ko";

dayjs.locale("ko");

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "대시보드", subtitle: "식대 관리 현황을 한눈에 확인하세요" },
  "/meal-status": {
    title: "식대관리 - 사용현황",
    subtitle: "식대 사용 내역 및 인원별 정산 관리",
  },
  "/calendar": { title: "식대 입력", subtitle: "일별 식대 기록을 관리합니다" },
  "/monthly": { title: "Monthly 음료", subtitle: "월별 음료 신청 현황 관리" },
  "/lunch-groups": {
    title: "점심조 관리",
    subtitle: "점심조 구성 및 배정 관리",
  },
  "/holidays": { title: "공휴일 관리", subtitle: "공휴일 및 휴무일 설정" },
  "/settings": {
    title: "식대 기본금 설정",
    subtitle: "월별 지원금 및 시스템 설정",
  },
  "/export": {
    title: "엑셀 내보내기",
    subtitle:
      "식대 데이터를 엑셀 파일로 내보냅니다. 원본 양식과 동일한 형식으로 생성됩니다.",
  },
  "/import": {
    title: "식대 데이터 Import",
    subtitle: "Excel 파일에서 식대 데이터를 가져옵니다.",
  },
  "/organization": {
    title: "조직 구성 관리",
    subtitle: "조직의 본부, 팀, 멤버를 관리합니다",
  },
  "/member-status": {
    title: "조직원 현황",
    subtitle: "멤버별 상태(휴직, 파견, 퇴사 등) 이력을 관리합니다",
  },
  "/budget": {
    title: "예산 할당 관리",
    subtitle: "기간별 복지포인트 및 활동비를 멤버에게 할당합니다",
  },
  "/review": {
    title: "사용내역 검토",
    subtitle: "멤버들의 포인트 사용내역을 검토하고 관리합니다",
  },
  "/points-overview": {
    title: "사용 내역 조회",
    subtitle: "전체 조직원의 포인트 사용 내역을 조회합니다",
  },
  "/notifications": {
    title: "알림 관리",
    subtitle: "푸시 알림 발송 및 구독 현황",
  },
};

export default function Header() {
  const pathname = usePathname();
  const pageInfo = pageTitles[pathname] ??
    pageTitles["/"] ?? { title: "대시보드", subtitle: "" };

  return (
    <header className="z-10 flex w-full items-center justify-between px-6 py-6">
      {/* Mobile menu button */}
      {/* <div className="flex items-center gap-4 lg:hidden">
        <button className="flex items-center justify-center rounded-md p-2 text-slate-500 hover:bg-white/50">
          <Menu className="h-5 w-5" />
        </button>
      </div> */}

      {/* Left - Page Title & Search */}
      <div className="flex flex-1 gap-1 md:px-2 flex-col">
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
            className="h-10 w-full rounded-lg border-none bg-white/60 pl-10 pr-4 text-sm text-slate-700 shadow-sm ring-1 ring-white/60 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#135bec]/20"
          />
        </div> */}
      </div>
    </header>
  );
}
