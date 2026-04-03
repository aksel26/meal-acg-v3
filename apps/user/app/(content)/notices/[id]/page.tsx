"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, Users, Paperclip, FileText } from "lucide-react";
import { NOTICES, CATEGORY_COLORS } from "../data";

export default function NoticeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const notice = NOTICES.find((n) => n.id === params.id);

  if (!notice) {
    return (
      <div className="py-20 text-center text-sm text-slate-400">
        공지사항을 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* 뒤로가기 */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        목록으로
      </button>

      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[notice.category]}`}
          >
            {notice.category}
          </span>
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-3">
          {notice.title}
        </h1>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>{notice.author}</span>
          <span>{notice.createdAt}</span>
        </div>
      </div>

      {/* 참조인원 / 첨부파일 메타 */}
      {(notice.references.length > 0 || notice.attachments.length > 0) && (
        <div className="flex flex-col gap-2 mb-6">
          {notice.references.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Users className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="text-slate-400">참조</span>
              <span className="text-slate-600">{notice.references.join(", ")}</span>
            </div>
          )}
          {notice.attachments.length > 0 && (
            <div className="flex items-start gap-2 text-sm text-slate-500">
              <Paperclip className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <span className="text-slate-400 shrink-0">첨부</span>
              <div className="flex flex-wrap gap-2">
                {notice.attachments.map((file) => (
                  <span
                    key={file.name}
                    className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2.5 py-1 text-xs text-slate-600"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    {file.name}
                    <span className="text-slate-400">({file.size})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 구분선 */}
      <div className="h-px bg-slate-100 mb-6" />

      {/* 본문 */}
      <div className="rounded-xl bg-gray-50 p-6">
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
          {notice.content}
        </p>
      </div>

      {/* 이전/다음 글 네비게이션 */}
      <div className="mt-8 flex gap-3">
        {(() => {
          const sorted = [...NOTICES].sort((a, b) => b.no - a.no);
          const idx = sorted.findIndex((n) => n.id === notice.id);
          const prev = idx > 0 ? sorted[idx - 1] : null;
          const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;
          return (
            <>
              <button
                onClick={() => prev && router.push(`/notices/${prev.id}`)}
                disabled={!prev}
                className="flex-1 rounded-lg bg-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <p className="text-[11px] text-slate-400 mb-0.5">이전 글</p>
                <p className="text-sm text-slate-700 truncate">
                  {prev?.title || "-"}
                </p>
              </button>
              <button
                onClick={() => next && router.push(`/notices/${next.id}`)}
                disabled={!next}
                className="flex-1 rounded-lg bg-gray-50 px-4 py-3 text-right transition-colors hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <p className="text-[11px] text-slate-400 mb-0.5">다음 글</p>
                <p className="text-sm text-slate-700 truncate">
                  {next?.title || "-"}
                </p>
              </button>
            </>
          );
        })()}
      </div>
    </motion.div>
  );
}
