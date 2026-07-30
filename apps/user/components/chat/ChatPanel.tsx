"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import type { ChatAnswer, ChatSource } from "@/lib/chat/answers";

const QUICK_QUESTIONS = [
  "내 휴가 얼마나 남았어?",
  "원래 법정 연차는 며칠이야?",
  "반차/반반차 규정 알려줘",
];

const MAX_MESSAGE_LENGTH = 300;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  asOf?: string;
  sources?: ChatSource[];
  failed?: boolean;
  question?: string; // 실패 시 재시도용 원 질문
}

const sourceChipClass =
  "rounded-full bg-white px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50";

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "요청에 실패했습니다.",
        );
      }
      const answer = data as ChatAnswer & { requestId: string };
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: answer.answer,
          asOf: answer.asOf,
          sources: answer.sources,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "답변을 가져오지 못했습니다.",
          failed: true,
          question,
        },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() =>
        bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      );
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              휴가 잔여일수, 법정 연차 기준, 반차/반반차 규정을 물어보세요.
            </p>
            <div className="flex flex-col items-start gap-2">
              {QUICK_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => send(question)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === "user"
                ? "flex justify-end"
                : "flex justify-start"
            }
          >
            <div
              className={
                message.role === "user"
                  ? "max-w-[80%] rounded-2xl rounded-br-sm bg-slate-900 px-3 py-2 text-sm text-white"
                  : "max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-sm text-slate-800"
              }
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.asOf && (
                <p className="mt-1 text-xs text-slate-500">
                  기준일 {message.asOf}
                </p>
              )}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {message.sources.map((source) =>
                    source.href.startsWith("/") ? (
                      <Link
                        key={source.id}
                        href={source.href}
                        className={sourceChipClass}
                      >
                        {source.label}
                      </Link>
                    ) : (
                      <a
                        key={source.id}
                        href={source.href}
                        target="_blank"
                        rel="noreferrer"
                        className={sourceChipClass}
                      >
                        {source.label}
                      </a>
                    ),
                  )}
                </div>
              )}
              {message.failed && message.question && (
                <button
                  type="button"
                  onClick={() => send(message.question!)}
                  className="mt-2 text-xs font-medium text-slate-600 underline"
                >
                  다시 시도
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <p className="text-sm text-slate-400">답변을 만드는 중…</p>
        )}
        <div ref={bottomRef} />
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 border-t border-slate-100 p-3"
      >
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            // 한글 IME 조합 중 Enter로 인한 이중 전송 방지 — isComposing 체크 필수
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              send(input);
            }
          }}
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="질문을 입력하세요"
          aria-label="질문 입력"
          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="질문 보내기"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white transition disabled:opacity-40"
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
