"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, LogOut, X, Globe, GraduationCap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import LOGO from "@/public/images/ACG_LOGO_GRAY.png";
import type { SessionUser } from "@/lib/auth";

interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
}

const menuItems: MenuItem[] = [
  {
    label: "인트라넷",
    href: process.env.NEXT_PUBLIC_USER_APP_URL || "http://localhost:3020",
    icon: Globe,
    external: true,
  },
  {
    label: "감독관/면접교육 운영",
    href: process.env.NEXT_PUBLIC_SUPERVISOR_APP_URL || "http://localhost:3002",
    icon: GraduationCap,
    external: true,
  },
];

function UserInfoCard({ user }: { user: SessionUser }) {
  return (
    <div className="mx-3 mb-4 rounded-xl bg-[#f9f9fa] px-4 py-3">
      <p className="truncate text-sm font-semibold text-[#111111]">
        {user.fullName || "사용자"}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-400">
        {user.role || "user"} · ACG
      </p>
    </div>
  );
}

function NavMenu({ onItemClick }: { onItemClick?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3">
      <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-widest text-slate-400">
        바로가기
      </p>
      <div className="space-y-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.label}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              onClick={onItemClick}
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-500 transition-colors hover:bg-[#f9f9fa] hover:text-[#111111]"
            >
              <Icon size={18} className="shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.external && (
                <ExternalLink
                  size={14}
                  className="text-slate-300 group-hover:text-slate-400"
                />
              )}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

function LogoutButton({ onAfterLogout }: { onAfterLogout?: () => void }) {
  const router = useRouter();
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    onAfterLogout?.();
    router.push("/login");
    router.refresh();
  };
  return (
    <button
      onClick={handleLogout}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-[#f9f9fa] hover:text-slate-500"
    >
      <LogOut size={18} />
      로그아웃
    </button>
  );
}

function SidebarHeader() {
  return (
    <Link href="/" className="mb-5 flex items-center gap-2 px-5">
      <Image
        src={LOGO}
        alt="ACG"
        width={48}
        height={48}
        className="h-12 w-12 object-contain"
      />
      <div>
        <p className="text-sm text-[#111111]">ACG 그룹웨어</p>
        <p className="mt-0.5 text-[11px] text-slate-400">요청관리</p>
      </div>
    </Link>
  );
}

export function Sidebar({ user }: { user: SessionUser }) {
  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-[#f3f3f3] bg-white py-5 text-slate-900">
      <SidebarHeader />
      <UserInfoCard user={user} />
      <NavMenu />
      <div className="space-y-0.5 px-3 pt-2">
        <LogoutButton />
      </div>
    </aside>
  );
}

export function MobileSidebar({
  user,
  open,
  onClose,
}: {
  user: SessionUser;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-[70] flex w-[280px] flex-col bg-white py-5 shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-5 flex items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <Image
              src={LOGO}
              alt="ACG"
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
            />
            <div>
              <p className="text-sm text-[#111111]">ACG 그룹웨어</p>
              <p className="mt-0.5 text-[11px] text-slate-400">요청관리</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-[#f9f9fa] hover:text-slate-600"
            aria-label="메뉴 닫기"
          >
            <X size={20} />
          </button>
        </div>

        <UserInfoCard user={user} />
        <NavMenu onItemClick={onClose} />

        <div className="space-y-0.5 px-3 pt-2">
          <LogoutButton onAfterLogout={onClose} />
        </div>
      </aside>
    </>
  );
}
