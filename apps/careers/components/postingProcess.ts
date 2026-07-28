import type { PostingStage, StageStatus } from "@/hooks/useCareersApi";
import { syncStatusFlags } from "@/lib/careers/parity";

export const STATUS_COLORS = [
  { id: "gray", label: "회색", hex: "#71717a" },
  { id: "orange", label: "주황", hex: "#b45309" },
  { id: "green", label: "초록", hex: "#047857" },
  { id: "blue", label: "파랑", hex: "#2563eb" },
  { id: "red", label: "빨강", hex: "#dc2626" },
  { id: "purple", label: "보라", hex: "#7c3aed" },
  { id: "pink", label: "분홍", hex: "#db2777" },
  { id: "yellow", label: "노랑", hex: "#a16207" },
  { id: "teal", label: "청록", hex: "#0f766e" },
  { id: "indigo", label: "남색", hex: "#4f46e5" },
] as const;

export const MESSAGE_VARIABLES = [
  "{{지원자명}}",
  "{{회사명}}",
  "{{포지션명}}",
  "{{전형단계명}}",
  "{{면접일시}}",
  "{{면접장소}}",
  "{{링크}}",
] as const;

export function normalizeStatuses(statuses: StageStatus[]): StageStatus[] {
  return syncStatusFlags(statuses).map((status, index) => ({
    ...status,
    displayOrder: index,
    isTerminal: index === statuses.length - 1,
    resultMeaning: "neutral" as const,
  }));
}

export function normalizeStages(stages: PostingStage[]): PostingStage[] {
  return stages.map((stage, index) => ({
    ...stage,
    displayOrder: index,
    statuses: normalizeStatuses(stage.statuses),
  }));
}

export function createStatus(index: number): StageStatus {
  return {
    id: crypto.randomUUID(),
    name: index === 0 ? "대기" : "",
    color: STATUS_COLORS[index % STATUS_COLORS.length]?.id ?? "gray",
    isDefault: index === 0,
    isCompletion: index === 0,
    hasDateInput: true,
    resultMeaning: "neutral",
    isTerminal: index === 0,
    isActive: true,
    displayOrder: index,
    messageRule: null,
  };
}

export function createStage(index: number): PostingStage {
  return {
    id: crypto.randomUUID(),
    name: "",
    type: "",
    displayOrder: index,
    showOnCalendar: false,
    isActive: true,
    statuses: normalizeStatuses([
      { ...createStatus(0), name: "대기", color: "gray" },
      { ...createStatus(1), name: "진행중", color: "orange" },
      { ...createStatus(2), name: "완료", color: "green" },
    ]),
    autoSend: {
      enabled: false,
      channels: ["email", "sms"],
      title: "{{전형단계명}} 안내",
      body: "",
    },
  };
}

export function reorder<T>(items: T[], from: number, to: number) {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  ) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item === undefined) return items;
  next.splice(to, 0, item);
  return next;
}
