"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Download, Lock, Unlock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "@repo/ui/src/sonner";
import { Button } from "@repo/ui/src/button";
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
import { useExpenseReportDetail } from "@/hooks/use-expense-reports";
import { useUpdateExpenseReport, useDeleteExpenseReportById } from "@/hooks/use-expense-report-mutations";
import { formatCurrency } from "@/lib/cost-utils";
import type { ExpenseReportItem } from "@/hooks/use-expense-reports";

type ItemWithId = ExpenseReportItem & { _id: string };

export function ExpenseReportDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { data: report, isLoading } = useExpenseReportDetail(id);
  const update = useUpdateExpenseReport();
  const deleteMutation = useDeleteExpenseReportById();

  const [title, setTitle] = useState("");
  const [items, setItems] = useState<ItemWithId[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (report) {
      setTitle(report.title);
      setItems((report.items ?? []).map((item) => ({ ...item, _id: crypto.randomUUID() })));
      setIsDirty(false);
    }
  }, [report]);

  const isDraft = report?.status === "draft";

  const extraCost = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const laborCost = report?.total_labor_cost ?? 0;
  const grandTotal = laborCost + extraCost;

  const handleAddItem = () => {
    setItems((prev) => [...prev, { name: "", amount: 0, note: "", _id: crypto.randomUUID() }]);
    setIsDirty(true);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const handleItemChange = (index: number, field: keyof ExpenseReportItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: field === "amount" ? Number(value) : value } : item
      )
    );
    setIsDirty(true);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }
    try {
      const cleanItems = items.map(({ _id, ...rest }) => rest);
      await update.mutateAsync({ id, title, items: cleanItems });
      toast.success("저장되었습니다.");
      setIsDirty(false);
    } catch {
      toast.error("저장에 실패했습니다.");
    }
  };

  const handleStatusChange = async (newStatus: "draft" | "finalized") => {
    try {
      // 저장 후 상태 변경
      if (isDirty) {
        const cleanItems = items.map(({ _id, ...rest }) => rest);
        await update.mutateAsync({ id, title, items: cleanItems });
        setIsDirty(false);
      }
      await update.mutateAsync({ id, status: newStatus });
      toast.success(newStatus === "finalized" ? "확정되었습니다." : "초안으로 되돌렸습니다.");
    } catch {
      toast.error("상태 변경에 실패했습니다.");
    }
  };

  const handleExport = async () => {
    if (!report?.job_posting_id) {
      toast.error("공고 연결이 없는 지출결의서는 내보내기를 지원하지 않습니다.");
      return;
    }
    setIsExporting(true);
    try {
      const res = await fetch(`/api/interview/expense-reports/export?job_posting_id=${report.job_posting_id}`);
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

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("지출결의서가 삭제되었습니다.");
      router.push("/interview/expense-reports");
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-slate-400">
        불러오는 중...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-sm text-slate-400">
        <p>지출결의서를 찾을 수 없습니다.</p>
        <button
          onClick={() => router.push("/interview/expense-reports")}
          className="text-blue-600 hover:underline"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* 헤더 */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.push("/interview/expense-reports")}
          className="mt-0.5 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          {isDraft ? (
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full rounded-lg border border-transparent px-2 py-1 text-xl font-semibold text-slate-900 outline-none hover:border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          ) : (
            <h1 className="px-2 py-1 text-xl font-semibold text-slate-900">{title}</h1>
          )}
          <div className="mt-1 flex items-center gap-2 px-2">
            {report.year && report.month && (
              <span className="text-sm text-slate-500">{report.year}년 {report.month}월</span>
            )}
            {report.status === "finalized" ? (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                확정
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                초안
              </span>
            )}
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex items-center gap-2">
          {report.job_posting_id && (
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Download size={15} />
              {isExporting ? "내보내는 중..." : "엑셀"}
            </button>
          )}
          {isDraft ? (
            <button
              onClick={() => handleStatusChange("finalized")}
              disabled={update.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Lock size={15} />
              확정
            </button>
          ) : (
            <button
              onClick={() => handleStatusChange("draft")}
              disabled={update.isPending}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Unlock size={15} />
              초안으로 되돌리기
            </button>
          )}
        </div>
      </div>

      {/* 부가비용 섹션 */}
      <div className="rounded-lg border bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">부가비용</h2>
          {isDraft && (
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            >
              <Plus size={14} />
              항목 추가
            </button>
          )}
        </div>

        <AnimatePresence initial={false} mode="popLayout">
          {items.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-lg border border-dashed border-slate-300 py-8 text-center text-sm text-slate-400"
            >
              {isDraft ? (
                <button type="button" onClick={handleAddItem} className="hover:text-blue-500">
                  클릭하여 부가비용 항목을 추가하세요
                </button>
              ) : (
                "부가비용 항목 없음"
              )}
            </motion.div>
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
              <div className="group flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-50">
                {isDraft ? (
                  <>
                    <input
                      type="text"
                      placeholder="항목명"
                      value={item.name}
                      onChange={(e) => handleItemChange(index, "name", e.target.value)}
                      className="h-9 flex-1 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <input
                      type="number"
                      placeholder="금액"
                      value={item.amount || ""}
                      onChange={(e) => handleItemChange(index, "amount", e.target.value)}
                      className="h-9 w-32 rounded-lg border border-slate-200 px-3 text-right text-sm tabular-nums outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <input
                      type="text"
                      placeholder="비고"
                      value={item.note ?? ""}
                      onChange={(e) => handleItemChange(index, "note", e.target.value)}
                      className="h-9 w-28 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="rounded-md p-1.5 text-slate-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <div className="flex w-full items-center justify-between px-2 py-1.5">
                    <span className="text-sm text-slate-700">{item.name}</span>
                    {item.note && <span className="text-xs text-slate-400">{item.note}</span>}
                    <span className="tabular-nums text-sm font-medium text-slate-900">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 합계 섹션 */}
      <div className="rounded-lg border bg-white p-5 space-y-2">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>인건비</span>
          <span className="tabular-nums">{formatCurrency(laborCost)}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>부가비용</span>
          <span className="tabular-nums">{formatCurrency(extraCost)}</span>
        </div>
        <div className="border-t pt-2 flex items-center justify-between font-semibold text-slate-900">
          <span>합계</span>
          <span className="tabular-nums text-lg">{formatCurrency(grandTotal)}</span>
        </div>
      </div>

      {/* 저장 / 삭제 */}
      {isDraft && (
        <div className="flex items-center justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                삭제
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="!max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle>지출결의서 삭제</AlertDialogTitle>
                <AlertDialogDescription>
                  이 지출결의서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteMutation.isPending ? "삭제 중..." : "삭제"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            onClick={handleSave}
            disabled={!isDirty || update.isPending}
          >
            {update.isPending ? "저장 중..." : "저장"}
          </Button>
        </div>
      )}
    </div>
  );
}
