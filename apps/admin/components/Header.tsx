"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/": "대시보드",
  "/users": "사용자 현황",
  "/calendar": "식대 입력",
  "/holidays": "공휴일 관리",
  "/settings": "설정",
  "/export": "엑셀 내보내기",
};

export default function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || "대시보드";

  return (
    <header className="flex h-16 items-center border-b bg-white px-6">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    </header>
  );
}
