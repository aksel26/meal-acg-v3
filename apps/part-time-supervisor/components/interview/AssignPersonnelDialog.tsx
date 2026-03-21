"use client";

import { useState, useMemo } from "react";
import { useInterviewPersonnel } from "@/hooks/use-interview-personnel";
import { useCreateInterviewJobAssignment } from "@/hooks/use-interview-job-assignments";
import { toast } from "@repo/ui/src/sonner";
import { Button } from "@repo/ui/src/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/src/dialog";
import type { InterviewJobPosting, InterviewJobAssignment, PersonnelRole } from "@/lib/interview-types";

const ROLE_TABS = [
  { value: "", label: "전체" },
  { value: "rp", label: "RP" },
  { value: "ft", label: "FT" },
  { value: "instructor", label: "강사" },
  { value: "other", label: "기타" },
] as const;

const roleLabel: Record<PersonnelRole, { text: string; className: string }> = {
  ft: { text: "FT", className: "bg-emerald-50 text-emerald-700" },
  rp: { text: "RP", className: "bg-blue-50 text-blue-700" },
  instructor: { text: "강사", className: "bg-purple-50 text-purple-700" },
  other: { text: "기타", className: "bg-slate-100 text-slate-600" },
};

export function AssignPersonnelDialog({
  open,
  onClose,
  jobPostingId,
  jobPosting,
  existingAssignments,
}: {
  open: boolean;
  onClose: () => void;
  jobPostingId: string;
  jobPosting: InterviewJobPosting;
  existingAssignments: InterviewJobAssignment[];
}) {
  const [roleFilter, setRoleFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [paySettings, setPaySettings] = useState<
    Record<string, { pay_type: string; pay_rate: number; work_hours: number | null }>
  >({});

  const { data: personnel = [] } = useInterviewPersonnel(
    roleFilter || undefined,
  );
  const createMutation = useCreateInterviewJobAssignment(jobPostingId);

  const existingPersonnelIds = new Set(
    existingAssignments.map((a) => a.personnel_id),
  );

  const availablePersonnel = useMemo(
    () =>
      personnel.filter(
        (p) => p.status === "active" && !existingPersonnelIds.has(p.id),
      ),
    [personnel, existingPersonnelIds],
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // 기본 급여 설정
        if (!paySettings[id]) {
          setPaySettings((ps) => ({
            ...ps,
            [id]: {
              pay_type: jobPosting.pay_type || "daily",
              pay_rate: jobPosting.pay_rate || 0,
              work_hours: null,
            },
          }));
        }
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;

    let successCount = 0;
    let failCount = 0;

    for (const personnelId of selectedIds) {
      const settings = paySettings[personnelId] || {
        pay_type: jobPosting.pay_type || "daily",
        pay_rate: jobPosting.pay_rate || 0,
        work_hours: null,
      };

      try {
        await createMutation.mutateAsync({
          personnel_id: personnelId,
          ...settings,
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount}명이 배정되었습니다.`);
    }
    if (failCount > 0) {
      toast.error(`${failCount}명 배정에 실패했습니다.`);
    }

    setSelectedIds(new Set());
    setPaySettings({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[85vh] p-0" style={{ maxWidth: "40rem" }}>
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>기존 인력 배정</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4">
          {/* Role filter */}
          <div className="mb-4 flex items-center gap-1 rounded-lg border bg-white p-1">
            {ROLE_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setRoleFilter(tab.value)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  roleFilter === tab.value
                    ? "bg-slate-900 font-medium text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Personnel list */}
          <div
            className="space-y-2 overflow-y-auto"
            style={{ maxHeight: "calc(85vh - 16rem)" }}
          >
            {availablePersonnel.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                배정 가능한 인력이 없습니다.
              </p>
            ) : (
              availablePersonnel.map((p) => {
                const selected = selectedIds.has(p.id);
                const role = roleLabel[p.role as PersonnelRole] || roleLabel.other;
                return (
                  <div key={p.id} className="space-y-2">
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        selected
                          ? "border-slate-900 bg-slate-50"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelect(p.id)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <div className="flex-1">
                        <span className="font-medium">{p.name}</span>
                        <span
                          className={`ml-2 rounded px-1.5 py-0.5 text-xs font-medium ${role.className}`}
                        >
                          {role.text}
                        </span>
                        {p.phone && (
                          <span className="ml-2 text-sm text-slate-400">
                            {p.phone}
                          </span>
                        )}
                      </div>
                    </label>

                    {/* 선택된 인원의 급여 설정 */}
                    {selected && (
                      <div className="ml-7 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-500">유형</label>
                          <select
                            value={paySettings[p.id]?.pay_type || "daily"}
                            onChange={(e) =>
                              setPaySettings((ps) => {
                                const prev = ps[p.id] ?? { pay_type: "daily", pay_rate: 0, work_hours: null };
                                return { ...ps, [p.id]: { ...prev, pay_type: e.target.value } };
                              })
                            }
                            className="rounded border px-2 py-1 text-sm"
                          >
                            <option value="daily">일급</option>
                            <option value="hourly">시급</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-500">금액</label>
                          <input
                            type="number"
                            value={paySettings[p.id]?.pay_rate || 0}
                            onChange={(e) =>
                              setPaySettings((ps) => {
                                const prev = ps[p.id] ?? { pay_type: "daily", pay_rate: 0, work_hours: null };
                                return { ...ps, [p.id]: { ...prev, pay_rate: Number(e.target.value) } };
                              })
                            }
                            className="w-28 rounded border px-2 py-1 text-sm"
                          />
                        </div>
                        {paySettings[p.id]?.pay_type === "hourly" && (
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-slate-500">시간</label>
                            <input
                              type="number"
                              step="0.5"
                              value={paySettings[p.id]?.work_hours || ""}
                              onChange={(e) =>
                                setPaySettings((ps) => {
                                  const prev = ps[p.id] ?? { pay_type: "daily", pay_rate: 0, work_hours: null };
                                  return {
                                    ...ps,
                                    [p.id]: {
                                      ...prev,
                                      work_hours: e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                    },
                                  };
                                })
                              }
                              className="w-20 rounded border px-2 py-1 text-sm"
                              placeholder="시간"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedIds.size === 0 || createMutation.isPending}
          >
            {createMutation.isPending
              ? "배정 중..."
              : `${selectedIds.size}명 배정`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
