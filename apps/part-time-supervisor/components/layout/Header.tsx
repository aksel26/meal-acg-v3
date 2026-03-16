"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/": "대시보드",
  "/job-postings": "공고 관리",
  "/workers": "지원자 관리",
  "/assignments": "배정 관리",
  "/room-assignments": "회의실 배정",
};

export default function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || "감독관";

  return (
    <header className="flex h-14 items-center border-b px-6">
      <h2 className="text-lg font-semibold">{title}</h2>
    </header>
  );
}
