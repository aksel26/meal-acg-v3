"use client";

import type { InterviewPersonnel } from "@/lib/interview-types";

type Props = {
  data: InterviewPersonnel[];
  isLoading: boolean;
  onEdit: (person: InterviewPersonnel) => void;
};

const ROLE_LABELS: Record<string, { label: string; className: string }> = {
  rp: { label: "RP", className: "bg-blue-50 text-blue-700" },
  ft: { label: "FT", className: "bg-emerald-50 text-emerald-700" },
  instructor: { label: "강사", className: "bg-purple-50 text-purple-700" },
};

const PAY_TYPE_LABELS: Record<string, string> = {
  hourly: "시급",
  daily: "일급",
  contract: "계약금",
};

export function PersonnelTable({ data, isLoading, onEdit }: Props) {
  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-slate-400">
        불러오는 중...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-slate-400">
        등록된 인력이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-3 font-medium">이름</th>
            <th className="px-4 py-3 font-medium">역할</th>
            <th className="px-4 py-3 font-medium">연락처</th>
            <th className="px-4 py-3 font-medium">급여유형</th>
            <th className="px-4 py-3 font-medium text-right">단가/계약금</th>
            <th className="px-4 py-3 font-medium">최근 참여 공고</th>
            <th className="px-4 py-3 font-medium text-center">참여 수</th>
            <th className="px-4 py-3 font-medium">상태</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((person) => {
            const roleInfo = ROLE_LABELS[person.role];
            const amount = person.default_pay_rate ?? person.contract_amount;

            return (
              <tr
                key={person.id}
                className="border-b transition-colors duration-150 hover:bg-slate-50"
              >
                <td className="px-4 py-3 font-medium text-slate-900">{person.name}</td>
                <td className="px-4 py-3">
                  {roleInfo && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleInfo.className}`}
                    >
                      {roleInfo.label}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{person.phone ?? "-"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {PAY_TYPE_LABELS[person.pay_type] ?? "-"}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {amount != null ? `${amount.toLocaleString("ko-KR")}원` : "-"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {person.assignments && person.assignments.length > 0
                    ? person.assignments[0]!.job_posting_title
                    : "-"}
                </td>
                <td className="px-4 py-3 text-center">
                  {person.assignments && person.assignments.length > 0 ? (
                    <span className="group relative cursor-default text-slate-600">
                      {person.assignments.length}
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-lg border bg-white px-3 py-2 opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                        <p className="mb-1 whitespace-nowrap text-xs font-medium text-slate-500">참여 공고 목록</p>
                        <ul className="space-y-0.5">
                          {person.assignments.map((a) => (
                            <li key={a.job_posting_id} className="whitespace-nowrap text-xs text-slate-700">
                              {a.job_posting_title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </span>
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {person.status === "active" ? (
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                      활동
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      비활동
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onEdit(person)}
                    className="rounded-md px-3 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  >
                    수정
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
