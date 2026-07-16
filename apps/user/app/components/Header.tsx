"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { useHeaderVisibility } from "@/hooks/useHeaderVisibility";
import { SearchLauncher } from "@/components/search/SearchLauncher";
import { motion } from "motion/react";
import {
  Menu,
  Bell,
  Clock,
  Send,
  FileText,
  Users,
  CalendarPlus,
  UtensilsCrossed,
  Wallet,
  Coffee,
  LogOut,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/src/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/src/tooltip";
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
  type WorkApplicationApprovalData,
} from "@/hooks/use-approvals";
import { usePathname, useRouter } from "next/navigation";
import { formatDateKorean } from "utils";
import dayjs from "dayjs";

const PAGE_HEADERS: Record<string, { title: string; description: string }> = {
  "/attendance": {
    title: "근태 관리",
    description: "출퇴근 기록과 휴가/연차 신청 내역을 한 곳에서 확인합니다.",
  },
  "/leave": {
    title: "연차 관리",
    description: "연도별 휴가 잔여와 사용 내역을 확인합니다.",
  },
  "/attendance-stats": {
    title: "근태/통계",
    description: "월별 근태 기록과 근속 통계를 확인합니다.",
  },
  "/overtime": {
    title: "시간외·주말근무",
    description: "승인 후에도 출퇴근/식대/정산에는 자동 반영되지 않습니다.",
  },
  "/meal": {
    title: "식대",
    description: "월별 식대 사용 내역을 입력하고 확인합니다.",
  },
  "/points": {
    title: "복지포인트",
    description: "복지포인트와 활동비 사용 현황을 확인합니다.",
  },
  "/points-dashboard": {
    title: "전체 포인트 현황",
    description: "조직 전체 예산 사용 현황을 확인하세요.",
  },
  "/approvals": {
    title: "결재/승인",
    description: "받은 요청과 보낸 요청의 처리 상태를 확인합니다.",
  },
  "/leave-request": {
    title: "휴가 신청",
    description: "승인자에게 자동으로 요청이 전달됩니다.",
  },
  "/monthly": {
    title: "음료 취합",
    description: "참여할 취합을 선택하세요.",
  },
  "/lunch": {
    title: "점심조 편성",
    description: "점심조 배정 현황을 확인합니다.",
  },
  "/notices": {
    title: "공지/일정",
    description: "사내 공지사항과 일정을 확인합니다.",
  },
  "/profile": {
    title: "내 정보",
    description: "내 기본정보를 확인하고 수정합니다.",
  },
  "/acg-life": {
    title: "ACG 라이프",
    description: "온보딩, 회사 소개, 행사 자료와 사규를 확인합니다.",
  },
  "/room-booking": {
    title: "회의실 예약",
    description: "회의실 예약 현황을 확인하고 일정을 등록합니다.",
  },
  "/lockers": {
    title: "개인 사물함",
    description: "개인 사물함 배정 현황을 확인하고 신청합니다.",
  },
  "/assets": {
    title: "물품관리대장",
    description: "사내 물품의 보유와 대여 현황을 확인합니다.",
  },
  "/vehicles": {
    title: "차량신청내역",
    description: "사내 차량 이용 현황을 확인하고 신청합니다.",
  },
  "/library": {
    title: "도서관",
    description: "도서 대여 현황을 확인하고 신청합니다.",
  },
  "/evaluations": {
    title: "다면평가",
    description: "활성화된 회차를 확인하고 배정된 평가를 작성합니다.",
  },
  "/project-dashboard": {
    title: "대시보드",
    description: "업무 요청과 프로젝트 현황을 한 곳에서 확인합니다.",
  },
  "/projects": {
    title: "프로젝트",
    description: "참여 중인 프로젝트와 진행 현황을 확인합니다.",
  },
  "/requests": {
    title: "전체 업무 요청",
    description: "접근 가능한 모든 업무 요청을 확인합니다.",
  },
};

const Header = () => {
  const { isHeaderVisible } = useHeaderVisibility({
    threshold: 50,
    scrollDifference: 5,
  });
  const { open } = useSidebarStore();
  const userName = useUserStore((s) => s.userName);
  const logout = useUserStore((s) => s.logout);
  const pathname = usePathname();
  const router = useRouter();
  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false);

  const isDashboard = pathname === "/dashboard";
  const pageHeader =
    PAGE_HEADERS[pathname] ||
    Object.entries(PAGE_HEADERS).find(([key]) =>
      pathname.startsWith(key + "/"),
    )?.[1];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "좋은 아침이에요";
    if (hour < 18) return "안녕하세요";
    return "좋은 저녁이에요";
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    logout();
    router.push("/");
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
      <div className="flex flex-wrap items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 md:flex-nowrap md:bg-transparent">
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
            <div>
              <h1 className="text-lg font-semibold text-slate-800">
                {pageHeader?.title}
              </h1>
              {pageHeader?.description && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {pageHeader.description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 우측: 빠른 메뉴 + 알림 + 검색 */}
        <div className="flex items-center gap-3">
          <HeaderShortcuts />
          <div aria-hidden="true" className="h-6 w-px bg-slate-200" />
          <ApprovalBell />
          <SearchLauncher />
          <div aria-hidden="true" className="h-6 w-px bg-slate-200" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setLogoutDialogOpen(true)}
                aria-label="로그아웃"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
              >
                <LogOut size={20} strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8}>
              로그아웃
            </TooltipContent>
          </Tooltip>
          <AlertDialog
            open={logoutDialogOpen}
            onOpenChange={setLogoutDialogOpen}
          >
            <AlertDialogContent className="max-w-sm rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>로그아웃하시겠어요?</AlertDialogTitle>
                <AlertDialogDescription>
                  현재 계정에서 로그아웃하고 로그인 화면으로 이동합니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout}>
                  로그아웃
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </motion.header>
  );
};

