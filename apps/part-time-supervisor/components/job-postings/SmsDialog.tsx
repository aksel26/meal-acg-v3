"use client";

import { useState, useMemo } from "react";
import { toast } from "@repo/ui/src/sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@repo/ui/src/dialog";
import { Button } from "@repo/ui/src/button";
import { Textarea } from "@repo/ui/src/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@repo/ui/src/select";
import { Checkbox } from "@repo/ui/src/checkbox";
import { Label } from "@repo/ui/src/label";
import { ScrollArea } from "@repo/ui/src/scroll-area";
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
      content: `[${job.title}] 근무 안내드립니다. 검사일: ${job.start_date}, 장소: ${job.location || "(미정)"}. 확인 부탁드립니다.`,
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
  open,
  onOpenChange,
  assignments,
  job,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignments: AssignmentWithDetails[];
  job: JobPosting;
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
  const [templateIndex, setTemplateIndex] = useState("0");
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

  const handleTemplateChange = (value: string) => {
    setTemplateIndex(value);
    const idx = Number(value);
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
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>SMS 전송</DialogTitle>
        </DialogHeader>

        {/* Recipients */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">수신자</span>
            <span className="text-xs text-slate-400">{selectedIds.size}명 선택됨</span>
          </div>
          <div className="rounded-lg border">
            <label className="flex cursor-pointer items-center gap-2 border-b px-3 py-2 hover:bg-slate-50">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                disabled={selectableRecipients.length === 0}
              />
              <span className="text-sm font-medium">전체 선택</span>
            </label>
            <ScrollArea className="max-h-52 overflow-hidden">
              {recipients.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-center gap-2 px-3 py-2 ${
                    r.hasPhone ? "cursor-pointer hover:bg-slate-50" : "opacity-40"
                  }`}
                >
                  <Checkbox
                    checked={selectedIds.has(r.id)}
                    onCheckedChange={() => toggleOne(r.id)}
                    disabled={!r.hasPhone}
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
            </ScrollArea>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label>메시지</Label>
          <Select value={templateIndex} onValueChange={handleTemplateChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t, i) => (
                <SelectItem key={i} value={String(i)}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="메시지를 입력하세요"
          />
          <div className="flex justify-end text-xs text-slate-400">
            {byteLength}byte ({messageType} · {messageType === "SMS" ? "90" : "2,000"}byte)
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSend}>전송</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
