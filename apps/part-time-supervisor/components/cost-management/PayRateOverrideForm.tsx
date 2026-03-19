"use client";

import { useState } from "react";
import { usePayOverride } from "@/hooks/use-pay-override";
import { toast } from "@repo/ui/src/sonner";

type Props = {
  assignmentId: string;
  currentPayRate: number;
  currentPayType: "hourly" | "daily";
  isOverridden: boolean;
};

export function PayRateOverrideForm({ assignmentId, currentPayRate, currentPayType, isOverridden }: Props) {
  const [enabled, setEnabled] = useState(isOverridden);
  const [payRate, setPayRate] = useState(currentPayRate);
  const [payType, setPayType] = useState(currentPayType);
  const payOverride = usePayOverride();

  const handleSave = () => {
    payOverride.mutate(
      {
        assignmentId,
        payRate: enabled ? payRate : null,
        payType: enabled ? payType : null,
      },
      {
        onSuccess: () => toast.success("단가가 변경되었습니다."),
        onError: () => toast.error("단가 변경에 실패했습니다."),
      }
    );
  };

  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded"
          />
          커스텀 단가 사용
        </label>
      </div>

      {enabled && (
        <div className="mt-3 flex items-center gap-3">
          <select
            value={payType}
            onChange={(e) => setPayType(e.target.value as "hourly" | "daily")}
            className="rounded-lg border px-3 py-1.5 text-sm"
          >
            <option value="hourly">시급</option>
            <option value="daily">일급</option>
          </select>
          <input
            type="number"
            value={payRate}
            onChange={(e) => setPayRate(Number(e.target.value))}
            className="w-32 rounded-lg border px-3 py-1.5 text-sm text-right"
            min={0}
          />
          <span className="text-sm text-slate-500">원</span>
          <button
            onClick={handleSave}
            disabled={payOverride.isPending}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
          >
            적용
          </button>
        </div>
      )}

      {!enabled && isOverridden && (
        <button
          onClick={handleSave}
          disabled={payOverride.isPending}
          className="mt-2 text-sm text-red-500 hover:underline"
        >
          커스텀 단가 제거
        </button>
      )}
    </div>
  );
}
