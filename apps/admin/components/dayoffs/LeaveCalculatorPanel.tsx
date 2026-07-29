"use client";

import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { HelpCircle } from "lucide-react";
import { Button } from "@repo/ui/src/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { cn } from "@repo/ui/lib/utils";
import { useLeaveCalculatorPreview } from "@/hooks/useLeaveCalculator";

function formatDays(value: number | null) {
  if (value === null) return "-";
  return Number.isInteger(value) ? `${value}일` : `${value.toFixed(1)}일`;
}

function formatDate(value: string | null) {
  return value ? dayjs(value).format("YYYY.MM.DD") : "-";
}

function tenureText(years: number | null, months: number | null) {
  if (years === null) return "-";
  if (years < 1) return `${months ?? 0}개월`;
  return `${years}년차`;
}

export function LeaveCalculatorPanel({ year }: { year: number }) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const { data, isLoading, isError } = useLeaveCalculatorPreview(year);

  const sortedMembers = useMemo(() => {
    return [...(data?.members ?? [])].sort((a, b) => {
      if (a.status !== b.status) return a.status === "needs_data" ? -1 : 1;
      return a.fullName.localeCompare(b.fullName, "ko");
    });
  }, [data?.members]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-slate-500">
          <HelpCircle className="h-3.5 w-3.5" />
          계산 확인 전용 화면입니다. 휴가 수량은 여기서 적용되지 않습니다.
        </div>
      </div>

      <section className="overflow-hidden rounded-xl bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              인원별 계산 결과
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              입사일, 직급, 인턴 개월 수를 기준으로 계산 방식과 현재 적용 수량을
              비교합니다.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-xs text-slate-500 hover:text-slate-900"
            onClick={() => setRulesOpen(true)}
          >
            <HelpCircle className="h-4 w-4" />
            도움말
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-100 text-left text-xs font-medium text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">이름</th>
                <th className="px-3 py-2 font-medium">팀</th>
                <th className="px-3 py-2 font-medium">직급</th>
                <th className="px-3 py-2 font-medium">입사일</th>
                <th className="px-3 py-2 font-medium">근무년차</th>
                <th className="px-3 py-2 font-medium">계산 결과</th>
                <th className="px-3 py-2 font-medium">현재 적용</th>
                <th className="px-3 py-2 font-medium">계산 방식</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-10 text-center text-sm text-slate-500"
                  >
                    계산 데이터를 불러오는 중...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-10 text-center text-sm text-slate-500"
                  >
                    계산 데이터를 불러오지 못했습니다.
                  </td>
                </tr>
              ) : sortedMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-10 text-center text-sm text-slate-500"
                  >
                    계산할 인원이 없습니다.
                  </td>
                </tr>
              ) : (
                sortedMembers.map((member) => {
                  const visibleResultItems = member.items.filter(
                    (item) =>
                      item.status === "calculated" &&
                      (item.type === "annual" || item.type === "monthly"),
                  );
                  const basisItems = member.items.filter(
                    (item) => item.status !== "not_applicable",
                  );

                  return (
                    <tr
                      key={member.memberId}
                      className="border-b border-slate-100 align-top transition-colors last:border-b-0 hover:bg-slate-50"
                    >
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-800">
                          {member.fullName}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        {member.teamName || "-"}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        {member.positionName || "-"}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        {formatDate(member.hireDate)}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">
                        {tenureText(
                          member.yearsEmployed,
                          member.monthsEmployed,
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="space-y-1">
                          {visibleResultItems.map((item) => {
                            return (
                              <span
                                key={item.type}
                                className={cn(
                                  "block text-xs font-semibold text-slate-800",
                                  item.type === "monthly" &&
                                    "underline decoration-slate-300 decoration-1 underline-offset-4",
                                )}
                              >
                                {item.label} {formatDays(item.calculated)}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs font-medium text-slate-700">
                        <div>{formatDays(member.totalApplied)}</div>
                        <div className="mt-1 text-[11px] font-normal text-slate-400">
                          잔여{" "}
                          {formatDays(
                            member.items.reduce(
                              (sum, item) => sum + item.remaining,
                              0,
                            ),
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-[320px] space-y-1 text-xs text-slate-500">
                          {basisItems.map((item) => (
                            <p key={item.type}>
                              <span className="font-medium text-slate-700">
                                {item.label}
                              </span>
                              {" · "}
                              {item.basis}
                            </p>
                          ))}
                          {member.notes.map((note) => (
                            <p key={note} className="text-slate-600">
                              {note}
                            </p>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>계산 기준</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 md:grid-cols-2">
            <RuleItem
              label="월차"
              value={data?.rules.monthly ?? "1년 미만 입사자 월차"}
            />
            <RuleItem
              label="연차"
              value={data?.rules.annual ?? "기본 연차 15일"}
            />
            <RuleItem
              label="하계휴가"
              value={data?.rules.summer ?? "해당없음 0일"}
            />
            <RuleItem
              label="사용 차감"
              value={data?.rules.deduction ?? "연차/반차 사용 시 차감"}
            />
            <RuleItem
              label="잔여 산식"
              value={data?.rules.balance ?? "잔여 = 부여 + 조정 - 사용"}
            />
            <RuleItem
              label="정규직 전환"
              value={data?.rules.conversion ?? "인턴 개월 수 참고"}
            />
            <RuleItem
              label="이월"
              value={data?.rules.carryover ?? "자동 계산 제외"}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RuleItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-xs leading-5 text-slate-700">{value}</p>
    </div>
  );
}