const headerShortcuts = [
  { href: "/leave-request", label: "휴가 신청", icon: CalendarPlus },
  { href: "/meal", label: "식대 입력", icon: UtensilsCrossed },
  { href: "/points", label: "복지포인트", icon: Wallet },
  { href: "/monthly", label: "Monthly 음료", icon: Coffee },
];

function HeaderShortcuts() {
  return (
    <nav aria-label="빠른 메뉴" className="flex gap-1">
      {headerShortcuts.map(({ href, label, icon: Icon }, index) => (
        <React.Fragment key={href}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={href}
                aria-label={label}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 active:bg-slate-200"
              >
                <Icon size={19} strokeWidth={1.5} />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={8}>
              {label}
            </TooltipContent>
          </Tooltip>
          {index === 0 && (
            <div
              aria-hidden="true"
              className="mx-1 h-6 w-px self-center bg-slate-200"
            />
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

function ApprovalBell() {
  const { memberId } = useUserStore();
  const [tab, setTab] = React.useState<"inbox" | "sent" | "cc">("inbox");

  const { data: inboxItems } = useApprovals(memberId || "", "pending");
  const { data: sentItems } = useMyRequests(memberId || "");
  const { data: ccItems } = useCcRequests(memberId || "");
  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();

  const pendingCount = inboxItems?.length || 0;
  const items =
    tab === "inbox" ? inboxItems : tab === "sent" ? sentItems : ccItems;
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

  const handleReject = (item: ApprovalRequest) => {
    if (!memberId) return;
    if (item.related_table === "work_applications") {
      toast.info("연장·주말근무 반려 사유는 결재 관리에서 입력해주세요.");
      window.location.assign("/approvals");
      return;
    }
    rejectMutation.mutate(
      { approvalId: item.id, memberId },
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
            <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-slate-50 bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
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
                {tab === "inbox"
                  ? "대기 중인 요청이 없습니다."
                  : tab === "sent"
                    ? "보낸 요청이 없습니다."
                    : "참조된 요청이 없습니다."}
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

function isDayoffData(
  data: ApprovalRequest["related_data"],
): data is DayoffApprovalData {
  return !!data && "leave_date" in data;
}

function isAttendanceModifyData(
  data: ApprovalRequest["related_data"],
): data is AttendanceModifyApprovalData {
  return !!data && "requested_type" in data;
}

function isWorkApplicationData(
  data: ApprovalRequest["related_data"],
): data is WorkApplicationApprovalData {
  return !!data && "application_type" in data;
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
  onReject: (item: ApprovalRequest) => void;
}) {
  const dayoff = isDayoffData(item.related_data) ? item.related_data : null;
  const modifyRequest = isAttendanceModifyData(item.related_data)
    ? item.related_data
    : null;
  const workApplication = isWorkApplicationData(item.related_data)
    ? item.related_data
    : null;
  const leaveType = dayoff?.leave_type;
  const title = modifyRequest
    ? "근태 수정 요청"
    : workApplication
      ? workApplication.application_type === "overtime"
        ? "연장근무 신청"
        : "주말근무 신청"
      : leaveType?.name || "휴가 요청";

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
      <p className="mb-1 text-xs font-medium text-slate-500">{personLabel}</p>
      {dayoff && (
        <p className="text-sm font-semibold text-slate-900">
          {dayjs(dayoff.leave_date).format("YYYY-MM-DD (ddd)")}
        </p>
      )}
      {dayoff?.reason && (
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
          사유: {dayoff.reason}
        </p>
      )}
      {modifyRequest && (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">
            {modifyRequest.attendance_record
              ? dayjs(modifyRequest.attendance_record.date).format(
                  "YYYY-MM-DD (ddd)",
                )
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
      {workApplication && (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">
            {dayjs(workApplication.work_date).format("YYYY-MM-DD (ddd)")} ·{" "}
            {workApplication.start_time.slice(0, 5)}-
            {workApplication.end_time.slice(0, 5)}
          </p>
          <p className="text-xs font-medium text-slate-600">
            {workApplication.project_name}
            {workApplication.location ? ` · ${workApplication.location}` : ""}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
            사유: {workApplication.reason}
          </p>
        </div>
      )}
      {item.reject_reason && (
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-red-600">
          반려: {item.reject_reason}
        </p>
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
            onClick={() => onReject(item)}
          >
            반려
          </Button>
        </div>
      )}
    </div>
  );
}

export default Header;
