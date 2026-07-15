"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  Calendar,
  Check,
  Clock,
  Lock,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@repo/ui/src/button";
import { Checkbox } from "@repo/ui/src/checkbox";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import {
  useCreateLeaveType,
  useDeleteLeaveType,
  useLeaveTypes,
  useUpdateLeaveType,
  type LeaveType,
} from "@/hooks/useLeaveTypes";

const DURATION_LABELS: Record<string, string> = {
  full: "종일",
  morning: "오전",
  afternoon: "오후",
};

const CATEGORY_OPTIONS = [
  "반반차",
  "반차",
  "연차",
  "지각/조퇴",
  "대체휴무",
  "경조휴무",
  "특별휴무",
  "훈련",
  "휴무",
  "하계휴가",
  "공제",
  "무급휴가",
  "기타",
];

interface FormState {
  name: string;
  category: string;
  duration_type: string;
  include_in_stats: boolean;
  deducts_annual: boolean;
  deduction_amount: string;
  has_separate_quota: boolean;
  default_quota: string;
}

const defaultForm: FormState = {
  name: "",
  category: "",
  duration_type: "full",
  include_in_stats: true,
  deducts_annual: false,
  deduction_amount: "0",
  has_separate_quota: false,
  default_quota: "0",
};

export default function LeaveTypesPage() {
  const { data: leaveTypes = [], isLoading } = useLeaveTypes();
  const createMutation = useCreateLeaveType();
  const updateMutation = useUpdateLeaveType();
  const deleteMutation = useDeleteLeaveType();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LeaveType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeaveType | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);

  const systemTypes = leaveTypes.filter((type) => type.is_system);
  const customTypes = leaveTypes.filter((type) => !type.is_system);
  const isPending = createMutation.isPending || updateMutation.isPending;
  const canSave = form.name.trim().length > 0 && form.category.length > 0;

  function openCreate() {
    setEditTarget(null);
    setForm(defaultForm);
    setFormOpen(true);
  }

  function closeForm() {
    setEditTarget(null);
    setForm(defaultForm);
    setFormOpen(false);
  }

  function openEdit(leaveType: LeaveType) {
    setEditTarget(leaveType);
    setFormOpen(true);
    setForm({
      name: leaveType.name,
      category: leaveType.category,
      duration_type: leaveType.duration_type,
      include_in_stats: leaveType.include_in_stats,
      deducts_annual: leaveType.deducts_annual,
      deduction_amount: String(leaveType.deduction_amount),
      has_separate_quota: leaveType.has_separate_quota,
      default_quota: String(leaveType.default_quota),
    });
  }

  function handleSave() {
    if (!canSave) return;

    const payload = {
      name: form.name.trim(),
      category: form.category,
      duration_type: form.duration_type,
      include_in_stats: form.include_in_stats,
      deducts_annual: form.deducts_annual,
      deduction_amount: form.deducts_annual
        ? parseFloat(form.deduction_amount) || 0
        : 0,
      has_separate_quota: form.has_separate_quota,
      default_quota: form.has_separate_quota
        ? parseInt(form.default_quota, 10) || 0
        : 0,
    };

    if (editTarget) {
      updateMutation.mutate(
        { id: editTarget.id, ...payload },
        { onSuccess: closeForm },
      );
      return;
    }

    createMutation.mutate(payload, { onSuccess: closeForm });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        if (editTarget?.id === deleteTarget.id) {
          closeForm();
        }
        setDeleteTarget(null);
      },
    });
  }

  return (
    <div className="space-y-5">
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "커스텀 유형 수정" : "커스텀 유형 추가"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-700">기본 정보</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="leave-type-name">이름 *</Label>
                  <Input
                    id="leave-type-name"
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    placeholder="예: 특별휴가"
                  />
                </div>

                <div className="space-y-2">
                  <Label>카테고리 *</Label>
                  <Select
                    value={form.category}
                    onValueChange={(value) =>
                      setForm({ ...form, category: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>시간 구분</Label>
                  <Select
                    value={form.duration_type}
                    onValueChange={(value) =>
                      setForm({ ...form, duration_type: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">종일</SelectItem>
                      <SelectItem value="morning">오전</SelectItem>
                      <SelectItem value="afternoon">오후</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50/70 p-4">
                <p className="text-xs font-semibold text-slate-700">
                  차감 설정
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Checkbox
                    id="deducts-annual"
                    checked={form.deducts_annual}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, deducts_annual: checked === true })
                    }
                  />
                  <Label
                    htmlFor="deducts-annual"
                    className="text-sm font-medium text-slate-700"
                  >
                    연차 잔여일에서 차감
                  </Label>
                </div>
                {form.deducts_annual ? (
                  <div className="mt-3 space-y-2">
                    <Label htmlFor="deduction-amount">차감량 (일)</Label>
                    <Input
                      id="deduction-amount"
                      type="number"
                      min="0"
                      step="0.25"
                      value={form.deduction_amount}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          deduction_amount: event.target.value,
                        })
                      }
                    />
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg bg-slate-50/70 p-4">
                <p className="text-xs font-semibold text-slate-700">
                  할당 설정
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Checkbox
                    id="has-separate-quota"
                    checked={form.has_separate_quota}
                    onCheckedChange={(checked) =>
                      setForm({
                        ...form,
                        has_separate_quota: checked === true,
                      })
                    }
                  />
                  <Label
                    htmlFor="has-separate-quota"
                    className="text-sm font-medium text-slate-700"
                  >
                    별도 기본 할당 사용
                  </Label>
                </div>
                {form.has_separate_quota ? (
                  <div className="mt-3 space-y-2">
                    <Label htmlFor="default-quota">기본 할당 일수</Label>
                    <Input
                      id="default-quota"
                      type="number"
                      min="0"
                      value={form.default_quota}
                      onChange={(event) =>
                        setForm({ ...form, default_quota: event.target.value })
                      }
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-lg p-4">
              <p className="text-xs font-semibold text-slate-700">통계 설정</p>
              <div className="mt-3 flex items-center gap-2">
                <Checkbox
                  id="include-in-stats"
                  checked={form.include_in_stats}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, include_in_stats: checked === true })
                  }
                />
                <Label
                  htmlFor="include-in-stats"
                  className="text-sm font-medium text-slate-700"
                >
                  근태 통계에 포함
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeForm}
              disabled={isPending}
            >
              취소
            </Button>
            <Button
              type="button"
              className="gap-1.5"
              onClick={handleSave}
              disabled={!canSave || isPending}
            >
              <Check className="h-4 w-4" />
              {editTarget ? "수정 저장" : "유형 추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="min-w-0">
        <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              휴가 유형 목록
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              시스템 유형은 조회만 가능하며 커스텀 유형은 직접 관리할 수
              있습니다.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1.5 sm:w-auto"
            onClick={openCreate}
          >
            <Plus className="h-4 w-4" />새 유형
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center px-5 py-20 text-sm text-slate-400">
            불러오는 중...
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <LeaveTypeSection
              icon={<Lock className="h-4 w-4 text-slate-400" />}
              title="시스템 유형"
              count={systemTypes.length}
              emptyText="등록된 시스템 유형이 없습니다."
            >
              {systemTypes.map((leaveType) => (
                <LeaveTypeRow key={leaveType.id} leaveType={leaveType} />
              ))}
            </LeaveTypeSection>

            <LeaveTypeSection
              icon={<Calendar className="h-4 w-4 text-slate-400" />}
              title="커스텀 유형"
              count={customTypes.length}
              emptyText="커스텀 유형이 없습니다. 새 유형 버튼으로 추가하세요."
            >
              {customTypes.map((leaveType) => (
                <LeaveTypeRow
                  key={leaveType.id}
                  leaveType={leaveType}
                  isEditing={formOpen && editTarget?.id === leaveType.id}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ))}
            </LeaveTypeSection>
          </div>
        )}
      </section>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>유형 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &apos;{deleteTarget?.name}&apos; 유형을 삭제하시겠습니까? 사용
              중인 근태 기록이 있으면 삭제할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-slate-600 hover:bg-slate-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LeaveTypeSection({
  icon,
  title,
  count,
  emptyText,
  children,
}: {
  icon: ReactNode;
  title: string;
  count: number;
  emptyText: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          {icon}
          {title}
        </h3>
        <span className="text-xs font-medium text-slate-400">{count}개</span>
      </div>
      {count === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
          {emptyText}
        </div>
      ) : (
        <div className="grid gap-2">{children}</div>
      )}
    </div>
  );
}

