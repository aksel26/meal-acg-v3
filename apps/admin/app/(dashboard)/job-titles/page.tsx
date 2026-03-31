"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  usePositions,
  useCreatePosition,
  useUpdatePosition,
  useDeletePosition,
  type Position,
} from "@/hooks/usePositions";
import {
  useTitles,
  useCreateTitle,
  useUpdateTitle,
  useDeleteTitle,
  type Title,
} from "@/hooks/useTitles";

type AccrualRule = "none" | "fixed" | "+1_per_3yr";

const ACCRUAL_RULE_LABELS: Record<AccrualRule, string> = {
  none: "없음",
  fixed: "고정",
  "+1_per_3yr": "3년마다 +1일",
};

function PositionsPanel() {
  const { data: positions = [], isLoading } = usePositions();
  const createMutation = useCreatePosition();
  const updateMutation = useUpdatePosition();
  const deleteMutation = useDeletePosition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null);

  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const [annualDays, setAnnualDays] = useState(0);
  const [accrualRule, setAccrualRule] = useState<AccrualRule>("fixed");

  function openCreate() {
    setEditing(null);
    setName("");
    setSortOrder(positions.length + 1);
    setAnnualDays(0);
    setAccrualRule("fixed");
    setDialogOpen(true);
  }

  function openEdit(position: Position) {
    setEditing(position);
    setName(position.name);
    setSortOrder(position.sort_order);
    setAnnualDays(position.annual_leave_days);
    setAccrualRule((position.leave_accrual_rule as AccrualRule) ?? "fixed");
    setDialogOpen(true);
  }

  function handleSave() {
    const data = {
      name,
      sort_order: sortOrder,
      annual_leave_days: annualDays,
      leave_accrual_rule: accrualRule,
    };
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, ...data },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      createMutation.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">
          {positions.length}개 직급
        </span>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          직급 추가
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              <th className="px-4 py-3">순서</th>
              <th className="px-4 py-3">직급명</th>
              <th className="px-4 py-3">기본 연차</th>
              <th className="px-4 py-3">가산 규칙</th>
              <th className="px-4 py-3">관리</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  불러오는 중...
                </td>
              </tr>
            ) : positions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  등록된 직급이 없습니다.
                </td>
              </tr>
            ) : (
              positions.map((position) => (
                <tr
                  key={position.id}
                  className="border-b last:border-b-0 hover:bg-slate-50/50"
                >
                  <td className="px-4 py-3 text-slate-500">
                    {position.sort_order}
                  </td>
                  <td className="px-4 py-3 font-medium">{position.name}</td>
                  <td className="px-4 py-3">{position.annual_leave_days}일</td>
                  <td className="px-4 py-3">
                    {ACCRUAL_RULE_LABELS[
                      position.leave_accrual_rule as AccrualRule
                    ] ?? position.leave_accrual_rule}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
                        onClick={() => openEdit(position)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
                        onClick={() => setDeleteTarget(position)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "직급 수정" : "직급 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pos-name">직급명</Label>
              <Input
                id="pos-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예) 사원, 대리, 과장"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pos-sort">순서</Label>
              <Input
                id="pos-sort"
                type="number"
                min={1}
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pos-annual">기본 연차</Label>
              <Input
                id="pos-annual"
                type="number"
                min={0}
                value={annualDays}
                onChange={(e) => setAnnualDays(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>가산 규칙</Label>
              <Select
                value={accrualRule}
                onValueChange={(v) => setAccrualRule(v as AccrualRule)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACCRUAL_RULE_LABELS) as AccrualRule[]).map(
                    (rule) => (
                      <SelectItem key={rule} value={rule}>
                        {ACCRUAL_RULE_LABELS[rule]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || isPending}>
              {editing ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>직급 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.name}&quot; 직급을 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  });
                }
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TitlesPanel() {
  const { data: titles = [], isLoading } = useTitles();
  const createMutation = useCreateTitle();
  const updateMutation = useUpdateTitle();
  const deleteMutation = useDeleteTitle();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Title | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Title | null>(null);

  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState(1);

  function openCreate() {
    setEditing(null);
    setName("");
    setSortOrder(titles.length + 1);
    setDialogOpen(true);
  }

  function openEdit(title: Title) {
    setEditing(title);
    setName(title.name);
    setSortOrder(title.sort_order);
    setDialogOpen(true);
  }

  function handleSave() {
    const data = { name, sort_order: sortOrder };
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, ...data },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      createMutation.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{titles.length}개 직책</span>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          직책 추가
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              <th className="px-4 py-3">순서</th>
              <th className="px-4 py-3">직책명</th>
              <th className="px-4 py-3">관리</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                  불러오는 중...
                </td>
              </tr>
            ) : titles.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                  등록된 직책이 없습니다.
                </td>
              </tr>
            ) : (
              titles.map((title) => (
                <tr
                  key={title.id}
                  className="border-b last:border-b-0 hover:bg-slate-50/50"
                >
                  <td className="px-4 py-3 text-slate-500">
                    {title.sort_order}
                  </td>
                  <td className="px-4 py-3 font-medium">{title.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
                        onClick={() => openEdit(title)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1.5 text-slate-400 hover:bg-slate-100"
                        onClick={() => setDeleteTarget(title)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "직책 수정" : "직책 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="title-name">직책명</Label>
              <Input
                id="title-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예) 팀장, 파트장, 매니저"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title-sort">순서</Label>
              <Input
                id="title-sort"
                type="number"
                min={1}
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || isPending}>
              {editing ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>직책 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.name}&quot; 직책을 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(null),
                  });
                }
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type Tab = "positions" | "titles";

export default function JobTitlesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("positions");

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">직급/직책 관리</h1>
        <p className="mt-1 text-sm text-slate-500">
          직급과 직책을 관리합니다.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex w-fit gap-1 rounded-lg border bg-white p-1">
        <button
          type="button"
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "positions"
              ? "bg-slate-900 text-white"
              : "text-slate-500 hover:text-slate-900"
          }`}
          onClick={() => setActiveTab("positions")}
        >
          직급 관리
        </button>
        <button
          type="button"
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "titles"
              ? "bg-slate-900 text-white"
              : "text-slate-500 hover:text-slate-900"
          }`}
          onClick={() => setActiveTab("titles")}
        >
          직책 관리
        </button>
      </div>

      {activeTab === "positions" ? <PositionsPanel /> : <TitlesPanel />}
    </div>
  );
}
