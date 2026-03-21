"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Trash2, Download } from "lucide-react";
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
  jobPostingId: string;
  jobTitle: string;
};

export function ExpenseReportDialog({ open, onClose, jobPostingId, jobTitle }: Props) {
  const defaultTitle = `${jobTitle} 지출결의서`;

  const [title, setTitle] = useState(defaultTitle);
  const [items, setItems] = useState<(ExpenseReportItem & { _id: string })[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const { data: existing } = useExpenseReport(jobPostingId);
  const save = useSaveExpenseReport();

  // Pre-populate when existing report loads
  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setItems((existing.items ?? []).map((item) => ({ ...item, _id: crypto.randomUUID() })));
    } else {
      setTitle(defaultTitle);
      setItems([]);
    }
  }, [existing, defaultTitle]);

  const extraCost = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  const handleAddItem = () => {
    setItems((prev) => [...prev, { name: "", amount: 0, note: "", _id: crypto.randomUUID() }]);
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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/interview/expense-reports/export?job_posting_id=${jobPostingId}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("엑셀 다운로드에 실패했습니다.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }
    try {
      const cleanItems = items.map(({ _id, ...rest }) => rest);
      await save.mutateAsync({ job_posting_id: jobPostingId, title, items: cleanItems, status: "draft" });
      toast.success("지출결의서가 저장되었습니다.");
      onClose();
    } catch {
      toast.error("저장에 실패했습니다.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl sm:max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>지출결의서</DialogTitle>
          <DialogDescription>
            {jobTitle} 지출결의서를 작성합니다.
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
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* 추가 비용 항목 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">추가 비용 항목</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-blue-600 transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 active:scale-95"
              >
                <Plus size={14} />
                항목 추가
              </button>
            </div>

            <AnimatePresence initial={false} mode="popLayout">
              {items.length === 0 && (
                <motion.button
                  key="empty-state"
                  type="button"
                  onClick={handleAddItem}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full rounded-lg border border-dashed border-slate-300 py-6 text-center text-sm text-slate-400 transition-colors duration-200 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-500"
                >
                  클릭하여 추가 비용 항목을 추가하세요
                </motion.button>
              )}

              {items.map((item, index) => (
                <motion.div
                  key={item._id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="group flex items-center gap-2 rounded-lg p-1.5 transition-colors duration-150 hover:bg-slate-50">
                    <input
                      type="text"
                      placeholder="항목명"
                      value={item.name}
                      onChange={(e) => handleItemChange(index, "name", e.target.value)}
                      className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <input
                      type="number"
                      placeholder="금액"
                      value={item.amount || ""}
                      onChange={(e) => handleItemChange(index, "amount", e.target.value)}
                      className="h-9 w-36 rounded-lg border border-slate-200 px-3 text-right text-sm tabular-nums outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <input
                      type="text"
                      placeholder="비고"
                      value={item.note ?? ""}
                      onChange={(e) => handleItemChange(index, "note", e.target.value)}
                      className="h-9 w-36 rounded-lg border border-slate-200 px-3 text-sm outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="rounded-md p-1.5 text-slate-300 opacity-0 transition-all duration-200 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* 합계 */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex justify-between font-semibold text-slate-900">
              <span>추가 비용 합계</span>
              <span className="tabular-nums text-base">{extraCost.toLocaleString("ko-KR")}원</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {existing ? (
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isExporting}
              className="mr-auto flex items-center gap-1.5 transition-all duration-200 active:scale-95"
            >
              <Download size={15} />
              {isExporting ? "내보내는 중..." : "엑셀 다운로드"}
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="transition-all duration-200 active:scale-95">
              취소
            </Button>
            <Button onClick={handleSave} disabled={save.isPending} className="transition-all duration-200 active:scale-95">
              {save.isPending ? "저장 중..." : "저장"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
