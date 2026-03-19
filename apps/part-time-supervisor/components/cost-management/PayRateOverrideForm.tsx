"use client";

import { useState } from "react";
import { usePayOverride } from "@/hooks/use-pay-override";
import { toast } from "@repo/ui/src/sonner";
import { Checkbox } from "@repo/ui/src/checkbox";
import { Label } from "@repo/ui/src/label";
import { Input } from "@repo/ui/src/input";
import { Button } from "@repo/ui/src/button";
import { Badge } from "@repo/ui/src/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/src/select";

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
    <div className="rounded-lg border bg-slate-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Label
          htmlFor="pay-override-toggle"
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <Checkbox
            id="pay-override-toggle"
            checked={enabled}
            onCheckedChange={(checked) => setEnabled(checked === true)}
          />
          <div className="space-y-0.5">
            <span className="text-sm text-slate-900">커스텀 단가 사용</span>
            <p className="text-xs text-slate-500">공고 기본 단가 대신 개별 단가를 적용합니다.</p>
          </div>
        </Label>
        {isOverridden && (
          <Badge variant="secondary" className="bg-orange-50 text-orange-600 border-orange-200">
            커스텀 적용중
          </Badge>
        )}
      </div>

      {enabled && (
        <div className="flex items-center gap-2.5 pt-1">
          <Select value={payType} onValueChange={(v) => setPayType(v as "hourly" | "daily")}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">시급</SelectItem>
              <SelectItem value="daily">일급</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Input
              type="number"
              value={payRate}
              onChange={(e) => setPayRate(Number(e.target.value))}
              className="w-32 pr-8 text-right"
              min={0}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              원
            </span>
          </div>
          <Button size="sm" onClick={handleSave} disabled={payOverride.isPending}>
            적용
          </Button>
        </div>
      )}

      {!enabled && isOverridden && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={payOverride.isPending}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 h-auto py-1 px-2"
        >
          커스텀 단가 제거
        </Button>
      )}
    </div>
  );
}
