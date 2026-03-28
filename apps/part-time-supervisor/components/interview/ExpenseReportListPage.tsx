"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, FileText, Download } from "lucide-react";
import { toast } from "@repo/ui/src/sonner";
import { useExpenseReports } from "@/hooks/use-expense-reports";
import { useCreateExpenseReport, useDeleteExpenseReportById } from "@/hooks/use-expense-report-mutations";
import { formatCurrency } from "@/lib/cost-utils";

export function ExpenseReportListPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleMonthChange = (direction: -1 | 1) => {
    let newMonth = month + direction;
    let newYear = year;
    if (newMonth < 1) { newMonth = 12; newYear--; }
    if (newMonth > 12) { newMonth = 1; newYear++; }
    setYear(newYear);
    setMonth(newMonth);
  };

  const { data: reports = [], isLoading } = useExpenseReports(year, month);
  const deleteMutation = useDeleteExpenseReportById();

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("지출결의서가 삭제되었습니다.");
      setDeleteTargetId(null);
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      {/* 필터 행 */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 items-center gap-2 rounded-lg border bg-white px-3">
          <button
            onClick={() => handleMonthChange(-1)}
            className="text-slate-400 hover:text-slate-600"
          >
            &larr;
          </button>
          <span className="min-w-[100px] text-center font-medium text-slate-900">
            {year}년 {month}월
          </span>
          <button
            onClick={() => handleMonthChange(1)}
            className="text-slate-400 hover:text-slate-600"
          >
            &rarr;
          </button>
        </div>

        <button
          onClick={() => setShowCreateDialog(true)}
          className="ml-auto flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700"
        >
          <Plus size={16} />
          새 지출결의서
        </button>
      </div>

      {/* 테이블 */}
      <div className="rounded-lg border bg-white overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-slate-400">불러오는 중...</div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            {year}년 {month}월 지출결의서가 없습니다.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">제목</th>
                <th className="px-4 py-3 font-medium">기간</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium text-right">총액</th>
                <th className="px-4 py-3 font-medium text-center">작업</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/interview/expense-reports/${report.id}`}
                      className="font-medium text-slate-900 hover:text-blue-600 hover:underline"
                    >
                      {report.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {report.year && report.month
                      ? `${report.year}년 ${report.month}월`
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {report.status === "finalized" ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        확정
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                        초안
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">
                    {formatCurrency(report.grand_total)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/interview/expense-reports/${report.id}`}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        title="상세 보기"
                      >
                        <FileText size={16} />
                      </Link>
                      <a
                        href={`/api/interview/expense-reports/export?job_posting_id=${report.job_posting_id ?? ""}&id=${report.id}`}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        title="엑셀 다운로드"
                        onClick={(e) => {
                          if (!report.job_posting_id) {
                            e.preventDefault();
                            toast.error("공고 연결 없는 지출결의서는 직접 상세 페이지에서 내보내기 하세요.");
                          }
                        }}
                      >
                        <Download size={16} />
                      </a>
                      <button
                        onClick={() => setDeleteTargetId(report.id)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        title="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 새 지출결의서 다이얼로그 */}
      {showCreateDialog && (
        <CreateExpenseReportDialog
          year={year}
          month={month}
          onClose={() => setShowCreateDialog(false)}
        />
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">지출결의서 삭제</h3>
            <p className="mt-2 text-sm text-slate-500">
              이 지출결의서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteTargetId)}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateExpenseReportDialog({
  year,
  month,
  onClose,
}: {
  year: number;
  month: number;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(`${year}년 ${month}월 지출결의서`);
  const create = useCreateExpenseReport();

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }
    try {
      await create.mutateAsync({ title, year, month });
      toast.success("지출결의서가 생성되었습니다.");
      onClose();
    } catch {
      toast.error("생성에 실패했습니다.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-slate-900">새 지출결의서</h3>
        <p className="mt-1 text-sm text-slate-500">{year}년 {month}월</p>
        <div className="mt-4">
          <label className="text-sm font-medium text-slate-700">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            autoFocus
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            취소
          </button>
          <button
            onClick={handleCreate}
            disabled={create.isPending}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {create.isPending ? "생성 중..." : "생성"}
          </button>
        </div>
      </div>
    </div>
  );
}
