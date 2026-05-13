"use client";

import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Lock,
  Calendar,
  Clock,
} from "lucide-react";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { Checkbox } from "@repo/ui/src/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/src/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import {
  useLeaveTypes,
  useCreateLeaveType,
  useUpdateLeaveType,
  useDeleteLeaveType,
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
  const { data: leaveTypes, isLoading } = useLeaveTypes();
  const createMutation = useCreateLeaveType();
  const updateMutation = useUpdateLeaveType();
  const deleteMutation = useDeleteLeaveType();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LeaveType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeaveType | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);

  const openCreate = () => {
    setEditTarget(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (lt: LeaveType) => {
    setEditTarget(lt);
    setForm({
      name: lt.name,
      category: lt.category,
      duration_type: lt.duration_type,
      include_in_stats: lt.include_in_stats,
      deducts_annual: lt.deducts_annual,
      deduction_amount: String(lt.deduction_amount),
      has_separate_quota: lt.has_separate_quota,
      default_quota: String(lt.default_quota),
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.category) return;

    const payload = {
      name: form.name,
      category: form.category,
      duration_type: form.duration_type,
      include_in_stats: form.include_in_stats,
      deducts_annual: form.deducts_annual,
      deduction_amount: parseFloat(form.deduction_amount) || 0,
      has_separate_quota: form.has_separate_quota,
      default_quota: parseInt(form.default_quota) || 0,
    };

    if (editTarget) {
      updateMutation.mutate(
        { id: editTarget.id, ...payload },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  const systemTypes = (leaveTypes || []).filter((t) => t.is_system);
  const customTypes = (leaveTypes || []).filter((t) => !t.is_system);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">휴가 유형 관리</h1>
          <p className="mt-1 text-sm text-slate-500">
            시스템 유형은 수정할 수 없으며, 커스텀 유형을 추가/수정/삭제할 수 있습니다.
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          유형 추가
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-400">
          불러오는 중...
        </div>
      ) : (
        <div className="space-y-6">
          {/* System Types */}
          <div>
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Lock className="h-4 w-4 text-slate-400" />
              시스템 유형 ({systemTypes.length})
            </h2>
            <div className="grid gap-2">
              {systemTypes.map((lt) => (
                <LeaveTypeRow key={lt.id} leaveType={lt} />
              ))}
            </div>
          </div>

          {/* Custom Types */}
          <div>
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Calendar className="h-4 w-4 text-slate-400" />
              커스텀 유형 ({customTypes.length})
            </h2>
            {customTypes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                커스텀 유형이 없습니다. 위 버튼으로 추가해보세요.
              </div>
            ) : (
              <div className="grid gap-2">
                {customTypes.map((lt) => (
                  <LeaveTypeRow
                    key={lt.id}
                    leaveType={lt}
                    onEdit={openEdit}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "유형 수정" : "유형 추가"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>이름 *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="예: 특별휴가"
              />
            </div>
            <div className="space-y-2">
              <Label>카테고리 *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>시간 구분</Label>
              <Select
                value={form.duration_type}
                onValueChange={(v) =>
                  setForm({ ...form, duration_type: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">종일</SelectItem>
                  <SelectItem value="morning">오전</SelectItem>
                  <SelectItem value="afternoon">오후</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="deducts_annual"
                checked={form.deducts_annual}
                onCheckedChange={(v: boolean) =>
                  setForm({ ...form, deducts_annual: v })
                }
              />
              <Label htmlFor="deducts_annual">연차 차감</Label>
            </div>
            {form.deducts_annual && (
              <div className="space-y-2">
                <Label>차감량 (일)</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={form.deduction_amount}
                  onChange={(e) =>
                    setForm({ ...form, deduction_amount: e.target.value })
                  }
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Checkbox
                id="has_separate_quota"
                checked={form.has_separate_quota}
                onCheckedChange={(v: boolean) =>
                  setForm({ ...form, has_separate_quota: v })
                }
              />
              <Label htmlFor="has_separate_quota">별도 할당</Label>
            </div>
            {form.has_separate_quota && (
              <div className="space-y-2">
                <Label>기본 할당 일수</Label>
                <Input
                  type="number"
                  value={form.default_quota}
                  onChange={(e) =>
                    setForm({ ...form, default_quota: e.target.value })
                  }
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Checkbox
                id="include_in_stats"
                checked={form.include_in_stats}
                onCheckedChange={(v: boolean) =>
                  setForm({ ...form, include_in_stats: v })
                }
              />
              <Label htmlFor="include_in_stats">통계 포함</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !form.name ||
                !form.category ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {editTarget ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>유형 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &apos;{deleteTarget?.name}&apos; 유형을 삭제하시겠습니까?
              사용 중인 근태 기록이 있으면 삭제할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LeaveTypeRow({
  leaveType,
  onEdit,
  onDelete,
}: {
  leaveType: LeaveType;
  onEdit?: (lt: LeaveType) => void;
  onDelete?: (lt: LeaveType) => void;
}) {
  return (
    <div className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
          {leaveType.is_system ? (
            <Lock className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <Clock className="h-3.5 w-3.5 text-slate-500" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">
              {leaveType.name}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
              {leaveType.category}
            </span>
            <span className="text-[11px] text-slate-400">
              {DURATION_LABELS[leaveType.duration_type] || leaveType.duration_type}
            </span>
          </div>
          <div className="flex gap-3 text-[11px] text-slate-400">
            {leaveType.deducts_annual && (
              <span>연차 차감: {leaveType.deduction_amount}일</span>
            )}
            {leaveType.has_separate_quota && (
              <span>별도 할당: {leaveType.default_quota}일</span>
            )}
            {!leaveType.include_in_stats && <span>통계 미포함</span>}
          </div>
        </div>
      </div>

      {!leaveType.is_system && onEdit && onDelete && (
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onEdit(leaveType)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(leaveType)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
