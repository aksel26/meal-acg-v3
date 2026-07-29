"use client";

import { useCallback, useEffect, useState } from "react";
import { DateRangePicker } from "@repo/ui/src/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import { toast } from "@repo/ui/src/sonner";
import {
  OperationConfirmDialog,
  OperationEmpty,
  OperationFormDialog,
  OperationIconButton,
  OperationLoading,
  OperationPagination,
  OperationReasonDialog,
  OperationToolbar,
  OperationsPage,
  OperationsSection,
  OperationStatus,
  operationButtonClass,
  operationDangerButtonClass,
  operationIconButtonClass,
  operationInputClass,
  operationSecondaryButtonClass,
  operationTextareaClass,
} from "@repo/ui/src/operations";
import { CheckCheck, Pencil, Undo2 } from "lucide-react";
import { adminOperationRequest } from "./client";

type Member = {
  id: string;
  full_name: string;
  team?: { id: string; name: string } | null;
};
type Checklist = {
  id: string;
  title: string;
  description: string | null;
  responsible_party: string | null;
  is_completed: boolean;
  completion_note: string | null;
  sort_order: number;
};
type Preset = {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
};
type Onboarding = {
  id: string;
  member_id: string;
  start_date: string;
  note: string | null;
  admin_note: string | null;
  status: string;
  member: Member;
  checklist: Checklist[];
};
const labels: Record<string, string> = {
  in_progress: "진행",
  completed: "완료",
  cancelled: "취소",
};

