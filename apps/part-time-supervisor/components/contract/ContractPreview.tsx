"use client";

import type { JobPosting } from "@/lib/supabase/types";

const payTypeLabel: Record<string, string> = { hourly: "시급", daily: "일급" };

export default function ContractPreview({
  job,
  workerName,
}: {
  job: JobPosting;
  workerName: string;
}) {
  const workPeriod = `${job.start_date} ~ ${job.end_date}`;
  const workTime =
    job.work_start && job.work_end
      ? `${job.work_start.slice(0, 5)} ~ ${job.work_end.slice(0, 5)}`
      : "-";
  const lunchTime =
    job.lunch_start && job.lunch_end
      ? `${job.lunch_start.slice(0, 5)} ~ ${job.lunch_end.slice(0, 5)}`
      : null;

  return (
    <div className="rounded-xl border bg-white p-5 text-[13px] leading-[1.9] text-stone-700">
      <h2 className="mb-5 text-center text-[17px] font-bold tracking-tight text-stone-900">
        표준근로계약서
      </h2>
      <p className="mb-1 text-center text-[11px] text-stone-400">(기간제 근무자용)</p>

      <div className="mt-4">
        <p>
          <span className="font-semibold text-stone-800">(이하 &quot;사업주&quot;라 함)</span>과(와){" "}
          근로자{" "}
          <span className="font-semibold text-stone-900">{workerName}</span>
          (이하 &quot;근로자&quot;라 함)은 다음과 같이 근로계약을 체결한다.
        </p>
      </div>

      <div className="mt-5 space-y-3 border-t border-stone-200 pt-4">
        <div className="flex">
          <span className="w-20 shrink-0 font-semibold text-stone-800">1. 근로기간</span>
          <span>{workPeriod}</span>
        </div>
        <div className="flex">
          <span className="w-20 shrink-0 font-semibold text-stone-800">2. 근무장소</span>
          <span>{job.location || "-"}</span>
        </div>
        <div className="flex">
          <span className="w-20 shrink-0 font-semibold text-stone-800">3. 업무내용</span>
          <span>{job.title}</span>
        </div>
        <div className="flex">
          <span className="w-20 shrink-0 font-semibold text-stone-800">4. 근무시간</span>
          <span>
            {workTime}
            {lunchTime && <span className="ml-1 text-stone-400">(점심 {lunchTime})</span>}
          </span>
        </div>
        <div className="flex">
          <span className="w-20 shrink-0 font-semibold text-stone-800">5. 급여</span>
          <span>{payTypeLabel[job.pay_type]} {job.pay_rate.toLocaleString()}원</span>
        </div>
        <div className="flex">
          <span className="w-20 shrink-0 font-semibold text-stone-800">6. 지급일</span>
          <span>근무 종료 후 익월 10일 이내</span>
        </div>
      </div>

      <div className="mt-5 space-y-1 border-t border-stone-200 pt-4 text-[12px] text-stone-500">
        <p>7. 근로자는 위 근무조건에 따라 성실히 업무를 수행한다.</p>
        <p>8. 사용자는 근로기준법 등 관련 법령을 준수하여 근로자를 보호한다.</p>
        <p>9. 본 계약에 명시되지 않은 사항은 근로기준법 및 관련 법령에 따른다.</p>
      </div>
    </div>
  );
}
