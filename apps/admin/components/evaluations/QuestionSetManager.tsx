"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Copy, Loader2, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "@repo/ui/src/sonner";
import { cn } from "@repo/ui/lib/utils";
import { Badge } from "@repo/ui/src/badge";
import { Button } from "@repo/ui/src/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/src/table";
import { queryKeys } from "@/lib/query-keys";

type QuestionType = "score" | "subjective";

export type QuestionSetItem = {
  id?: string;
  question_set_id?: string;
  position_id: string;
  question_type: QuestionType;
  prompt: string;
  category?: string | null;
  subcategory?: string | null;
  detail?: string | null;
  scale_guide?: string | null;
  scale_min?: number | null;
  scale_max?: number | null;
  scale_weights?: Record<string, number | string | null> | null;
  evaluator_types?: string[] | null;
  evaluator_title_ids?: string[] | null;
  weight: number | null;
  sort_order: number;
  is_required: boolean;
  position?: { id: string; name: string } | null;
};

export type QuestionSet = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  items: QuestionSetItem[];
};

type QuestionSetForm = {
  id?: string;
  name: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  items: QuestionSetItem[];
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(payload?.error || "요청 처리에 실패했습니다.");
  }

  return payload as T;
}

function toPayload(form: QuestionSetForm) {
  return {
    name: form.name,
    description: form.description,
    isActive: form.isActive,
    isDefault: form.isDefault,
    items: form.items.map((item, index) => ({
      positionId: item.position_id,
      questionType: item.question_type,
      prompt: item.prompt,
      category: item.category,
      subcategory: item.subcategory,
      detail: item.detail,
      scaleGuide: item.scale_guide,
      scaleMin: item.scale_min,
      scaleMax: item.scale_max,
      scaleWeights: item.scale_weights || {},
      evaluatorTypes: item.evaluator_types || [],
      evaluatorTitleIds: item.evaluator_title_ids || [],
      weight: item.question_type === "score" ? item.weight : null,
      sortOrder: index + 1,
      isRequired: item.is_required,
    })),
  };
}

function toForm(questionSet: QuestionSet): QuestionSetForm {
  return {
    id: questionSet.id,
    name: questionSet.name,
    description: questionSet.description || "",
    isActive: questionSet.is_active,
    isDefault: questionSet.is_default,
    items: [...questionSet.items].sort((a, b) => a.sort_order - b.sort_order),
  };
}

function questionIdentity(item: QuestionSetItem) {
  return [
    item.question_type,
    item.prompt,
    JSON.stringify(item.scale_weights || {}),
    [...(item.evaluator_types || [])].sort().join(","),
  ].join("|");
}

function logicalQuestionCount(items: QuestionSetItem[]) {
  return new Set(items.map(questionIdentity)).size;
}

export function QuestionSetManager() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: questionSets = [], isLoading } = useQuery<QuestionSet[]>({
    queryKey: queryKeys.evaluations.questionSets,
    queryFn: async () =>
      requestJson<QuestionSet[]>("/api/evaluations/question-sets"),
  });

  function invalidateQuestionSets() {
    queryClient.invalidateQueries({
      queryKey: queryKeys.evaluations.questionSets,
    });
  }

  const updateMutation = useMutation({
    mutationFn: async (next: QuestionSetForm) =>
      requestJson<QuestionSet>(`/api/evaluations/question-sets/${next.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(next)),
      }),
    onSuccess: () => {
      invalidateQuestionSets();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cloneMutation = useMutation({
    mutationFn: async (id: string) =>
      requestJson<QuestionSet>(`/api/evaluations/question-sets/${id}/clone`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("문항 SET이 복제되었습니다.");
      invalidateQuestionSets();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      requestJson<{ success: boolean }>(
        `/api/evaluations/question-sets/${id}`,
        {
          method: "DELETE",
        },
      ),
    onSuccess: () => {
      toast.success("문항 SET이 삭제되었습니다.");
      invalidateQuestionSets();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={() => router.push("/evaluations/question-sets/new")}>
          <Plus className="mr-1 h-4 w-4" />
          신규 SET
        </Button>
      </div>

      <div className="rounded-xl bg-white">
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-slate-50 hover:bg-slate-50">
              <TableHead className="text-xs text-slate-500">SET명</TableHead>
              <TableHead className="w-32 text-xs text-slate-500">
                상태
              </TableHead>
              <TableHead className="w-28 text-xs text-slate-500">
                문항
              </TableHead>
              <TableHead className="w-44 text-xs text-slate-500">
                등록일
              </TableHead>
              <TableHead className="w-44 text-xs text-slate-500">
                수정일
              </TableHead>
              <TableHead className="w-28 text-xs text-slate-500">
                관리
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-sm text-slate-400"
                >
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : questionSets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-sm text-slate-400"
                >
                  등록된 문항 SET이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              questionSets.map((questionSet) => (
                <TableRow
                  key={questionSet.id}
                  className="cursor-pointer border-b last:border-0"
                  onClick={() =>
                    router.push(`/evaluations/question-sets/${questionSet.id}`)
                  }
                >
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={
                          questionSet.is_default
                            ? "기본 SET"
                            : "기본 SET으로 지정"
                        }
                        disabled={
                          !questionSet.is_active ||
                          questionSet.is_default ||
                          updateMutation.isPending
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          updateMutation.mutate({
                            ...toForm(questionSet),
                            isDefault: true,
                          });
                        }}
                        className={cn(
                          "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
                          questionSet.is_default
                            ? "text-amber-500"
                            : "text-slate-300 hover:bg-amber-50 hover:text-amber-500",
                          (!questionSet.is_active ||
                            updateMutation.isPending) &&
                            "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-slate-300",
                        )}
                      >
                        <Star
                          className={cn(
                            "h-4 w-4",
                            questionSet.is_default && "fill-current",
                          )}
                        />
                      </button>
                      <span className="font-medium text-slate-900">
                        {questionSet.name}
                      </span>
                      {questionSet.is_default && (
                        <Badge className="border-0 bg-amber-100 text-amber-700">
                          기본
                        </Badge>
                      )}
                    </div>
                    {questionSet.description && (
                      <div className="mt-0.5 line-clamp-1 text-xs text-slate-400">
                        {questionSet.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="py-3">
                    <button
                      type="button"
                      disabled={updateMutation.isPending}
                      onClick={(event) => {
                        event.stopPropagation();
                        updateMutation.mutate({
                          ...toForm(questionSet),
                          isActive: !questionSet.is_active,
                          isDefault: questionSet.is_active
                            ? false
                            : questionSet.is_default,
                        });
                      }}
                      className="disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Badge
                        className={cn(
                          "cursor-pointer border-0 text-[11px]",
                          questionSet.is_active
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                        )}
                      >
                        {questionSet.is_active ? "활성" : "비활성"}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="py-3 text-sm text-slate-500">
                    {logicalQuestionCount(questionSet.items)}개
                  </TableCell>
                  <TableCell className="py-3 text-sm text-slate-500">
                    {dayjs(questionSet.created_at).format("YYYY-MM-DD HH:mm")}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-slate-500">
                    {dayjs(questionSet.updated_at).format("YYYY-MM-DD HH:mm")}
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          cloneMutation.mutate(questionSet.id);
                        }}
                        disabled={cloneMutation.isPending}
                      >
                        <Copy className="mr-1 h-3.5 w-3.5" />
                        복제
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={deleteMutation.isPending}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (window.confirm("문항 SET을 삭제하시겠습니까?")) {
                            deleteMutation.mutate(questionSet.id);
                          }
                        }}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        삭제
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
