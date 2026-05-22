"use client";

import { usePathname } from "next/navigation";

export default function DashboardContentFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDashboardPage = pathname === "/";

  return (
    <div
      className={`flex-1 overflow-y-auto scroll-smooth px-6 py-4 ${isDashboardPage ? "bg-[#fafafc]" : ""}`}
    >
      <div className="md:px-2">{children}</div>
    </div>
  );
}
