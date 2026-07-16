"use client";

import { useMemo, useState } from "react";
import type { ComponentType, FormEvent, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
  Check,
  Clock,
  FileText,
  ListChecks,
  Plus,
  Send,
  X,
} from "lucide-react";
import { Button } from "@repo/ui/src/button";
import { DatePicker } from "@repo/ui/src/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { SearchableDropdown } from "@repo/ui/src/searchable-dropdown";
import { Textarea } from "@repo/ui/src/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { toast } from "@repo/ui/src/sonner";
import { useUserStore } from "@/stores/userStore";
import {
  useCreateWorkApplication,
  useProcessWorkApplication,
  useWorkApplications,
  type WorkApplication,
  type WorkApplicationType,
} from "@/hooks/use-work-applications";

dayjs.extend(utc);
dayjs.extend(timezone);

type TabKey = "mine" | "managed";

type MemberOption = {
  id: string;
  full_name: string;
  member_role: string | null;
  user_authority: string | null;
  division_id: string | null;
  team_id: string | null;
  team_name: string | null;
};

const MANAGER_ROLES = new Set(["대표", "본부장", "팀장", "파트장"]);

function canApproveWeekendWork(member: MemberOption) {
  return (
    (!!member.member_role && MANAGER_ROLES.has(member.member_role)) ||
    member.user_authority === "팀장" ||
    member.user_authority === "팀장/본부장"
  );
}

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
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const EMPTY_FORM = {
  applicationType: "weekend" as WorkApplicationType,
  workDate: dayjs().format("YYYY-MM-DD"),
  startTime: "18:00",
  endTime: "19:00",
  projectName: "",
  reason: "",
  approverId: "",
};

const EMPTY_OVERTIME_FORM = {
  expectedEndTime: "19:00",
  location: "",
  reason: "",
  approverIds: [] as string[],
  ccMemberIds: [] as string[],
};

