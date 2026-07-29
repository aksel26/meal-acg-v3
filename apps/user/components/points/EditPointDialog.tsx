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
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AutoCompleteInput } from "@repo/ui/src/autocomplete-input";
import { useUsers } from "@/hooks/useUsers";
import { useUserStore } from "@/stores/userStore";
import { toast } from "@repo/ui/src/sonner";
import { X, ChevronLeft, Check, Pencil } from "@repo/ui/icons";

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
  proxy_payer?: string;         // 대표 결제자 이름 (단일). undefined = 본인
  companion_names?: string[];   // 동반 결제자 이름들 (UI 전용, DB 저장 안함)
}

type StepId = "type" | "vendor" | "proxy" | "amount";

const STEP_ORDER_NEW: StepId[] = ["type", "vendor", "proxy", "amount"];
const STEP_ORDER_EDIT: StepId[] = ["type", "vendor", "proxy", "amount"];

const STEP_LABELS: Record<StepId, string> = {
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
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group relative"
    >
      <div
        onClick={onEdit}
        className="flex items-center justify-between px-4 py-3 bg-slate-50/80 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100/80 hover:border-slate-200 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
            <Check className="w-3 h-3 text-emerald-600" strokeWidth={3} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              {STEP_LABELS[stepId]}
            </span>
            <span className="text-sm font-medium text-slate-800 leading-tight">
              {value || "-"}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-200 transition-all duration-200"
        >
          <Pencil className="w-3.5 h-3.5 text-slate-500" />
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
}: EditPointDialogProps) {
  // 비매니저는 type 스텝 건너뛰기 (복지포인트 고정)
  const baseStepOrder = isNewPoint ? STEP_ORDER_NEW : STEP_ORDER_EDIT;
  const stepOrder = isManager ? baseStepOrder : baseStepOrder.filter((s) => s !== "type");
  const [currentStep, setCurrentStep] = useState<StepId>(stepOrder[0] as StepId);
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
        setCompletedSteps([...stepOrder]);
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

  if (!editingPoint) return null;

  const updatePoint = (updates: Partial<WelfarePoint>) => {
    onPointChange({ ...editingPoint, ...updates });
  };

  // --- Step navigation ---

  const completeAndNext = (stepId: StepId) => {
    setCompletedSteps((prev) => (prev.includes(stepId) ? prev : [...prev, stepId]));
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

  const formSteps = stepOrder;
  const allFormCompleted = formSteps.every((s) => completedSteps.includes(s));
  const isSummaryView = !isNewPoint && allFormCompleted && completedSteps.includes(currentStep);

  const canGoBack = stepOrder.indexOf(currentStep) > 0 && !isSummaryView;

  // --- Handlers ---

  const handleSave = async () => {
    if (isSaving) return;
    try {
      await onSave();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      toast.error(`저장에 실패했습니다: ${msg}`);
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
      const diffDays = Math.floor((new Date().getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24));
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
    const diffDays = Math.floor((today.getTime() - usedDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 1;
  })();

  // --- Step value display ---

  const getStepValue = (stepId: StepId): string => {
    switch (stepId) {
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
    : stepOrder.filter((s) => completedSteps.includes(s) && s !== currentStep);

  const selectedDate = editingPoint.date ? new Date(editingPoint.date) : undefined;

  // --- Render steps ---

  const renderCurrentStep = () => {
    switch (currentStep) {
      case "type":
        return (
          <motion.div
            key="type"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <div className="text-center space-y-1 mb-2">
              <h3 className="text-sm font-semibold text-slate-800">유형을 선택해주세요</h3>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  updatePoint({ type: "welfare" });
                  setTimeout(() => completeAndNext("type"), 150);
                }}
                className={`flex-1 py-4 rounded-xl border-2 transition-all duration-200 text-sm font-semibold ${
                  editingPoint.type === "welfare"
                    ? "bg-blue-50 border-blue-300 text-blue-800 shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50/50"
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
                className={`flex-1 py-4 rounded-xl border-2 transition-all duration-200 text-sm font-semibold ${
                  editingPoint.type === "activity"
                    ? "bg-orange-50 border-orange-300 text-orange-800 shadow-sm"
                    : "bg-white border-slate-200 text-slate-600 hover:border-orange-200 hover:bg-orange-50/50"
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <div className="text-center space-y-1 mb-2">
              <h3 className="text-sm font-semibold text-slate-800">사용처를 입력해주세요</h3>
            </div>
            <Input
              ref={vendorInputRef}
              value={editingPoint.vendor}
              onChange={(e) => updatePoint({ vendor: e.target.value })}
              className="text-sm border-slate-300 h-12"
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
              className="w-full py-3.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* Section A: 대표 결제자 (카드 주인) */}
            <div>
              <div className="text-center space-y-1 mb-3">
                <h3 className="text-sm font-semibold text-slate-800">대표 결제자 (카드 주인)</h3>
                <p className="text-xs text-slate-500">본인 외 다른 카드로 결제한 경우 변경해주세요</p>
              </div>

              {/* 현재 선택된 대표 결제자 표시 */}
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
                  {currentPayer}
                  {editingPoint.proxy_payer && editingPoint.proxy_payer !== userName && (
                    <button
                      type="button"
                      onClick={() => {
                        updatePoint({ proxy_payer: undefined });
                        setProxySearchValue("");
                      }}
                      className="ml-0.5 hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
                {!editingPoint.proxy_payer && (
                  <span className="text-[10px] text-slate-400">(본인)</span>
                )}
              </div>

              <AutoCompleteInput
                ref={proxyInputRef}
                showOnFocus={false}
                suggestions={users.filter(
                  (u) => u !== currentPayer && !selectedCompanions.includes(u)
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
                className="h-12 text-sm rounded-xl border-2 border-slate-100 bg-white focus:border-slate-300 focus:ring-0 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Section B: 동반 결제자 — 본인 결제일 때만 표시 */}
            {!editingPoint.proxy_payer && (
              <>
                <div className="border-t border-slate-100" />
                <div>
                  <div className="text-center space-y-1 mb-3">
                    <h3 className="text-sm font-semibold text-slate-800">동반 결제자</h3>
                    <p className="text-xs text-slate-400">함께 결제한 인원들을 선택해 주세요.</p>
                  </div>

                  {/* Selected companion chips */}
                  {selectedCompanions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedCompanions.map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium"
                        >
                          {name}
                          <button
                            type="button"
                            onClick={() => {
                              updatePoint({
                                companion_names: selectedCompanions.filter((n) => n !== name),
                              });
                            }}
                            className="ml-0.5 hover:bg-blue-100 rounded-full p-0.5 transition-colors"
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
                      (u) =>
                        !selectedCompanions.includes(u) &&
                        u !== userName
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
                    className="h-12 text-sm rounded-xl border-2 border-slate-100 bg-white focus:border-slate-300 focus:ring-0 transition-all placeholder:text-slate-400"
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
                className="flex-1 py-3.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
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
                className="flex-1 py-3.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <div className="text-center space-y-1 mb-2">
              <h3 className="text-sm font-semibold text-slate-800">금액과 날짜를 입력해주세요</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">날짜</Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between font-normal text-xs border-slate-300 h-12 px-3 py-2">
                      {selectedDate
                        ? `${selectedDate.getFullYear()}.${String(selectedDate.getMonth() + 1).padStart(2, "0")}.${String(selectedDate.getDate()).padStart(2, "0")}`
                        : "날짜 선택"}
                      <ChevronDownIcon className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      captionLayout="dropdown"
                      onSelect={handleDateSelect}
                      showOutsideDays={false}
                      classNames={{
                        day_selected: "bg-blue-500! text-white! hover:bg-blue-600 focus:bg-blue-600",
                        day_today: "bg-orange-100 text-orange-900 font-semibold",
                        today: "border border-slate-500 rounded-lg",
                      }}
                      components={{
                        YearsDropdown: ({ value }) => (
                          <div className="p-2 text-sm sm:text-md">{value ?? new Date().getFullYear()}</div>
                        ),
                        MonthsDropdown: ({ value }) => (
                          <div className="p-2 text-sm sm:text-md">{Number(value ?? new Date().getMonth()) + 1}월</div>
                        ),
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-xs font-semibold text-slate-700">금액</Label>
                <div className="relative">
                  <Input
                    ref={amountInputRef}
                    id="amount"
                    type="number"
                    value={editingPoint.amount || ""}
                    onChange={handleAmountChange}
                    className="pr-8 text-sm border-slate-300 h-12 py-2"
                    placeholder="금액 입력"
                    min="0"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && editingPoint.amount > 0 && !(needsDelayReason && !editingPoint.delay_reason?.trim())) {
                        e.preventDefault();
                        handleSave();
                      }
                    }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">원</span>
                </div>
              </div>
            </div>
            {needsDelayReason && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-amber-700">지연 사유 (필수)</Label>
                <textarea
                  value={editingPoint.delay_reason || ""}
                  onChange={(e) => updatePoint({ delay_reason: e.target.value })}
                  className="flex w-full rounded-xl border border-amber-300 bg-amber-50/50 px-3 py-2.5 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 min-h-[72px] resize-none"
                  placeholder="지연 사유를 입력해주세요"
                />
              </div>
            )}
            <button
              type="button"
              disabled={!editingPoint.amount || editingPoint.amount <= 0 || (needsDelayReason && !editingPoint.delay_reason?.trim()) || isSaving}
              onClick={handleSave}
              className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                isNewPoint
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-slate-800 hover:bg-slate-700 text-white"
              }`}
            >
              {isSaving ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  저장 중...
                </div>
              ) : (
                isNewPoint ? "추가하기" : "수정하기"
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
        className="max-w-md w-[calc(100%-2rem)] bg-white rounded-2xl border-0 shadow-2xl p-0 gap-0 overflow-visible"
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
                    className="p-2 -ml-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Center: Title */}
            <div className="flex-1 text-center">
              <DialogTitle className="text-base font-semibold text-slate-900">
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
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-red-600 border-t-transparent" />
                      ) : (
                        "삭제"
                      )}
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>내역을 삭제하시겠습니까?</AlertDialogTitle>
                      <AlertDialogDescription>
                        이 작업은 되돌릴 수 없습니다. <br />
                        선택한 내역이 영구적으로 삭제됩니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="w-[90%] text-sm mx-auto text-left bg-slate-50 p-3 rounded-md flex flex-col space-y-2">
                      <strong>삭제할 내역</strong>
                      <div className="flex flex-col items-start space-y-1">
                        <div className="text-slate-400">사용처</div>
                        <div>{editingPoint.vendor}</div>
                      </div>
                      <div className="flex flex-col items-start space-y-1">
                        <div className="text-slate-400">금액</div>
                        <div>{editingPoint.amount.toLocaleString()}원</div>
                      </div>
                      <div className="flex flex-col items-start space-y-1">
                        <div className="text-slate-400">날짜</div>
                        <div>{new Date(editingPoint.date).toLocaleDateString("ko-KR")}</div>
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-red-50 hover:bg-red-700 border border-red-300 text-red-500">
                        내역 삭제하기
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <DialogClose asChild>
                  <button
                    type="button"
                    className="p-2 -mr-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="pt-2"
              >
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full py-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      저장 중...
                    </div>
                  ) : (
                    "수정 완료"
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
