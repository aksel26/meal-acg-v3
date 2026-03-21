"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@repo/ui/src/dialog";
import { Button } from "@repo/ui/src/button";
import { toast } from "@repo/ui/src/sonner";
import {
  useExpenseReport,
  useSaveExpenseReport,
  type ExpenseReportItem,
} from "@/hooks/use-expense-reports";

type Props = {
  open: boolean;
  onClose: () => void;
  year: number;
  month: number;
};

export function ExpenseReportDialog({ open, onClose, year, month }: Props) {
  const defaultTitle = `${year}년 ${month}월 면접교육 지출결의서`;

  const [title, setTitle] = useState(defaultTitle);
  const [items, setItems] = useState<ExpenseReportItem[]>([]);

  const { data: existing } = useExpenseReport(year, month);
  const save = useSaveExpenseReport();

  // Pre-populate when existing report loads
  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setItems(existing.items ?? []);
    } else {
      setTitle(defaultTitle);
      setItems([]);
    }
  }, [existing, defaultTitle]);

  const laborCost = existing?.total_labor_cost ?? 0;
  const extraCost = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const grandTotal = laborCost + extraCost;

  const handleAddItem = () => {
    setItems((prev) => [...prev, { name: "", amount: 0, note: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof ExpenseReportItem,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: field === "amount" ? Number(value) : value } : item
      )
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }
    try {
      await save.mutateAsync({ year, month, title, items, status: "draft" });
      toast.success("지출결의서가 저장되었습니다.");
      onClose();
    } catch {
      toast.error("저장에 실패했습니다.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>지출결의서</DialogTitle>
          <DialogDescription>
            {year}년 {month}월 면접교육 지출결의서를 작성합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* 제목 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 w-full rounded-lg border px-3 text-sm outline-none focus:border-slate-400"
            />
          </div>

          {/* 인건비 합계 (read-only) */}
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">인건비 합계</span>
              <span className="font-semibold text-slate-900">
                {laborCost.toLocaleString("ko-KR")}원
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              저장 시 해당 월의 인건비가 자동으로 계산됩니다.
            </p>
          </div>

          {/* 추가 비용 항목 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">추가 비용 항목</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus size={14} />
                항목 추가
              </button>
            </div>

            {items.length === 0 && (
              <p className="rounded-lg border border-dashed py-6 text-center text-sm text-slate-400">
                추가 비용 항목이 없습니다.
              </p>
            )}

            {items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="항목명"
                  value={item.name}
                  onChange={(e) => handleItemChange(index, "name", e.target.value)}
                  className="h-9 flex-1 rounded-lg border px-3 text-sm outline-none focus:border-slate-400"
                />
                <input
                  type="number"
                  placeholder="금액"
                  value={item.amount || ""}
                  onChange={(e) => handleItemChange(index, "amount", e.target.value)}
                  className="h-9 w-32 rounded-lg border px-3 text-right text-sm outline-none focus:border-slate-400"
                />
                <input
                  type="text"
                  placeholder="비고"
                  value={item.note ?? ""}
                  onChange={(e) => handleItemChange(index, "note", e.target.value)}
                  className="h-9 w-28 rounded-lg border px-3 text-sm outline-none focus:border-slate-400"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* 합계 */}
          <div className="rounded-lg border bg-white p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>인건비</span>
                <span>{laborCost.toLocaleString("ko-KR")}원</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>추가 비용</span>
                <span>{extraCost.toLocaleString("ko-KR")}원</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold text-slate-900">
                <span>합계</span>
                <span>{grandTotal.toLocaleString("ko-KR")}원</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
