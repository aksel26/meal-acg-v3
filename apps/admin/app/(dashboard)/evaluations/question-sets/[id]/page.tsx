"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Background,
  Controls,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ChevronDown,
  ChevronLeft,
  ClipboardList,
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
import { Checkbox } from "@repo/ui/src/checkbox";
import { Input } from "@repo/ui/src/input";
import { Textarea } from "@repo/ui/src/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@repo/ui/src/sheet";
import { usePositions } from "@/hooks/usePositions";
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
  scaleGuide: string;
  appliesToMember: boolean;
  appliesToLeader: boolean;
  isRequired: boolean;
};

type EmptySubcategoryGroup = {
  category: string;
  subcategory: string;
};

type EditorSnapshot = {
  rows: EditableQuestionRow[];
  selectedNo: number | null;
  isEditorOpen: boolean;
  emptySubcategories: EmptySubcategoryGroup[];
  hiddenCategoryKeys: string[];
  hiddenSubcategoryKeys: string[];
};

const MEMBER_POSITION_NAMES = new Set(["인턴", "사원", "선임"]);
const LEADER_POSITION_NAMES = new Set(["책임", "수석", "대표"]);
const POSITION_SORT_ORDER: Record<string, number> = {
  인턴: 1,
  사원: 2,
  선임: 3,
  책임: 4,
  수석: 5,
  대표: 6,
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(payload?.error || "요청 처리에 실패했습니다.");
  }

  return payload as T;
}

function questionGroupNo(item: QuestionSetItem) {
  if (item.sort_order >= 100) {
    return Math.floor(item.sort_order / 100);
  }

  return item.sort_order;
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
    scaleGuide: "",
    appliesToMember: true,
    appliesToLeader: false,
    isRequired: true,
  };
}

function cloneRows(rows: EditableQuestionRow[]) {
  return rows.map((row) => ({
    ...row,
    evaluatorTypes: [...row.evaluatorTypes],
    scaleWeights: { ...row.scaleWeights },
  }));
}

