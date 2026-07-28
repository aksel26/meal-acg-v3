"use client";

import { MailCheck, RotateCcw, Send, Zap } from "lucide-react";
import { useState } from "react";
import { Button } from "@repo/ui/src/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { Textarea } from "@repo/ui/src/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/src/tooltip";
import { todayInSeoul } from "@/lib/careers/date";
import { renderMessageTemplate } from "@/lib/careers/parity";
import type { AutoSendConfig, StageRecordMeta } from "@/hooks/useCareersApi";

export type StageRecordMetaInput = {
  startDate?: string;
  endDate?: string;
  time?: string;
  note?: string;
  send?: StageRecordMeta["send"];
};
export type StageRecordSendIntent = "auto" | "manual" | "preserve";

export type StageRecordSendContext = {
  autoSend?: AutoSendConfig;
  applicantName: string;
  stageName: string;
  positionName?: string;
  existingSend?: StageRecordMeta["send"];
  autoSendOnSubmit: boolean;
};

export function SendRecordIndicator({
  send,
  className = "size-4 text-emerald-600",
}: {
  send: NonNullable<StageRecordMeta["send"]>;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <MailCheck
          className={className}
          tabIndex={0}
          aria-label="안내 메시지 기록 있음"
        />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs space-y-1">
        <p>
          {new Date(send.sentAt).toLocaleString("ko-KR")} ·{" "}
          {send.channels
            .map((channel) => (channel === "email" ? "이메일" : "문자"))
            .join(", ")}
          {send.auto ? " · 자동" : " · 수동"}
        </p>
        {send.subject && <p>제목: {send.subject}</p>}
      </TooltipContent>
    </Tooltip>
  );
}

