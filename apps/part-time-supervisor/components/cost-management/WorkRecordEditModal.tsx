"use client";

import { useState, useEffect } from "react";
import { Clock, CalendarDays } from "lucide-react";
import { useWorkRecords, useGenerateWorkRecords, useSaveWorkRecords } from "@/hooks/use-work-records";
import { PayRateOverrideForm } from "./PayRateOverrideForm";
import { toast } from "@repo/ui/src/sonner";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@repo/ui/src/dialog";
import { Button } from "@repo/ui/src/button";
import { Input } from "@repo/ui/src/input";
import { Badge } from "@repo/ui/src/badge";

type Props = {
  assignmentId: string;
  currentPayRate: number;
  currentPayType: "hourly" | "daily";
  isOverridden: boolean;
  onClose: () => void;
};

type EditableRecord = {
  workDate: string;
  workHours: number;
  note: string;
};

function formatWeekday(dateStr: string) {
  const day = new Date(dateStr).getDay();
  const names = ["일", "월", "화", "수", "목", "금", "토"];
  return names[day];
}

export function WorkRecordEditModal({ assignmentId, currentPayRate, currentPayType, isOverridden, onClose }: Props) {
  const { data: records, isLoading } = useWorkRecords(assignmentId);
  const { mutate: generateMutate, isPending: isGenerating } = useGenerateWorkRecords();
  const saveRecords = useSaveWorkRecords();
  const [editableRecords, setEditableRecords] = useState<EditableRecord[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // 모달 진입 시 일괄 생성 트리거 — mutate는 TanStack Query v5에서 stable reference
  useEffect(() => {
    generateMutate({ assignmentId });
  }, [assignmentId, generateMutate]);

  // records 변경 시 editable 상태 동기화
  useEffect(() => {
    if (records) {
      setEditableRecords(
        records.map((r) => ({
          workDate: r.work_date,
          workHours: r.work_hours,
          note: r.note ?? "",
        }))
      );
    }
  }, [records]);

  const handleHoursChange = (index: number, value: number) => {
    setEditableRecords((prev) =>
      prev.map((r, i) => (i === index ? { ...r, workHours: value } : r))
    );
    setHasChanges(true);
  };

  const handleNoteChange = (index: number, value: string) => {
    setEditableRecords((prev) =>
      prev.map((r, i) => (i === index ? { ...r, note: value } : r))
    );
    setHasChanges(true);
  };

  const handleSave = () => {
    saveRecords.mutate(
      { assignmentId, records: editableRecords },
      {
        onSuccess: () => {
          toast.success("근무 기록이 저장되었습니다.");
          setHasChanges(false);
        },
        onError: () => toast.error("저장에 실패했습니다."),
      }
    );
  };

  const totalHours = editableRecords.reduce((sum, r) => sum + r.workHours, 0);
  const workDays = editableRecords.filter((r) => r.workHours > 0).length;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col gap-0">
        <DialogHeader className="pb-4">
          <DialogTitle>근무 기록 편집</DialogTitle>
          <DialogDescription>일별 근무 시간을 수정하고 비고를 입력할 수 있습니다.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2">
          {/* 단가 오버라이드 */}
          <PayRateOverrideForm
            assignmentId={assignmentId}
            currentPayRate={currentPayRate}
            currentPayType={currentPayType}
            isOverridden={isOverridden}
          />

          {/* 요약 */}
          {!isLoading && !isGenerating && editableRecords.length > 0 && (
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="gap-1.5 py-1 text-slate-600">
                <CalendarDays className="size-3.5" />
                {workDays}일 근무
              </Badge>
              <Badge variant="outline" className="gap-1.5 py-1 text-slate-600">
                <Clock className="size-3.5" />
                총 {totalHours}시간
              </Badge>
            </div>
          )}

          {/* 근무 기록 테이블 */}
          {isLoading || isGenerating ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-4 w-20 rounded bg-slate-200" />
                  <div className="h-8 w-20 rounded bg-slate-200" />
                  <div className="h-8 flex-1 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-slate-500">
                    <th className="px-3 py-2.5 font-medium">날짜</th>
                    <th className="px-3 py-2.5 font-medium text-right">근무 시간</th>
                    <th className="px-3 py-2.5 font-medium">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {editableRecords.map((r, i) => {
                    const weekday = formatWeekday(r.workDate);
                    const isWeekend = weekday === "토" || weekday === "일";
                    return (
                      <tr
                        key={r.workDate}
                        className={`border-b last:border-0 transition-colors ${
                          isWeekend ? "bg-red-50/40" : "hover:bg-slate-50/50"
                        }`}
                      >
                        <td className="px-3 py-2">
                          <span className="text-slate-900 tabular-nums">{r.workDate.slice(5)}</span>
                          <span className={`ml-1.5 text-xs ${isWeekend ? "text-red-400" : "text-slate-400"}`}>
                            {weekday}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Input
                            type="number"
                            value={r.workHours}
                            onChange={(e) => handleHoursChange(i, parseFloat(e.target.value) || 0)}
                            className="w-20 text-right h-8 ml-auto tabular-nums"
                            min={0}
                            max={24}
                            step={0.5}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="text"
                            value={r.note}
                            onChange={(e) => handleNoteChange(i, e.target.value)}
                            placeholder="비고"
                            className="h-8"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 border-t mt-2">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saveRecords.isPending}
          >
            {saveRecords.isPending ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
