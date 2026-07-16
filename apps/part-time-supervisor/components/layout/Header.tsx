"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/": "대시보드",
  "/supervisor/job-postings": "공고 관리",
  "/supervisor/workers": "지원자 관리",
  "/supervisor/cost-management": "감독관 정산 관리",
  "/room-assignments": "회의실 배정",
  "/interview/job-postings": "면접교육 공고 관리",
  "/interview/personnel": "면접교육 인력 관리",
  "/interview/settlement": "면접교육 정산 관리",
};

export default function Header() {
  const pathname = usePathname();
  const title =
    pageTitles[pathname] ||
    (pathname.startsWith("/supervisor/job-postings/")
      ? "공고 상세"
      : pathname.startsWith("/interview/job-postings/")
        ? "면접교육 공고 상세"
        : "");

  return (
    <header className="sticky top-0 z-20 px-4 pt-3 md:px-8 md:pt-4">
      <div className="flex min-h-12 items-center rounded-2xl bg-slate-50 px-4 py-3 md:bg-transparent md:px-0">
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      </div>
    </header>
  );
}
