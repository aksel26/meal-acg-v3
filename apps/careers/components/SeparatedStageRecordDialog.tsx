"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import type { StageRecord } from "@/hooks/useCareersApi";

export function SeparatedStageRecordDialog({
  open,
  onOpenChange,
  applicantName,
  stageName,
  statusName,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicantName: string;
  stageName: string;
  statusName: string;
  record?: StageRecord;
}) {
  const meta = record?.meta;
  const send = meta?.send;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>전형 기록</DialogTitle>
          <DialogDescription>
            {applicantName} · {stageName} · {statusName}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-400">기간</dt>
            <dd className="mt-1 text-slate-700">
              {meta?.startDate || "-"} ~ {meta?.endDate || "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">시간</dt>
            <dd className="mt-1 text-slate-700">{meta?.time || "-"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-400">메모</dt>
            <dd className="mt-1 whitespace-pre-wrap text-slate-700">
              {meta?.note || "-"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-400">발송 기록</dt>
            {send ? (
              <dd className="mt-1 space-y-1 text-slate-700">
                <p>
                  {new Intl.DateTimeFormat("ko-KR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(send.sentAt))}{" "}
                  · {send.channels.join(", ")}
                  {send.auto ? " · 자동" : ""}
                </p>
                {send.subject && <p>제목: {send.subject}</p>}
                {send.body && (
                  <p className="whitespace-pre-wrap text-slate-500">
                    {send.body}
                  </p>
                )}
              </dd>
            ) : (
              <dd className="mt-1 text-slate-400">발송 기록이 없습니다.</dd>
            )}
          </div>
        </dl>
        <p className="text-xs text-slate-400">
          별도 관리 당시의 기록은 읽기만 할 수 있습니다.
        </p>
      </DialogContent>
    </Dialog>
  );
}
