"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useBulkDeleteJobPostings } from "@/hooks/use-bulk-delete-job-postings";
import { toast } from "@repo/ui/src/sonner";
import { Checkbox } from "@repo/ui/src/checkbox";
import { Pencil, Trash2 } from "lucide-react";
import type { JobPosting } from "@/lib/supabase/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/src/alert-dialog";
import dayjs from "dayjs";
import "dayjs/locale/ko";

dayjs.locale("ko");

import type { Client } from "@/lib/supabase/types";

type JobPostingRow = JobPosting & {
  assignments: { count: number }[];
  client?: Pick<Client, "id" | "name"> | null;
};

const statusLabel: Record<string, { text: string; className: string }> = {
  draft: { text: "임시", className: "bg-slate-100 text-slate-600" },
  open: { text: "모집중", className: "bg-green-50 text-green-700" },
  closed: { text: "마감", className: "bg-red-50 text-red-700" },
  in_progress: { text: "진행중", className: "bg-blue-50 text-blue-700" },
  completed: { text: "완료", className: "bg-purple-50 text-purple-700" },
};

const workTypeLabel: Record<string, string> = {
  online: "온라인",
  offline: "오프라인",
};

function formatDate(dateStr: string) {
  return dayjs(dateStr).format("YYYY.MM.DD (dd)");
}

function formatTime(start: string | null, end: string | null) {
  if (!start || !end) return "-";
  return `${start.slice(0, 5)} ~ ${end.slice(0, 5)}`;
}

export default function JobPostingTable({
  data,
  isLoading,
  onEdit,
}: {
  data: JobPostingRow[];
  isLoading: boolean;
  onEdit: (id: string) => void;
}) {
  const router = useRouter();
  const bulkDeleteMutation = useBulkDeleteJobPostings();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const allSelected = data.length > 0 && selectedIds.size === data.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((j) => j.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteMutation.mutateAsync(Array.from(selectedIds));
      toast.success(`${selectedIds.size}개 공고가 삭제되었습니다.`);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    }
    setBulkDeleteOpen(false);
  };

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-slate-400">로딩 중...</div>;
  }

  if (!data.length) {
    return <div className="py-10 text-center text-sm text-slate-400">등록된 공고가 없습니다.</div>;
  }

  return (
    <div className="space-y-3">
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-white px-4 py-2">
          <span className="text-sm text-slate-600">{selectedIds.size}개 선택</span>
          <button
            onClick={() => setBulkDeleteOpen(true)}
            disabled={bulkDeleteMutation.isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
          >
            <Trash2 size={14} />
            {bulkDeleteMutation.isPending ? "삭제 중..." : "선택 삭제"}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-medium text-slate-400">
              <th className="px-3 py-2">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </th>
              <th className="px-3 py-2 font-medium">공고명</th>
              <th className="px-3 py-2 font-medium">형태</th>
              <th className="px-3 py-2 font-medium">일자</th>
              <th className="px-3 py-2 font-medium">장소</th>
              <th className="px-3 py-2 font-medium">시간</th>
              <th className="px-3 py-2 font-medium text-right">비용</th>
              <th className="px-3 py-2 font-medium text-center">모집인원</th>
              <th className="px-3 py-2 font-medium">플랫폼</th>
              <th className="px-3 py-2 font-medium">고객사</th>
              <th className="px-3 py-2 font-medium">담당자</th>
              <th className="px-3 py-2 font-medium text-center">상태</th>
              <th className="px-3 py-2 font-medium">등록일</th>
              <th className="px-3 py-2 font-medium text-center">관리</th>
            </tr>
          </thead>
          <tbody>
            {data.map((job) => {
              const assignedCount = job.assignments?.[0]?.count ?? 0;
              const status = statusLabel[job.status] || { text: job.status, className: "bg-slate-100 text-slate-600" };
              return (
                <tr
                  key={job.id}
                  className="cursor-pointer border-b border-slate-100 last:border-b-0 bg-white transition-colors hover:bg-slate-50"
                  onClick={() => router.push(`/supervisor/job-postings/${job.id}`)}
                >
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(job.id)}
                      onCheckedChange={() => toggleOne(job.id)}
                    />
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-800">
                    {job.title || "-"}
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {workTypeLabel[job.work_type] || "오프라인"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-600">
                    {formatDate(job.start_date)}
                  </td>
                  <td className="px-3 py-3 text-slate-600">{job.location || "-"}</td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-600">
                    {formatTime(job.work_start, job.work_end)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-600">
                    {job.pay_rate.toLocaleString()}원
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums">
                    <span className={assignedCount >= job.headcount ? "font-semibold text-green-600" : ""}>
                      {assignedCount}
                    </span>
                    <span className="text-slate-400"> / {job.headcount}</span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{job.platform || "-"}</td>
                  <td className="px-3 py-3 text-slate-600">{job.client?.name || "-"}</td>
                  <td className="px-3 py-3 text-slate-600">{job.supervisor_name || "-"}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                      {status.text}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-400">
                    {dayjs(job.created_at).format("YYYY.MM.DD")}
                  </td>
                  <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onEdit(job.id)}
                      className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <Pencil size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>일괄 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 {selectedIds.size}개 공고를 삭제하시겠습니까? 관련 배정도 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
