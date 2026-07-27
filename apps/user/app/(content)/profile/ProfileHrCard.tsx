"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Button } from "@repo/ui/src/button";
import { Eye, EyeOff } from "lucide-react";

type HrProfile = {
  registered: boolean;
  residentId: string | null;
  account: { bank: string; number: string } | null;
  annualSalary: number | null;
  salaryMasked: boolean;
  salaryEffectiveDate: string | null;
  salaryNote: string | null;
};

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center border-b border-slate-100 py-3">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value || "-"}</span>
    </div>
  );
}

export default function ProfileHrCard() {
  const [reveal, setReveal] = useState(false);
  const { data, isLoading } = useQuery<HrProfile>({
    queryKey: ["my-hr-profile", reveal],
    queryFn: async () => {
      const res = await fetch(`/api/users/me/hr-profile?reveal=${reveal}`);
      if (!res.ok) throw new Error("인사정보를 불러오지 못했습니다.");
      return res.json();
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="grid grid-cols-[100px_minmax(0,1fr)_auto] items-center border-b border-slate-100 py-3">
        <span className="text-xs text-slate-500">인사정보</span>
        <span className="text-sm text-slate-500">
          {isLoading
            ? "불러오는 중..."
            : data?.registered
              ? "본인만 조회 가능"
              : "등록된 정보 없음"}
        </span>
        <div>
          {data?.registered && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setReveal((v) => !v)}
            >
              {reveal ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              {reveal ? "가리기" : "전체 보기"}
            </Button>
          )}
        </div>
      </div>

      {!isLoading && data?.registered && (
        <>
          <Row label="주민등록번호" value={data.residentId} />
          <Row
            label="계좌"
            value={
              data.account
                ? `${data.account.bank} ${data.account.number}`
                : "-"
            }
          />
          <Row
            label="연봉"
            value={
              reveal
                ? data.annualSalary != null
                  ? `${data.annualSalary.toLocaleString("ko-KR")}원`
                  : "-"
                : data.salaryMasked
                  ? "•••"
                  : "-"
            }
          />
        </>
      )}

      {data?.registered && (
        <p className="mt-3 text-[11px] text-slate-400">
          본인만 조회할 수 있으며, 전체 보기 시 열람 기록이 남습니다.
        </p>
      )}
    </motion.div>
  );
}
