"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
import { RequestForm } from "@/components/requests/RequestForm";

type MasterMember = {
  id: string;
  full_name: string;
  role: string | null;
  member_role: string | null;
  team_id: string | null;
};

const localNav = [
  { label: "홈", href: "/" },
  { label: "내 큐", href: "/queue" },
  { label: "내 요청", href: "/requests/mine" },
  { label: "전체 요청", href: "/requests" },
  { label: "관리", href: "/settings" },
];

const PAGE_TITLES: Record<string, string> = {
  "/": "나의 캘린더",
  "/queue": "내 큐",
  "/requests": "전체 요청",
  "/requests/mine": "내 요청",
  "/settings": "관리",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const match = Object.entries(PAGE_TITLES).find(
    ([key]) => key !== "/" && pathname.startsWith(key + "/"),
  );
  return match?.[1] || "요청관리";
}

export function Header({ onMenuOpen }: { onMenuOpen: () => void }) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const [members, setMembers] = useState<MasterMember[]>([]);
  const [search, setSearch] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MasterMember | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);

  useEffect(() => {
    fetch("/api/masters")
      .then((response) => response.json())
      .then((payload) => setMembers(payload.members ?? []))
      .catch(() => setMembers([]));
  }, []);

  const filteredMembers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return members.slice(0, 8);

    return members
      .filter((member) =>
        [member.full_name, member.member_role, member.role]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(keyword)),
      )
      .slice(0, 8);
  }, [members, search]);

  function openQuickRequest(member: MasterMember) {
    setSelectedMember(member);
    setPopoverOpen(false);
    setRequestOpen(true);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[#f3f3f3] bg-white">
      <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuOpen}
            className="-ml-1 rounded-lg p-1 text-slate-500 transition-colors hover:bg-black/5 md:hidden"
            aria-label="메뉴 열기"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-base font-semibold text-slate-800">{pageTitle}</h1>
        </div>

        <div className="flex items-center gap-2">
          <nav className="hidden flex-wrap items-center gap-1 md:flex">
            {localNav.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-[#111111] font-medium text-white"
                      : "text-slate-500 hover:bg-[#f9f9fa] hover:text-[#111111]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex size-10 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white text-slate-600 transition-colors hover:bg-[#f9f9fa] hover:text-[#111111]"
                aria-label="직원 조회"
              >
                <Search size={18} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="border-b border-[#f3f3f3] px-3 py-3">
                <p className="text-sm font-semibold text-[#111111]">직원 조회</p>
                <div className="mt-2 flex h-9 items-center gap-2 rounded-md border border-[#e5e7eb] px-2.5">
                  <Search size={15} className="shrink-0 text-slate-400" />
                  <input
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="이름 또는 역할 검색"
                  />
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto p-1.5">
                {filteredMembers.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-slate-500">
                    검색 결과가 없습니다.
                  </p>
                ) : (
                  filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-[#f9f9fa]"
                      onClick={() => openQuickRequest(member)}
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#f3f4f6] text-slate-500">
                        <UserRound size={16} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-[#111111]">
                          {member.full_name}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {member.member_role || member.role || "역할 미지정"}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent
          className="max-h-[85vh] gap-0 overflow-hidden p-0"
          style={{ maxWidth: "min(560px, calc(100% - 2rem))" }}
        >
          <DialogHeader className="border-b border-[#f3f3f3] px-5 py-4">
            <DialogTitle>
              {selectedMember ? `${selectedMember.full_name}에게 업무 요청` : "빠른 업무 요청"}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(85vh-73px)] overflow-y-auto px-5 py-5">
            {selectedMember && (
              <RequestForm
                key={selectedMember.id}
                initialAssignees={[{ id: selectedMember.id, fullName: selectedMember.full_name }]}
                onSuccess={() => setRequestOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
