"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Users, LayoutDashboard, DoorOpen } from "lucide-react";

const navItems = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/job-postings", label: "공고 관리", icon: Briefcase },
  { href: "/workers", label: "지원자 관리", icon: Users },
  { href: "/room-assignments", label: "회의실 배정", icon: DoorOpen },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col rounded-lg bg-slate-900 p-4 text-white">
      <Link href="/" className="mb-8 block px-2 py-4">
        <Image
          src="/ACG_CI-WHITE.webp"
          alt="ACG"
          width={120}
          height={40}
          className="h-auto w-auto"
          priority
        />
        <p className="mt-1 text-sm text-slate-400">아르바이트 관리</p>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-white/10 font-medium text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
