"use client";

import { usePathname } from "next/navigation";
import dayjs from "dayjs";
import "dayjs/locale/ko";

dayjs.locale("ko");

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "대시보드", subtitle: "식대 관리 현황을 한눈에 확인하세요" },
  "/meal-status": {
    title: "식대관리 - 사용현황 (인원별)",
    subtitle: "팀원별 식대 사용 현황 및 정산 관리",
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
  "/admin-audit-logs": {
    title: "감사 로그",
    subtitle: "민감정보 조회, 권한 변경, 다운로드 기록을 확인합니다",
  },
  "/permission-policies": {
    title: "권한 관리",
    subtitle: "대표 전용 역할 권한과 직원별 예외 권한을 설정합니다",
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
    title: "조직 구성",
    subtitle: "조직원 현황을 확인하고 편집 모드에서 조직 구성을 관리합니다",
  },
  "/job-titles": {
    title: "직급/직책 관리",
    subtitle: "조직의 직급과 직책을 관리합니다",
  },
  "/evaluations": {
    title: "다면평가",
    subtitle: "회차별 문항, 대상자, 평가자 배정을 설정합니다",
  },
  "/attendance": {
    title: "출퇴근 관리",
    subtitle: "조직원의 출퇴근 기록을 관리합니다",
  },
  "/leave-balances": {
    title: "잔여 휴가 현황",
    subtitle: "조직원별 잔여 휴가 현황을 조회합니다",
  },
  "/leave-types": {
    title: "휴가 유형 관리",
    subtitle: "근태 유형의 차감, 할당, 통계 포함 기준을 관리합니다",
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
  "/assets": {
    title: "물품관리대장",
    subtitle: "구성원별 등록 현황과 전체 물품 목록을 확인합니다.",
  },
  "/lockers": {
    title: "개인 사물함 관리",
    subtitle: "사물함 위치, 배정 현황, 사용자 요청을 처리합니다.",
  },
  "/vehicles": {
    title: "사내 차량관리",
    subtitle: "차량 등록 현황과 신청 내역을 관리합니다.",
  },
  "/dayoffs": {
    title: "연차 관리",
    subtitle: "연차 등록, 승인, 통계를 관리합니다",
  },
  "/notifications": {
    title: "알림 관리",
    subtitle: "푸시 알림 발송 및 구독 현황",
  },
  "/finance/clients": {
    title: "고객사 관리",
    subtitle: "고객사 기본 정보와 거래 상태를 관리합니다",
  },
  "/finance/projects": {
    title: "프로젝트/계약 관리",
    subtitle: "고객사별 프로젝트와 계약 정보를 관리합니다",
  },
  "/finance/quotes": {
    title: "견적서 관리",
    subtitle: "견적서 품목, 금액, 승인 상태를 관리합니다",
  },
  "/finance/revenue": {
    title: "매출 관리",
    subtitle: "매출 예정, 세금계산서, 입금 상태를 관리합니다",
  },
  "/finance/expenses": {
    title: "비용 정산",
    subtitle: "프로젝트 비용 정산과 승인·지급 상태를 관리합니다",
  },
  "/finance/reports": {
    title: "정산 리포트",
    subtitle: "매출, 비용, 마진과 미수·미지급 현황을 확인합니다",
  },
  "/work-applications": {
    title: "근무 신청 관리",
    subtitle:
      "시간외·주말근무 신청의 팀별 진행 내역과 전체 인원 내역을 조회합니다.",
  },
  "/approvals": {
    title: "승인 관리",
    subtitle: "대기 건을 우선 처리하고 완료/반려 이력을 확인합니다.",
  },
};

export default function Header() {
  const pathname = usePathname();
  const normalizedPathname = pathname.startsWith("/organization/members/")
    ? "/organization/members"
    : pathname.startsWith("/evaluations/")
      ? "/evaluations"
      : pathname;

  const dynamicPageTitles: Record<string, { title: string; subtitle: string }> =
    {
      "/organization/members": {
        title: "조직원 상세",
        subtitle: "조직원의 기본 정보와 현재 운영 요약을 확인합니다",
      },
    };

  const pageInfo = dynamicPageTitles[normalizedPathname] ??
    pageTitles[normalizedPathname] ??
    pageTitles["/"] ?? { title: "대시보드", subtitle: "" };

  return (
    <header className="admin-topbar z-10 flex w-full items-center justify-between px-6 py-3.5">
      {/* Mobile menu button */}
      {/* <div className="flex items-center gap-4 lg:hidden">
        <button className="flex items-center justify-center rounded-md p-2 text-slate-500 hover:bg-white/50">
          <Menu className="h-5 w-5" />
        </button>
      </div> */}

      {/* Left - Page Title & Search */}
      <div className="flex flex-1 flex-col gap-1 md:px-2">
        <h2 className="text-[21px] font-semibold leading-tight tracking-[-0.02em] text-[#1d1d1f] md:block">
          {pageInfo.title}
        </h2>
        <p className="text-sm leading-5 tracking-[-0.01em] text-[#7a7a7a]">
          {pageInfo.subtitle}
        </p>

        {/* Search Bar */}
        {/* <div className="relative max-w-md flex-1 md:block">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="검색..."
            className="h-10 w-full rounded-lg border-none bg-white/60 pl-10 pr-4 text-sm text-slate-700 ring-1 ring-white/60 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]/20"
          />
        </div> */}
      </div>
    </header>
  );
}