export function StageRecordDialog({
  open,
  onOpenChange,
  stageName,
  initialValue,
  readOnly = false,
  pending = false,
  sendContext,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stageName: string;
  initialValue?: StageRecordMetaInput | null;
  readOnly?: boolean;
  pending?: boolean;
  sendContext?: StageRecordSendContext;
  onSave: (
    value: StageRecordMetaInput,
    sendIntent: StageRecordSendIntent,
  ) => void;
}) {
  const today = todayInSeoul();
  const [startDate, setStartDate] = useState(initialValue?.startDate || today);
  const [endDate, setEndDate] = useState(initialValue?.endDate || "");
  const [time, setTime] = useState(initialValue?.time || "");
  const [note, setNote] = useState(initialValue?.note || "");
  const [messageDraft, setMessageDraft] = useState<{
    subject: string;
    body: string;
  } | null>(() => {
    const existing = sendContext?.existingSend;
    return existing?.subject !== undefined || existing?.body !== undefined
      ? {
          subject: existing.subject || "",
          body: existing.body || "",
        }
      : null;
  });
  const autoSend = sendContext?.autoSend;
  const hasTemplate = Boolean(autoSend?.title.trim() || autoSend?.body.trim());
  const canSend = hasTemplate && Boolean(autoSend?.channels.length);
  const variables = {
    지원자명: sendContext?.applicantName,
    전형단계명: sendContext?.stageName,
    포지션명: sendContext?.positionName,
    면접일시: endDate ? `${endDate}${time ? ` ${time}` : ""}` : undefined,
  };
  const templateSubject = renderMessageTemplate(
    autoSend?.title || "",
    variables,
  );
  const templateBody = renderMessageTemplate(autoSend?.body || "", variables);
  const subject = messageDraft?.subject ?? templateSubject;
  const body = messageDraft?.body ?? templateBody;
  const baseValue = () => ({
    startDate,
    endDate,
    time: time || undefined,
    note: note.trim() || undefined,
  });
  const sendRecord = (auto: boolean): NonNullable<StageRecordMeta["send"]> => ({
    sentAt: new Date().toISOString(),
    channels: [...(autoSend?.channels || [])],
    auto,
    subject: auto ? templateSubject : subject,
    body: auto ? templateBody : body,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {stageName} {readOnly ? "기록 확인" : "정보 입력"}
          </DialogTitle>
          <DialogDescription>
            {readOnly
              ? "최종 결과가 지정되어 기록을 열람만 할 수 있습니다."
              : "기간과 시간, 담당자 및 특이사항을 기록합니다."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="stage-record-start">시작일</Label>
            <Input
              id="stage-record-start"
              type="date"
              value={startDate}
              disabled={readOnly}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stage-record-end">종료일</Label>
            <Input
              id="stage-record-end"
              type="date"
              value={endDate}
              disabled={readOnly}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="stage-record-time">시간 (선택)</Label>
            <Input
              id="stage-record-time"
              type="time"
              value={time}
              disabled={readOnly}
              onChange={(event) => setTime(event.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="stage-record-note">메모 (선택)</Label>
            <Textarea
              id="stage-record-note"
              rows={4}
              value={note}
              disabled={readOnly}
              placeholder="담당자, 특이사항 등을 입력하세요."
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          {sendContext && (
            <div className="space-y-3 border-t border-slate-100 pt-4 sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>안내 메시지</Label>
                <div className="flex gap-1">
                  {(autoSend?.channels || []).map((channel) => (
                    <span
                      key={channel}
                      className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500"
                    >
                      {channel === "email" ? "이메일" : "문자"}
                    </span>
                  ))}
                </div>
              </div>
              {!hasTemplate ? (
                <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  이 단계에 설정된 안내 메시지가 없습니다.
                </p>
              ) : (
                <>
                  {!readOnly &&
                    sendContext.autoSendOnSubmit &&
                    autoSend?.enabled &&
                    canSend && (
                      <p className="flex items-center gap-1 text-xs text-slate-500">
                        <Zap className="size-3.5" /> 확인 시 자동 발송 기록이
                        생성됩니다.
                      </p>
                    )}
                  {sendContext.existingSend && (
                    <p className="flex items-center gap-1 text-xs text-emerald-700">
                      <MailCheck className="size-3.5" />
                      {new Date(sendContext.existingSend.sentAt).toLocaleString(
                        "ko-KR",
                      )}{" "}
                      ·{" "}
                      {sendContext.existingSend.channels
                        .map((channel) =>
                          channel === "email" ? "이메일" : "문자",
                        )
                        .join(", ")}
                    </p>
                  )}
                  <Input
                    value={subject}
                    disabled={readOnly}
                    placeholder="발송 제목"
                    onChange={(event) =>
                      setMessageDraft({
                        subject: event.target.value,
                        body,
                      })
                    }
                  />
                  <Textarea
                    value={body}
                    disabled={readOnly}
                    rows={5}
                    placeholder="발송 내용"
                    onChange={(event) =>
                      setMessageDraft({
                        subject,
                        body: event.target.value,
                      })
                    }
                  />
                  {!readOnly && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={messageDraft === null}
                        onClick={() => setMessageDraft(null)}
                      >
                        <RotateCcw /> 템플릿으로 복원
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!endDate || !canSend || pending}
                        onClick={() =>
                          onSave(
                            {
                              ...baseValue(),
                              send: sendRecord(false),
                            },
                            "manual",
                          )
                        }
                      >
                        <Send />
                        {sendContext.existingSend ? "재발송" : "수동 발송"}
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-slate-400">
                    실제 외부 발송 없이 이 지원자의 발송 기록만 저장됩니다.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? "닫기" : "취소"}
          </Button>
          {!readOnly && (
            <Button
              disabled={!endDate || pending}
              onClick={() => {
                const autoFires = Boolean(
                  sendContext?.autoSendOnSubmit && autoSend?.enabled && canSend,
                );
                onSave(
                  {
                    ...baseValue(),
                    ...(autoFires ? { send: sendRecord(true) } : {}),
                  },
                  autoFires ? "auto" : "preserve",
                );
              }}
            >
              {pending ? "저장 중..." : "저장"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MemoDialog({
  open,
  onOpenChange,
  applicantName,
  initialValue,
  pending = false,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicantName: string;
  initialValue: string;
  pending?: boolean;
  onSave: (memo: string) => void;
}) {
  const [memo, setMemo] = useState(initialValue);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{applicantName} · 메모</DialogTitle>
          <DialogDescription>
            지원자 목록과 상세 화면에 함께 표시됩니다.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          autoFocus
          rows={7}
          value={memo}
          maxLength={10_000}
          placeholder="특이사항을 입력하세요."
          onChange={(event) => setMemo(event.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button disabled={pending} onClick={() => onSave(memo)}>
            {pending ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SeparationDialog({
  open,
  onOpenChange,
  applicantName,
  initialValue = "",
  edit = false,
  pending = false,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicantName: string;
  initialValue?: string;
  edit?: boolean;
  pending?: boolean;
  onSave: (reason: string) => void;
}) {
  const [reason, setReason] = useState(initialValue);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {applicantName} · 별도 관리 {edit ? "사유" : "이동"}
          </DialogTitle>
          <DialogDescription>
            {edit
              ? "최초 이동 시각은 유지되고 사유만 변경됩니다."
              : "현재 전형 단계와 상태를 보존한 뒤 일반 목록에서 제외합니다."}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          autoFocus
          rows={5}
          value={reason}
          maxLength={10_000}
          placeholder="별도 관리 사유를 입력하세요."
          onChange={(event) => setReason(event.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            disabled={!reason.trim() || pending}
            onClick={() => onSave(reason.trim())}
          >
            {pending ? "저장 중..." : edit ? "저장" : "이동"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type FinalResultInput = {
  result: "hired" | "rejected";
  reason?: string;
};

export function FinalResultDialog({
  open,
  onOpenChange,
  applicantName,
  initialValue,
  pending = false,
  onSave,
  onClear,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicantName: string;
  initialValue?: FinalResultInput | null;
  pending?: boolean;
  onSave: (value: FinalResultInput) => void;
  onClear: () => void;
}) {
  const [result, setResult] = useState<"hired" | "rejected" | null>(
    initialValue?.result || null,
  );
  const [reason, setReason] = useState(initialValue?.reason || "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{applicantName} · 최종 결과</DialogTitle>
          <DialogDescription>
            최종 결과가 지정되면 전형 상태 조작이 잠깁니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={result === "hired" ? "default" : "outline"}
              onClick={() => setResult("hired")}
            >
              합격
            </Button>
            <Button
              type="button"
              variant={result === "rejected" ? "default" : "outline"}
              onClick={() => setResult("rejected")}
            >
              불합격
            </Button>
          </div>
          <Textarea
            rows={4}
            value={reason}
            placeholder="메모 또는 사유 (선택)"
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <DialogFooter className="sm:justify-between">
          {initialValue ? (
            <Button
              variant="ghost"
              className="text-red-600 hover:text-red-700"
              disabled={pending}
              onClick={onClear}
            >
              판정 해제
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button
              disabled={!result || pending}
              onClick={() =>
                result &&
                onSave({
                  result,
                  reason: reason.trim() || undefined,
                })
              }
            >
              {pending ? "저장 중..." : "저장"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
