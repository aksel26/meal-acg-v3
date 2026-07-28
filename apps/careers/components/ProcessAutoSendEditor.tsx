"use client";

import { useRef } from "react";
import { Button } from "@repo/ui/src/button";
import { Checkbox } from "@repo/ui/src/checkbox";
import { Input } from "@repo/ui/src/input";
import { Label } from "@repo/ui/src/label";
import { Textarea } from "@repo/ui/src/textarea";
import type { PostingStage } from "@/hooks/useCareersApi";
import { MESSAGE_VARIABLES } from "@/components/postingProcess";

type AutoSend = NonNullable<PostingStage["autoSend"]>;

export function ProcessAutoSendEditor({
  value,
  onChange,
  onSave,
}: {
  value: AutoSend;
  onChange: (value: AutoSend) => void;
  onSave: () => Promise<boolean>;
}) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function toggleChannel(channel: "email" | "sms") {
    onChange({
      ...value,
      channels: value.channels.includes(channel)
        ? value.channels.filter((item) => item !== channel)
        : [...value.channels, channel],
    });
  }

  function insertVariable(variable: string) {
    const input = bodyRef.current;
    const start = input?.selectionStart ?? value.body.length;
    const end = input?.selectionEnd ?? value.body.length;
    onChange({
      ...value,
      body: value.body.slice(0, start) + variable + value.body.slice(end),
    });
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(
        start + variable.length,
        start + variable.length,
      );
    });
  }

  return (
    <div className="space-y-4 bg-slate-50/70 px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label>자동 발송 사용</Label>
          <p className="mt-1 text-xs text-slate-500">
            실제 외부 발송 없이 지원자 전형 기록에 발송 내용을 저장합니다.
          </p>
        </div>
        <Checkbox
          aria-label="자동 발송 사용"
          checked={value.enabled}
          onCheckedChange={(checked) =>
            onChange({ ...value, enabled: checked === true })
          }
        />
      </div>

      <div className="flex gap-5">
        {(["email", "sms"] as const).map((channel) => (
          <label key={channel} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={value.channels.includes(channel)}
              onCheckedChange={() => toggleChannel(channel)}
            />
            {channel === "email" ? "이메일" : "문자(SMS)"}
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="auto-send-title">제목</Label>
        <Input
          id="auto-send-title"
          value={value.title}
          onChange={(event) =>
            onChange({ ...value, title: event.target.value })
          }
          placeholder="메시지 제목"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="auto-send-body">내용</Label>
        <Textarea
          ref={bodyRef}
          id="auto-send-body"
          rows={5}
          value={value.body}
          onChange={(event) => onChange({ ...value, body: event.target.value })}
          placeholder="메시지 내용을 입력하세요."
        />
      </div>
      <div>
        <p className="mb-2 text-xs text-slate-500">변수 삽입</p>
        <div className="flex flex-wrap gap-1.5">
          {MESSAGE_VARIABLES.map((variable) => (
            <Button
              key={variable}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-full px-2 text-[11px]"
              onClick={() => insertVariable(variable)}
            >
              {variable}
            </Button>
          ))}
        </div>
      </div>
      <Button type="button" size="sm" onClick={() => void onSave()}>
        메시지 설정 저장
      </Button>
    </div>
  );
}