export function AdminOnboardingClient() {
  const [requests, setRequests] = useState<Onboarding[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [note, setNote] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetOpen, setPresetOpen] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [checkTitle, setCheckTitle] = useState("");
  const [checkDescription, setCheckDescription] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page) });
        if (statusFilter) params.set("status", statusFilter);
        if (memberFilter.trim()) params.set("member", memberFilter.trim());
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        const data = await adminOperationRequest<{
          requests: Onboarding[];
          members: Member[];
          presets: Preset[];
          total: number;
          pagination: { hasMore: boolean };
        }>(`/api/onboarding?${params}`, { signal });
        setRequests(data.requests);
        setMembers(data.members);
        setPresets(data.presets);
        setTotal(data.total);
        setHasMore(data.pagination.hasMore);
        setMemberId((current) => current || data.members[0]?.id || "");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [dateFrom, dateTo, memberFilter, page, statusFilter],
  );
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).catch((error) => {
      if (error.name !== "AbortError") toast.error(error.message);
    });
    return () => controller.abort();
  }, [load]);

  const selected = requests.find((item) => item.id === selectedId) ?? null;
  function select(item: Onboarding) {
    setSelectedId(item.id);
    setMemberId(item.member_id);
    setStartDate(item.start_date);
    setNote(item.note ?? "");
    setAdminNote(item.admin_note ?? "");
    setFormOpen(true);
  }

  function resetForm() {
    setSelectedId(null);
    setMemberId(members[0]?.id ?? "");
    setStartDate("");
    setNote("");
    setAdminNote("");
  }

  async function mutate(body: Record<string, unknown>) {
    setBusy(true);
    try {
      await adminOperationRequest("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      toast.success("처리했습니다.");
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "처리에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  function resetPresetForm() {
    setEditingPresetId(null);
    setCheckTitle("");
    setCheckDescription("");
  }

  async function savePreset(event: React.FormEvent) {
    event.preventDefault();
    await mutate({
      action: editingPresetId ? "update_preset" : "add_preset",
      presetId: editingPresetId,
      title: checkTitle,
      description: checkDescription,
      sortOrder: editingPresetId
        ? (presets.find((preset) => preset.id === editingPresetId)
            ?.sort_order ?? 0)
        : presets.length,
    });
    resetPresetForm();
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await adminOperationRequest("/api/onboarding", {
        method: selectedId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedId,
          action: selectedId ? "update" : undefined,
          memberId,
          startDate,
          note,
          adminNote,
        }),
      });
      toast.success(
        selectedId ? "온보딩을 수정했습니다." : "대상자를 등록했습니다.",
      );
      setFormOpen(false);
      resetForm();
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "저장에 실패했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <OperationsPage
      variant="admin"
      title="온보딩 관리"
      description="신규 입사자의 온보딩 진행 상황을 확인하고 체크리스트를 관리합니다."
    >
      <OperationFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) resetForm();
        }}
        title={selectedId ? "대상자 수정" : "대상자 등록"}
        description="직원과 온보딩 시작일을 입력해주세요."
      >
        <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
          <div className="text-sm text-slate-600">
            직원
            <Select
              value={memberId}
              onValueChange={setMemberId}
              disabled={Boolean(selectedId)}
            >
              <SelectTrigger aria-label="직원" className="mt-1 w-full">
                <SelectValue placeholder="직원 선택" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="text-sm text-slate-600">
            온보딩 시작일
            <DateRangePicker
              mode="single"
              modal
              startDate={startDate}
              ariaLabel="온보딩 시작일"
              placeholder="시작일 선택"
              className="mt-1"
              onChange={({ startDate: next }) => setStartDate(next)}
            />
          </label>
          <label className="text-sm text-slate-600">
            관리자 메모
            <input
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
            />
          </label>
          <label className="text-sm text-slate-600 md:col-span-2">
            메모
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={`mt-1 ${operationTextareaClass}`}
            />
          </label>
          <div className="flex justify-end gap-2 md:col-span-2">
            <button
              type="button"
              className={operationSecondaryButtonClass}
              onClick={() => setFormOpen(false)}
            >
              취소
            </button>
            <button
              disabled={busy || !memberId || !startDate}
              className={operationButtonClass}
            >
              저장
            </button>
          </div>
        </form>
      </OperationFormDialog>

      <OperationFormDialog
        open={presetOpen}
        onOpenChange={(open) => {
          setPresetOpen(open);
          if (!open) resetPresetForm();
        }}
        title="체크리스트 관리"
        description="여기에 등록한 단계가 이후 등록되는 대상자에게 그대로 적용됩니다."
      >
        <form className="grid gap-3" onSubmit={savePreset}>
          <label className="text-sm text-slate-600">
            제목
            <input
              required
              name="presetTitle"
              value={checkTitle}
              onChange={(event) => setCheckTitle(event.target.value)}
              className={`mt-1 ${operationInputClass}`}
              maxLength={200}
              placeholder="예: 보안 교육 이수"
            />
          </label>
          <label className="text-sm text-slate-600">
            세부내용
            <textarea
              name="presetDescription"
              value={checkDescription}
              onChange={(event) => setCheckDescription(event.target.value)}
              className={`mt-1 ${operationTextareaClass}`}
              maxLength={2000}
              placeholder="입사자가 무엇을 해야 하는지 적어주세요."
            />
          </label>
          <div className="flex justify-end gap-2">
            {editingPresetId && (
              <button
                type="button"
                className={operationSecondaryButtonClass}
                onClick={resetPresetForm}
              >
                수정 취소
              </button>
            )}
            <button
              disabled={busy || !checkTitle.trim()}
              className={operationButtonClass}
            >
              {editingPresetId ? "수정 저장" : "단계 추가"}
            </button>
          </div>
        </form>

        <div className="mt-5 space-y-2">
          {presets.length === 0 ? (
            <OperationEmpty>
              등록된 단계가 없습니다. 추가한 단계는 이후 등록되는 입사자에게
              자동으로 적용됩니다.
            </OperationEmpty>
          ) : (
            presets.map((preset, index) => (
              <div key={preset.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex-1 text-sm font-medium text-slate-900">
                    {index + 1}. {preset.title}
                  </span>
                  <button
                    type="button"
                    className={operationSecondaryButtonClass}
                    onClick={() => {
                      setEditingPresetId(preset.id);
                      setCheckTitle(preset.title);
                      setCheckDescription(preset.description ?? "");
                    }}
                  >
                    수정
                  </button>
                  <OperationConfirmDialog
                    title="이 단계를 삭제할까요?"
                    description="이미 등록된 입사자의 체크 항목은 그대로 남습니다."
                    confirmLabel="단계 삭제"
                    onConfirm={() =>
                      mutate({ action: "delete_preset", presetId: preset.id })
                    }
                  >
                    <button
                      type="button"
                      className={operationDangerButtonClass}
                    >
                      삭제
                    </button>
                  </OperationConfirmDialog>
                </div>
                {preset.description && (
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-500">
                    {preset.description}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </OperationFormDialog>

      <OperationsSection title="">
        <OperationToolbar
          layout="inline"
          action={
            <div className="flex gap-2">
              {requests.length > 0 && (
                <button
                  type="button"
                  className={operationButtonClass}
                  onClick={() => {
                    resetForm();
                    setFormOpen(true);
                  }}
                >
                  대상자 등록
                </button>
              )}
              <button
                type="button"
                className={operationSecondaryButtonClass}
                onClick={() => {
                  resetPresetForm();
                  setPresetOpen(true);
                }}
              >
                체크리스트 관리
              </button>
            </div>
          }
        >
          <span className="whitespace-nowrap text-sm text-slate-500">
            총 {total}건
          </span>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <Select
              value={statusFilter || "all"}
              onValueChange={(value) => {
                setStatusFilter(value === "all" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="온보딩 상태 필터" className="w-32">
                <SelectValue placeholder="전체 상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                {Object.entries(labels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="w-44">
              <input
                aria-label="직원명 검색"
                name="memberSearch"
                value={memberFilter}
                onChange={(event) => {
                  setMemberFilter(event.target.value);
                  setPage(1);
                }}
                className={operationInputClass}
                placeholder="직원명 검색"
              />
            </div>
            <div className="w-52">
              <DateRangePicker
                clearable
                startDate={dateFrom}
                endDate={dateTo}
                ariaLabel="온보딩 시작일 기간 필터"
                placeholder="시작일 기간"
                onChange={({ startDate: from, endDate: to }) => {
                  setDateFrom(from);
                  setDateTo(to);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </OperationToolbar>
        {loading ? (
          <OperationLoading label="온보딩 목록을 불러오는 중" />
        ) : requests.length === 0 ? (
          <OperationEmpty
            action={
              <button
                type="button"
                className={operationButtonClass}
                onClick={() => {
                  resetForm();
                  setFormOpen(true);
                }}
              >
                대상자 등록
              </button>
            }
          >
            조건에 맞는 온보딩이 없습니다.
          </OperationEmpty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="px-3 py-1.5 font-medium">직원</th>
                  <th className="px-3 py-1.5 font-medium">팀</th>
                  <th className="px-3 py-1.5 font-medium">시작일</th>
                  <th className="px-3 py-1.5 font-medium">메모</th>
                  <th className="px-3 py-1.5 font-medium">체크리스트</th>
                  <th className="px-3 py-1.5 font-medium">상태</th>
                  <th className="px-3 py-1.5 font-medium">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((item) => {
                  const done = item.checklist.filter(
                    (check) => check.is_completed,
                  ).length;
                  return (
                    <tr
                      key={item.id}
                      className={
                        item.id === selectedId
                          ? "bg-slate-50 align-middle"
                          : "align-middle"
                      }
                    >
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-950">
                        {item.member?.full_name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                        {item.member?.team?.name ?? "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                        {item.start_date}
                      </td>
                      <td className="max-w-[220px] px-3 py-2 text-slate-600">
                        <p className="truncate" title={item.note ?? ""}>
                          {item.note || "-"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-700">
                        {item.checklist.length === 0
                          ? "-"
                          : `${done}/${item.checklist.length}`}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <OperationStatus value={item.status} labels={labels} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          <OperationIconButton
                            label="상세 · 체크리스트"
                            onClick={() => select(item)}
                          >
                            <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </OperationIconButton>
                          {item.status === "in_progress" && (
                            <>
                              <OperationIconButton
                                label="온보딩 완료"
                                tone="primary"
                                disabled={busy}
                                onClick={() =>
                                  mutate({ id: item.id, action: "complete" })
                                }
                              >
                                <CheckCheck
                                  className="h-3.5 w-3.5"
                                  strokeWidth={1.5}
                                />
                              </OperationIconButton>
                              <OperationReasonDialog
                                title="온보딩을 취소할까요?"
                                description="필요한 경우 취소 메모를 남길 수 있습니다."
                                label="취소 메모"
                                confirmLabel="온보딩 취소"
                                tooltip="온보딩 취소"
                                required={false}
                                onConfirm={(reason) =>
                                  mutate({
                                    id: item.id,
                                    action: "cancel",
                                    reason,
                                  })
                                }
                              >
                                <button
                                  type="button"
                                  aria-label="온보딩 취소"
                                  className={operationIconButtonClass("danger")}
                                >
                                  <Undo2
                                    className="h-3.5 w-3.5"
                                    strokeWidth={1.5}
                                  />
                                </button>
                              </OperationReasonDialog>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </OperationsSection>

      {selected && (
        <OperationsSection title={`${selected.member.full_name} 체크리스트`}>
          {selected.checklist.length === 0 ? (
            <OperationEmpty>
              체크 항목이 없습니다. 체크리스트를 먼저 등록한 뒤 대상자를 만들면
              자동으로 적용됩니다.
            </OperationEmpty>
          ) : (
            <div className="space-y-2">
              {[...selected.checklist]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3"
                  >
                    {item.is_completed ? (
                      <button
                        type="button"
                        className={operationSecondaryButtonClass}
                        onClick={() =>
                          mutate({
                            id: selected.id,
                            itemId: item.id,
                            action: "update_checklist",
                            isCompleted: false,
                            completionNote: "",
                          })
                        }
                      >
                        완료 취소
                      </button>
                    ) : (
                      <OperationReasonDialog
                        title="체크 항목을 완료할까요?"
                        description="필요한 경우 완료 메모를 남길 수 있습니다."
                        label="완료 메모"
                        confirmLabel="완료 처리"
                        required={false}
                        onConfirm={(completionNote) =>
                          mutate({
                            id: selected.id,
                            itemId: item.id,
                            action: "update_checklist",
                            isCompleted: true,
                            completionNote,
                          })
                        }
                      >
                        <button
                          type="button"
                          className={operationSecondaryButtonClass}
                        >
                          완료
                        </button>
                      </OperationReasonDialog>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-sm">
                        {item.title}
                        {item.responsible_party &&
                          ` · ${item.responsible_party}`}
                      </span>
                      {item.description && (
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-500">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <OperationConfirmDialog
                      title="체크 항목을 삭제할까요?"
                      description="삭제한 체크 항목은 복구할 수 없습니다."
                      confirmLabel="항목 삭제"
                      onConfirm={() =>
                        mutate({
                          id: selected.id,
                          itemId: item.id,
                          action: "delete_checklist",
                        })
                      }
                    >
                      <button
                        type="button"
                        className={operationDangerButtonClass}
                      >
                        삭제
                      </button>
                    </OperationConfirmDialog>
                  </div>
                ))}
            </div>
          )}
        </OperationsSection>
      )}

      <OperationPagination
        page={page}
        hasMore={hasMore}
        disabled={loading || busy}
        onPageChange={setPage}
      />
    </OperationsPage>
  );
}
