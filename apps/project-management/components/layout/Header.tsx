"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, Search, UserRound } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
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
  { label: "프로젝트", href: "/projects" },
  { label: "내 요청 목록", href: "/queue" },
  { label: "내 요청", href: "/requests/mine" },
  { label: "전체 요청", href: "/requests" },
  { label: "관리", href: "/settings" },
];

const PAGE_TITLES: Record<string, string> = {
  "/": "나의 캘린더",
  "/projects": "프로젝트",
  "/queue": "내 요청 목록",
  "/requests": "전체 요청",
  "/requests/mine": "내 요청",
  "/settings": "관리",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

  if (pathname.startsWith("/projects/")) return "프로젝트 상세";
  if (pathname.startsWith("/requests/")) return "요청 상세";

  const match = Object.entries(PAGE_TITLES).find(
    ([key]) => key !== "/" && pathname.startsWith(key + "/"),
  );
  return match?.[1] || "프로젝트관리";
}

const BREADCRUMB_LABELS: Record<string, string> = {
  "/": "홈",
  "/projects": "프로젝트",
  "/queue": "내 요청 목록",
  "/requests": "전체 요청",
  "/requests/mine": "내 요청",
  "/settings": "관리",
};

type BreadcrumbItem = { label: string; href: string };

function buildBreadcrumb(pathname: string): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: "홈", href: "/" }];

  if (pathname === "/") return items;

  const direct = BREADCRUMB_LABELS[pathname];
  if (direct) {
    items.push({ label: direct, href: pathname });
    return items;
  }

  if (pathname.startsWith("/requests/")) {
    items.push({ label: "전체 요청", href: "/requests" });
    items.push({ label: "요청 상세", href: pathname });
    return items;
  }

  if (pathname.startsWith("/projects/")) {
    items.push({ label: "프로젝트", href: "/projects" });
    items.push({ label: "프로젝트 상세", href: pathname });
    return items;
  }

  if (pathname.startsWith("/settings/")) {
    items.push({ label: "관리", href: "/settings" });
    items.push({ label: getPageTitle(pathname), href: pathname });
    return items;
  }

  items.push({ label: getPageTitle(pathname), href: pathname });
  return items;
}

export function Header({ onMenuOpen }: { onMenuOpen: () => void }) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const breadcrumb = useMemo(() => buildBreadcrumb(pathname), [pathname]);
  const [members, setMembers] = useState<MasterMember[]>([]);
  const [search, setSearch] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MasterMember | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    fetch("/api/masters")
      .then((response) => response.json())
      .then((payload) => setMembers(payload.members ?? []))
      .catch(() => setMembers([]));
  }, []);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(navigator.platform));
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isShortcut) return;
      event.preventDefault();
      setPopoverOpen((current) => !current);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenuOpen}
            className="-ml-1 rounded-lg p-1 text-slate-500 transition-colors hover:bg-black/5 md:hidden"
            aria-label="메뉴 열기"
          >
            <Menu size={22} />
          </button>
          <div className="min-w-0">
            <nav
              aria-label="breadcrumb"
              className="flex items-center gap-1 text-[11px] text-slate-400"
            >
              {breadcrumb.map((item, idx) => {
                const isLast = idx === breadcrumb.length - 1;
                return (
                  <Fragment key={`${item.href}-${idx}`}>
                    {idx > 0 && (
                      <ChevronRight size={12} className="shrink-0 text-slate-300" />
                    )}
                    {isLast ? (
                      <span className="truncate font-medium text-slate-500">
                        {item.label}
                      </span>
                    ) : (
                      <Link
                        href={item.href}
                        className="truncate transition-colors hover:text-[#111111]"
                      >
                        {item.label}
                      </Link>
                    )}
                  </Fragment>
                );
              })}
            </nav>
            <h1 className="truncate text-base font-semibold text-slate-800">{pageTitle}</h1>
          </div>
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
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-2.5 text-slate-600 transition-colors hover:bg-[#f9f9fa] hover:text-[#111111] md:px-3"
                aria-label={`직원 조회 (${isMac ? "⌘" : "Ctrl"}+K)`}
                title={`직원 조회 (${isMac ? "⌘" : "Ctrl"}+K)`}
              >
                <Search size={18} />
                <kbd className="inline-flex items-center gap-0.5 rounded border border-[#e5e7eb] bg-[#f9f9fa] px-1 py-0.5 text-[10px] font-medium leading-none text-slate-500">
                  {isMac ? "⌘" : "Ctrl"}
                  <span>K</span>
                </kbd>
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
          style={{ maxWidth: "min(900px, calc(100% - 2rem))" }}
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
