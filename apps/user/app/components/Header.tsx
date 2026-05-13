"use client";

import Image from "next/image";
import React from "react";
import { useHeaderVisibility } from "@/hooks/useHeaderVisibility";
import { SearchLauncher } from "@/components/search/SearchLauncher";
import { motion } from "motion/react";
import { Menu, Bell, Clock, Send, FileText, Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
import { Button } from "@repo/ui/src/button";
import { toast } from "@repo/ui/src/sonner";
import { useSidebarStore } from "@/stores/sidebarStore";
import { useUserStore } from "@/stores/userStore";
import {
  useApprovals,
  useMyRequests,
  useCcRequests,
  useApproveRequest,
  useRejectRequest,
  type ApprovalRequest,
} from "@/hooks/use-approvals";
import { usePathname } from "next/navigation";
import { formatDateKorean } from "utils";
import dayjs from "dayjs";

const PAGE_TITLES: Record<string, string> = {
  "/attendance": "출퇴근 관리",
  "/dayoffs": "휴가/연차 관리",
  "/meal": "식대",
  "/points": "복지포인트",
  "/points-dashboard": "활동비",
  "/approvals": "결재/승인",
  "/leave-request": "휴가 신청",
  "/monthly": "월간 취합",
  "/lunch": "점심 그룹",
  "/notices": "공지/일정",
  "/profile": "내 정보 수정",
  "/acg-life": "ACG 라이프",
  "/project-dashboard": "대시보드",
  "/projects": "프로젝트",
  "/requests": "업무 요청",
};

const Header = () => {
  const { isHeaderVisible } = useHeaderVisibility({
    threshold: 50,
    scrollDifference: 5,
  });
  const { open } = useSidebarStore();
  const userName = useUserStore((s) => s.userName);
  const pathname = usePathname();

  const isDashboard = pathname === "/dashboard";
  const pageTitle =
    PAGE_TITLES[pathname] ||
    Object.entries(PAGE_TITLES).find(([key]) => pathname.startsWith(key + "/"))?.[1] ||
    "";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "좋은 아침이에요";
    if (hour < 18) return "안녕하세요";
    return "좋은 저녁이에요";
  };

  return (
    <motion.header
      initial={{ y: 0 }}
      animate={{ y: isHeaderVisible ? 0 : -100 }}
      transition={{
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="sticky top-0 z-20 px-4 pt-3 md:px-8 md:pt-4"
    >
      <div className="rounded-2xl bg-gray-50 md:bg-transparent px-4 py-3 flex items-center justify-between">
        {/* 좌측: 햄버거(모바일) + 인사 or 페이지 제목 */}
        <div className="flex items-center gap-3">
          <button
            onClick={open}
            className="md:hidden rounded-lg p-1 -ml-1 text-slate-500 transition-colors hover:bg-black/5"
            aria-label="메뉴 열기"
          >
            <Menu size={22} />
          </button>

          {isDashboard ? (
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-slate-800">
                  {getGreeting()}, {userName || ""}님
                </h1>
                <Image
                  src="/icons/greeting.png"
                  alt="greeting"
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                오늘은{" "}
                <span className="font-medium text-slate-600">
                  {formatDateKorean()}
                </span>{" "}
                입니다
              </p>
            </div>
          ) : (
            <h1 className="text-lg font-semibold text-slate-800">
              {pageTitle}
            </h1>
          )}
        </div>

        {/* 우측: 날짜 뱃지(대시보드만) + 알림 */}
        <div className="flex items-center gap-3">
          {isDashboard && (
            <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-slate-100 text-slate-700">
              <span className="text-[10px] font-medium text-slate-500">
                {new Date().toLocaleDateString("ko-KR", { weekday: "short" })}
              </span>
              <span className="text-lg font-bold -mt-0.5">
                {new Date().getDate()}
              </span>
            </div>
          )}
          <SearchLauncher />
          <ApprovalBell />
        </div>
      </div>
    </motion.header>
  );
};

function ApprovalBell() {
  const { memberId } = useUserStore();
  const [tab, setTab] = React.useState<"inbox" | "sent" | "cc">("inbox");

  const { data: inboxItems } = useApprovals(memberId || "", "pending");
  const { data: sentItems } = useMyRequests(memberId || "");
  const { data: ccItems } = useCcRequests(memberId || "");
  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();

  const pendingCount = inboxItems?.length || 0;
  const items = tab === "inbox" ? inboxItems : tab === "sent" ? sentItems : ccItems;

  const handleApprove = (id: string) => {
    if (!memberId) return;
    approveMutation.mutate(
      { approvalId: id, memberId },
      { onSuccess: () => toast.success("승인되었습니다.") },
    );
  };

  const handleReject = (id: string) => {
    if (!memberId) return;
    rejectMutation.mutate(
      { approvalId: id, memberId },
      { onSuccess: () => toast.success("반려되었습니다.") },
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label="알림"
        >
          <Bell size={20} />
          {pendingCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-sm bg-rose-500 text-[9px] font-bold text-white">
              {pendingCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 rounded-lg p-2">
        {/* 탭 */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setTab("inbox")}
            className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
              tab === "inbox" ? "text-slate-800 border-b-2 border-slate-800" : "text-slate-400"
            }`}
          >
            <Clock size={13} />
            받은 요청
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("sent")}
            className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
              tab === "sent" ? "text-slate-800 border-b-2 border-slate-800" : "text-slate-400"
            }`}
          >
            <Send size={13} />
            보낸 요청
          </button>
          <button
            onClick={() => setTab("cc")}
            className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
              tab === "cc" ? "text-slate-800 border-b-2 border-slate-800" : "text-slate-400"
            }`}
          >
            <Users size={13} />
            참조
            {ccItems && ccItems.length > 0 && (
              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                {ccItems.length}
              </span>
            )}
          </button>
        </div>

        {/* 리스트 */}
        <div className="max-h-80 overflow-y-auto">
          {!items || items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <FileText className="mb-2 h-6 w-6" />
              <p className="text-xs">
                {tab === "inbox" ? "대기 중인 요청이 없습니다." : tab === "sent" ? "보낸 요청이 없습니다." : "참조된 요청이 없습니다."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {items.map((item) => (
                <ApprovalItem
                  key={item.id}
                  item={item}
                  viewMode={tab}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ApprovalItem({
  item,
  viewMode,
  onApprove,
  onReject,
}: {
  item: ApprovalRequest;
  viewMode: "inbox" | "sent";
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const dayoff = item.related_data;

  // 요청 유형 표시
  const typeLabels: Record<string, { label: string; className: string }> = {
    dayoffs: { label: "휴가", className: "bg-blue-50 text-blue-600" },
    room_bookings: { label: "회의실", className: "bg-violet-50 text-violet-600" },
    notices: { label: "공지사항", className: "bg-emerald-50 text-emerald-600" },
  };
  const requestType = item.related_table
    ? typeLabels[item.related_table] || { label: item.type || "기타", className: "bg-gray-50 text-gray-600" }
    : { label: item.type || "기타", className: "bg-gray-50 text-gray-600" };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-50 text-amber-600",
    approved: "bg-emerald-50 text-emerald-600",
    rejected: "bg-red-50 text-red-600",
  };
  const statusLabels: Record<string, string> = {
    pending: "대기",
    approved: "승인",
    rejected: "반려",
  };

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`rounded-xs px-1.5 py-0.5 text-[10px] font-medium ${statusColors[item.status] || ""}`}>
            {statusLabels[item.status] || item.status}
          </span>
          <span className={`rounded-xs px-1.5 py-0.5 text-[10px] font-medium ${requestType.className}`}>
            {requestType.label}
          </span>
          {dayoff?.leave_type && (
            <span className="text-xs font-medium text-slate-700">{dayoff.leave_type.name}</span>
          )}
        </div>
        <span className="text-[10px] text-slate-400">
          {dayjs(item.requested_at).format("MM/DD")}
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-0.5">
        {viewMode === "inbox"
          ? item.requester?.full_name || "알 수 없음"
          : `승인자: ${item.approver?.full_name || "알 수 없음"}`}
      </p>
      {dayoff && (
        <p className="text-xs font-medium text-slate-800">
          {dayjs(dayoff.leave_date).format("YYYY-MM-DD (ddd)")}
        </p>
      )}
      {dayoff?.reason && (
        <p className="text-[11px] text-slate-400 mt-0.5">사유: {dayoff.reason}</p>
      )}
      {item.reject_reason && (
        <p className="text-[11px] text-red-500 mt-0.5">반려: {item.reject_reason}</p>
      )}
      {viewMode === "inbox" && item.status === "pending" && (
        <div className="flex gap-1.5 mt-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 flex-1 text-xs text-emerald-600 hover:bg-emerald-50 border-emerald-200"
            onClick={() => onApprove(item.id)}
          >
            승인
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 flex-1 text-xs text-red-500 hover:bg-red-50 border-red-200"
            onClick={() => onReject(item.id)}
          >
            반려
          </Button>
        </div>
      )}
    </div>
  );
}

export default Header;