function LeaveTypeRow({
  leaveType,
  isEditing,
  onEdit,
  onDelete,
}: {
  leaveType: LeaveType;
  isEditing?: boolean;
  onEdit?: (leaveType: LeaveType) => void;
  onDelete?: (leaveType: LeaveType) => void;
}) {
  const statusItems = [
    leaveType.deducts_annual
      ? `연차 차감 ${leaveType.deduction_amount}일`
      : "연차 미차감",
    leaveType.has_separate_quota
      ? `별도 할당 ${leaveType.default_quota}일`
      : "공통 할당",
    leaveType.include_in_stats ? "통계 포함" : "통계 미포함",
  ];

  return (
    <div
      className={[
        "group flex flex-col gap-3 rounded-lg border bg-white px-4 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between",
        isEditing
          ? "border-slate-900"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60",
      ].join(" ")}
    >
      <div className="min-w-0 flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100">
          {leaveType.is_system ? (
            <Lock className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <Clock className="h-3.5 w-3.5 text-slate-500" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">
              {leaveType.name}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {leaveType.category}
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {DURATION_LABELS[leaveType.duration_type] ||
                leaveType.duration_type}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
            {statusItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </div>

      {!leaveType.is_system && onEdit && onDelete ? (
        <div className="flex shrink-0 items-center justify-end gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onEdit(leaveType)}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
            aria-label={`${leaveType.name} 수정`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(leaveType)}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200"
            aria-label={`${leaveType.name} 삭제`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
