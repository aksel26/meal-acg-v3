import { ChevronDownIcon } from "@repo/ui/icons";
import { Button } from "@repo/ui/src/button";
import { Calendar } from "@repo/ui/src/calendar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/src/alert-dialog";
import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AutoCompleteInput } from "@repo/ui/src/autocomplete-input";
import { ReceiptScanner } from "../ReceiptScanner";
import { ReceiptScanResult } from "@/lib/types/receipt-types";
import { useUsers } from "@/hooks/useUsers";
import { useUserStore } from "@/stores/userStore";
import { toast } from "@repo/ui/src/sonner";
import { X, ChevronLeft, Check, Pencil, Loader2 } from "@repo/ui/icons";
import { stepMotion } from "@/lib/motion";

// --- Types ---

interface WelfarePoint {
  id: string;
  date: string;
  type: "activity" | "welfare";
  vendor: string;
  amount: number;
  used: boolean;
  confirmed: boolean;
  notes?: string;
  delay_reason?: string;
  proxy_payer?: string; // 대표 결제자 이름 (단일). undefined = 본인
  companion_names?: string[]; // 동반 결제자 이름들 (UI 전용, DB 저장 안함)
}

type StepId = "scan" | "type" | "vendor" | "proxy" | "amount";

const STEP_ORDER_NEW: StepId[] = ["type", "vendor", "proxy", "amount"];
const STEP_ORDER_EDIT: StepId[] = ["type", "vendor", "proxy", "amount"];

const STEP_LABELS: Record<StepId, string> = {
  scan: "영수증",
  type: "유형",
  vendor: "사용처",
  proxy: "결제자",
  amount: "금액·날짜",
};

// --- Sub-components ---

function CompletedStepChip({
  stepId,
  value,
  onEdit,
  index,
}: {
  stepId: StepId;
  value: string;
  onEdit: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.3,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="group relative"
    >
      <div
        onClick={onEdit}
        className="flex items-center justify-between px-4 py-3 bg-[var(--whisper-cream)] rounded-[16px] cursor-pointer hover:bg-[var(--soft-bone)] transition-colors duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-[rgba(0,168,126,0.12)] flex items-center justify-center">
            <Check className="w-3 h-3 text-[var(--success-text)]" strokeWidth={3} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-[var(--slate-gray)] font-medium">
              {STEP_LABELS[stepId]}
            </span>
            <span className="text-sm font-medium text-[var(--ink-black)] leading-tight">
              {value || "-"}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="p-1.5 rounded-full hover:bg-white"
        >
          <Pencil className="w-3.5 h-3.5 text-[var(--granite)]" />
        </button>
      </div>
    </motion.div>
  );
}

// --- Main Component ---

interface EditPointDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingPoint: WelfarePoint | null;
  onSave: () => Promise<void>;
  onDelete?: (point: WelfarePoint) => void;
  onPointChange: (point: WelfarePoint) => void;
  isNewPoint: boolean;
  isDeleting?: boolean;
  isSaving?: boolean;
  isManager?: boolean;
  vendorSuggestions?: string[];
}

