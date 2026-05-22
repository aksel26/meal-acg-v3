"use client";

import Image from "next/image";
import React from "react";
import { useHeaderVisibility } from "@/hooks/useHeaderVisibility";
import { SearchLauncher } from "@/components/search/SearchLauncher";
import { motion } from "motion/react";
import { Menu, Bell, Clock, Send, FileText, Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
import { Button } from "@repo/ui/src/button";
import { ScrollArea } from "@repo/ui/src/scroll-area";
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
  type AttendanceModifyApprovalData,
  type DayoffApprovalData,
} from "@/hooks/use-approvals";
import { usePathname } from "next/navigation";
import { formatDateKorean } from "utils";
import dayjs from "dayjs";

const PAGE_TITLES: Record<string, string> = {
  "/attendance": "근태 관리",
  "/meal": "식대",
  "/points": "복지포인트",
  "/points-dashboard": "활동비",
  "/approvals": "결재/승인",
  "/leave-request": "휴가 신청",
  "/monthly": "월간 취합",
  "/lunch": "점심 그룹",
  "/notices": "공지/일정",
  "/profile": "내 정보",
  "/acg-life": "ACG 라이프",
  "/lockers": "개인 사물함",
  "/vehicles": "차량신청내역",
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
  const ccCount = ccItems?.length || 0;
  const tabMeta = {
    inbox: {
      title: "받은 요청",
      description: "내 승인이 필요한 요청",
      count: pendingCount,
    },
    sent: {
      title: "보낸 요청",
      description: "내가 올린 요청의 처리 상태",
      count: sentItems?.length || 0,
    },
    cc: {
      title: "참조",
      description: "내가 참조자로 포함된 요청",
      count: ccCount,
    },
  }[tab];

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
          className="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
          aria-label={`알림${pendingCount > 0 ? `, 대기 ${pendingCount}건` : ""}`}
        >
          <Bell size={20} />
          {pendingCount > 0 && (
            <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-gray-50 bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
              {pendingCount > 99 ? "99+" : pendingCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[calc(100vw-2rem)] max-w-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 shadow-[0_20px_60px_rgba(15,23,42,0.16)]"
      >
        <div className="border-b border-slate-100 px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">알림</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {tabMeta.description}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {tabMeta.count}건
            </span>
          </div>
        </div>

        <div
          className="grid grid-cols-3 gap-1 border-b border-slate-100 bg-slate-100/80 p-1.5"
          role="tablist"
          aria-label="알림 유형"
        >
          <NotificationTabButton
            icon={Clock}
            label="받은 요청"
            count={pendingCount}
            selected={tab === "inbox"}
            onClick={() => setTab("inbox")}
          />
          <NotificationTabButton
            icon={Send}
            label="보낸 요청"
            count={sentItems?.length || 0}
            selected={tab === "sent"}
            onClick={() => setTab("sent")}
          />
          <NotificationTabButton
            icon={Users}
            label="참조"
            count={ccCount}
            selected={tab === "cc"}
            onClick={() => setTab("cc")}
          />
        </div>

        <ScrollArea className="h-[min(420px,calc(100vh-12rem))]">
          {!items || items.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center text-slate-400">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-50">
                <FileText className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-slate-700">
                {tab === "inbox" ? "대기 중인 요청이 없습니다." : tab === "sent" ? "보낸 요청이 없습니다." : "참조된 요청이 없습니다."}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                새 요청이 생기면 이곳에 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
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
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function NotificationTabButton({
  icon: Icon,
  label,
  count,
  selected,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 ${
        selected
          ? "bg-white text-slate-950"
          : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
      }`}
    >
      <Icon size={14} />
      <span className="truncate">{label}</span>
      {count > 0 && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
            selected ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"
          }`}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

function isDayoffData(data: ApprovalRequest["related_data"]): data is DayoffApprovalData {
  return !!data && "leave_date" in data;
}

function isAttendanceModifyData(
  data: ApprovalRequest["related_data"],
): data is AttendanceModifyApprovalData {
  return !!data && "requested_type" in data;
}

function ApprovalItem({
  item,
  viewMode,
  onApprove,
  onReject,
}: {
  item: ApprovalRequest;
  viewMode: "inbox" | "sent" | "cc";
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const dayoff = isDayoffData(item.related_data) ? item.related_data : null;
  const modifyRequest = isAttendanceModifyData(item.related_data)
    ? item.related_data
    : null;
  const leaveType = dayoff?.leave_type;
  const title = modifyRequest ? "근태 수정 요청" : leaveType?.name || "휴가 요청";

  const personLabel =
    viewMode === "inbox"
      ? `요청자: ${item.requester?.full_name || "알 수 없음"}`
      : viewMode === "sent"
        ? `승인자: ${item.approver?.full_name || "알 수 없음"}`
        : `참조 요청 · ${item.requester?.full_name || "알 수 없음"}`;

  return (
    <div className="px-4 py-3.5 transition-colors hover:bg-slate-50/80">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="min-w-0 truncate text-sm font-semibold text-slate-900">
          {title}
        </h3>
        <span className="shrink-0 text-[11px] font-medium text-slate-400">
          {dayjs(item.requested_at).format("MM/DD")}
        </span>
      </div>
      <p className="mb-1 text-xs font-medium text-slate-500">
        {personLabel}
      </p>
      {dayoff && (
        <p className="text-sm font-semibold text-slate-900">
          {dayjs(dayoff.leave_date).format("YYYY-MM-DD (ddd)")}
        </p>
      )}
      {dayoff?.reason && (
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">사유: {dayoff.reason}</p>
      )}
      {modifyRequest && (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">
            {modifyRequest.attendance_record
              ? dayjs(modifyRequest.attendance_record.date).format("YYYY-MM-DD (ddd)")
              : "대상 날짜 없음"}
          </p>
          <p className="text-xs font-medium text-slate-600">
            {modifyRequest.original_type} → {modifyRequest.requested_type}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
            사유: {modifyRequest.reason}
          </p>
        </div>
      )}
      {item.reject_reason && (
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-red-600">반려: {item.reject_reason}</p>
      )}
      {viewMode === "inbox" && item.status === "pending" && (
        <div className="mt-3 flex justify-end gap-2">
          <Button
            size="sm"
            className="h-8 rounded-lg bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-700"
            onClick={() => onApprove(item.id)}
          >
            승인
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-lg border-rose-200 px-3 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
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
