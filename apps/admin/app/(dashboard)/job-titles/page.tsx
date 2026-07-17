"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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

function PositionsPanel() {
  const { data: positions = [], isLoading } = usePositions();
  const createMutation = useCreatePosition();
  const updateMutation = useUpdatePosition();
  const deleteMutation = useDeletePosition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null);

  const [name, setName] = useState("");

  function openCreate() {
    setEditing(null);
    setName("");
    setDialogOpen(true);
  }

  function openEdit(position: Position) {
    setEditing(position);
    setName(position.name);
    setDialogOpen(true);
  }

  function handleSave() {
    const nextSortOrder =
      Math.max(0, ...positions.map((position) => position.sort_order)) + 1;
    const data = {
      name,
      sort_order: editing?.sort_order ?? nextSortOrder,
      annual_leave_days: editing?.annual_leave_days ?? 0,
      leave_accrual_rule: editing?.leave_accrual_rule ?? "fixed",
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
        <div>
          <p className="text-sm font-semibold text-slate-900">직급</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {positions.length}개
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          직급 추가
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-medium text-slate-400">
              <th className="px-3 py-2 font-medium">순서</th>
              <th className="px-3 py-2 text-center font-medium">직급명</th>
              <th className="px-3 py-2 text-right font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-3 py-10 text-center text-sm text-slate-500">
                  불러오는 중...
                </td>
              </tr>
            ) : positions.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-10 text-center text-sm text-slate-500">
                  등록된 직급이 없습니다.
                </td>
              </tr>
            ) : (
              positions.map((position) => (
                <tr
                  key={position.id}
                  className="border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50"
                >
                  <td className="px-3 py-3 text-slate-500">
                    {position.sort_order}
                  </td>
                  <td className="px-3 py-3 text-center font-medium text-slate-800">{position.name}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="rounded px-1.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        onClick={() => openEdit(position)}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className="rounded px-1.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-600"
                        onClick={() => setDeleteTarget(position)}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
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

  function openCreate() {
    setEditing(null);
    setName("");
    setDialogOpen(true);
  }

  function openEdit(title: Title) {
    setEditing(title);
    setName(title.name);
    setDialogOpen(true);
  }

  function handleSave() {
    const nextSortOrder =
      Math.max(0, ...titles.map((title) => title.sort_order)) + 1;
    const data = {
      name,
      sort_order: editing?.sort_order ?? nextSortOrder,
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
        <div>
          <p className="text-sm font-semibold text-slate-900">직책</p>
          <p className="mt-0.5 text-xs text-slate-500">{titles.length}개</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          직책 추가
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-medium text-slate-400">
              <th className="px-3 py-2 font-medium">순서</th>
              <th className="px-3 py-2 text-center font-medium">직책명</th>
              <th className="px-3 py-2 text-right font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="px-3 py-10 text-center text-sm text-slate-500">
                  불러오는 중...
                </td>
              </tr>
            ) : titles.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-10 text-center text-sm text-slate-500">
                  등록된 직책이 없습니다.
                </td>
              </tr>
            ) : (
              titles.map((title) => (
                <tr
                  key={title.id}
                  className="border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50"
                >
                  <td className="px-3 py-3 text-slate-500">
                    {title.sort_order}
                  </td>
                  <td className="px-3 py-3 text-center font-medium text-slate-800">{title.name}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="rounded px-1.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        onClick={() => openEdit(title)}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className="rounded px-1.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-600"
                        onClick={() => setDeleteTarget(title)}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
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

export default function JobTitlesPage() {
  return (
    <div className="grid gap-6 p-6 xl:grid-cols-2">
      <PositionsPanel />
      <TitlesPanel />
    </div>
  );
}