export function EditPointDialog({
  isOpen,
  onOpenChange,
  editingPoint,
  onSave,
  onDelete,
  onPointChange,
  isNewPoint,
  isDeleting = false,
  isSaving = false,
  isManager = false,
  vendorSuggestions = [],
}: EditPointDialogProps) {
  // 비매니저는 type 스텝 건너뛰기 (복지포인트 고정)
  const baseStepOrder = isNewPoint ? STEP_ORDER_NEW : STEP_ORDER_EDIT;
  const stepOrder = isManager
    ? baseStepOrder
    : baseStepOrder.filter((s) => s !== "type");
  const [currentStep, setCurrentStep] = useState<StepId>(
    stepOrder[0] as StepId,
  );
  const [completedSteps, setCompletedSteps] = useState<StepId[]>([]);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const vendorInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const proxyInputRef = useRef<HTMLInputElement>(null);

  // Users for autocomplete
  const { users, fetchUsers } = useUsers();
  const { userName } = useUserStore();
  const [proxySearchValue, setProxySearchValue] = useState("");
  const [companionSearchValue, setCompanionSearchValue] = useState("");
  const companionInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (users.length === 0) fetchUsers();
  }, [users.length, fetchUsers]);

  // Dialog open/close → 스텝 초기화
  useEffect(() => {
    if (isOpen) {
      // 비매니저는 항상 복지포인트 고정
      if (!isManager && editingPoint) {
        onPointChange({ ...editingPoint, type: "welfare" });
      }
      if (isNewPoint) {
        setCurrentStep(stepOrder[0] as StepId);
        setCompletedSteps([]);
      } else {
        // 수정 모드: 모든 스텝 완료 상태로 시작 (요약 뷰)
        setCompletedSteps([...stepOrder.filter((s) => s !== "scan")]);
        setCurrentStep(stepOrder[stepOrder.length - 1] as StepId);
      }
    }
  }, [isOpen, isNewPoint, isManager]);

  // 스텝 변경 시 input auto-focus
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (currentStep === "vendor") vendorInputRef.current?.focus();
      else if (currentStep === "proxy") proxyInputRef.current?.focus();
      else if (currentStep === "amount") amountInputRef.current?.focus();
    }, 350);
    return () => clearTimeout(timer);
  }, [currentStep, isOpen]);

  const handleScanComplete = useCallback(
    (result: ReceiptScanResult) => {
      if (!editingPoint) return;
      const updates: Partial<WelfarePoint> = {};
      if (result.storeName) updates.vendor = result.storeName;
      if (result.totalAmount > 0) updates.amount = result.totalAmount;
      if (result.date) updates.date = result.date;
      if (Object.keys(updates).length > 0) {
        onPointChange({ ...editingPoint, ...updates });
      }
      // 스캔 완료 후 다음 스텝으로
      completeAndNext("scan");
    },
    [editingPoint, onPointChange],
  );

  if (!editingPoint) return null;

  const updatePoint = (updates: Partial<WelfarePoint>) => {
    onPointChange({ ...editingPoint, ...updates });
  };

  // --- Step navigation ---

  const completeAndNext = (stepId: StepId) => {
    setCompletedSteps((prev) =>
      prev.includes(stepId) ? prev : [...prev, stepId],
    );
    const idx = stepOrder.indexOf(stepId);
    const nextStep = stepOrder[idx + 1];
    if (idx < stepOrder.length - 1 && nextStep) {
      setCurrentStep(nextStep);
    }
  };

  const goToStep = (stepId: StepId) => {
    // 해당 스텝과 이후 스텝을 미완료 상태로 되돌림
    const idx = stepOrder.indexOf(stepId);
    setCompletedSteps((prev) => prev.filter((s) => stepOrder.indexOf(s) < idx));
    setCurrentStep(stepId);
  };

  const prevStep = () => {
    const idx = stepOrder.indexOf(currentStep);
    const prev = stepOrder[idx - 1];
    if (idx > 0 && prev) {
      goToStep(prev);
    }
  };

  // --- Summary view (edit mode) ---

  const formSteps = stepOrder.filter((s) => s !== "scan");
  const allFormCompleted = formSteps.every((s) => completedSteps.includes(s));
  const isSummaryView =
    !isNewPoint && allFormCompleted && completedSteps.includes(currentStep);

  const canGoBack = stepOrder.indexOf(currentStep) > 0 && !isSummaryView;

  // --- Handlers ---

  const handleSave = async () => {
    if (isSaving) return;
    try {
      await onSave();
    } catch (error) {
      console.error(error);
      toast.error("내역을 저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.");
    }
  };

  const handleDelete = () => {
    if (onDelete && editingPoint) {
      onDelete(editingPoint);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "" || (!isNaN(Number(value)) && Number(value) >= 0)) {
      updatePoint({ amount: value === "" ? 0 : Number(value) });
    }
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const newDate = `${year}-${month}-${day}`;
      // 1일 이내면 delay_reason 초기화
      const diffDays = Math.floor(
        (new Date().getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays <= 1) {
        updatePoint({ date: newDate, delay_reason: "" });
      } else {
        updatePoint({ date: newDate });
      }
      setDatePickerOpen(false);
    }
  };

  // 지연 사유 필요 여부 판단 (사용일이 오늘 기준 1일 초과)
  const needsDelayReason = (() => {
    if (!editingPoint?.date) return false;
    const usedDate = new Date(editingPoint.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    usedDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor(
      (today.getTime() - usedDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diffDays > 1;
  })();

  // --- Step value display ---

  const getStepValue = (stepId: StepId): string => {
    switch (stepId) {
      case "scan":
        return "스캔 완료";
      case "type":
        return editingPoint.type === "welfare" ? "복지포인트" : "활동비";
      case "vendor":
        return editingPoint.vendor || "-";
      case "proxy": {
        const payer = editingPoint.proxy_payer ?? userName ?? "본인";
        const companions = editingPoint.companion_names ?? [];
        return companions.length > 0
          ? `${payer} · 동반 ${companions.length}명`
          : payer;
      }
      case "amount": {
        const d = editingPoint.date ? new Date(editingPoint.date) : null;
        const dateStr = d
          ? `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`
          : "";
        return `${editingPoint.amount ? editingPoint.amount.toLocaleString() + "원" : "-"} · ${dateStr}`;
      }
      default:
        return "";
    }
  };

  // --- Completed steps to display ---

  const displayedCompletedSteps = isSummaryView
    ? formSteps
    : stepOrder.filter(
        (s) => completedSteps.includes(s) && s !== currentStep && s !== "scan",
      );

  const selectedDate = editingPoint.date
    ? new Date(editingPoint.date)
    : undefined;

  // --- Render steps ---

  const renderCurrentStep = () => {
    switch (currentStep) {
      case "scan":
        return (
          <motion.div
            key="scan"
            {...stepMotion}
            className="space-y-4"
          >
            <div className="space-y-1">
              <h3 className="text-lg font-medium text-[var(--ink-black)]">
                영수증을 스캔하시겠어요?
              </h3>
              <p className="text-sm text-[var(--slate-gray)]">
                스캔하면 사용처, 금액, 날짜가 자동 입력됩니다
              </p>
            </div>
            <ReceiptScanner onScanComplete={handleScanComplete} />
            <button
              type="button"
              onClick={() => completeAndNext("scan")}
              className="w-full py-3 text-sm text-[var(--granite)] hover:text-[var(--granite)] transition-colors"
            >
              건너뛰기
            </button>
          </motion.div>
        );

      case "type":
        return (
          <motion.div
            key="type"
            {...stepMotion}
            className="space-y-4"
          >
            <div className="space-y-1">
              <h3 className="text-lg font-medium text-[var(--ink-black)]">
                유형을 선택해주세요
              </h3>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  updatePoint({ type: "welfare" });
                  setTimeout(() => completeAndNext("type"), 150);
                }}
                className={`flex-1 py-4 rounded-[18px] transition-colors duration-200 text-sm font-semibold ${
                  editingPoint.type === "welfare"
                    ? "bg-[var(--ink-black)] text-white"
                    : "bg-[var(--whisper-cream)] text-[var(--granite)] hover:bg-[var(--soft-bone)]"
                }`}
              >
                복지포인트
              </button>
              <button
                type="button"
                onClick={() => {
                  updatePoint({ type: "activity" });
                  setTimeout(() => completeAndNext("type"), 150);
                }}
                className={`flex-1 py-4 rounded-[18px] transition-colors duration-200 text-sm font-semibold ${
                  editingPoint.type === "activity"
                    ? "bg-[var(--ink-black)] text-white"
                    : "bg-[var(--whisper-cream)] text-[var(--granite)] hover:bg-[var(--soft-bone)]"
                }`}
              >
                활동비
              </button>
            </div>
          </motion.div>
        );

      case "vendor":
        return (
          <motion.div
            key="vendor"
            {...stepMotion}
            className="space-y-4"
          >
            <div className="space-y-1">
              <h3 className="text-lg font-medium text-[var(--ink-black)]">
                사용처를 입력해주세요
              </h3>
            </div>
            <AutoCompleteInput
              ref={vendorInputRef}
              showOnFocus={false}
              suggestions={vendorSuggestions}
              value={editingPoint.vendor}
              onValueChange={(value) => updatePoint({ vendor: value })}
              onSuggestionSelect={() => completeAndNext("vendor")}
              allowFreeText={true}
              maxSuggestions={10}
              emptyText="일치하는 사용처가 없습니다"
              className="h-14 text-base rounded-[16px] border-0 bg-[var(--whisper-cream)] focus:bg-white transition-colors placeholder:text-[var(--slate-gray)] ring-offset-background focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1"
              placeholder="예: 스타벅스 강남점"
              onKeyDown={(e) => {
                if (e.key === "Enter" && editingPoint.vendor.trim()) {
                  e.preventDefault();
                  completeAndNext("vendor");
                }
              }}
            />
            <button
              type="button"
              disabled={!editingPoint.vendor.trim()}
              onClick={() => completeAndNext("vendor")}
              className="w-full py-3.5 rounded-full bg-[var(--ink-black)] text-white text-sm font-medium hover:opacity-85 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </motion.div>
        );

      case "proxy": {
        const currentPayer = editingPoint.proxy_payer ?? userName ?? "";
        const selectedCompanions = editingPoint.companion_names ?? [];
        return (
          <motion.div
            key="proxy"
            {...stepMotion}
            className="space-y-4"
          >
            {/* Section A: 대표 결제자 (카드 주인) */}
            <div>
              <div className="space-y-1 mb-3">
                <h3 className="text-lg font-medium text-[var(--ink-black)]">
                  카드 주인
                </h3>
                <p className="text-sm text-[var(--slate-gray)]">
                  본인 외 다른 카드로 결제한 경우 변경해주세요
                </p>
              </div>

              {/* 현재 선택된 대표 결제자 표시 */}
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(56,200,255,0.12)] text-[#0f4c75] text-sm font-medium">
                  {currentPayer}
                  {editingPoint.proxy_payer &&
                    editingPoint.proxy_payer !== userName && (
                      <button
                        type="button"
                        onClick={() => {
                          updatePoint({ proxy_payer: undefined });
                          setProxySearchValue("");
                        }}
                        className="ml-0.5 hover:bg-[rgba(56,200,255,0.15)] rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                </span>
                {!editingPoint.proxy_payer && (
                  <span className="text-xs text-[var(--slate-gray)]">
                    (본인)
                  </span>
                )}
              </div>

              <AutoCompleteInput
                ref={proxyInputRef}
                showOnFocus={false}
                suggestions={users.filter(
                  (u) => u !== currentPayer && !selectedCompanions.includes(u),
                )}
                value={proxySearchValue}
                onValueChange={(value) => setProxySearchValue(value)}
                onSuggestionSelect={(name) => {
                  // 본인 이름 선택 시 undefined로 처리, 다른 사람이면 동반 결제자 초기화
                  const isSelf = name === userName;
                  updatePoint({
                    proxy_payer: isSelf ? undefined : name,
                    companion_names: isSelf ? editingPoint.companion_names : [],
                  });
                  setProxySearchValue("");
                  if (!isSelf) setCompanionSearchValue("");
                }}
                placeholder="다른 카드 주인 검색"
                allowFreeText={true}
                maxSuggestions={users.length}
                emptyText="조직원을 찾을 수 없습니다"
                className="h-14 text-base rounded-[16px] border-0 bg-[var(--whisper-cream)] focus:bg-white focus:ring-0 transition-colors placeholder:text-[var(--slate-gray)]"
              />
            </div>

            {/* Section B: 동반 결제자 — 본인 결제일 때만 표시 */}
            {!editingPoint.proxy_payer && (
              <>
                <div className="border-t border-[rgba(25,28,31,0.06)]" />
                <div>
                  <div className="space-y-1 mb-3">
                    <h3 className="text-sm font-medium text-[var(--ink-black)]">
                      동반 결제자
                    </h3>
                    <p className="text-xs text-[var(--slate-gray)]">
                      함께 결제한 인원들을 선택해 주세요.
                    </p>
                  </div>

                  {/* Selected companion chips */}
                  {selectedCompanions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedCompanions.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[rgba(56,200,255,0.12)] text-[#0f4c75] text-sm font-medium"
                        >
                          {name}
                          <button
                            type="button"
                            onClick={() => {
                              updatePoint({
                                companion_names: selectedCompanions.filter(
                                  (n) => n !== name,
                                ),
                              });
                            }}
                            className="ml-0.5 hover:bg-[rgba(56,200,255,0.15)] rounded-full p-0.5 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <AutoCompleteInput
                    ref={companionInputRef}
                    showOnFocus={false}
                    suggestions={users.filter(
                      (u) => !selectedCompanions.includes(u) && u !== userName,
                    )}
                    value={companionSearchValue}
                    onValueChange={(value) => setCompanionSearchValue(value)}
                    onSuggestionSelect={(name) => {
                      updatePoint({
                        companion_names: [...selectedCompanions, name],
                      });
                      setCompanionSearchValue("");
                    }}
                    placeholder="이름 검색"
                    allowFreeText={true}
                    maxSuggestions={users.length}
                    emptyText="조직원을 찾을 수 없습니다"
                    className="h-14 text-base rounded-[16px] border-0 bg-[var(--whisper-cream)] focus:bg-white focus:ring-0 transition-colors placeholder:text-[var(--slate-gray)]"
                  />
                </div>
              </>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  updatePoint({ proxy_payer: undefined, companion_names: [] });
                  setProxySearchValue("");
                  setCompanionSearchValue("");
                  completeAndNext("proxy");
                }}
                className="flex-1 py-3.5 rounded-full border border-[rgba(25,28,31,0.08)] text-sm font-medium text-[var(--granite)] hover:bg-[var(--soft-bone)] transition-colors"
              >
                건너뛰기
              </button>
              <button
                type="button"
                onClick={() => {
                  setProxySearchValue("");
                  setCompanionSearchValue("");
                  completeAndNext("proxy");
                }}
                className="flex-1 py-3.5 rounded-full bg-[var(--ink-black)] text-white text-sm font-medium hover:opacity-85 transition-colors"
              >
                다음
              </button>
            </div>
          </motion.div>
        );
      }

      case "amount":
        return (
          <motion.div
            key="amount"
            {...stepMotion}
            className="space-y-4"
          >
            <div className="space-y-1">
              <h3 className="text-lg font-medium text-[var(--ink-black)]">
                금액과 날짜를 입력해주세요
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-[var(--granite)]">
                  날짜
                </Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal text-xs border-[rgba(25,28,31,0.12)] h-12 px-3 py-2"
                    >
                      {selectedDate
                        ? `${selectedDate.getFullYear()}.${String(selectedDate.getMonth() + 1).padStart(2, "0")}.${String(selectedDate.getDate()).padStart(2, "0")}`
                        : "날짜 선택"}
                      <ChevronDownIcon className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto overflow-hidden p-0"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      captionLayout="dropdown"
                      onSelect={handleDateSelect}
                      showOutsideDays={false}
                      classNames={{
                        day_selected:
                          "bg-[rgba(56,200,255,0.12)]0! text-white! hover:bg-[var(--ink-black)] focus:bg-[var(--ink-black)]",
                        day_today:
                          "bg-orange-100 text-orange-900 font-semibold",
                        today: "border border-[var(--granite)] rounded-[10px]",
                      }}
                      components={{
                        YearsDropdown: ({ value }) => (
                          <div className="p-2 text-sm sm:text-base">
                            {value ?? new Date().getFullYear()}
                          </div>
                        ),
                        MonthsDropdown: ({ value }) => (
                          <div className="p-2 text-sm sm:text-base">
                            {Number(value ?? new Date().getMonth()) + 1}월
                          </div>
                        ),
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="amount"
                  className="text-xs font-semibold text-[var(--granite)]"
                >
                  금액
                </Label>
                <div className="relative">
                  <Input
                    ref={amountInputRef}
                    id="amount"
                    type="number"
                    value={editingPoint.amount || ""}
                    onChange={handleAmountChange}
                    className="pr-8 text-sm border-[rgba(25,28,31,0.12)] h-12 py-2"
                    placeholder="금액 입력"
                    min="0"
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        editingPoint.amount > 0 &&
                        !(
                          needsDelayReason && !editingPoint.delay_reason?.trim()
                        )
                      ) {
                        e.preventDefault();
                        handleSave();
                      }
                    }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--granite)]">
                    원
                  </span>
                </div>
              </div>
            </div>
            {needsDelayReason && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-[#6b4c00]">
                  지연 사유 (필수)
                </Label>
                <textarea
                  value={editingPoint.delay_reason || ""}
                  onChange={(e) =>
                    updatePoint({ delay_reason: e.target.value })
                  }
                  className="flex w-full rounded-[16px] border border-[rgba(255,209,26,0.4)] bg-[rgba(255,209,26,0.08)] px-3 py-2.5 text-sm placeholder:text-[var(--slate-gray)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ffd11a] min-h-[72px] resize-none"
                  placeholder="지연 사유를 입력해주세요"
                />
              </div>
            )}
            <button
              type="button"
              disabled={
                !editingPoint.amount ||
                editingPoint.amount <= 0 ||
                (needsDelayReason && !editingPoint.delay_reason?.trim()) ||
                isSaving
              }
              onClick={handleSave}
              className={`w-full py-3.5 rounded-full text-sm font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                isNewPoint
                  ? "bg-gradient-to-r from-[var(--ink-black)] to-[var(--granite)] hover:from-[var(--ink-black)] hover:to-[#0e0f0c] text-white"
                  : "bg-[var(--ink-black)] hover:bg-[var(--granite)] text-white"
              }`}
            >
              {isSaving ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  저장 중...
                </div>
              ) : (
                "저장"
              )}
            </button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md w-[calc(100%-2rem)] bg-white rounded-[24px] border-0 p-0 gap-0 overflow-visible"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between">
            {/* Left: Back or spacer */}
            <div className="w-10">
              <AnimatePresence mode="wait">
                {canGoBack && (
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    type="button"
                    onClick={prevStep}
                    className="p-2 -ml-2 rounded-full hover:bg-[var(--whisper-cream)] transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-[var(--granite)]" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Center: Title */}
            <div className="flex-1 text-center">
              <DialogTitle className="text-base text-[var(--ink-black)]">
                {isNewPoint ? "포인트 내역 추가" : "포인트 내역 수정"}
              </DialogTitle>
            </div>

            {/* Right: Delete or Close */}
            <div className="w-10 flex justify-end">
              {!isNewPoint && onDelete ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="px-2.5 py-1.5 rounded-full text-xs font-medium text-[var(--danger-text)] bg-[rgba(208,50,56,0.08)] hover:bg-[rgba(208,50,56,0.12)] transition-colors"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "삭제"
                      )}
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        이 내역을 삭제할까요?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        삭제하면 되돌릴 수 없어요.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="mx-auto w-full rounded-[18px] bg-[rgba(244,244,244,0.58)] p-4 text-sm">
                      <div className="mb-3 flex items-center justify-between">
                        <strong className="font-medium text-[var(--ink-black)]">
                          삭제할 내역
                        </strong>
                        <span className="rounded-full bg-[rgba(208,50,56,0.08)] px-2.5 py-1 text-xs font-medium text-[var(--danger-text)]">
                          삭제 예정
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-[4rem_1fr] gap-3">
                          <div className="text-[var(--slate-gray)]">사용처</div>
                          <div className="min-w-0 truncate font-medium text-[var(--ink-black)]">
                            {editingPoint.vendor}
                          </div>
                        </div>
                        <div className="grid grid-cols-[4rem_1fr] gap-3">
                          <div className="text-[var(--slate-gray)]">금액</div>
                          <div className="font-medium tabular-nums text-[var(--ink-black)]">
                            {editingPoint.amount.toLocaleString()}원
                          </div>
                        </div>
                        <div className="grid grid-cols-[4rem_1fr] gap-3">
                          <div className="text-[var(--slate-gray)]">날짜</div>
                          <div className="text-[var(--ink-black)]">
                            {new Date(editingPoint.date).toLocaleDateString(
                              "ko-KR",
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-[rgba(208,50,56,0.08)] hover:bg-[#a8181e] hover:text-white border border-[rgba(208,50,56,0.3)] text-[var(--danger-text)]"
                      >
                        내역 삭제
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <DialogClose asChild>
                  <button
                    type="button"
                    className="p-2 -mr-2 rounded-full hover:bg-[var(--whisper-cream)] transition-colors"
                  >
                    <X className="w-5 h-5 text-[var(--slate-gray)]" />
                  </button>
                </DialogClose>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="px-5 pb-6 overflow-visible">
          {/* Completed Steps */}
          <AnimatePresence mode="popLayout">
            {displayedCompletedSteps.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2 mb-5"
              >
                {displayedCompletedSteps.map((stepId, index) => (
                  <CompletedStepChip
                    key={stepId}
                    stepId={stepId}
                    value={getStepValue(stepId)}
                    onEdit={() => goToStep(stepId)}
                    index={index}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Current Step or Summary Save */}
          <AnimatePresence mode="wait">
            {isSummaryView ? (
              <motion.div
                key="summary-save"
                {...stepMotion}
                className="pt-2"
              >
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full py-4 rounded-full bg-[var(--ink-black)] hover:bg-[var(--granite)] text-white text-sm font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      저장 중...
                    </div>
                  ) : (
                    "저장"
                  )}
                </button>
              </motion.div>
            ) : (
              renderCurrentStep()
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
