"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "대시보드",
    subtitle: "감독관·면접교육 운영 현황을 한눈에 확인하세요",
  },
  "/supervisor/job-postings": {
    title: "공고 관리",
    subtitle: "감독관 공고 등록과 배정 현황을 관리합니다",
  },
  "/supervisor/workers": {
    title: "지원자 관리",
    subtitle: "지원자 등록, 계약, 배정 이력을 관리합니다",
  },
  "/supervisor/cost-management": {
    title: "감독관 정산 관리",
    subtitle: "감독관 근무 기록과 정산 내역을 관리합니다",
  },
  "/room-assignments": {
    title: "회의실 배정",
    subtitle: "면접교육 회의실 배정 현황을 관리합니다",
  },
  "/interview/job-postings": {
    title: "면접교육 공고 관리",
    subtitle: "면접교육 공고와 인력 배정을 관리합니다",
  },
  "/interview/personnel": {
    title: "면접교육 인력 관리",
    subtitle: "면접교육 인력 정보와 활동 현황을 관리합니다",
  },
  "/interview/settlement": {
    title: "면접교육 정산 관리",
    subtitle: "면접교육 정산과 지출결의를 관리합니다",
  },
};

export default function Header() {
  const pathname = usePathname();
  const pageInfo =
    pageTitles[pathname] ||
    (pathname.startsWith("/supervisor/job-postings/")
      ? { title: "공고 상세", subtitle: "공고 정보와 배정 인원을 확인합니다" }
      : pathname.startsWith("/interview/job-postings/")
        ? {
            title: "면접교육 공고 상세",
            subtitle: "공고 정보와 배정 인원을 확인합니다",
          }
        : { title: "", subtitle: "" });

  return (
    <header className="z-10 flex w-full items-center justify-between px-6 py-3.5">
      <div className="flex flex-1 flex-col gap-1 md:px-2">
        <h2 className="text-[21px] font-semibold leading-tight tracking-[-0.02em] text-[#1d1d1f] md:block">
          {pageInfo.title}
        </h2>
        <p className="text-sm leading-5 tracking-[-0.01em] text-[#7a7a7a]">
          {pageInfo.subtitle}
        </p>
      </div>
    </header>
  );
}
