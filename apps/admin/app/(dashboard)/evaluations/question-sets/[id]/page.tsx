"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  Loader2,
  Plus,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "@repo/ui/src/sonner";
import { cn } from "@repo/ui/lib/utils";
import { Badge } from "@repo/ui/src/badge";
import { Button } from "@repo/ui/src/button";
import { Card, CardContent } from "@repo/ui/src/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Input } from "@repo/ui/src/input";
import { Textarea } from "@repo/ui/src/textarea";
import { queryKeys } from "@/lib/query-keys";

type QuestionType = "score" | "subjective";

type QuestionSetItem = {
  id: string;
  position_id: string;
  question_type: QuestionType;
  prompt: string;
  category: string | null;
  subcategory: string | null;
  detail: string | null;
  scale_guide: string | null;
  scale_min: number | null;
  scale_max: number | null;
  scale_weights: Record<string, number | string | null> | null;
  evaluator_types: string[] | null;
  weight: number | null;
  sort_order: number;
  is_required: boolean;
  position?: { id: string; name: string } | null;
};

type QuestionSet = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  items: QuestionSetItem[];
};

type EditableQuestionRow = {
  no: number;
  category: string;
  subcategory: string;
  evaluatorTypes: string[];
  detail: string;
  questionType: QuestionType;
  scaleMin: number;
  scaleMax: number;
  weight: number | null;
  scaleWeights: Record<string, number>;
  scaleLabels: Record<string, string>;
  scaleGuide: string;
  isRequired: boolean;
};

type EditorSnapshot = {
  rows: EditableQuestionRow[];
  selectedNo: number | null;
};

type EvaluatorSection = {
  key: "common" | "manager" | "peer";
  label: string;
  description: string;
  evaluatorTypes: string[];
};

const EVALUATOR_SECTIONS: EvaluatorSection[] = [
  {
    key: "common",
    label: "공통",
    description: "상사와 동료 평가에 모두 노출되는 문항",
    evaluatorTypes: ["상사", "동료"],
  },
  {
    key: "manager",
    label: "상사",
    description: "상사 평가에만 노출되는 문항",
    evaluatorTypes: ["상사"],
  },
  {
    key: "peer",
    label: "동료평가",
    description: "동료 평가에만 노출되는 문항",
    evaluatorTypes: ["동료"],
  },
];

const CONTROL_FOCUS_CLASS =
  "focus-visible:border-input focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(payload?.error || "요청 처리에 실패했습니다.");
  }

  return payload as T;
}

function questionIdentity(item: QuestionSetItem) {
  return [
    item.question_type,
    item.prompt,
    JSON.stringify(item.scale_weights || {}),
    [...(item.evaluator_types || [])].sort().join(","),
  ].join("|");
}

function splitPrompt(prompt: string) {
  const lines = prompt.split("\n");
  const [category = "", subcategory = ""] = (lines[0] || "").split(">");
  const bodyLines = lines.slice(1).filter((line) => line.trim().length > 0);
  const scaleStartIndex = bodyLines.findIndex((line) =>
    /^(1점|3점|5점|응답 안내|운영 기준)/.test(line.trim()),
  );

  return {
    category: category.trim(),
    subcategory: subcategory.trim(),
    detail:
      scaleStartIndex === -1
        ? bodyLines.join("\n").trim()
        : bodyLines.slice(0, scaleStartIndex).join("\n").trim(),
    scaleGuide:
      scaleStartIndex === -1
        ? ""
        : bodyLines.slice(scaleStartIndex).join("\n").trim(),
  };
}

function makeEmptyRow(no: number): EditableQuestionRow {
  return {
    no,
    category: "",
    subcategory: "",
    evaluatorTypes: ["상사"],
    detail: "",
    questionType: "score",
    scaleMin: 1,
    scaleMax: 5,
    weight: 1,
    scaleWeights: { "1": 1, "2": 1, "3": 1, "4": 1, "5": 1 },
    scaleLabels: {},
    scaleGuide: "",
    isRequired: true,
  };
}

