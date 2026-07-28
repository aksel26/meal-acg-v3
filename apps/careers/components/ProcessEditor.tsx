"use client";

import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Save,
  Settings2,
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
import { Input } from "@repo/ui/src/input";
import { toast } from "@repo/ui/src/sonner";
import { ProcessAutoSendEditor } from "@/components/ProcessAutoSendEditor";
import {
  createStage,
  normalizeStages,
  reorder,
  STATUS_COLORS,
} from "@/components/postingProcess";
import { StageStatusDialog } from "@/components/StageStatusDialog";
import {
  beginDeleteImpact,
  canConfirmDeleteImpact,
  type DeleteImpactState,
  parseAffectedApplications,
  rejectDeleteImpact,
  resolveDeleteImpact,
} from "@/lib/careers/delete-impact";
import {
  careersApi,
  careersKeys,
  type PostingStage,
  useCareersMutation,
} from "@/hooks/useCareersApi";

function statusColor(id: string) {
  return STATUS_COLORS.find((color) => color.id === id)?.hex ?? "#71717a";
}

export function ProcessEditor({
  postingId,
  initialStages,
  mode = "posting",
}: {
  postingId?: string;
  initialStages: PostingStage[];
  mode?: "posting" | "preset";
}) {
  const [stages, setStages] = useState<PostingStage[]>(() =>
    normalizeStages(initialStages),
  );
  const [statusStageIndex, setStatusStageIndex] = useState<number | null>(null);
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<DeleteImpactState>({
    status: "idle",
  });
  const [dragging, setDragging] = useState<number | null>(null);
  const deleteImpactRequestRef = useRef(0);
  const draggingRef = useRef<number | null>(null);
  const handleRef = useRef(false);

  useEffect(() => setStages(normalizeStages(initialStages)), [initialStages]);

  const mutation = useCareersMutation(
    (value: PostingStage[]) =>
      mode === "preset"
        ? careersApi.saveProcessPreset(value)
        : careersApi.saveProcess(postingId || "", value),
    mode === "preset"
      ? [careersKeys.processPreset, careersKeys.all]
      : [careersKeys.posting(postingId || ""), careersKeys.all],
  );

  function patchStage(index: number, patch: Partial<PostingStage>) {
    setStages((current) =>
      current.map((stage, stageIndex) =>
        stageIndex === index ? { ...stage, ...patch } : stage,
      ),
    );
  }

  async function getDeleteImpact(stageId: string, statusId?: string) {
    if (mode === "preset" || !postingId) return 0;
    const search = new URLSearchParams({ stageId });
    if (statusId) search.set("statusId", statusId);
    const response = await fetch(
      `/api/job-postings/${postingId}/process?${search.toString()}`,
    );
    const body = (await response.json().catch(() => null)) as {
      data?: { affectedApplications?: unknown };
      error?: string;
    } | null;
    if (!response.ok) {
      throw new Error(
        body?.error || "영향받는 지원자 수를 확인하지 못했습니다.",
      );
    }
    return parseAffectedApplications(body?.data?.affectedApplications);
  }

  async function save() {
    if (
      stages.length === 0 ||
      stages.some(
        (stage) =>
          !stage.name.trim() ||
          stage.statuses.length === 0 ||
          stage.statuses.some((status) => !status.name.trim()) ||
          (stage.autoSend?.enabled &&
            (stage.autoSend.channels.length === 0 ||
              (!stage.autoSend.title.trim() && !stage.autoSend.body.trim()))),
      )
    ) {
      toast.error(
        "단계·상태 이름과 활성 자동 발송의 채널 및 제목 또는 내용을 입력해 주세요.",
      );
      return;
    }
    try {
      await mutation.mutateAsync(normalizeStages(stages));
      toast.success(
        mode === "preset"
          ? "기본 프로세스 프리셋을 저장했습니다."
          : "전형 프로세스를 저장했습니다.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "저장하지 못했습니다.",
      );
    }
  }

  async function persistDraft(
    next: PostingStage[],
    successMessage: string,
  ): Promise<boolean> {
    try {
      const normalized = normalizeStages(next);
      await mutation.mutateAsync(normalized);
      setStages(normalized);
      toast.success(successMessage);
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "저장하지 못했습니다.",
      );
      return false;
    }
  }

  const targetStage = deleteTarget === null ? null : stages[deleteTarget];
  const destination =
    deleteTarget === null
      ? null
      : deleteTarget === 0
        ? stages[1]
        : stages[deleteTarget - 1];
  const statusStage =
    statusStageIndex === null ? undefined : stages[statusStageIndex];
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-semibold">
            {mode === "preset" ? "기본 프로세스 프리셋" : "전형 프로세스"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "preset"
              ? "새 공고 생성 시 독립 복사되는 전역 기본 단계입니다. 기존 공고에는 소급 적용되지 않습니다."
              : "단계와 상태의 핸들을 드래그해 순서를 정하고 발송 메시지와 일정 노출을 관리합니다."}
          </p>
        </div>
        <Button onClick={save} disabled={mutation.isPending}>
          <Save />
          {mutation.isPending ? "저장 중..." : "프로세스 저장"}
        </Button>
      </div>

      {stages.map((stage, stageIndex) => (
        <article
          key={stage.id || `stage-${stageIndex}`}
          draggable
          onDragStart={(event) => {
            if (!handleRef.current) {
              event.preventDefault();
              return;
            }
            handleRef.current = false;
            draggingRef.current = stageIndex;
            setDragging(stageIndex);
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
              setStages((current) =>
                normalizeStages(reorder(current, from, stageIndex)),
              );
            }
            draggingRef.current = null;
            setDragging(null);
          }}
          className={`overflow-hidden rounded-xl bg-white transition-opacity ${
            dragging === stageIndex ? "opacity-40" : ""
          }`}
        >
          <div className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center">
            <div className="flex shrink-0 items-center xl:hidden">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-[40px]"
                aria-label="단계 위로 이동"
                disabled={stageIndex === 0}
                onClick={() =>
                  setStages((current) =>
                    normalizeStages(
                      reorder(current, stageIndex, stageIndex - 1),
                    ),
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
                aria-label="단계 아래로 이동"
                disabled={stageIndex === stages.length - 1}
                onClick={() =>
                  setStages((current) =>
                    normalizeStages(
                      reorder(current, stageIndex, stageIndex + 1),
                    ),
                  )
                }
              >
                <ChevronDown className="size-4" />
              </Button>
              <span className="ml-2 text-xs tabular-nums text-slate-400">
                {stageIndex + 1}단계
              </span>
            </div>
            <button
              type="button"
              aria-label="단계 순서 이동. 위아래 화살표 키로 이동"
              className="hidden size-[40px] shrink-0 cursor-grab items-center justify-center self-stretch rounded text-slate-400 hover:bg-slate-50 hover:text-slate-700 active:cursor-grabbing xl:flex"
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
                  event.key === "ArrowUp" ? stageIndex - 1 : stageIndex + 1;
                setStages((current) =>
                  normalizeStages(reorder(current, stageIndex, nextIndex)),
                );
              }}
            >
              <GripVertical className="size-4" />
            </button>
            <span className="hidden w-6 shrink-0 text-center text-xs tabular-nums text-slate-400 xl:block">
              {stageIndex + 1}
            </span>
            <Input
              aria-label={`${stageIndex + 1}단계 이름`}
              className="xl:max-w-xs"
              value={stage.name}
              onChange={(event) =>
                patchStage(stageIndex, { name: event.target.value })
              }
              placeholder="단계 이름"
            />
            <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
              {stage.statuses.map((status, statusIndex) => (
                <span
                  key={status.id || `status-${statusIndex}`}
                  className="rounded-full px-2 py-1 text-[11px] font-medium text-white"
                  style={{ backgroundColor: statusColor(status.color) }}
                >
                  {status.name || "이름 없음"}
                  {statusIndex === 0 ? " · 시작" : ""}
                  {statusIndex === stage.statuses.length - 1
                    ? " · 단계 종료"
                    : ""}
                </span>
              ))}
            </div>
            <label className="flex shrink-0 items-center gap-2 text-xs text-slate-600">
              <Checkbox
                checked={stage.showOnCalendar}
                onCheckedChange={(checked) =>
                  patchStage(stageIndex, {
                    showOnCalendar: checked === true,
                  })
                }
              />
              채용 일정에 노출
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStatusStageIndex(stageIndex)}
            >
              <Settings2 /> 상태 관리
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="단계 삭제"
              disabled={stages.length === 1}
              onClick={async () => {
                const requestSequence = ++deleteImpactRequestRef.current;
                setDeleteTarget(stageIndex);
                setDeleteImpact(beginDeleteImpact(stage.id, requestSequence));
                try {
                  const count = parseAffectedApplications(
                    await getDeleteImpact(stage.id),
                  );
                  setDeleteImpact((current) =>
                    resolveDeleteImpact(
                      current,
                      stage.id,
                      requestSequence,
                      count,
                    ),
                  );
                } catch (error) {
                  setDeleteImpact((current) =>
                    rejectDeleteImpact(
                      current,
                      stage.id,
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

          <button
            type="button"
            className="flex w-full items-center justify-between border-t border-slate-100 px-4 py-2.5 text-left text-xs text-slate-500 hover:bg-slate-50"
            onClick={() =>
              setExpandedStageId((current) =>
                current === stage.id ? null : stage.id,
              )
            }
          >
            <span>
              발송 메시지 설정
              {stage.autoSend?.enabled ? " · 자동 기록 사용 중" : ""}
            </span>
            {expandedStageId === stage.id ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>
          {expandedStageId === stage.id && (
            <ProcessAutoSendEditor
              value={
                stage.autoSend || {
                  enabled: false,
                  channels: ["email", "sms"],
                  title: "{{전형단계명}} 안내",
                  body: "",
                }
              }
              onChange={(autoSend) => patchStage(stageIndex, { autoSend })}
              onSave={() =>
                persistDraft(stages, "발송 메시지 설정을 저장했습니다.")
              }
            />
          )}
        </article>
      ))}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() =>
          setStages((current) => [...current, createStage(current.length)])
        }
      >
        <Plus /> 전형 단계 추가
      </Button>

      {statusStageIndex !== null && statusStage && (
        <StageStatusDialog
          open
          onOpenChange={(open) => !open && setStatusStageIndex(null)}
          stage={statusStage}
          getDeleteImpact={(statusId) =>
            getDeleteImpact(statusStage.id, statusId)
          }
          onSave={(statuses) =>
            persistDraft(
              stages.map((stage, index) =>
                index === statusStageIndex ? { ...stage, statuses } : stage,
              ),
              "상태값을 저장했습니다.",
            )
          }
          onDelete={(statuses) =>
            persistDraft(
              stages.map((stage, index) =>
                index === statusStageIndex ? { ...stage, statuses } : stage,
              ),
              "상태값을 삭제하고 영향받는 지원자를 시작 상태로 이동했습니다.",
            )
          }
        />
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (open) return;
          deleteImpactRequestRef.current += 1;
          setDeleteTarget(null);
          setDeleteImpact({ status: "idle" });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>단계를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{targetStage?.name}&quot; 단계를 삭제합니다.
              {mode === "preset" &&
                " 이후 생성되는 공고에만 변경 사항이 적용됩니다."}
              {deleteImpact.status === "loading" &&
                " 영향받는 지원자 수를 확인 중입니다."}
              {deleteImpact.status === "error" && (
                <span className="mt-2 block text-red-600">
                  {deleteImpact.message} 삭제를 진행할 수 없습니다.
                </span>
              )}
              {mode === "posting" &&
                deleteImpact.status === "loaded" &&
                deleteImpact.count === 0 &&
                " 현재 이 단계를 참조하는 지원자는 0명입니다."}
              {mode === "posting" &&
                deleteImpact.status === "loaded" &&
                deleteImpact.count > 0 &&
                destination && (
                  <>
                    {" "}
                    현재 단계인 지원자 {deleteImpact.count}명은{" "}
                    {deleteTarget === 0 ? "다음" : "이전"} 단계 &quot;
                    {destination.name}&quot;으로 이동하고, 삭제 단계의 날짜·메모
                    기록도 함께 삭제됩니다.
                  </>
                )}{" "}
              이 작업은 즉시 저장되며 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                mutation.isPending ||
                !targetStage ||
                !canConfirmDeleteImpact(deleteImpact, targetStage.id)
              }
              onClick={async () => {
                if (
                  deleteTarget === null ||
                  !targetStage ||
                  !canConfirmDeleteImpact(deleteImpact, targetStage.id)
                )
                  return;
                const saved = await persistDraft(
                  stages.filter((_, index) => index !== deleteTarget),
                  mode === "preset"
                    ? "프리셋 단계를 삭제했습니다."
                    : "단계를 삭제하고 영향받는 지원자를 인접 단계로 이동했습니다.",
                );
                if (saved) {
                  deleteImpactRequestRef.current += 1;
                  setDeleteTarget(null);
                  setDeleteImpact({ status: "idle" });
                }
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