function toEditableRows(questionSet?: QuestionSet): EditableQuestionRow[] {
  const groups = new Map<number, QuestionSetItem[]>();
  for (const item of questionSet?.items || []) {
    const key = questionGroupNo(item);
    const current = groups.get(key) || [];
    current.push(item);
    groups.set(key, current);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([no, items]) => {
      const sortedItems = [...items].sort((a, b) => a.sort_order - b.sort_order);
      const source = sortedItems[0];
      if (!source) return null;

      const parsed = splitPrompt(source.prompt);
      const positionNames = new Set(sortedItems.map((item) => item.position?.name || ""));

      const scaleMin = source.scale_min || 1;
      const scaleMax = source.scale_max || 5;
      const scaleWeights = buildScaleWeights(
        source.scale_weights,
        scaleMin,
        scaleMax,
        source.weight || 1,
      );

      return {
        no,
        category: source.category || parsed.category,
        subcategory: source.subcategory || parsed.subcategory,
        evaluatorTypes: source.evaluator_types || [],
        detail: source.detail || parsed.detail || source.prompt,
        questionType: source.question_type,
        scaleMin,
        scaleMax,
        weight: source.question_type === "score" ? source.weight || 1 : null,
        scaleWeights,
        scaleGuide:
          source.scale_guide ||
          parsed.scaleGuide ||
          (source.question_type === "score" ? "5점 척도" : "주관식"),
        appliesToMember: Array.from(positionNames).some((name) =>
          MEMBER_POSITION_NAMES.has(name),
        ),
        appliesToLeader: Array.from(positionNames).some((name) =>
          LEADER_POSITION_NAMES.has(name),
        ),
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

function normalizeScaleWeights(
  row: EditableQuestionRow,
  patch?: Partial<Pick<EditableQuestionRow, "scaleMin" | "scaleMax" | "weight">>,
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

type QuestionTreeNodeData = {
  rowNo?: number;
  kind: "category" | "subcategory" | "question";
  category?: string;
  subcategory?: string;
  label: ReactNode;
};

type QuestionTreeDeletePayload = {
  kind: "category" | "subcategory" | "question";
  rowNo?: number;
  category?: string;
  subcategory?: string;
};

type FlowViewport = {
  setCenter: (
    x: number,
    y: number,
    options?: { zoom?: number; duration?: number },
  ) => void;
};

const TREE_COLUMN_GAP = 300;
const TREE_ROW_GAP = 138;
const TREE_START_X = 40;
const TREE_START_Y = 40;
const TREE_CATEGORY_WIDTH = 190;
const TREE_CATEGORY_HEIGHT = 72;
const TREE_SUBCATEGORY_HEIGHT = 96;
const TREE_QUESTION_HEIGHT = 96;

function subcategoryGroupKey(category: string, subcategory: string) {
  return `${category.trim() || "상위 미입력"}::${subcategory.trim() || "하위 미입력"}`;
}

function categoryGroupKey(category: string) {
  return category.trim() || "상위 미입력";
}

function TreeNodeDeleteButton({
  node,
  onDelete,
}: {
  node: QuestionTreeDeletePayload;
  onDelete: (
    node: QuestionTreeDeletePayload,
    event: MouseEvent<HTMLButtonElement>,
  ) => void;
}) {
  return (
    <button
      type="button"
      aria-label="노드 삭제"
      className="nodrag nopan absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
      onClick={(event) => onDelete(node, event)}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}

function buildQuestionTreeFlow(
  rows: EditableQuestionRow[],
  selectedNo: number | null,
  highlightedCategoryKey: string | null,
  emptySubcategories: EmptySubcategoryGroup[],
  hiddenCategoryKeys: string[],
  hiddenSubcategoryKeys: string[],
  onDeleteNode: (
    node: QuestionTreeDeletePayload,
    event: MouseEvent<HTMLButtonElement>,
  ) => void,
): {
  nodes: Node<QuestionTreeNodeData>[];
  edges: Edge[];
} {
  const categoryMap = new Map<string, Map<string, EditableQuestionRow[]>>();
  const hiddenCategorySet = new Set(hiddenCategoryKeys);
  const hiddenSubcategorySet = new Set(hiddenSubcategoryKeys);

  rows.forEach((row) => {
    const category = row.category.trim() || "상위 미입력";
    const subcategory = row.subcategory.trim() || "하위 미입력";
    const subcategoryMap = categoryMap.get(category) || new Map();
    const group = subcategoryMap.get(subcategory) || [];
    group.push(row);
    subcategoryMap.set(subcategory, group);
    categoryMap.set(category, subcategoryMap);
  });

  emptySubcategories.forEach((emptyGroup) => {
    const category = emptyGroup.category.trim() || "상위 미입력";
    const subcategory = emptyGroup.subcategory.trim() || "하위 미입력";
    const subcategoryMap = categoryMap.get(category) || new Map();

    if (!subcategoryMap.has(subcategory)) {
      subcategoryMap.set(subcategory, []);
      categoryMap.set(category, subcategoryMap);
    }
  });

  const nodes: Node<QuestionTreeNodeData>[] = [];
  const edges: Edge[] = [];
  let leafIndex = 0;
  let categoryIndex = 0;
  const leafCenterY = (index: number) =>
    TREE_START_Y + index * TREE_ROW_GAP + TREE_QUESTION_HEIGHT / 2;
  const nodeTopForCenter = (centerY: number, height: number) =>
    centerY - height / 2;

  Array.from(categoryMap.entries()).forEach(([category, subcategoryMap]) => {
    const categoryId = `category-${categoryIndex}`;
    const categoryLeafStart = leafIndex;
    const hasSingleSubcategory = subcategoryMap.size === 1;
    const currentCategoryKey = categoryGroupKey(category);
    const isCategoryHidden = hiddenCategorySet.has(currentCategoryKey);
    const isCategoryHighlighted = highlightedCategoryKey === currentCategoryKey;
    let subcategoryIndex = 0;

    Array.from(subcategoryMap.entries()).forEach(([subcategory, group]) => {
      const subcategoryId = `${categoryId}-subcategory-${subcategoryIndex}`;
      const subcategoryLeafStart = leafIndex;
      const hasSingleQuestion = group.length === 1;
      const isSubcategoryHidden = hiddenSubcategorySet.has(
        subcategoryGroupKey(category, subcategory),
      );

      group.forEach((row) => {
        const isSelected = selectedNo === row.no;
        const questionId = `question-${row.no}`;
        const targets = [
          row.appliesToMember ? "팀원" : null,
          row.appliesToLeader ? "팀장 이상" : null,
        ].filter(Boolean);

        nodes.push({
          id: questionId,
          type: "default",
          position: {
            x: TREE_START_X + TREE_COLUMN_GAP * 2,
            y: TREE_START_Y + leafIndex * TREE_ROW_GAP,
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          data: {
            rowNo: row.no,
            kind: "question",
            category: row.category,
            subcategory: row.subcategory,
            label: (
              <div className="relative flex h-[96px] w-[300px] flex-col justify-center space-y-2 rounded-xl border border-slate-100 bg-white px-3 py-3 pr-10 text-left">
                <TreeNodeDeleteButton
                  node={{
                    kind: "question",
                    rowNo: row.no,
                    category: row.category,
                    subcategory: row.subcategory,
                  }}
                  onDelete={onDeleteNode}
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex h-6 min-w-6 items-center justify-center rounded text-xs font-semibold",
                          isSelected
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600",
                        )}
                      >
                        {row.no}
                      </span>
                      <span className="line-clamp-1 text-sm font-semibold text-slate-900">
                        {row.detail || "세부내용 미입력"}
                      </span>
                    </div>
                  </div>
                  <Badge className="shrink-0 border-0 bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                    {row.questionType === "score" ? "척도" : "주관식"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {[...row.evaluatorTypes, ...targets].map((label) => (
                    <Badge
                      key={label}
                      className="border-0 bg-slate-100 px-1.5 py-0.5 text-[11px] font-normal text-slate-500"
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            ),
          },
          className: cn(
            "!w-auto !border-0 !bg-transparent !p-0 !shadow-none",
            isSelected && "!ring-1 !ring-slate-300",
          ),
        });

        if (!isSubcategoryHidden) {
          edges.push({
            id: `${subcategoryId}-${questionId}`,
            source: subcategoryId,
            target: questionId,
            type: hasSingleQuestion ? "straight" : "smoothstep",
            reconnectable: "source",
            interactionWidth: 28,
            markerEnd: { type: MarkerType.ArrowClosed, color: "#cbd5e1" },
            style: { stroke: "#cbd5e1", strokeWidth: 1.2 },
          });
        }

        leafIndex += 1;
      });

      if (group.length === 0) {
        leafIndex += 1;
      }

      const subcategoryLeafEnd = Math.max(leafIndex - 1, subcategoryLeafStart);
      const representative = group[0];
      if (!isSubcategoryHidden) {
        nodes.push({
          id: subcategoryId,
          type: "default",
          position: {
            x: TREE_START_X + TREE_COLUMN_GAP,
            y: nodeTopForCenter(
              (leafCenterY(subcategoryLeafStart) +
                leafCenterY(subcategoryLeafEnd)) /
                2,
              TREE_SUBCATEGORY_HEIGHT,
            ),
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          data: {
            rowNo: representative?.no,
            kind: "subcategory",
            category,
            subcategory,
            label: (
              <div className="relative flex h-[96px] w-[210px] flex-col justify-center rounded-xl border border-slate-100 bg-white px-3 py-2.5 pr-10 text-left">
                <TreeNodeDeleteButton
                  node={{ kind: "subcategory", category, subcategory }}
                  onDelete={onDeleteNode}
                />
                <p className="line-clamp-1 text-xs font-medium text-slate-500">
                  하위
                </p>
                <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">
                  {subcategory}
                </p>
                <Badge className="mt-2 border-0 bg-slate-100 px-1.5 py-0.5 text-[11px] font-normal text-slate-500">
                  {group.length}개
                </Badge>
              </div>
            ),
          },
          className: "!w-auto !border-0 !bg-transparent !p-0 !shadow-none",
        });
      }

      if (!isCategoryHidden && !isSubcategoryHidden) {
        edges.push({
          id: `${categoryId}-${subcategoryId}`,
          source: categoryId,
          target: subcategoryId,
          type: hasSingleSubcategory ? "straight" : "smoothstep",
          reconnectable: "source",
          interactionWidth: 28,
          markerEnd: { type: MarkerType.ArrowClosed, color: "#cbd5e1" },
          style: { stroke: "#cbd5e1", strokeWidth: 1.2 },
        });
      }

      subcategoryIndex += 1;
    });

    const categoryLeafEnd = Math.max(leafIndex - 1, categoryLeafStart);
    const firstRow = Array.from(subcategoryMap.values())[0]?.[0];
    if (!isCategoryHidden) {
      nodes.push({
        id: categoryId,
        type: "default",
        position: {
          x: TREE_START_X,
          y: nodeTopForCenter(
            (leafCenterY(categoryLeafStart) + leafCenterY(categoryLeafEnd)) / 2,
            TREE_CATEGORY_HEIGHT,
          ),
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          rowNo: firstRow?.no,
          kind: "category",
          category,
          label: (
            <div
              className={cn(
                "relative flex h-[72px] w-[190px] flex-col justify-center rounded-xl border bg-white px-3 py-2.5 pr-10 text-left transition",
                isCategoryHighlighted
                  ? "border-slate-300 ring-2 ring-slate-200"
                  : "border-slate-100",
              )}
            >
              <TreeNodeDeleteButton
                node={{ kind: "category", category }}
                onDelete={onDeleteNode}
              />
              <p className="line-clamp-1 text-xs font-medium text-slate-500">
                상위
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">
                {category}
              </p>
            </div>
          ),
        },
        className: "!w-auto !border-0 !bg-transparent !p-0 !shadow-none",
      });
    }

    categoryIndex += 1;
  });

  return { nodes, edges };
}

export default function QuestionSetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<EditableQuestionRow[]>([]);
  const [selectedNo, setSelectedNo] = useState<number | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [emptySubcategories, setEmptySubcategories] = useState<
    EmptySubcategoryGroup[]
  >([]);
  const [hiddenCategoryKeys, setHiddenCategoryKeys] = useState<string[]>([]);
  const [hiddenSubcategoryKeys, setHiddenSubcategoryKeys] = useState<string[]>(
    [],
  );
  const [undoStack, setUndoStack] = useState<EditorSnapshot[]>([]);
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [highlightedCategoryKey, setHighlightedCategoryKey] = useState<
    string | null
  >(null);
  const [flowViewport, setFlowViewport] = useState<FlowViewport | null>(null);

  const { data: positions = [] } = usePositions();
  const { data: questionSet, isLoading, error } = useQuery<QuestionSet>({
    queryKey: [...queryKeys.evaluations.questionSets, id],
    queryFn: async () =>
      requestJson<QuestionSet>(`/api/evaluations/question-sets/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    const nextRows = toEditableRows(questionSet);
    setRows(nextRows);
    setEmptySubcategories([]);
    setHiddenCategoryKeys([]);
    setHiddenSubcategoryKeys([]);
    setUndoStack([]);
    setHighlightedCategoryKey(null);
    setSelectedNo((current) =>
      current && nextRows.some((row) => row.no === current)
        ? current
        : nextRows[0]?.no ?? null,
    );
  }, [questionSet]);

  const memberPositions = useMemo(
    () => positions.filter((position) => MEMBER_POSITION_NAMES.has(position.name)),
    [positions],
  );
  const leaderPositions = useMemo(
    () => positions.filter((position) => LEADER_POSITION_NAMES.has(position.name)),
    [positions],
  );

  function createSnapshot(): EditorSnapshot {
    return {
      rows: cloneRows(rows),
      selectedNo,
      isEditorOpen,
      emptySubcategories: emptySubcategories.map((group) => ({ ...group })),
      hiddenCategoryKeys: [...hiddenCategoryKeys],
      hiddenSubcategoryKeys: [...hiddenSubcategoryKeys],
    };
  }

  function pushUndoSnapshot() {
    const snapshot = createSnapshot();
    setUndoStack((prev) => [...prev.slice(-49), snapshot]);
  }

  function restoreSnapshot(snapshot: EditorSnapshot) {
    setRows(cloneRows(snapshot.rows));
    setSelectedNo(snapshot.selectedNo);
    setIsEditorOpen(snapshot.isEditorOpen);
    setEmptySubcategories(snapshot.emptySubcategories.map((group) => ({ ...group })));
    setHiddenCategoryKeys([...snapshot.hiddenCategoryKeys]);
    setHiddenSubcategoryKeys([...snapshot.hiddenSubcategoryKeys]);
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

      const items = rows.flatMap((row) => {
        const targetPositions = [
          ...(row.appliesToMember ? memberPositions : []),
          ...(row.appliesToLeader ? leaderPositions : []),
        ];

        return targetPositions.map((position) => ({
          positionId: position.id,
          questionType: row.questionType,
          category: row.category,
          subcategory: row.subcategory,
          detail: row.detail,
          scaleGuide: row.scaleGuide,
          scaleMin: row.scaleMin,
          scaleMax: row.scaleMax,
          scaleWeights: row.questionType === "score" ? row.scaleWeights : {},
          evaluatorTypes: row.evaluatorTypes,
          weight: row.questionType === "score" ? row.weight || 1 : null,
          sortOrder:
            row.no * 100 + (POSITION_SORT_ORDER[position.name] || 9),
          isRequired: row.isRequired,
        }));
      });

      return requestJson<QuestionSet>(`/api/evaluations/question-sets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: questionSet.name,
          description: questionSet.description || "",
          isActive: questionSet.is_active,
          isDefault: questionSet.is_default,
          items,
        }),
      });
    },
    onSuccess: () => {
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

  function toggleEvaluatorType(row: EditableQuestionRow, evaluatorType: string) {
    const exists = row.evaluatorTypes.includes(evaluatorType);
    updateRow(row.no, {
      evaluatorTypes: exists
        ? row.evaluatorTypes.filter((type) => type !== evaluatorType)
        : [...row.evaluatorTypes, evaluatorType],
    });
  }

  function appendRow(row: EditableQuestionRow) {
    pushUndoSnapshot();

    setEmptySubcategories((prev) =>
      prev.filter(
        (group) =>
          subcategoryGroupKey(group.category, group.subcategory) !==
          subcategoryGroupKey(row.category, row.subcategory),
      ),
    );
    setHiddenCategoryKeys((prev) =>
      prev.filter((key) => key !== categoryGroupKey(row.category)),
    );
    setHiddenSubcategoryKeys((prev) =>
      prev.filter(
        (key) => key !== subcategoryGroupKey(row.category, row.subcategory),
      ),
    );
    setRows((prev) => [...prev, row]);
    setSelectedNo(row.no);
    setIsEditorOpen(true);
  }

  function addCategoryRow() {
    const nextNo = rows.length > 0 ? Math.max(...rows.map((row) => row.no)) + 1 : 1;
    appendRow({
      ...makeEmptyRow(nextNo),
      category: "새 상위",
      subcategory: "새 하위",
    });
  }

  function addSubcategoryRow() {
    const nextNo = rows.length > 0 ? Math.max(...rows.map((row) => row.no)) + 1 : 1;
    appendRow({
      ...makeEmptyRow(nextNo),
      category: selectedRow?.category || "새 상위",
      subcategory: "새 하위",
    });
  }

  function addQuestionRow() {
    const nextNo = rows.length > 0 ? Math.max(...rows.map((row) => row.no)) + 1 : 1;
    appendRow({
      ...makeEmptyRow(nextNo),
      category: selectedRow?.category || "새 상위",
      subcategory: selectedRow?.subcategory || "새 하위",
    });
  }

  function deleteRow(no: number) {
    pushUndoSnapshot();

    const sourceRow = rows.find((row) => row.no === no);
    const nextRows = rows
      .filter((row) => row.no !== no)
      .map((row, index) => ({ ...row, no: index + 1 }));

    if (
      sourceRow &&
      rows.filter(
        (row) =>
          subcategoryGroupKey(row.category, row.subcategory) ===
          subcategoryGroupKey(sourceRow.category, sourceRow.subcategory),
      ).length === 1
    ) {
      setEmptySubcategories((prev) => {
        const key = subcategoryGroupKey(
          sourceRow.category,
          sourceRow.subcategory,
        );
        if (
          prev.some(
            (group) =>
              subcategoryGroupKey(group.category, group.subcategory) === key,
          )
        ) {
          return prev;
        }

        return [
          ...prev,
          {
            category: sourceRow.category,
            subcategory: sourceRow.subcategory,
          },
        ];
      });
    }

    setRows(nextRows);
    if (nextRows.length === 0) {
      setIsEditorOpen(false);
    }
    setSelectedNo((current) =>
      current === no || !nextRows.some((row) => row.no === current)
        ? nextRows[Math.min(no - 1, nextRows.length - 1)]?.no ?? null
        : current,
    );
  }

  function deleteTreeNode(
    node: QuestionTreeDeletePayload,
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (node.kind === "question" && typeof node.rowNo === "number") {
      deleteRow(node.rowNo);
      return;
    }

    if (node.kind === "subcategory" && node.category && node.subcategory) {
      pushUndoSnapshot();

      const key = subcategoryGroupKey(node.category, node.subcategory);
      const hasChildren = rows.some(
        (row) => subcategoryGroupKey(row.category, row.subcategory) === key,
      );

      if (!hasChildren) {
        setEmptySubcategories((prev) =>
          prev.filter(
            (group) =>
              subcategoryGroupKey(group.category, group.subcategory) !== key,
          ),
        );
        return;
      }

      setHiddenSubcategoryKeys((prev) =>
        prev.includes(key) ? prev : [...prev, key],
      );
      return;
    }

    if (node.kind === "category" && node.category) {
      pushUndoSnapshot();

      const key = categoryGroupKey(node.category);
      setHiddenCategoryKeys((prev) =>
        prev.includes(key) ? prev : [...prev, key],
      );
    }
  }

  const selectedRow =
    rows.find((row) => row.no === selectedNo) ?? rows[0] ?? null;
  const { nodes: flowNodes, edges: flowEdges } = useMemo(
    () =>
      buildQuestionTreeFlow(
        rows,
        selectedNo,
        highlightedCategoryKey,
        emptySubcategories,
        hiddenCategoryKeys,
        hiddenSubcategoryKeys,
        deleteTreeNode,
      ),
    [
      emptySubcategories,
      hiddenCategoryKeys,
      hiddenSubcategoryKeys,
      highlightedCategoryKey,
      rows,
      selectedNo,
    ],
  );
  const treeSummary = useMemo(() => {
    const categoryBuckets = new Map<
      string,
      { key: string; label: string; questionCount: number }
    >();

    rows.forEach((row) => {
      const key = categoryGroupKey(row.category);
      const current = categoryBuckets.get(key);
      categoryBuckets.set(key, {
        key,
        label: key,
        questionCount: (current?.questionCount ?? 0) + 1,
      });
    });

    emptySubcategories.forEach((group) => {
      const key = categoryGroupKey(group.category);
      if (!categoryBuckets.has(key)) {
        categoryBuckets.set(key, {
          key,
          label: key,
          questionCount: 0,
        });
      }
    });

    const hiddenCategorySet = new Set(hiddenCategoryKeys);
    const categoryItems = Array.from(categoryBuckets.values()).filter(
      (item) => !hiddenCategorySet.has(item.key),
    );
    const categoryCount = categoryItems.length;
    const subcategoryCount =
      new Set(
        rows.map((row) => subcategoryGroupKey(row.category, row.subcategory)),
      ).size + emptySubcategories.length;
    const scoreCount = rows.filter((row) => row.questionType === "score").length;
    const subjectiveCount = rows.filter(
      (row) => row.questionType === "subjective",
    ).length;
    const managerCount = rows.filter((row) =>
      row.evaluatorTypes.includes("상사"),
    ).length;
    const peerCount = rows.filter((row) =>
      row.evaluatorTypes.includes("동료"),
    ).length;
    const memberTargetCount = rows.filter((row) => row.appliesToMember).length;
    const leaderTargetCount = rows.filter((row) => row.appliesToLeader).length;

    return {
      categoryCount,
      subcategoryCount,
      scoreCount,
      subjectiveCount,
      managerCount,
      peerCount,
      memberTargetCount,
      leaderTargetCount,
      categoryItems,
    };
  }, [emptySubcategories, hiddenCategoryKeys, rows]);
  const handleNodeClick = useCallback(
    (_event: MouseEvent, node: Node<QuestionTreeNodeData>) => {
      if (typeof node.data.rowNo !== "number") return;
      setSelectedNo(node.data.rowNo);
      setIsEditorOpen(true);
    },
    [],
  );
  const focusCategoryNode = useCallback(
    (categoryKey: string) => {
      const targetNode = flowNodes.find(
        (node) =>
          node.data.kind === "category" &&
          categoryGroupKey(node.data.category || "") === categoryKey,
      );

      if (!flowViewport || !targetNode) return;

      flowViewport.setCenter(
        targetNode.position.x + TREE_CATEGORY_WIDTH / 2 + 160,
        targetNode.position.y + TREE_CATEGORY_HEIGHT / 2,
        { zoom: 1, duration: 450 },
      );
    },
    [flowNodes, flowViewport],
  );
  const findFlowNode = useCallback(
    (nodeId: string | null) =>
      nodeId ? flowNodes.find((node) => node.id === nodeId) : undefined,
    [flowNodes],
  );
  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      const source = findFlowNode(connection.source);
      const target = findFlowNode(connection.target);
      if (!source || !target || source.id === target.id) return false;

      return (
        (source.data.kind === "category" &&
          target.data.kind === "subcategory") ||
        (source.data.kind === "subcategory" && target.data.kind === "question")
      );
    },
    [findFlowNode],
  );
  const applyConnection = useCallback(
    (connection: Connection) => {
      const source = findFlowNode(connection.source);
      const target = findFlowNode(connection.target);
      if (!source || !target || !isValidConnection(connection)) {
        toast.error("상위→하위 또는 하위→문항으로만 연결할 수 있습니다.");
        return;
      }

      if (
        source.data.kind === "category" &&
        target.data.kind === "subcategory" &&
        source.data.category &&
        target.data.category &&
        target.data.subcategory
      ) {
        pushUndoSnapshot();

        setEmptySubcategories((prev) =>
          prev.map((group) =>
            subcategoryGroupKey(group.category, group.subcategory) ===
            subcategoryGroupKey(
              target.data.category || "",
              target.data.subcategory || "",
            )
              ? {
                  ...group,
                  category: source.data.category || group.category,
                }
              : group,
          ),
        );
        setRows((prev) =>
          prev.map((row) =>
            row.category === target.data.category &&
            row.subcategory === target.data.subcategory
              ? { ...row, category: source.data.category || row.category }
              : row,
          ),
        );
        toast.success("하위 노드의 상위가 변경되었습니다.");
        return;
      }

      if (
        source.data.kind === "subcategory" &&
        target.data.kind === "question" &&
        typeof target.data.rowNo === "number" &&
        source.data.category &&
        source.data.subcategory
      ) {
        const targetRow = rows.find((row) => row.no === target.data.rowNo);
        if (!targetRow) return;

        pushUndoSnapshot();

        const sourceGroupKey = subcategoryGroupKey(
          targetRow.category,
          targetRow.subcategory,
        );
        const sourceGroupCount = rows.filter(
          (row) =>
            subcategoryGroupKey(row.category, row.subcategory) ===
            sourceGroupKey,
        ).length;
        const nextGroupKey = subcategoryGroupKey(
          source.data.category,
          source.data.subcategory,
        );

        setEmptySubcategories((prev) => {
          const withoutTarget = prev.filter(
            (group) =>
              subcategoryGroupKey(group.category, group.subcategory) !==
              nextGroupKey,
          );

          if (sourceGroupCount !== 1 || sourceGroupKey === nextGroupKey) {
            return withoutTarget;
          }

          if (
            withoutTarget.some(
              (group) =>
                subcategoryGroupKey(group.category, group.subcategory) ===
                sourceGroupKey,
            )
          ) {
            return withoutTarget;
          }

          return [
            ...withoutTarget,
            {
              category: targetRow.category,
              subcategory: targetRow.subcategory,
            },
          ];
        });

        updateRow(targetRow.no, {
          category: source.data.category,
          subcategory: source.data.subcategory,
        }, false);
        setSelectedNo(targetRow.no);
        toast.success("문항 연결이 변경되었습니다.");
      }
    },
    [findFlowNode, isValidConnection, rows],
  );
  const handleReconnect = useCallback(
    (_oldEdge: Edge, newConnection: Connection) => {
      applyConnection(newConnection);
    },
    [applyConnection],
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
            <Button variant="outline" size="icon" aria-label="목록으로 돌아가기">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">
              {questionSet.name}
            </h1>
            {questionSet.is_default && (
              <Badge className="border-0 bg-amber-100 text-amber-700">
                기본
              </Badge>
            )}
            <Badge
              className={cn(
                "border-0",
                questionSet.is_active
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-500",
              )}
            >
              {questionSet.is_active ? "활성" : "비활성"}
            </Badge>
          </div>
          {questionSet.description && (
            <p className="mt-2 max-w-4xl whitespace-pre-wrap text-sm text-slate-500">
              {questionSet.description}
            </p>
          )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={undoLastChange}
            disabled={undoStack.length === 0}
          >
            <Undo2 className="mr-1 h-4 w-4" />
            실행취소
          </Button>
          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
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

      {rows.length === 0 && emptySubcategories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-400">
            <ClipboardList className="mx-auto mb-2 h-6 w-6" />
            등록된 문항이 없습니다.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="h-[calc(100vh-220px)] min-h-[620px] overflow-hidden rounded-xl border border-slate-100 bg-white">
            <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">문항 트리</p>
                <p className="text-xs text-slate-500">{rows.length}개</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addCategoryRow}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  상위
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addSubcategoryRow}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  하위
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addQuestionRow}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  문항
                </Button>
              </div>
            </div>
            <div className="h-[calc(100%-56px)] bg-white">
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                onInit={setFlowViewport}
                onNodeClick={handleNodeClick}
                onConnect={applyConnection}
                onReconnect={handleReconnect}
                isValidConnection={isValidConnection}
                edgesReconnectable
                reconnectRadius={32}
                fitView
                fitViewOptions={{ padding: 0.18 }}
                minZoom={0.25}
                maxZoom={1.4}
                defaultEdgeOptions={{
                  type: "smoothstep",
                  style: { stroke: "#cbd5e1", strokeWidth: 1.2 },
                }}
                proOptions={{ hideAttribution: true }}
              >
                <Background color="#f1f5f9" gap={24} size={1} />
                <Controls showInteractive={false} />
                <Panel position="top-right" className="m-4">
                  <div className="w-[300px] rounded-xl border border-slate-100 bg-white/95 backdrop-blur">
                    <button
                      type="button"
                      className="flex h-11 w-full items-center justify-between px-4 text-left"
                      onClick={() => setIsSummaryOpen((prev) => !prev)}
                    >
                      <span className="text-sm font-semibold text-slate-900">
                        요약 정보
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-slate-400 transition-transform duration-300",
                          isSummaryOpen && "rotate-180",
                        )}
                      />
                    </button>
                    <div
                      className={cn(
                        "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out",
                        isSummaryOpen
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <div className="min-h-0">
                        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3">
                          {[
                            ["상위", treeSummary.categoryCount],
                            ["하위", treeSummary.subcategoryCount],
                            ["척도", treeSummary.scoreCount],
                            ["주관식", treeSummary.subjectiveCount],
                            ["상사", treeSummary.managerCount],
                            ["동료", treeSummary.peerCount],
                            ["팀원", treeSummary.memberTargetCount],
                            ["팀장 이상", treeSummary.leaderTargetCount],
                          ].map(([label, value]) => (
                            <div
                              key={label}
                              className="rounded-lg border border-slate-100 bg-white px-3 py-2"
                            >
                              <p className="text-[11px] text-slate-500">
                                {label}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {value}개
                              </p>
                            </div>
                          ))}
                        </div>
                        {treeSummary.categoryItems.length > 0 && (
                          <div className="border-t border-slate-100 px-3 pb-3 pt-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-semibold text-slate-700">
                                상위 노드
                              </p>
                              <Badge className="border-0 bg-slate-100 px-2 py-0.5 text-[11px] font-normal text-slate-500">
                                {treeSummary.categoryItems.length}개
                              </Badge>
                            </div>
                            <div className="mt-2 max-h-36 space-y-1 overflow-y-auto pr-1">
                              {treeSummary.categoryItems.map((item) => {
                                const isHighlighted =
                                  highlightedCategoryKey === item.key;

                                return (
                                  <button
                                    key={item.key}
                                    type="button"
                                    className={cn(
                                      "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition",
                                      isHighlighted
                                        ? "border-slate-300 bg-slate-50"
                                        : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50",
                                    )}
                                    onClick={() => {
                                      setHighlightedCategoryKey(item.key);
                                      focusCategoryNode(item.key);
                                    }}
                                  >
                                    <span className="min-w-0 truncate text-xs font-medium text-slate-800">
                                      {item.label}
                                    </span>
                                    <Badge className="shrink-0 border-0 bg-slate-100 px-1.5 py-0.5 text-[11px] font-normal text-slate-500">
                                      {item.questionCount}개
                                    </Badge>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Panel>
              </ReactFlow>
            </div>
          </div>

          <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen} modal={false}>
            <SheetContent
              className="question-set-editor-sheet w-full overflow-hidden border-l border-slate-100 p-0 sm:max-w-2xl"
              onEscapeKeyDown={(event) => event.preventDefault()}
              onPointerDownOutside={(event) => event.preventDefault()}
            >
              {selectedRow ? (
                <div className="flex h-full min-h-0 flex-col">
                  <SheetHeader className="border-b border-slate-100 px-6 py-5 text-left">
                    <div className="flex items-start justify-between gap-10">
                      <div>
                        <SheetTitle>NO {selectedRow.no}</SheetTitle>
                        <SheetDescription>
                          {selectedRow.questionType === "score"
                            ? "척도 문항"
                            : "주관식 문항"}
                        </SheetDescription>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mr-8 text-rose-600 hover:text-rose-700"
                        onClick={() => deleteRow(selectedRow.no)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        삭제
                      </Button>
                    </div>
                  </SheetHeader>

                  <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
                    <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">상위</span>
                      <Input
                        value={selectedRow.category}
                        onChange={(event) =>
                          updateRow(selectedRow.no, { category: event.target.value })
                        }
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">하위</span>
                      <Input
                        value={selectedRow.subcategory}
                        onChange={(event) =>
                          updateRow(selectedRow.no, {
                            subcategory: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">
                        평가방식
                      </span>
                      <Select
                        value={selectedRow.questionType}
                        onValueChange={(value: QuestionType) =>
                          updateRow(selectedRow.no, {
                            questionType: value,
                            weight:
                              value === "score" ? selectedRow.weight || 1 : null,
                            scaleGuide:
                              value === "score" &&
                              selectedRow.scaleGuide === "주관식"
                                ? "5점 척도"
                                : selectedRow.scaleGuide,
                          })
                        }
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="score">척도</SelectItem>
                          <SelectItem value="subjective">주관식</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">
                        평가주체
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {["상사", "동료"].map((evaluatorType) => (
                          <label
                            key={evaluatorType}
                            className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-700"
                          >
                            <Checkbox
                              checked={selectedRow.evaluatorTypes.includes(
                                evaluatorType,
                              )}
                              onCheckedChange={() =>
                                toggleEvaluatorType(selectedRow, evaluatorType)
                              }
                            />
                            {evaluatorType}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">
                        노출 대상
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-700">
                          <Checkbox
                            checked={selectedRow.appliesToMember}
                            onCheckedChange={(checked) =>
                              updateRow(selectedRow.no, {
                                appliesToMember: Boolean(checked),
                              })
                            }
                          />
                          팀원
                        </label>
                        <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-700">
                          <Checkbox
                            checked={selectedRow.appliesToLeader}
                            onCheckedChange={(checked) =>
                              updateRow(selectedRow.no, {
                                appliesToLeader: Boolean(checked),
                              })
                            }
                          />
                          팀장 이상
                        </label>
                      </div>
                    </div>
                  </div>

                  {selectedRow.questionType === "score" && (
                    <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-end gap-3">
                        <label className="space-y-2">
                          <span className="text-xs font-medium text-slate-500">
                            척도 시작
                          </span>
                          <Input
                            type="number"
                            min={1}
                            className="h-9 w-24 bg-white"
                            value={selectedRow.scaleMin}
                            onChange={(event) =>
                              updateRow(selectedRow.no, {
                                scaleMin: Number(event.target.value || 1),
                              })
                            }
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs font-medium text-slate-500">
                            척도 종료
                          </span>
                          <Input
                            type="number"
                            min={1}
                            className="h-9 w-24 bg-white"
                            value={selectedRow.scaleMax}
                            onChange={(event) =>
                              updateRow(selectedRow.no, {
                                scaleMax: Number(event.target.value || 5),
                              })
                            }
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs font-medium text-slate-500">
                            기본 가중치
                          </span>
                          <Input
                            type="number"
                            min={0}
                            step="0.5"
                            className="h-9 w-28 bg-white"
                            value={selectedRow.weight ?? 1}
                            onChange={(event) =>
                              updateRow(selectedRow.no, {
                                weight: event.target.value
                                  ? Number(event.target.value)
                                  : 0,
                              })
                            }
                          />
                        </label>
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs font-medium text-slate-500">
                          척도별 가중치
                        </span>
                        <div className="grid gap-2 sm:grid-cols-5">
                          {scaleValues(selectedRow).map((score) => (
                            <label
                              key={score}
                              className="space-y-1 rounded-md bg-white p-2"
                            >
                              <span className="text-xs text-slate-500">
                                {score}점
                              </span>
                              <Input
                                type="number"
                                min={0}
                                step="0.5"
                                className="h-9"
                                value={
                                  selectedRow.scaleWeights[String(score)] ??
                                  selectedRow.weight ??
                                  1
                                }
                                onChange={(event) => {
                                  const next = event.target.value
                                    ? Number(event.target.value)
                                    : 0;
                                  updateScaleWeight(
                                    selectedRow.no,
                                    String(score),
                                    next,
                                  );
                                }}
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      세부내용
                    </span>
                    <Textarea
                      rows={5}
                      className="min-h-36 leading-6 hover:ring-1 hover:ring-slate-200 focus-visible:ring-1"
                      value={selectedRow.detail}
                      onChange={(event) =>
                        updateRow(selectedRow.no, { detail: event.target.value })
                      }
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      부가설명
                    </span>
                    <Textarea
                      rows={4}
                      className="min-h-28 leading-6 hover:ring-1 hover:ring-slate-200 focus-visible:ring-1"
                      value={selectedRow.scaleGuide}
                      onChange={(event) =>
                        updateRow(selectedRow.no, {
                          scaleGuide: event.target.value,
                        })
                      }
                    />
                  </label>

                  </div>
                  <div className="flex shrink-0 border-t border-slate-100 bg-white px-6 py-4">
                    <SheetClose asChild>
                      <Button type="button" variant="outline" className="w-full">
                        닫기
                      </Button>
                    </SheetClose>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-slate-400">
                  <ClipboardList className="mx-auto mb-2 h-6 w-6" />
                  편집할 문항을 선택해주세요.
                </div>
              )}
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}
