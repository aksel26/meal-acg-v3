"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, FileText, Pencil, UserPlus, Users } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import { useInterviewJobPosting } from "@/hooks/use-interview-job-postings";
import { useDeleteInterviewJobPosting } from "@/hooks/use-interview-job-postings";
import { useInterviewJobAssignments } from "@/hooks/use-interview-job-assignments";
import { InterviewJobAssignmentTable } from "@/components/interview/InterviewJobAssignmentTable";
import { InterviewJobPostingModal } from "@/components/interview/InterviewJobPostingModal";
import { AssignPersonnelDialog } from "@/components/interview/AssignPersonnelDialog";
import { RegisterAndAssignDialog } from "@/components/interview/RegisterAndAssignDialog";
import { ExpenseReportDialog } from "@/components/interview/ExpenseReportDialog";
import { toast } from "@repo/ui/src/sonner";

dayjs.locale("ko");

const statusLabel: Record<string, { text: string; className: string }> = {
  draft: { text: "임시", className: "bg-slate-100 text-slate-600" },
  open: { text: "모집중", className: "bg-green-100 text-green-700" },
  closed: { text: "마감", className: "bg-red-100 text-red-700" },
  completed: { text: "완료", className: "bg-purple-100 text-purple-700" },
};

const payTypeLabel: Record<string, string> = { hourly: "시급", daily: "일급" };

const ROLE_TABS = [
  { value: "", label: "전체" },
  { value: "ft", label: "FT" },
  { value: "rp", label: "RP" },
  { value: "instructor", label: "강사" },
  { value: "other", label: "기타" },
] as const;

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="w-16 shrink-0 text-xs text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-slate-700">{value || "-"}</dd>
    </div>
  );
}

export default function InterviewJobPostingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [expenseReportOpen, setExpenseReportOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState("");

  const { data: job, isLoading } = useInterviewJobPosting(id);
  const { data: assignments = [], isLoading: assignmentsLoading } =
    useInterviewJobAssignments(id);
  const deleteMutation = useDeleteInterviewJobPosting();

  const handleDelete = async () => {
    if (!confirm("이 공고를 삭제하시겠습니까?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("공고가 삭제되었습니다.");
      router.push("/interview/job-postings");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "삭제에 실패했습니다.",
      );
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(
        `/api/interview/job-postings/${id}/export`,
      );
      if (!res.ok) throw new Error("다운로드 실패");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `면접교육_공고_${job?.title || id}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("다운로드에 실패했습니다.");
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-sm text-slate-400">로딩 중...</div>
    );
  }

  if (!job) {
    return (
      <div className="py-20 text-center text-sm text-slate-400">
        공고를 찾을 수 없습니다.
      </div>
    );
  }

  const status = statusLabel[job.status] || {
    text: job.status,
    className: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/interview/job-postings")}
            className="rounded-lg p-1.5 hover:bg-slate-100"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h3 className="text-lg font-semibold">{job.title}</h3>
            <p className="text-sm text-slate-400">
              등록일 {dayjs(job.created_at).format("YYYY.MM.DD")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}
          >
            {status.text}
          </span>
          <button
            onClick={() => setExpenseReportOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <FileText size={16} />
            지출결의서
          </button>
          <button
            onClick={() => setEditOpen(true)}
            className="rounded-lg border p-2 hover:bg-slate-50"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="rounded-lg border px-3 py-2 text-sm text-red-500 hover:bg-red-50 disabled:opacity-40"
          >
            삭제
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-xl bg-white p-3">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
          <InfoItem
            label="기간"
            value={
              job.start_date === job.end_date
                ? dayjs(job.start_date).format("MM.DD")
                : `${dayjs(job.start_date).format("MM.DD")} ~ ${dayjs(job.end_date).format("MM.DD")}`
            }
          />
          <InfoItem
            label="근무시간"
            value={
              job.work_start && job.work_end
                ? `${job.work_start.slice(0, 5)} ~ ${job.work_end.slice(0, 5)}`
                : null
            }
          />
          <InfoItem label="플랫폼" value={job.platform} />
          <InfoItem
            label="급여"
            value={
              job.pay_rate
                ? `${job.pay_rate.toLocaleString()}원 (${payTypeLabel[job.pay_type] || job.pay_type})`
                : null
            }
          />
          <InfoItem label="총 인원" value={`${job.total_headcount}명`} />
          <InfoItem
            label="구성"
            value={
              [
                job.ft_count > 0 ? `FT ${job.ft_count}` : null,
                job.rp_count > 0 ? `RP ${job.rp_count}` : null,
                job.instructor_count > 0 ? `강사 ${job.instructor_count}` : null,
                job.other_count > 0 ? `기타 ${job.other_count}` : null,
              ]
                .filter(Boolean)
                .join(", ") || "-"
            }
          />
          <InfoItem label="배정" value={`${assignments.length}명`} />
        </dl>
      </div>

      {/* Workers Section */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h4 className="text-base font-semibold">참가 인원 명단</h4>
            <div className="flex items-center gap-1 rounded-lg border bg-white p-0.5">
              {ROLE_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setRoleFilter(tab.value)}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                    roleFilter === tab.value
                      ? "bg-slate-900 font-medium text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={assignments.length === 0}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
            >
              <Download size={15} />
              명단 다운로드
            </button>
            <button
              onClick={() => setAssignOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
            >
              <Users size={15} />
              기존 인력 배정
            </button>
            <button
              onClick={() => setRegisterOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              <UserPlus size={15} />
              신규 등록
            </button>
          </div>
        </div>

        <InterviewJobAssignmentTable
          assignments={assignments}
          isLoading={assignmentsLoading}
          jobPostingId={id}
          roleFilter={roleFilter}
        />
      </div>

      {/* Dialogs */}
      <InterviewJobPostingModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editingId={id}
      />

      <AssignPersonnelDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        jobPostingId={id}
        jobPosting={job}
        existingAssignments={assignments}
      />

      <RegisterAndAssignDialog
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        jobPostingId={id}
        jobPosting={job}
      />

      <ExpenseReportDialog
        open={expenseReportOpen}
        onClose={() => setExpenseReportOpen(false)}
        jobPostingId={id}
        jobTitle={job.title}
      />
    </div>
  );
}
