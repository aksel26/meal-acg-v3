"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  Eye,
  Loader2,
  ShieldAlert,
  UserRound,
  WalletCards,
} from "lucide-react";
import { Badge } from "@repo/ui/src/badge";
import { Button } from "@repo/ui/src/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Textarea } from "@repo/ui/src/textarea";
import { cn } from "@repo/ui/lib/utils";
import { queryKeys } from "@/lib/query-keys";
import { hasAdminPermission } from "@/lib/rbac";
import { STATUS_COLORS } from "@/lib/constants";

type MemberDetail = {
  id: string;
  login_id: string | null;
  full_name: string;
  role: string | null;
  admin_role: string | null;
  user_authority: string | null;
  member_role: string | null;
  hire_date: string | null;
  email: string | null;
  team_id: string | null;
  division_id: string | null;
  organization_id: string | null;
  position_id: string | null;
  intern_months: number | null;
  team: { name: string | null } | null;
  position: { name: string | null } | null;
  division: { name: string | null } | null;
};

type MemberOverview = {
  currentStatus: {
    status: string | null;
    startDate: string | null;
    endDate: string | null;
    note: string | null;
  };
  leave: {
    year: number;
    usedDays: number;
    approvedCount: number;
    pendingCount: number;
  } | null;
  attendance: {
    year: number;
    month: number;
    checkedInDays: number;
    lateCount: number;
    absentCount: number;
  } | null;
  points: {
    period: string;
    mealUsed: number;
    welfareUsed: number;
    mealBudget: number;
    welfareBudget: number;
  } | null;
  permissions: {
    leave: boolean;
    attendance: boolean;
    points: boolean;
    meal: boolean;
  };
};

type SessionResponse = {
  authenticated: boolean;
  user?: {
    adminRole?: string | null;
  };
};

type SensitiveMember = {
  birth_date: string | null;
  phone: string | null;
  passport_number: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ko-KR");
}