function sectionLabelForKey(sectionKey: EvaluatorSection["key"]) {
  return (
    EVALUATOR_SECTIONS.find((section) => section.key === sectionKey)?.label ||
    sectionKey
  );
}

function cloneRows(rows: EditableQuestionRow[]) {
  return rows.map((row) => ({
    ...row,
    evaluatorTypes: [...row.evaluatorTypes],
    scaleWeights: { ...row.scaleWeights },
    scaleLabels: { ...row.scaleLabels },
  }));
}

function toEditableRows(questionSet?: QuestionSet): EditableQuestionRow[] {
  const groups = new Map<string, QuestionSetItem[]>();
  for (const item of [...(questionSet?.items || [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  )) {
    const key = questionIdentity(item);
    const current = groups.get(key) || [];
    current.push(item);
    groups.set(key, current);
  }

  return Array.from(groups.values())
    .map((items, index) => {
      const sortedItems = [...items].sort(
        (a, b) => a.sort_order - b.sort_order,
      );
      const source = sortedItems[0];
      if (!source) return null;

      const parsed = splitPrompt(source.prompt);
      const scaleMin = source.scale_min || 1;
      const scaleMax = source.scale_max || 5;
      const scaleWeights = buildScaleWeights(
        source.scale_weights,
        scaleMin,
        scaleMax,
        source.weight || 1,
      );
      const scaleLabels = buildScaleLabels(
        source.scale_weights,
        scaleMin,
        scaleMax,
      );

      return {
        no: index + 1,
        category: source.category || parsed.category,
        subcategory: source.subcategory || parsed.subcategory,
        evaluatorTypes:
          source.evaluator_types && source.evaluator_types.length > 0
            ? source.evaluator_types
            : ["상사", "동료"],
        detail: source.detail || parsed.detail || source.prompt,
        questionType: source.question_type,
        scaleMin,
        scaleMax,
        weight: source.question_type === "score" ? source.weight || 1 : null,
        scaleWeights,
        scaleLabels,
        scaleGuide:
          source.scale_guide ||
          parsed.scaleGuide ||
          (source.question_type === "score" ? "5점 척도" : "주관식"),
        isRequired: source.is_required,
      };
    })
    .filter((row): row is EditableQuestionRow => Boolean(row));
}

function buildScaleWeights(
  source: Record<string, number | string | null> | null,
  min: number,
  max: number,
  fallback: number,
) {
  const result: Record<string, number> = {};
  for (let score = min; score <= max; score += 1) {
    const value = source?.[String(score)];
    result[String(score)] = Number(value ?? fallback);
  }
  return result;
}

function buildScaleLabels(
  source: Record<string, number | string | null> | null,
  min: number,
  max: number,
) {
  const result: Record<string, string> = {};
  for (let score = min; score <= max; score += 1) {
    const value = source?.[`label:${score}`];
    result[String(score)] = typeof value === "string" ? value : "";
  }
  return result;
}

function normalizeScaleWeights(
  row: EditableQuestionRow,
  patch?: Partial<
    Pick<EditableQuestionRow, "scaleMin" | "scaleMax" | "weight">
  >,
) {
  const nextMin = patch?.scaleMin ?? row.scaleMin;
  const nextMax = patch?.scaleMax ?? row.scaleMax;
  const fallback = patch?.weight ?? row.weight ?? 1;
  const next: Record<string, number> = {};

  for (let score = nextMin; score <= nextMax; score += 1) {
    next[String(score)] = Number(row.scaleWeights[String(score)] ?? fallback);
  }

  return next;
}

function normalizeScaleLabels(
  row: EditableQuestionRow,
  patch?: Partial<Pick<EditableQuestionRow, "scaleMin" | "scaleMax">>,
) {
  const nextMin = patch?.scaleMin ?? row.scaleMin;
  const nextMax = patch?.scaleMax ?? row.scaleMax;
  const next: Record<string, string> = {};

  for (let score = nextMin; score <= nextMax; score += 1) {
    next[String(score)] = row.scaleLabels[String(score)] ?? "";
  }

  return next;
}

function scaleLabelKey(score: number | string) {
  return `label:${score}`;
}

function scaleLabelPlaceholder(score: number) {
  return score === 1 ? "매우 아니다 (1점)" : `응답 라벨 (${score}점)`;
}

function serializeScaleWeights(row: EditableQuestionRow) {
  const scaleWeights: Record<string, number | string | null> = {};

  for (let score = row.scaleMin; score <= row.scaleMax; score += 1) {
    const scoreKey = String(score);
    scaleWeights[scoreKey] = row.scaleWeights[scoreKey] ?? row.weight ?? 1;
    const label = row.scaleLabels[scoreKey]?.trim();
    if (label) {
      scaleWeights[scaleLabelKey(scoreKey)] = label;
    }
  }

  return scaleWeights;
}

function isKeywordReady(row: EditableQuestionRow) {
  return row.category.trim().length > 0 && row.subcategory.trim().length > 0;
}

export default function QuestionSetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [rows, setRows] = useState<EditableQuestionRow[]>([]);
  const [selectedNo, setSelectedNo] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [collapsedSectionKeys, setCollapsedSectionKeys] = useState<
    EvaluatorSection["key"][]
  >([]);
  const [undoStack, setUndoStack] = useState<EditorSnapshot[]>([]);

  const {
    data: questionSet,
    isLoading,
    error,
  } = useQuery<QuestionSet>({
    queryKey: [...queryKeys.evaluations.questionSets, id],
    queryFn: async () =>
      requestJson<QuestionSet>(`/api/evaluations/question-sets/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    const nextRows = toEditableRows(questionSet);
    setName(questionSet?.name ?? "");
    setDescription(questionSet?.description ?? "");
    setIsActive(questionSet?.is_active ?? true);
    setIsDefault(questionSet?.is_default ?? false);
    setRows(nextRows);
    setUndoStack([]);
    setSelectedNo((current) =>
      current && nextRows.some((row) => row.no === current)
        ? current
        : (nextRows[0]?.no ?? null),
    );
  }, [questionSet]);

  function createSnapshot(): EditorSnapshot {
    return {
      rows: cloneRows(rows),
      selectedNo,
    };
  }

  function pushUndoSnapshot() {
    const snapshot = createSnapshot();
    setUndoStack((prev) => [...prev.slice(-49), snapshot]);
  }

  function restoreSnapshot(snapshot: EditorSnapshot) {
    setRows(cloneRows(snapshot.rows));
    setSelectedNo(snapshot.selectedNo);
  }

  function undoLastChange() {
    const snapshot = undoStack[undoStack.length - 1];
    if (!snapshot) return;

    restoreSnapshot(snapshot);
    setUndoStack((prev) => prev.slice(0, -1));
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!questionSet) throw new Error("문항 SET을 찾을 수 없습니다.");
      const validationMessage = validateBeforeSave();
      if (validationMessage) throw new Error(validationMessage);

      const items = rows.map((row) => ({
        questionType: row.questionType,
        category: row.category,
        subcategory: row.subcategory,
        detail: row.detail,
        scaleGuide: row.scaleGuide,
        scaleMin: row.scaleMin,
        scaleMax: row.scaleMax,
        scaleWeights:
          row.questionType === "score" ? serializeScaleWeights(row) : {},
        evaluatorTypes: row.evaluatorTypes,
        weight: row.questionType === "score" ? row.weight || 1 : null,
        sortOrder: row.no,
        isRequired: row.isRequired,
      }));

      return requestJson<QuestionSet>(`/api/evaluations/question-sets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          isActive,
          isDefault,
          items,
        }),
      });
    },
    onSuccess: () => {
      setPreviewOpen(false);
      setUndoStack([]);
      toast.success("문항 SET이 저장되었습니다.");
      queryClient.invalidateQueries({
        queryKey: queryKeys.evaluations.questionSets,
      });
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.evaluations.questionSets, id],
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function validateBeforeSave() {
    if (!name.trim()) return "SET명을 입력하세요.";
    if (isDefault && !isActive) {
      return "비활성 SET은 기본 SET으로 지정할 수 없습니다.";
    }

    const incompleteKeywordRow = rows.find((row) => !isKeywordReady(row));
    if (incompleteKeywordRow) {
      return `${incompleteKeywordRow.no}번 문항의 상위/하위 키워드를 먼저 입력해주세요.`;
    }

    return null;
  }

  function openPreview() {
    const validationMessage = validateBeforeSave();
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    setPreviewOpen(true);
  }

  function updateRow(
    no: number,
    patch: Partial<EditableQuestionRow>,
    shouldRecordUndo = true,
  ) {
    if (shouldRecordUndo) {
      pushUndoSnapshot();
    }

    setRows((prev) =>
      prev.map((row) => {
        if (row.no !== no) return row;
        const next = { ...row, ...patch };
        if (
          patch.scaleMin !== undefined ||
          patch.scaleMax !== undefined ||
          patch.weight !== undefined
        ) {
          next.scaleWeights = normalizeScaleWeights(row, patch);
        }
        if (patch.scaleMin !== undefined || patch.scaleMax !== undefined) {
          next.scaleLabels = normalizeScaleLabels(row, patch);
        }
        return next;
      }),
    );
  }

  function updateScaleWeight(no: number, score: string, value: number) {
    pushUndoSnapshot();

    setRows((prev) =>
      prev.map((row) =>
        row.no === no
          ? {
              ...row,
              scaleWeights: {
                ...row.scaleWeights,
                [score]: value,
              },
            }
          : row,
      ),
    );
  }

  function scaleValues(row: EditableQuestionRow) {
    const values: number[] = [];
    for (let score = row.scaleMin; score <= row.scaleMax; score += 1) {
      values.push(score);
    }
    return values;
  }

  function updateScaleCount(row: EditableQuestionRow, value: string) {
    const nextScaleCount = Math.max(1, Number(value || 1));
    updateRow(row.no, {
      scaleMin: 1,
      scaleMax: nextScaleCount,
    });
  }

  function updateScaleLabel(no: number, score: string, value: string) {
    pushUndoSnapshot();

    setRows((prev) =>
      prev.map((row) =>
        row.no === no
          ? {
              ...row,
              scaleLabels: {
                ...row.scaleLabels,
                [score]: value,
              },
            }
          : row,
      ),
    );
  }

  function updateQuestionType(
    row: EditableQuestionRow,
    questionType: QuestionType,
  ) {
    updateRow(row.no, {
      questionType,
      weight: questionType === "score" ? row.weight || 1 : null,
      scaleGuide:
        questionType === "score" && row.scaleGuide === "주관식"
          ? "5점 척도"
          : row.scaleGuide,
    });
  }

  function appendRow(section: EvaluatorSection) {
    pushUndoSnapshot();

    const nextNo =
      rows.length > 0 ? Math.max(...rows.map((row) => row.no)) + 1 : 1;
    const nextRow = {
      ...makeEmptyRow(nextNo),
      category: "",
      subcategory: "",
      evaluatorTypes: [...section.evaluatorTypes],
    };
    setRows((prev) => [...prev, nextRow]);
    setSelectedNo(nextRow.no);
    setCollapsedSectionKeys((prev) =>
      prev.filter((key) => key !== section.key),
    );
  }

  function toggleSection(sectionKey: EvaluatorSection["key"]) {
    setCollapsedSectionKeys((prev) =>
      prev.includes(sectionKey)
        ? prev.filter((key) => key !== sectionKey)
        : [...prev, sectionKey],
    );
  }

  function deleteRow(no: number) {
    pushUndoSnapshot();

    const nextRows = rows
      .filter((row) => row.no !== no)
      .map((row, index) => ({ ...row, no: index + 1 }));

    setRows(nextRows);
    setSelectedNo((current) =>
      current === no || !nextRows.some((row) => row.no === current)
        ? (nextRows[Math.min(no - 1, nextRows.length - 1)]?.no ?? null)
        : current,
    );
  }

  function duplicateRow(no: number) {
    const sourceIndex = rows.findIndex((row) => row.no === no);
    const source = rows[sourceIndex];
    if (!source) return;

    pushUndoSnapshot();

    const duplicate = {
      ...source,
      evaluatorTypes: [...source.evaluatorTypes],
      scaleWeights: { ...source.scaleWeights },
      scaleLabels: { ...source.scaleLabels },
    };
    const nextRows = [
      ...rows.slice(0, sourceIndex + 1),
      duplicate,
      ...rows.slice(sourceIndex + 1),
    ].map((row, index) => ({ ...row, no: index + 1 }));

    setRows(nextRows);
    setSelectedNo(sourceIndex + 2);
    setCollapsedSectionKeys((prev) =>
      prev.filter((key) => key !== sectionForRow(source)),
    );
  }

  function sectionForRow(row: EditableQuestionRow): EvaluatorSection["key"] {
    const hasManager = row.evaluatorTypes.includes("상사");
    const hasPeer = row.evaluatorTypes.includes("동료");
    if (hasManager && hasPeer) return "common";
    if (hasPeer) return "peer";
    return "manager";
  }

  const tableSummary = useMemo(() => {
    const scoreCount = rows.filter(
      (row) => row.questionType === "score",
    ).length;
    const subjectiveCount = rows.filter(
      (row) => row.questionType === "subjective",
    ).length;
    const managerCount = rows.filter((row) =>
      row.evaluatorTypes.includes("상사"),
    ).length;
    const peerCount = rows.filter((row) =>
      row.evaluatorTypes.includes("동료"),
    ).length;

    return {
      scoreCount,
      subjectiveCount,
      managerCount,
      peerCount,
    };
  }, [rows]);

  const previewSections = useMemo(
    () =>
      EVALUATOR_SECTIONS.map((section) => ({
        ...section,
        rows: rows.filter((row) => sectionForRow(row) === section.key),
      })).filter((section) => section.rows.length > 0),
    [rows],
  );

  if (isLoading) {
    return (
      <div className="evaluations-page space-y-4 p-6">
        <Link href="/evaluations">
          <Button variant="outline" size="sm">
            <ChevronLeft className="mr-1 h-4 w-4" />
            목록
          </Button>
        </Link>
        <div className="flex h-60 items-center justify-center text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !questionSet) {
    return (
      <div className="evaluations-page space-y-4 p-6">
        <Link href="/evaluations">
          <Button variant="outline" size="sm">
            <ChevronLeft className="mr-1 h-4 w-4" />
            목록
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-400">
            문항 SET을 찾을 수 없습니다.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="evaluations-page space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-start gap-3">
          <Link href="/evaluations" className="shrink-0">
            <Button
              variant="outline"
              size="icon"
              aria-label="목록으로 돌아가기"
              className={CONTROL_FOCUS_CLASS}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-slate-900">
              문항 SET 수정
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className={CONTROL_FOCUS_CLASS}
            onClick={undoLastChange}
            disabled={undoStack.length === 0}
          >
            <Undo2 className="mr-1 h-4 w-4" />
            실행취소
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "border-0",
              CONTROL_FOCUS_CLASS,
              isActive
                ? "bg-slate-100 text-slate-700 hover:bg-slate-100"
                : "bg-slate-100 text-slate-500 hover:bg-slate-100",
            )}
            onClick={() => {
              const nextActive = !isActive;
              setIsActive(nextActive);
              if (!nextActive) setIsDefault(false);
            }}
          >
            {isActive ? "활성" : "비활성"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!isActive}
            className={cn(
              "border-0",
              CONTROL_FOCUS_CLASS,
              isDefault
                ? "bg-slate-100 text-slate-700 hover:bg-slate-100"
                : "bg-slate-100 text-slate-500 hover:bg-slate-100",
            )}
            onClick={() => setIsDefault((current) => !current)}
          >
            기본 SET
          </Button>
          <Button
            type="button"
            onClick={openPreview}
            disabled={saveMutation.isPending}
            className={CONTROL_FOCUS_CLASS}
          >
            {saveMutation.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            저장
          </Button>
        </div>
      </div>

      <div className="grid w-full gap-3 lg:grid-cols-[minmax(360px,1fr)_auto]">
        <div className="grid gap-3 md:grid-cols-[minmax(240px,360px)_1fr]">
          <Input
            value={name}
            placeholder="SET명"
            className="bg-white"
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            value={description}
            placeholder="설명"
            className="bg-white"
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="grid grid-cols-4 gap-2 lg:min-w-[360px]">
          {[
            ["전체", rows.length],
            ["척도", tableSummary.scoreCount],
            ["주관식", tableSummary.subjectiveCount],
            [
              "상사/동료",
              `${tableSummary.managerCount}/${tableSummary.peerCount}`,
            ],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-medium text-slate-500">{label}</p>
              <p className="mt-0.5 text-base font-semibold text-slate-900">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-transparent p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              새 문항 등록
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              먼저 평가 유형을 선택한 뒤 카드에서 키워드와 척도 정보를
              입력합니다.
            </p>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-3">
            {EVALUATOR_SECTIONS.map((section) => (
              <Button
                key={section.key}
                type="button"
                variant="outline"
                className={cn("border-slate-200 bg-white", CONTROL_FOCUS_CLASS)}
                onClick={() => appendRow(section)}
              >
                <Plus className="mr-1 h-4 w-4" />
                {section.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card className="border-0 bg-slate-50 shadow-none">
          <CardContent className="py-12 text-center text-sm text-slate-400">
            <ClipboardList className="mx-auto mb-2 h-6 w-6" />
            등록된 문항이 없습니다.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {EVALUATOR_SECTIONS.map((section) => {
            const sectionRows = rows.filter(
              (row) => sectionForRow(row) === section.key,
            );

            if (sectionRows.length === 0) return null;
            const isCollapsed = collapsedSectionKeys.includes(section.key);

            return (
              <Card
                key={section.key}
                className="border-0 bg-slate-50 shadow-none"
              >
                <CardContent className="space-y-4 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      className={cn(
                        "flex min-w-0 items-start gap-2 rounded-lg text-left transition-colors hover:bg-slate-100",
                        CONTROL_FOCUS_CLASS,
                      )}
                      aria-expanded={!isCollapsed}
                      onClick={() => toggleSection(section.key)}
                    >
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-slate-500">
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {section.label}
                          </span>
                          <Badge className="border-0 bg-white text-slate-500">
                            {sectionRows.length}개
                          </Badge>
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          {section.description}
                        </span>
                      </span>
                    </button>
                    <div className="flex items-center gap-2">
                      <Badge className="border-0 bg-white text-slate-500">
                        {isCollapsed ? "접힘" : "펼침"}
                      </Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={cn("border-0 bg-white", CONTROL_FOCUS_CLASS)}
                        onClick={() => appendRow(section)}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        문항 추가
                      </Button>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="relative grid gap-3 pl-6">
                      <span className="absolute bottom-4 left-3 top-0 w-px bg-slate-200" />
                      {sectionRows.map((row) => (
                        <div key={row.no} className="relative pl-5">
                          <span className="absolute left-[-11px] top-6 h-px w-4 bg-slate-200" />
                          <div
                            className={cn(
                              "space-y-5 rounded-xl bg-white p-4 transition-colors",
                              selectedNo === row.no && "bg-slate-100",
                            )}
                            onFocus={() => setSelectedNo(row.no)}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-700">
                                  {row.no}
                                </span>
                                <p className="text-sm font-semibold text-slate-900">
                                  {section.label} 문항
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    "h-8 w-8 text-slate-500 hover:text-slate-700",
                                    CONTROL_FOCUS_CLASS,
                                  )}
                                  aria-label="문항 복사"
                                  onClick={() => duplicateRow(row.no)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className={cn(
                                    "h-8 w-8 text-slate-600 hover:text-slate-700",
                                    CONTROL_FOCUS_CLASS,
                                  )}
                                  aria-label="문항 삭제"
                                  onClick={() => deleteRow(row.no)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]">
                              <div className="space-y-3">
                                <div className="grid gap-3 md:grid-cols-2">
                                  <label className="space-y-1.5">
                                    <span className="text-xs font-medium text-slate-500">
                                      키워드
                                    </span>
                                    <Input
                                      value={row.category}
                                      className="bg-slate-50"
                                      placeholder="상위 키워드"
                                      onChange={(event) =>
                                        updateRow(row.no, {
                                          category: event.target.value,
                                        })
                                      }
                                    />
                                  </label>
                                  <label className="space-y-1.5">
                                    <span className="text-xs font-medium text-slate-500">
                                      하위 키워드
                                    </span>
                                    <Input
                                      value={row.subcategory}
                                      className="bg-slate-50"
                                      placeholder="하위 키워드"
                                      onChange={(event) =>
                                        updateRow(row.no, {
                                          subcategory: event.target.value,
                                        })
                                      }
                                    />
                                  </label>
                                </div>
                                <label className="space-y-1.5">
                                  <span className="text-xs font-medium text-slate-500">
                                    문항
                                  </span>
                                  <Textarea
                                    rows={4}
                                    className={cn(
                                      "min-h-24 bg-slate-50 leading-5",
                                      CONTROL_FOCUS_CLASS,
                                    )}
                                    placeholder="평가 문항을 입력하세요."
                                    value={row.detail}
                                    onChange={(event) =>
                                      updateRow(row.no, {
                                        detail: event.target.value,
                                      })
                                    }
                                  />
                                </label>
                                <label className="space-y-1.5">
                                  <span className="text-xs font-medium text-slate-500">
                                    안내문구
                                  </span>
                                  <Input
                                    className={cn(
                                      "bg-slate-50",
                                      CONTROL_FOCUS_CLASS,
                                    )}
                                    placeholder="척도 설명 또는 주관식 안내"
                                    value={row.scaleGuide}
                                    onChange={(event) =>
                                      updateRow(row.no, {
                                        scaleGuide: event.target.value,
                                      })
                                    }
                                  />
                                </label>
                              </div>

                              <div className="hidden w-px bg-slate-200 md:block" />

                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-slate-500">
                                    응답 방식
                                  </p>
                                  <div className="grid grid-cols-2 gap-2">
                                    {[
                                      ["subjective", "주관식"],
                                      ["score", "척도"],
                                    ].map(([value, label]) => (
                                      <button
                                        key={value}
                                        type="button"
                                        aria-pressed={
                                          row.questionType === value
                                        }
                                        className={cn(
                                          "flex h-10 items-center justify-center rounded-lg px-3 text-sm transition-colors",
                                          CONTROL_FOCUS_CLASS,
                                          row.questionType === value
                                            ? "bg-slate-200 font-medium text-slate-900"
                                            : "bg-slate-50 text-slate-600 hover:bg-slate-100",
                                        )}
                                        onClick={() =>
                                          updateQuestionType(
                                            row,
                                            value as QuestionType,
                                          )
                                        }
                                      >
                                        {label}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {row.questionType === "score" ? (
                                  <div className="grid gap-2">
                                    <label className="grid gap-2">
                                      <span className="text-[11px] text-slate-500">
                                        척도 수
                                      </span>
                                      <Input
                                        type="number"
                                        min={1}
                                        className="h-8 bg-slate-50"
                                        value={row.scaleMax}
                                        onChange={(event) =>
                                          updateScaleCount(
                                            row,
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </label>
                                    <div className="grid gap-2">
                                      {scaleValues(row).map((score) => (
                                        <label
                                          key={score}
                                          className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_96px]"
                                        >
                                          <Input
                                            className="h-8 bg-slate-50"
                                            placeholder={scaleLabelPlaceholder(
                                              score,
                                            )}
                                            value={
                                              row.scaleLabels[String(score)] ??
                                              ""
                                            }
                                            onChange={(event) =>
                                              updateScaleLabel(
                                                row.no,
                                                String(score),
                                                event.target.value,
                                              )
                                            }
                                          />
                                          <Input
                                            aria-label={`${score}점 가중치`}
                                            type="number"
                                            min={0}
                                            step="0.5"
                                            className="h-8 bg-slate-50 px-2"
                                            value={
                                              row.scaleWeights[String(score)] ??
                                              row.weight ??
                                              1
                                            }
                                            onChange={(event) =>
                                              updateScaleWeight(
                                                row.no,
                                                String(score),
                                                event.target.value
                                                  ? Number(event.target.value)
                                                  : 0,
                                              )
                                            }
                                          />
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                                    주관식 문항은 척도/가중치를 사용하지
                                    않습니다.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="flex max-h-[82vh] flex-col overflow-hidden sm:max-w-5xl">
          <DialogHeader className="shrink-0">
            <DialogTitle>문항 SET Preview</DialogTitle>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto pr-1">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {name}
                  </p>
                  {description && (
                    <p className="mt-1 text-sm text-slate-500">{description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Badge className="border-0 bg-white text-slate-600">
                    {isActive ? "활성" : "비활성"}
                  </Badge>
                  {isDefault && (
                    <Badge className="border-0 bg-white text-slate-600">
                      기본 SET
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {previewSections.map((section) => (
                <section key={section.key} className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {section.label}
                    </h3>
                    <Badge className="border-0 bg-slate-100 text-slate-600">
                      {section.rows.length}개
                    </Badge>
                  </div>
                  <div className="grid gap-3">
                    {section.rows.map((row) => (
                        <div
                          key={row.no}
                          className="rounded-xl bg-slate-50 p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="border-0 bg-white text-slate-600">
                              {row.no}
                            </Badge>
                            <Badge className="border-0 bg-white text-slate-600">
                              {sectionLabelForKey(sectionForRow(row))}
                            </Badge>
                            <Badge className="border-0 bg-white text-slate-600">
                              {row.questionType === "score" ? "척도" : "주관식"}
                            </Badge>
                          </div>
                          <p className="mt-3 text-sm font-medium text-slate-900">
                            {row.category} / {row.subcategory}
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                            {row.detail}
                          </p>
                          {row.scaleGuide && (
                            <p className="mt-2 text-xs text-slate-500">
                              {row.scaleGuide}
                            </p>
                          )}
                          {row.questionType === "score" && (
                            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
                              {scaleValues(row).map((score) => (
                                <div
                                  key={score}
                                  className="min-w-[132px] flex-1 rounded-lg bg-white px-3 py-2 text-xs text-slate-600"
                                >
                                  <p className="truncate">
                                    {row.scaleLabels[String(score)] ||
                                      scaleLabelPlaceholder(score)}
                                  </p>
                                  <p className="mt-1 font-medium text-slate-800">
                                    가중치{" "}
                                    {row.scaleWeights[String(score)] ??
                                      row.weight ??
                                      1}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

          </div>

          <DialogFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewOpen(false)}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              )}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
