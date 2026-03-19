"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useWorkRecords, useGenerateWorkRecords, useSaveWorkRecords } from "@/hooks/use-work-records";
import { PayRateOverrideForm } from "./PayRateOverrideForm";
import { toast } from "@repo/ui/src/sonner";

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">근무 기록 편집</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* 내용 */}
        <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4">
          {/* 단가 오버라이드 */}
          <PayRateOverrideForm
            assignmentId={assignmentId}
            currentPayRate={currentPayRate}
            currentPayType={currentPayType}
            isOverridden={isOverridden}
          />

          {/* 근무 기록 테이블 */}
          {isLoading || isGenerating ? (
            <div className="flex h-20 items-center justify-center text-slate-400">
              불러오는 중...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="pb-2 font-medium">날짜</th>
                  <th className="pb-2 font-medium text-right">근무 시간</th>
                  <th className="pb-2 font-medium">비고</th>
                </tr>
              </thead>
              <tbody>
                {editableRecords.map((r, i) => (
                  <tr key={r.workDate} className="border-b last:border-0">
                    <td className="py-2 text-slate-900">{r.workDate}</td>
                    <td className="py-2 text-right">
                      <input
                        type="number"
                        value={r.workHours}
                        onChange={(e) => handleHoursChange(i, parseFloat(e.target.value) || 0)}
                        className="w-20 rounded border px-2 py-1 text-right text-sm"
                        min={0}
                        max={24}
                        step={0.5}
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="text"
                        value={r.note}
                        onChange={(e) => handleNoteChange(i, e.target.value)}
                        placeholder="비고"
                        className="w-full rounded border px-2 py-1 text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            닫기
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saveRecords.isPending}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saveRecords.isPending ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
