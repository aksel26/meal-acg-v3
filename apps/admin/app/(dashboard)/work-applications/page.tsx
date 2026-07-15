"use client";

import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { Check, Clock, FileText, Search, X } from "lucide-react";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Textarea } from "@repo/ui/src/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/src/select";
import {
  useUpdateWorkApplicationStatus,
  useWorkApplications,
  type WorkApplication,
  type WorkApplicationStatus,
} from "@/hooks/useWorkApplications";

const TYPE_LABEL: Record<string, string> = {
  overtime: "시간외",
  weekend: "주말",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "반려",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "border-slate-200 bg-slate-50 text-slate-700",
  approved: "border-slate-200 bg-slate-50 text-slate-700",
  rejected: "border-slate-200 bg-slate-50 text-slate-700",
};
const actionIconClass = "mr-1 h-3.5 w-3.5 shrink-0";

export default function WorkApplicationsAdminPage() {
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: applications = [], isLoading } = useWorkApplications({
    status,
    type,
    keyword,
  });
  const updateMutation = useUpdateWorkApplicationStatus();
  const statusCounts = useMemo(
    () => ({
      pending: applications.filter((item) => item.status === "pending").length,
      approved: applications.filter((item) => item.status === "approved").length,
      rejected: applications.filter((item) => item.status === "rejected").length,
    }),
    [applications],
  );

  const teamProgress = useMemo(() => {
    const map = new Map<string, { teamName: string; total: number; pending: number; approved: number; rejected: number }>();

    applications.forEach((item) => {
      const teamName = item.requester?.team?.name || "소속 없음";
      const current = map.get(teamName) || {
        teamName,
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
      };

      current.total += 1;
      current[item.status] += 1;
      map.set(teamName, current);
    });

    return Array.from(map.values()).sort((a, b) => b.pending - a.pending || b.total - a.total);
  }, [applications]);

  const updateStatus = (id: string, nextStatus: WorkApplicationStatus, reason?: string) => {
    updateMutation.mutate({ id, status: nextStatus, rejectReason: reason });
  };

  const confirmReject = () => {
    if (!rejectingId) return;
    updateStatus(rejectingId, "rejected", rejectReason);
    setRejectingId(null);
    setRejectReason("");
  };

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-xl bg-white">
          <div className="border-b border-slate-100 py-3">
            <h2 className="font-semibold text-slate-900">팀별 진행 내역</h2>
          </div>
          {teamProgress.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-slate-100">
              {teamProgress.map((team) => (
                <div key={team.teamName} className="py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-semibold text-slate-900">{team.teamName}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <CountBadge label="대기" value={team.pending} />
                      <CountBadge label="승인" value={team.approved} />
                      <CountBadge label="반려" value={team.rejected} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white">
          <div className="border-b border-slate-100 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-semibold text-slate-900">전체 인원 내역</h2>
              <div className="flex flex-wrap items-center gap-1.5">
                <CountBadge label="대기" value={statusCounts.pending} />
                <CountBadge label="승인" value={statusCounts.approved} />
                <CountBadge label="반려" value={statusCounts.rejected} />
              </div>
            </div>

            <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="pending">대기</SelectItem>
                  <SelectItem value="approved">승인</SelectItem>
                  <SelectItem value="rejected">반려</SelectItem>
                </SelectContent>
              </Select>

              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 유형</SelectItem>
                  <SelectItem value="overtime">시간외</SelectItem>
                  <SelectItem value="weekend">주말</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="w-full pl-9"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="이름, 팀, 프로젝트/업무명, 사유 검색"
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-sm text-slate-400">불러오는 중...</div>
          ) : applications.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full whitespace-nowrap text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">상태</th>
                    <th className="px-4 py-2.5">신청자</th>
                    <th className="px-4 py-2.5">팀</th>
                    <th className="px-4 py-2.5">유형</th>
                    <th className="px-4 py-2.5">근무일</th>
                    <th className="px-4 py-2.5">프로젝트/업무</th>
                    <th className="px-4 py-2.5">사유</th>
                    <th className="w-44 px-4 py-2.5 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.map((item) => (
                    <ApplicationRow
                      key={item.id}
                      item={item}
                      isPending={updateMutation.isPending}
                      onApprove={() => updateStatus(item.id, "approved")}
                      onReopen={() => updateStatus(item.id, "pending")}
                      onReject={() => {
                        setRejectingId(item.id);
                        setRejectReason("");
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && applications.length > 0 && (
            <div className="divide-y divide-slate-100 lg:hidden">
              {applications.map((item) => (
                <ApplicationMobileCard
                  key={item.id}
                  item={item}
                  isPending={updateMutation.isPending}
                  onApprove={() => updateStatus(item.id, "approved")}
                  onReopen={() => updateStatus(item.id, "pending")}
                  onReject={() => {
                    setRejectingId(item.id);
                    setRejectReason("");
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {rejectingId && (
        <section className="rounded-xl bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-900">반려 사유</h3>
          <Textarea
            className="mt-2 bg-white"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            rows={3}
            placeholder="반려 사유를 입력해주세요."
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectingId(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={updateMutation.isPending}
            >
              반려
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function CountBadge({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex h-6 items-center rounded-full bg-slate-100 px-2 text-[11px] font-medium text-slate-500">
      {label} {value}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <FileText className="mb-3 h-10 w-10" />
      <p className="text-sm">조회된 근무 신청이 없습니다.</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function ApplicationRow({
  item,
  isPending,
  onApprove,
  onReject,
  onReopen,
}: {
  item: WorkApplication;
  isPending: boolean;
  onApprove: () => void;
  onReject: () => void;
  onReopen: () => void;
}) {
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
      <td className="px-4 py-3">
        <p className="font-medium text-slate-900">{item.requester?.full_name || "-"}</p>
      </td>
      <td className="px-4 py-3 text-slate-500">{item.requester?.team?.name || "소속 없음"}</td>
      <td className="px-4 py-3 text-slate-700">{TYPE_LABEL[item.application_type]}</td>
      <td className="px-4 py-3 text-slate-600">
        {dayjs(item.work_date).format("YYYY.MM.DD")} {item.start_time.slice(0, 5)}-{item.end_time.slice(0, 5)}
      </td>
      <td className="max-w-[180px] px-4 py-3 text-slate-700">
        <p className="truncate">{item.project_name}</p>
      </td>
      <td className="max-w-[220px] px-4 py-3 text-slate-500">
        <p className="truncate">{item.reject_reason || item.reason}</p>
      </td>
      <td className="px-4 py-3">
        <ActionButtons
          status={item.status}
          isPending={isPending}
          onApprove={onApprove}
          onReject={onReject}
          onReopen={onReopen}
        />
      </td>
    </tr>
  );
}

function ApplicationMobileCard({
  item,
  isPending,
  onApprove,
  onReject,
  onReopen,
}: {
  item: WorkApplication;
  isPending: boolean;
  onApprove: () => void;
  onReject: () => void;
  onReopen: () => void;
}) {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{item.requester?.full_name || "-"}</p>
          <p className="mt-1 text-sm text-slate-500">
            {item.requester?.team?.name || "소속 없음"} · {TYPE_LABEL[item.application_type]}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <p className="text-sm text-slate-600">
        {dayjs(item.work_date).format("YYYY.MM.DD")} {item.start_time.slice(0, 5)}-{item.end_time.slice(0, 5)}
      </p>
      <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{item.project_name}</p>
      <p className="text-sm text-slate-500">{item.reject_reason || item.reason}</p>
      <ActionButtons
        status={item.status}
        isPending={isPending}
        onApprove={onApprove}
        onReject={onReject}
        onReopen={onReopen}
      />
    </div>
  );
}

function ActionButtons({
  status,
  isPending,
  onApprove,
  onReject,
  onReopen,
}: {
  status: string;
  isPending: boolean;
  onApprove: () => void;
  onReject: () => void;
  onReopen: () => void;
}) {
  if (status !== "pending") {
    return (
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={onReopen} disabled={isPending}>
          <Clock className={actionIconClass} />
          대기로
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-2">
      <Button size="sm" variant="outline" onClick={onReject} disabled={isPending}>
        <X className={actionIconClass} />
        반려
      </Button>
      <Button size="sm" onClick={onApprove} disabled={isPending}>
        <Check className={actionIconClass} />
        승인
      </Button>
    </div>
  );
}
