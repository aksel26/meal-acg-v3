"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Button } from "@repo/ui/src/button";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";

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
    <div className="flex items-center gap-3 rounded-xl bg-white p-3">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value || "-"}</p>
      </div>
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
      <div className="rounded-2xl bg-gray-50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">내 인사정보</h3>
          </div>
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

        {isLoading ? (
          <p className="text-sm text-slate-400">불러오는 중...</p>
        ) : !data?.registered ? (
          <p className="text-sm text-slate-400">등록된 인사정보가 없습니다.</p>
        ) : (
          <div className="space-y-3">
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
          </div>
        )}

        <p className="mt-3 text-[11px] text-slate-400">
          본인만 조회할 수 있으며, 전체 보기 시 열람 기록이 남습니다.
        </p>
      </div>
    </motion.div>
  );
}
