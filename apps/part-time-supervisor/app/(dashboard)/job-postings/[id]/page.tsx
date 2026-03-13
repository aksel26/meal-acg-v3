"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useJobPosting } from "@/hooks/use-job-postings";
import { useAssignmentsByJobPosting } from "@/hooks/use-assignments";
import { ArrowLeft, MessageSquare, Pencil, QrCode, UserPlus } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import AssignedWorkersTable from "@/components/job-postings/AssignedWorkersTable";
import RegisterWorkerDialog from "@/components/job-postings/RegisterWorkerDialog";
import SmsDialog from "@/components/job-postings/SmsDialog";
import ContractLinkModal from "@/components/job-postings/ContractLinkModal";

dayjs.locale("ko");

const statusLabel: Record<string, { text: string; className: string }> = {
  draft: { text: "임시", className: "bg-slate-100 text-slate-600" },
  open: { text: "모집중", className: "bg-green-100 text-green-700" },
  closed: { text: "마감", className: "bg-red-100 text-red-700" },
  in_progress: { text: "진행중", className: "bg-blue-100 text-blue-700" },
  completed: { text: "완료", className: "bg-purple-100 text-purple-700" },
};

const workTypeLabel: Record<string, string> = { online: "온라인", offline: "오프라인" };
const shiftTypeLabel: Record<string, string> = { day: "주간", night: "야간" };
const payTypeLabel: Record<string, string> = { hourly: "시급", daily: "일급" };

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-700">{value || "-"}</dd>
    </div>
  );
}

export default function JobPostingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [contractLinkOpen, setContractLinkOpen] = useState(false);
  const { data: job, isLoading } = useJobPosting(id);
  const { data: assignments, isLoading: assignmentsLoading } = useAssignmentsByJobPosting(id);

  if (isLoading) {
    return <div className="py-20 text-center text-sm text-slate-400">로딩 중...</div>;
  }

  if (!job) {
    return <div className="py-20 text-center text-sm text-slate-400">공고를 찾을 수 없습니다.</div>;
  }

  const status = statusLabel[job.status] || { text: job.status, className: "bg-slate-100 text-slate-600" };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/job-postings")}
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
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>
          {status.text}
        </span>
      </div>

      {/* Summary */}
      <div className="rounded-xl border bg-slate-50/50 p-5">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <InfoItem label="형태" value={workTypeLabel[job.work_type]} />
          <InfoItem label="시간대" value={shiftTypeLabel[job.shift_type]} />
          <InfoItem label="장소" value={job.location} />
          <InfoItem label="플랫폼" value={job.platform} />
          <InfoItem label="일자" value={`${job.start_date} ~ ${job.end_date}`} />
          <InfoItem
            label="근무시간"
            value={job.work_start && job.work_end ? `${job.work_start.slice(0, 5)} ~ ${job.work_end.slice(0, 5)}` : null}
          />
          <InfoItem
            label="점심시간"
            value={job.lunch_start && job.lunch_end ? `${job.lunch_start.slice(0, 5)} ~ ${job.lunch_end.slice(0, 5)}` : null}
          />
          <InfoItem label="급여" value={`${job.pay_rate.toLocaleString()}원 (${payTypeLabel[job.pay_type]})`} />
          <InfoItem label="모집인원" value={`${job.headcount}명`} />
        </dl>
        {job.description && (
          <div className="mt-4 border-t pt-4">
            <dt className="text-xs font-medium text-slate-400">내용</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{job.description}</dd>
          </div>
        )}
      </div>

      {/* Workers Table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-base font-semibold">지원자 명단</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setContractLinkOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
            >
              <QrCode size={15} />
              계약 링크
            </button>
            <button
              onClick={() => setSmsOpen(true)}
              disabled={!assignments || assignments.length === 0}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <MessageSquare size={15} />
              SMS 전송
            </button>
            <button
              onClick={() => setRegisterOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              <UserPlus size={15} />
              지원자 등록
            </button>
          </div>
        </div>
        <AssignedWorkersTable
          jobPostingId={id}
          job={job}
          assignments={assignments || []}
          isLoading={assignmentsLoading}
        />
      </div>

      <RegisterWorkerDialog
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        jobPostingId={id}
      />

      {contractLinkOpen && (
        <ContractLinkModal
          jobPostingId={id}
          onClose={() => setContractLinkOpen(false)}
        />
      )}

      {smsOpen && (
        <SmsDialog
          assignments={assignments || []}
          job={job}
          onClose={() => setSmsOpen(false)}
        />
      )}
    </div>
  );
}