function formatAmount(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function remainingAmount(total: number, used: number) {
  return Math.max(0, total - used);
}

function InfoCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl bg-white p-5", className)}>
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 border-b border-slate-100 py-2 last:border-0">
      <dt className="text-xs font-medium text-slate-400">{label}</dt>
      <dd className="min-w-0 text-sm text-slate-700">{value || "-"}</dd>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "amber" | "rose";
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div
        className={cn(
          "mt-1 text-base font-semibold tabular-nums text-slate-900",
          tone === "amber" && "text-amber-600",
          tone === "rose" && "text-rose-600",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export default function OrganizationMemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [isSensitiveOpen, setIsSensitiveOpen] = useState(false);
  const [sensitiveReason, setSensitiveReason] = useState("");
  const [sensitiveError, setSensitiveError] = useState("");
  const [sensitiveData, setSensitiveData] = useState<SensitiveMember | null>(null);

  const memberQuery = useQuery<MemberDetail>({
    queryKey: queryKeys.members.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/members/${id}`);
      if (!res.ok) throw new Error("Failed to fetch member");
      return res.json();
    },
    enabled: !!id,
  });

  const overviewQuery = useQuery<MemberOverview>({
    queryKey: queryKeys.members.overview(id),
    queryFn: async () => {
      const res = await fetch(`/api/members/${id}/overview`);
      if (!res.ok) throw new Error("Failed to fetch overview");
      return res.json();
    },
    enabled: !!id,
  });

  const sessionQuery = useQuery<SessionResponse>({
    queryKey: ["auth", "session"],
    queryFn: async () => {
      const res = await fetch("/api/auth/session");
      if (!res.ok) throw new Error("Failed to fetch session");
      return res.json();
    },
  });

  const sensitiveMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await fetch(`/api/members/${id}/sensitive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "민감정보를 불러오지 못했습니다.");
      }
      return body as SensitiveMember;
    },
    onSuccess: (data) => {
      setSensitiveData(data);
      setSensitiveReason("");
      setSensitiveError("");
      setIsSensitiveOpen(false);
    },
    onError: (error: Error) => {
      setSensitiveError(error.message);
    },
  });

  const member = memberQuery.data;
  const overview = overviewQuery.data;
  const displayStatus = overview?.currentStatus.status || "정상";
  const statusClass = STATUS_COLORS[displayStatus] || STATUS_COLORS["정상"];
  const canRequestSensitive = useMemo(
    () =>
      hasAdminPermission(
        sessionQuery.data?.user?.adminRole,
        "members:sensitive:read",
      ),
    [sessionQuery.data?.user?.adminRole],
  );

  const handleSensitiveSubmit = () => {
    const reason = sensitiveReason.trim();
    if (!reason) {
      setSensitiveError("조회 사유를 입력해주세요.");
      return;
    }
    setSensitiveError("");
    sensitiveMutation.mutate(reason);
  };

  if (memberQuery.isLoading) {
    return (
      <div className="flex min-h-[24rem] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (memberQuery.isError || !member) {
    return (
      <div className="rounded-xl bg-white py-16 text-center">
        <UserRound className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-4 text-sm font-medium text-slate-700">
          인원을 찾을 수 없습니다
        </p>
        <Link href="/organization">
          <Button variant="outline" size="sm" className="mt-4">
            조직원 현황으로 돌아가기
          </Button>
        </Link>
      </div>
    );
  }

  const hasOverviewError = overviewQuery.isError;
  const points = overview?.points;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <Link href="/organization">
          <Button variant="outline" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">
              {member.full_name}
            </h1>
            <Badge className={cn("border-0 px-2 py-0.5 text-xs", statusClass)}>
              {displayStatus}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {[member.position?.name, member.member_role, member.team?.name]
              .filter(Boolean)
              .join(" · ") || "소속 정보 없음"}
          </p>
        </div>
      </div>

      {hasOverviewError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          요약 정보를 불러오지 못했습니다. 기본 정보만 표시합니다.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <InfoCard title="기본 정보">
          <dl>
            <Field label="로그인 아이디" value={member.login_id} />
            <Field label="이메일" value={member.email} />
            <Field label="본부" value={member.division?.name} />
            <Field label="팀" value={member.team?.name} />
            <Field label="직급" value={member.position?.name || member.member_role} />
            <Field label="직책" value={member.member_role} />
            <Field label="관리 권한" value={member.role === "admin" ? member.admin_role || "관리자" : "일반"} />
            <Field label="사용자 권한" value={member.user_authority} />
            <Field label="입사일" value={formatDate(member.hire_date)} />
          </dl>
        </InfoCard>

        <InfoCard title="현재 특이사항">
          {overviewQuery.isLoading ? (
            <EmptyState>요약 정보를 불러오는 중입니다.</EmptyState>
          ) : overview?.currentStatus.status ? (
            <dl>
              <Field label="상태" value={overview.currentStatus.status} />
              <Field label="시작일" value={formatDate(overview.currentStatus.startDate)} />
              <Field label="종료일" value={formatDate(overview.currentStatus.endDate)} />
              <Field label="메모" value={overview.currentStatus.note} />
            </dl>
          ) : (
            <EmptyState>현재 등록된 특이사항이 없습니다.</EmptyState>
          )}
        </InfoCard>

        <InfoCard title="올해 휴가 요약">
          {overviewQuery.isLoading ? (
            <EmptyState>요약 정보를 불러오는 중입니다.</EmptyState>
          ) : !overview?.permissions.leave ? (
            <EmptyState>휴가 조회 권한이 없습니다.</EmptyState>
          ) : overview.leave ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label={`${overview.leave.year}년 사용일수`} value={`${overview.leave.usedDays}일`} />
              <Metric label="승인 건수" value={`${overview.leave.approvedCount}건`} />
              <Metric label="대기 건수" value={`${overview.leave.pendingCount}건`} tone={overview.leave.pendingCount > 0 ? "amber" : "default"} />
            </div>
          ) : (
            <EmptyState>등록된 휴가 데이터가 없습니다.</EmptyState>
          )}
        </InfoCard>

        <InfoCard title="이번 달 근태 요약">
          {overviewQuery.isLoading ? (
            <EmptyState>요약 정보를 불러오는 중입니다.</EmptyState>
          ) : !overview?.permissions.attendance ? (
            <EmptyState>근태 조회 권한이 없습니다.</EmptyState>
          ) : overview.attendance ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label={`${overview.attendance.month}월 출근일`} value={`${overview.attendance.checkedInDays}일`} />
              <Metric label="지각" value={`${overview.attendance.lateCount}건`} tone={overview.attendance.lateCount > 0 ? "amber" : "default"} />
              <Metric label="결근" value={`${overview.attendance.absentCount}건`} tone={overview.attendance.absentCount > 0 ? "rose" : "default"} />
            </div>
          ) : (
            <EmptyState>등록된 근태 데이터가 없습니다.</EmptyState>
          )}
        </InfoCard>

        <InfoCard title="현재 반기 식대/복지포인트 요약">
          {overviewQuery.isLoading ? (
            <EmptyState>요약 정보를 불러오는 중입니다.</EmptyState>
          ) : !points ? (
            <EmptyState>식대 또는 복지포인트 조회 권한이 없습니다.</EmptyState>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <WalletCards className="h-4 w-4 text-slate-400" />
                  식대
                </div>
                {overview?.permissions.meal ? (
                  <dl className="mt-3 space-y-1 text-sm">
                    <Field label="예산" value={formatAmount(points.mealBudget)} />
                    <Field label="사용액" value={formatAmount(points.mealUsed)} />
                    <Field label="잔액" value={formatAmount(remainingAmount(points.mealBudget, points.mealUsed))} />
                  </dl>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">식대 조회 권한이 없습니다.</p>
                )}
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <BadgeCheck className="h-4 w-4 text-slate-400" />
                  복지포인트
                </div>
                {overview?.permissions.points ? (
                  <dl className="mt-3 space-y-1 text-sm">
                    <Field label="예산" value={formatAmount(points.welfareBudget)} />
                    <Field label="사용액" value={formatAmount(points.welfareUsed)} />
                    <Field label="잔액" value={formatAmount(remainingAmount(points.welfareBudget, points.welfareUsed))} />
                  </dl>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    복지포인트 조회 권한이 없습니다.
                  </p>
                )}
              </div>
            </div>
          )}
        </InfoCard>

        <InfoCard title="민감정보">
          {sensitiveData ? (
            <dl>
              <Field label="생년월일" value={sensitiveData.birth_date || "-"} />
              <Field label="휴대폰번호" value={sensitiveData.phone || "-"} />
              <Field label="여권번호" value={sensitiveData.passport_number || "-"} />
            </dl>
          ) : canRequestSensitive ? (
            <div className="flex items-start justify-between gap-4 rounded-lg bg-slate-50 p-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  조회 사유 필요
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  조회 시 감사 로그에 사유와 조회 기록이 남습니다.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setIsSensitiveOpen(true)}
              >
                <Eye className="h-4 w-4" />
                보기
              </Button>
            </div>
          ) : (
            <EmptyState>대표 권한 또는 민감정보 조회 권한이 필요합니다.</EmptyState>
          )}
        </InfoCard>
      </div>

      <Dialog open={isSensitiveOpen} onOpenChange={setIsSensitiveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>민감정보 조회</DialogTitle>
            <DialogDescription>
              조회 사유는 감사 로그에 기록됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              value={sensitiveReason}
              onChange={(event) => setSensitiveReason(event.target.value)}
              placeholder="예: 인사 정보 확인 요청 처리"
              rows={4}
            />
            {sensitiveError && (
              <p className="text-sm text-rose-600">{sensitiveError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsSensitiveOpen(false);
                setSensitiveError("");
              }}
            >
              취소
            </Button>
            <Button
              onClick={handleSensitiveSubmit}
              disabled={sensitiveMutation.isPending}
            >
              {sensitiveMutation.isPending ? "조회 중..." : "조회"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
