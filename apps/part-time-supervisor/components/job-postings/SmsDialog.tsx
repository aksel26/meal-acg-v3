"use client";

import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { toast } from "@repo/ui/src/sonner";
import type { AssignmentWithDetails, JobPosting } from "@/lib/supabase/types";

type Template = {
  label: string;
  content: string;
};

function getTemplates(job: JobPosting): Template[] {
  return [
    {
      label: "직접 작성",
      content: "",
    },
    {
      label: "근무 안내",
      content: `[${job.title}] 근무 안내드립니다. 일시: ${job.start_date} ~ ${job.end_date}, 장소: ${job.location || "(미정)"}. 확인 부탁드립니다.`,
    },
    {
      label: "일정 변경",
      content: `[${job.title}] 일정이 변경되었습니다. 변경된 일정을 확인해주세요.`,
    },
  ];
}

function getByteLength(str: string): number {
  let byte = 0;
  for (let i = 0; i < str.length; i++) {
    byte += str.charCodeAt(i) > 127 ? 2 : 1;
  }
  return byte;
}

export default function SmsDialog({
  assignments,
  job,
  onClose,
}: {
  assignments: AssignmentWithDetails[];
  job: JobPosting;
  onClose: () => void;
}) {
  const templates = useMemo(() => getTemplates(job), [job]);

  const recipients = useMemo(
    () =>
      assignments
        .filter((a) => a.worker && a.status !== "cancelled")
        .map((a) => ({
          id: a.worker!.id,
          name: a.worker!.name,
          phone: a.worker!.phone,
          hasPhone: !!a.worker!.phone,
        })),
    [assignments]
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(recipients.filter((r) => r.hasPhone).map((r) => r.id))
  );
  const [templateIndex, setTemplateIndex] = useState(0);
  const [message, setMessage] = useState(templates[0]?.content ?? "");

  const selectableRecipients = recipients.filter((r) => r.hasPhone);
  const allSelected =
    selectableRecipients.length > 0 &&
    selectableRecipients.every((r) => selectedIds.has(r.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableRecipients.map((r) => r.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleTemplateChange = (idx: number) => {
    setTemplateIndex(idx);
    setMessage(templates[idx]?.content ?? "");
  };

  const byteLength = getByteLength(message);
  const messageType = byteLength <= 90 ? "SMS" : "LMS";

  const handleSend = () => {
    if (selectedIds.size === 0) {
      toast.error("수신자를 선택해주세요.");
      return;
    }
    if (!message.trim()) {
      toast.error("메시지를 입력해주세요.");
      return;
    }
    if (window.confirm(`${selectedIds.size}명에게 ${messageType}를 전송하시겠습니까?`)) {
      toast.info("SMS 전송 기능은 준비 중입니다.");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">SMS 전송</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* Recipients */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">수신자</span>
            <span className="text-xs text-slate-400">{selectedIds.size}명 선택됨</span>
          </div>
          <div className="max-h-40 overflow-y-auto rounded-lg border">
            <label className="flex cursor-pointer items-center gap-2 border-b px-3 py-2 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                disabled={selectableRecipients.length === 0}
                className="rounded"
              />
              <span className="text-sm font-medium">전체 선택</span>
            </label>
            {recipients.map((r) => (
              <label
                key={r.id}
                className={`flex items-center gap-2 px-3 py-2 ${
                  r.hasPhone ? "cursor-pointer hover:bg-slate-50" : "opacity-40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(r.id)}
                  onChange={() => toggleOne(r.id)}
                  disabled={!r.hasPhone}
                  className="rounded"
                />
                <span className="text-sm">{r.name}</span>
                <span className="text-xs text-slate-400">
                  {r.phone || "번호 없음"}
                </span>
              </label>
            ))}
            {recipients.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-slate-400">
                배정된 지원자가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* Message */}
        <div className="mb-4 space-y-2">
          <span className="text-sm font-medium">메시지</span>
          <select
            value={templateIndex}
            onChange={(e) => handleTemplateChange(Number(e.target.value))}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            {templates.map((t, i) => (
              <option key={i} value={i}>
                {t.label}
              </option>
            ))}
          </select>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="메시지를 입력하세요"
          />
          <div className="flex justify-end text-xs text-slate-400">
            {byteLength}byte ({messageType} · {messageType === "SMS" ? "90" : "2,000"}byte)
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
