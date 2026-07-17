"use client";

import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import type { InterviewJobPostingWithCount } from "@/lib/interview-types";

const statusLabel: Record<string, { text: string; className: string }> = {
  draft: { text: "임시", className: "bg-slate-100 text-slate-600" },
  open: { text: "모집중", className: "bg-green-50 text-green-700" },
  closed: { text: "마감", className: "bg-red-50 text-red-700" },
  completed: { text: "완료", className: "bg-purple-50 text-purple-700" },
};

function CompositionBadges({
  ft,
  rp,
  instructor,
  other,
}: {
  ft: number;
  rp: number;
  instructor: number;
  other: number;
}) {
  const items = [
    { label: "FT", count: ft, className: "bg-emerald-50 text-emerald-700" },
    { label: "RP", count: rp, className: "bg-blue-50 text-blue-700" },
    { label: "강사", count: instructor, className: "bg-purple-50 text-purple-700" },
    { label: "기타", count: other, className: "bg-slate-100 text-slate-600" },
  ].filter((item) => item.count > 0);

  if (items.length === 0) return <span className="text-slate-400">-</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item.label}
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${item.className}`}
        >
          {item.label} {item.count}
        </span>
      ))}
    </div>
  );
}

export function InterviewJobPostingTable({
  data,
  isLoading,
  onEdit,
}: {
  data: InterviewJobPostingWithCount[];
  isLoading: boolean;
  onEdit: (id: string) => void;
}) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="py-20 text-center text-sm text-slate-400">로딩 중...</div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-20 text-center text-sm text-slate-400">
        등록된 공고가 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-medium text-slate-400">
            <th className="px-3 py-2 font-medium">공고명</th>
            <th className="px-3 py-2 font-medium">기간</th>
            <th className="px-3 py-2 font-medium">플랫폼</th>
            <th className="px-3 py-2 font-medium">고객사</th>
            <th className="px-3 py-2 font-medium">구성</th>
            <th className="px-3 py-2 font-medium">인원</th>
            <th className="px-3 py-2 font-medium">상태</th>
            <th className="px-3 py-2 font-medium">등록일</th>
            <th className="w-16 px-3 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((posting) => {
            const status = statusLabel[posting.status] || {
              text: posting.status,
              className: "bg-slate-100 text-slate-600",
            };
            return (
              <tr
                key={posting.id}
                onClick={() =>
                  router.push(`/interview/job-postings/${posting.id}`)
                }
                className="cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors hover:bg-slate-50"
              >
                <td className="px-3 py-3 font-medium text-slate-800">
                  {posting.title}
                </td>
                <td className="px-3 py-3 tabular-nums text-slate-600">
                  {dayjs(posting.start_date).format("MM.DD")}
                  {posting.start_date !== posting.end_date &&
                    ` ~ ${dayjs(posting.end_date).format("MM.DD")}`}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {posting.platform || "-"}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {posting.client?.name || "-"}
                </td>
                <td className="px-3 py-3">
                  <CompositionBadges
                    ft={posting.ft_count}
                    rp={posting.rp_count}
                    instructor={posting.instructor_count}
                    other={posting.other_count}
                  />
                </td>
                <td className="px-3 py-3 tabular-nums text-slate-600">
                  <span className="font-medium text-slate-800">
                    {posting.assignment_count}
                  </span>
                  <span className="text-slate-400">
                    /{posting.total_headcount}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                  >
                    {status.text}
                  </span>
                </td>
                <td className="px-3 py-3 tabular-nums text-slate-400">
                  {dayjs(posting.created_at).format("MM.DD")}
                </td>
                <td className="px-3 py-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(posting.id);
                    }}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      <path d="m15 5 4 4" />
                    </svg>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
