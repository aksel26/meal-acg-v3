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
          <tr className="border-b bg-slate-200 text-left text-slate-600 [&>th:first-child]:rounded-tl-md [&>th:last-child]:rounded-tr-md">
            <th className="px-4 py-3 font-medium">이름</th>
            <th className="px-4 py-3 font-medium">역할</th>
            <th className="px-4 py-3 font-medium">연락처</th>
            <th className="px-4 py-3 font-medium">급여유형</th>
            <th className="px-4 py-3 font-medium text-right">단가/계약금</th>
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