export default function OvertimePage() {
  const { memberId, memberRole, userName } = useUserStore();
  const [tab, setTab] = useState<TabKey>("mine");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [form, setForm] = useState(EMPTY_FORM);
  const [overtimeOpen, setOvertimeOpen] = useState(false);
  const [overtimeForm, setOvertimeForm] = useState(EMPTY_OVERTIME_FORM);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const mineQuery = useWorkApplications(memberId || "", "mine", {
    status: statusFilter,
    type: typeFilter,
  });
  const managedQuery = useWorkApplications(memberId || "", "managed", {
    status: statusFilter,
    type: typeFilter,
  });
  const createMutation = useCreateWorkApplication();
  const processMutation = useProcessWorkApplication();
  const { data: members = [] } = useQuery<MemberOption[]>({
    queryKey: ["work-application-approvers", memberId],
    queryFn: async () => {
      const params = memberId
        ? new URLSearchParams({ member_id: memberId })
        : null;
      const res = await fetch(
        `/api/points/members${params ? `?${params}` : ""}`,
      );
      if (!res.ok) throw new Error("승인자 목록 조회 실패");
      return res.json();
    },
    enabled: !!memberId,
  });

  const items = tab === "mine" ? mineQuery.data || [] : managedQuery.data || [];
  const isLoading =
    tab === "mine" ? mineQuery.isLoading : managedQuery.isLoading;
  const approverOptions = useMemo(
    () => members.filter((member) => member.id !== memberId),
    [memberId, members],
  );
  const weekendApproverOptions = useMemo(
    () => approverOptions.filter(canApproveWeekendWork),
    [approverOptions],
  );
  const selectedApprover = weekendApproverOptions.find(
    (member) => member.id === form.approverId,
  );
  const ccOptions = useMemo(
    () => members.filter((member) => member.id !== memberId),
    [memberId, members],
  );
  const pendingManagedCount = useMemo(
    () =>
      (managedQuery.data || []).filter((item) => item.status === "pending")
        .length,
    [managedQuery.data],
  );
  const canManage =
    (managedQuery.data || []).length > 0 || pendingManagedCount > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!memberId) {
      toast.error("사용자 정보를 확인할 수 없습니다.");
      return;
    }
    if (!form.approverId) {
      toast.error("승인자를 선택해주세요.");
      return;
    }

    createMutation.mutate(
      {
        requesterId: memberId,
        applicationType: form.applicationType,
        workDate: form.workDate,
        startTime: form.startTime,
        endTime: form.endTime,
        projectName: form.projectName,
        reason: form.reason,
        approverId: form.approverId,
      },
      {
        onSuccess: () => {
          toast.success("근무 신청이 등록되었습니다.");
          setForm(EMPTY_FORM);
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
  };

  const openOvertimeDialog = () => {
    const currentMember = members.find((member) => member.id === memberId);
    const now = dayjs().tz("Asia/Seoul");
    let approverIds: string[] = [];
    let ccMemberIds: string[] = [];

    if (now.hour() >= 17 && currentMember) {
      const teamLead = members.find(
        (member) =>
          member.id !== memberId &&
          !!currentMember.team_id &&
          member.team_id === currentMember.team_id &&
          (member.member_role === "팀장" ||
            member.user_authority === "팀장" ||
            member.user_authority === "팀장/본부장"),
      );
      const divisionHead = members.find(
        (member) =>
          member.id !== memberId &&
          !!currentMember.division_id &&
          member.division_id === currentMember.division_id &&
          (member.member_role === "본부장" ||
            member.user_authority === "팀장/본부장"),
      );
      const autoCcMember = divisionHead || teamLead;

      if (teamLead) approverIds = [teamLead.id];
      if (autoCcMember) ccMemberIds = [autoCcMember.id];
    }

    setOvertimeForm({
      ...EMPTY_OVERTIME_FORM,
      approverIds,
      ccMemberIds,
    });
    setOvertimeOpen(true);
  };

  const handleOvertimeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!memberId) {
      toast.error("사용자 정보를 확인할 수 없습니다.");
      return;
    }
    if (overtimeForm.approverIds.length === 0) {
      toast.error("승인자를 한 명 이상 선택해주세요.");
      return;
    }
    if (overtimeForm.expectedEndTime <= "17:00") {
      toast.error("예상시간은 오후 5시 이후로 입력해주세요.");
      return;
    }

    createMutation.mutate(
      {
        requesterId: memberId,
        applicationType: "overtime",
        workDate: dayjs().tz("Asia/Seoul").format("YYYY-MM-DD"),
        startTime: "17:00",
        endTime: overtimeForm.expectedEndTime,
        projectName: "연장근무",
        location: overtimeForm.location,
        reason: overtimeForm.reason,
        approverIds: overtimeForm.approverIds,
        ccMemberIds: overtimeForm.ccMemberIds,
      },
      {
        onSuccess: () => {
          toast.success("연장근무 신청이 등록되었습니다.");
          setOvertimeOpen(false);
          setOvertimeForm(EMPTY_OVERTIME_FORM);
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
  };

  const handleApprove = (id: string) => {
    if (!memberId) return;
    processMutation.mutate(
      { id, approverId: memberId, action: "approve" },
      {
        onSuccess: () => toast.success("승인되었습니다."),
        onError: (error: Error) => toast.error(error.message),
      },
    );
  };

  const handleReject = () => {
    if (!memberId || !rejectingId) return;
    processMutation.mutate(
      { id: rejectingId, approverId: memberId, action: "reject", rejectReason },
      {
        onSuccess: () => {
          toast.success("반려되었습니다.");
          setRejectingId(null);
          setRejectReason("");
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
  };

  return (
    <div className="w-full space-y-5">
      <div className="flex justify-end">
        <Button type="button" onClick={openOvertimeDialog}>
          <Plus className="mr-2 h-4 w-4" />
          연장근무 신청하기
        </Button>
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
        <form onSubmit={handleSubmit} className="bg-white p-4">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">주말근무 신청</h2>
            <p className="mt-1 text-sm text-slate-500">
              기존 주말근무 신청 기능입니다.
            </p>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <Field label="근무일">
                <DatePicker
                  value={form.workDate}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, workDate: value }))
                  }
                  placeholder="근무일 선택"
                  className="h-11 border-slate-200 bg-white"
                  modal
                />
              </Field>

              <div className="mt-3">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  근무 시간
                </span>
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-slate-400">
                      시작
                    </span>
                    <Input
                      className="h-11 bg-white"
                      type="time"
                      value={form.startTime}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          startTime: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  <span className="pb-2.5 text-sm font-medium text-slate-400">
                    ~
                  </span>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-slate-400">
                      종료
                    </span>
                    <Input
                      className="h-11 bg-white"
                      type="time"
                      value={form.endTime}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          endTime: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                </div>
              </div>
            </div>

            <Field label="프로젝트/업무명">
              <Input
                value={form.projectName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    projectName: event.target.value,
                  }))
                }
                placeholder="예: ACG 인트라넷 운영"
                required
              />
            </Field>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">
                승인자
              </Label>
              <SearchableDropdown
                items={weekendApproverOptions}
                getItemKey={(member) => member.id}
                getItemLabel={(member) =>
                  `${member.full_name}${member.member_role ? ` · ${member.member_role}` : ""}${
                    member.team_name ? ` · ${member.team_name}` : ""
                  }`
                }
                onSelect={(member) =>
                  setForm((current) => ({ ...current, approverId: member.id }))
                }
                placeholder="승인자 선택"
                searchPlaceholder="이름 검색"
                className="w-full"
              />
              {selectedApprover && (
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-700">
                    {selectedApprover.full_name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {[selectedApprover.member_role, selectedApprover.team_name]
                      .filter(Boolean)
                      .join(" · ") || "승인자"}
                  </span>
                </div>
              )}
            </div>

            <Field label="사유">
              <Textarea
                value={form.reason}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
                placeholder="필요 사유를 입력해주세요."
                rows={4}
                required
              />
            </Field>
          </div>

          <Button
            className="mt-4 w-full"
            type="submit"
            disabled={createMutation.isPending || !form.approverId}
          >
            <Send className="mr-2 h-4 w-4" />
            주말근무 신청하기
          </Button>
        </form>

        <section className="bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">신청 내역</h2>
              <p className="mt-1 text-xs text-slate-500">
                {memberRole || "팀원"} 권한 기준으로 조회합니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TabButton
                active={tab === "mine"}
                onClick={() => setTab("mine")}
                icon={FileText}
              >
                내 신청
              </TabButton>
              <TabButton
                active={tab === "managed"}
                onClick={() => setTab("managed")}
                icon={ListChecks}
              >
                팀원 관리
                {pendingManagedCount > 0 ? ` ${pendingManagedCount}` : ""}
              </TabButton>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="pending">대기</SelectItem>
                <SelectItem value="approved">승인</SelectItem>
                <SelectItem value="rejected">반려</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 유형</SelectItem>
                <SelectItem value="overtime">시간외</SelectItem>
                <SelectItem value="weekend">주말</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-sm text-slate-400">
              불러오는 중...
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Clock className="mb-3 h-9 w-9" />
              <p className="text-sm">
                {tab === "managed" && !canManage
                  ? "관리할 신청이 없습니다."
                  : "신청 내역이 없습니다."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <ApplicationRow
                  key={item.id}
                  item={item}
                  showRequester={tab === "managed"}
                  showActions={
                    tab === "managed" &&
                    item.status === "pending" &&
                    item.my_approval_status === "pending"
                  }
                  isPending={processMutation.isPending}
                  onApprove={() => handleApprove(item.id)}
                  onReject={() => {
                    setRejectingId(item.id);
                    setRejectReason("");
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </section>

      <Dialog open={overtimeOpen} onOpenChange={setOvertimeOpen}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto rounded-2xl">
          <form onSubmit={handleOvertimeSubmit}>
            <DialogHeader>
              <DialogTitle>연장근무 신청</DialogTitle>
              <DialogDescription>
                신청 날짜는 오늘로 고정되며 예상 종료 시각을 입력합니다.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-4">
              <ReadonlyField label="이름" value={userName || "-"} />
              <ReadonlyField
                label="신청 날짜"
                value={dayjs().tz("Asia/Seoul").format("YYYY년 M월 D일")}
              />

              <Field label="예상시간">
                <Input
                  type="time"
                  min="17:01"
                  value={overtimeForm.expectedEndTime}
                  onChange={(event) =>
                    setOvertimeForm((current) => ({
                      ...current,
                      expectedEndTime: event.target.value,
                    }))
                  }
                  required
                />
              </Field>

              <Field label="장소">
                <Input
                  value={overtimeForm.location}
                  onChange={(event) =>
                    setOvertimeForm((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  placeholder="예: 본사 3층 회의실"
                  required
                />
              </Field>

              <Field label="사유">
                <Textarea
                  value={overtimeForm.reason}
                  onChange={(event) =>
                    setOvertimeForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  placeholder="연장근무 사유를 입력해주세요."
                  rows={3}
                  required
                />
              </Field>

              <MemberMultiSelect
                label="승인자"
                members={approverOptions}
                selectedIds={overtimeForm.approverIds}
                onChange={(approverIds) =>
                  setOvertimeForm((current) => ({ ...current, approverIds }))
                }
                required
              />

              <MemberMultiSelect
                label="참조자"
                members={ccOptions}
                selectedIds={overtimeForm.ccMemberIds}
                onChange={(ccMemberIds) =>
                  setOvertimeForm((current) => ({ ...current, ccMemberIds }))
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOvertimeOpen(false)}
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  overtimeForm.approverIds.length === 0
                }
              >
                {createMutation.isPending ? "신청 중..." : "신청하기"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {rejectingId && (
        <section className="rounded-xl border border-red-100 bg-red-50 p-4">
          <h3 className="font-semibold text-red-900">반려 사유</h3>
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
              onClick={handleReject}
              disabled={processMutation.isPending}
            >
              반려
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-500">{label}</Label>
      <div className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
        {value}
      </div>
    </div>
  );
}

function MemberMultiSelect({
  label,
  members,
  selectedIds,
  onChange,
  required = false,
}: {
  label: string;
  members: MemberOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  required?: boolean;
}) {
  const selectedMembers = selectedIds
    .map((id) => members.find((member) => member.id === id))
    .filter((member): member is MemberOption => !!member);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-500">
        {label}
        {required ? <span className="ml-1 text-rose-500">*</span> : null}
      </Label>
      <SearchableDropdown
        items={members.filter((member) => !selectedIds.includes(member.id))}
        getItemKey={(member) => member.id}
        getItemLabel={(member) =>
          `${member.full_name}${member.member_role ? ` · ${member.member_role}` : ""}${member.team_name ? ` · ${member.team_name}` : ""}`
        }
        onSelect={(member) => onChange([...selectedIds, member.id])}
        placeholder={`${label} 선택`}
        searchPlaceholder="이름 검색"
        className="w-full"
      />
      {selectedMembers.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedMembers.map((member) => (
            <span
              key={member.id}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
            >
              {member.full_name}
              <button
                type="button"
                onClick={() =>
                  onChange(selectedIds.filter((id) => id !== member.id))
                }
                className="text-slate-400 hover:text-slate-700"
                aria-label={`${member.full_name} ${label} 제거`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors ${
        active
          ? "bg-slate-900 text-white"
          : "bg-slate-50 text-slate-500 hover:text-slate-800"
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function ApplicationRow({
  item,
  showRequester,
  showActions,
  isPending,
  onApprove,
  onReject,
}: {
  item: WorkApplication;
  showRequester: boolean;
  showActions: boolean;
  isPending: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="relative min-w-0">
        <div className="flex items-start justify-between gap-3">
          <span className="min-w-0 text-sm font-semibold text-slate-900">
            {item.project_name}
          </span>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <div className="flex flex-wrap justify-end gap-1.5">
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[item.status]}`}
              >
                {STATUS_LABEL[item.status]}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {TYPE_LABEL[item.application_type]}
              </span>
            </div>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {dayjs(item.work_date).format("YYYY.MM.DD")}{" "}
          {item.start_time.slice(0, 5)}-{item.end_time.slice(0, 5)}
          {showRequester && item.requester
            ? ` · ${item.requester.full_name}`
            : ""}
          {item.requester?.team?.name ? ` · ${item.requester.team.name}` : ""}
        </p>
        <p className="mt-1 line-clamp-2 text-sm text-slate-500">
          {item.reason}
        </p>
        {item.location ? (
          <p className="mt-1 text-xs text-slate-400">장소: {item.location}</p>
        ) : null}
        {item.reject_reason && (
          <p className="mt-1 text-xs text-red-600">
            반려: {item.reject_reason}
          </p>
        )}
        <span className="absolute bottom-0 right-0 text-xs text-slate-400">
          신청 {dayjs(item.created_at).format("MM/DD HH:mm")}
        </span>
      </div>

      {showActions ? (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={isPending}
          >
            <X className="mr-1 h-4 w-4" />
            반려
          </Button>
          <Button size="sm" onClick={onApprove} disabled={isPending}>
            <Check className="mr-1 h-4 w-4" />
            승인
          </Button>
        </div>
      ) : (
        <div />
      )}
    </div>
  );
}
