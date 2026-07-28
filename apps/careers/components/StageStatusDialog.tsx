"use client";

import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { Button } from "@repo/ui/src/button";
import { Checkbox } from "@repo/ui/src/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Input } from "@repo/ui/src/input";
import type { PostingStage, StageStatus } from "@/hooks/useCareersApi";
import {
  createStatus,
  normalizeStatuses,
  reorder,
  STATUS_COLORS,
} from "@/components/postingProcess";
import {
  beginDeleteImpact,
  canConfirmDeleteImpact,
  type DeleteImpactState,
  parseAffectedApplications,
  rejectDeleteImpact,
  resolveDeleteImpact,
} from "@/lib/careers/delete-impact";

export function StageStatusDialog({
  open,
  onOpenChange,
  stage,
  onSave,
  onDelete,
  getDeleteImpact,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: PostingStage;
  onSave: (statuses: StageStatus[]) => Promise<boolean> | boolean;
  onDelete: (statuses: StageStatus[]) => Promise<boolean> | boolean;
  getDeleteImpact?: (statusId: string) => Promise<number>;
}) {
  const [statuses, setStatuses] = useState(stage.statuses);
  const [deleteTarget, setDeleteTarget] = useState<StageStatus | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<DeleteImpactState>({
    status: "idle",
  });
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const deleteImpactRequestRef = useRef(0);
  const draggingRef = useRef<number | null>(null);
  const handleRef = useRef(false);

  useEffect(() => setStatuses(stage.statuses), [stage]);

  function patch(id: string, value: Partial<StageStatus>) {
    setStatuses((current) =>
      current.map((status) =>
        status.id === id ? { ...status, ...value } : status,
      ),
    );
  }

  async function removeConfirmed() {
    if (!deleteTarget || !canConfirmDeleteImpact(deleteImpact, deleteTarget.id))
      return;
    const next = normalizeStatuses(
      statuses.filter((status) => status.id !== deleteTarget.id),
    );
    setSaving(true);
    const saved = await onDelete(next);
    setSaving(false);
    if (!saved) return;
    deleteImpactRequestRef.current += 1;
    setStatuses(next);
    setDeleteTarget(null);
    setDeleteImpact({ status: "idle" });
  }

  const remaining = deleteTarget
    ? statuses.filter((status) => status.id !== deleteTarget.id)
    : statuses;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>&quot;{stage.name}&quot; 상태값 관리</DialogTitle>
            <DialogDescription>
              맨 위 상태는 시작, 맨 아래 상태는 단계 종료가 됩니다. 핸들을
              드래그해 순서를 바꿀 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {statuses.map((status, index) => (
              <div
                key={status.id || `status-${index}`}
                draggable
                onDragStart={(event) => {
                  if (!handleRef.current) {
                    event.preventDefault();
                    return;
                  }
                  handleRef.current = false;
                  draggingRef.current = index;
                  setDragging(index);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => {
                  draggingRef.current = null;
                  setDragging(null);
                }}
                onDragOver={(event) => {
                  if (draggingRef.current !== null) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const from = draggingRef.current;
                  if (from !== null) {
                    setStatuses((current) =>
                      normalizeStatuses(reorder(current, from, index)),
                    );
                  }
                  draggingRef.current = null;
                  setDragging(null);
                }}
                className={`flex gap-2 rounded-lg bg-slate-50 p-3 transition-opacity ${
                  dragging === index ? "opacity-40" : ""
                }`}
              >
                <div className="flex shrink-0 flex-col xl:hidden">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-[40px]"
                    aria-label="상태 위로 이동"
                    disabled={index === 0}
                    onClick={() =>
                      setStatuses((current) =>
                        normalizeStatuses(reorder(current, index, index - 1)),
                      )
                    }
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-[40px]"
                    aria-label="상태 아래로 이동"
                    disabled={index === statuses.length - 1}
                    onClick={() =>
                      setStatuses((current) =>
                        normalizeStatuses(reorder(current, index, index + 1)),
                      )
                    }
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                </div>
                <button
                  type="button"
                  aria-label="상태 순서 이동. 위아래 화살표 키로 이동"
                  className="hidden size-[40px] shrink-0 cursor-grab items-center justify-center self-stretch rounded text-slate-400 hover:bg-white hover:text-slate-700 active:cursor-grabbing xl:flex"
                  onMouseDown={() => {
                    handleRef.current = true;
                  }}
                  onMouseUp={() => {
                    handleRef.current = false;
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowUp" && event.key !== "ArrowDown")
                      return;
                    event.preventDefault();
                    const nextIndex =
                      event.key === "ArrowUp" ? index - 1 : index + 1;
                    setStatuses((current) =>
                      normalizeStatuses(reorder(current, index, nextIndex)),
                    );
                  }}
                >
                  <GripVertical className="size-4" />
                </button>
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={status.name}
                      onChange={(event) =>
                        patch(status.id, { name: event.target.value })
                      }
                      placeholder="상태 이름"
                    />
                    {index === 0 && (
                      <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] text-slate-600">
                        시작
                      </span>
                    )}
                    {index === statuses.length - 1 && (
                      <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] text-slate-600">
                        단계 종료
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="상태 삭제"
                      disabled={statuses.length === 1}
                      onClick={async () => {
                        const requestSequence =
                          ++deleteImpactRequestRef.current;
                        setDeleteTarget(status);
                        setDeleteImpact(
                          beginDeleteImpact(status.id, requestSequence),
                        );
                        try {
                          const count = parseAffectedApplications(
                            getDeleteImpact
                              ? await getDeleteImpact(status.id)
                              : 0,
                          );
                          setDeleteImpact((current) =>
                            resolveDeleteImpact(
                              current,
                              status.id,
                              requestSequence,
                              count,
                            ),
                          );
                        } catch (error) {
                          setDeleteImpact((current) =>
                            rejectDeleteImpact(
                              current,
                              status.id,
                              requestSequence,
                              error instanceof Error
                                ? error.message
                                : "영향받는 지원자 수를 확인하지 못했습니다.",
                            ),
                          );
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-wrap gap-2">
                      {STATUS_COLORS.map((color) => (
                        <button
                          key={color.id}
                          type="button"
                          title={color.label}
                          aria-label={`${color.label} 선택`}
                          aria-pressed={status.color === color.id}
                          className={`size-[40px] rounded-full border-[8px] border-transparent bg-clip-content ${
                            status.color === color.id
                              ? "ring-2 ring-slate-900 ring-offset-2"
                              : ""
                          }`}
                          style={{ backgroundColor: color.hex }}
                          onClick={() => patch(status.id, { color: color.id })}
                        />
                      ))}
                    </div>
                    <label className="ml-auto flex items-center gap-2 text-xs text-slate-600">
                      <Checkbox
                        checked={Boolean(status.hasDateInput)}
                        onCheckedChange={(checked) =>
                          patch(status.id, {
                            hasDateInput: checked === true,
                          })
                        }
                      />
                      상태 변경 시 날짜·시간·메모 입력
                    </label>
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() =>
                setStatuses((current) =>
                  normalizeStatuses([...current, createStatus(current.length)]),
                )
              }
            >
              <Plus /> 상태 추가
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button
              onClick={async () => {
                const cleaned = statuses.filter((status) => status.name.trim());
                if (cleaned.length === 0) return;
                setSaving(true);
                const saved = await onSave(normalizeStatuses(cleaned));
                setSaving(false);
                if (!saved) return;
                onOpenChange(false);
              }}
              disabled={saving}
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(next) => {
          if (next) return;
          deleteImpactRequestRef.current += 1;
          setDeleteTarget(null);
          setDeleteImpact({ status: "idle" });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>상태값을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.name}&quot; 상태를 삭제합니다.
              {deleteImpact.status === "loading" &&
                " 영향받는 지원자 수를 확인 중입니다."}
              {deleteImpact.status === "error" && (
                <span className="mt-2 block text-red-600">
                  {deleteImpact.message} 삭제를 진행할 수 없습니다.
                </span>
              )}
              {deleteImpact.status === "loaded" &&
                (deleteImpact.count > 0
                  ? ` 현재 이 상태를 참조하는 지원자 ${deleteImpact.count}명은 새 시작 상태로 이동합니다.`
                  : " 현재 이 상태를 참조하는 지원자는 0명입니다.")}
              {statuses[0]?.id === deleteTarget?.id &&
                remaining[0] &&
                ` 삭제 후 "${remaining[0].name}"이 시작 상태가 됩니다.`}
              {statuses.at(-1)?.id === deleteTarget?.id &&
                remaining.at(-1) &&
                ` 삭제 후 "${remaining.at(-1)?.name}"이 단계 종료 상태가 됩니다.`}
              {" 이 작업은 즉시 저장되며 되돌릴 수 없습니다."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                saving ||
                !deleteTarget ||
                !canConfirmDeleteImpact(deleteImpact, deleteTarget.id)
              }
              onClick={removeConfirmed}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
