"use client";

import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import { Search, Pin, Paperclip } from "lucide-react";
import { useRouter } from "next/navigation";
import { NOTICES, CATEGORY_COLORS } from "./data";

// ─── 페이지 ───

export default function NoticesPage() {
  const [search, setSearch] = useState("");
  const router = useRouter();

  const filtered = useMemo(() => {
    if (!search.trim()) return NOTICES;
    const q = search.toLowerCase();
    return NOTICES.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q),
    );
  }, [search]);

  // 고정 공지 먼저, 그 다음 번호 역순
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.no - a.no;
    });
  }, [filtered]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* 검색 바 */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="제목 또는 내용 검색"
          className="w-full rounded-lg bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-200 transition-shadow"
        />
      </div>

      {/* PC: 테이블 뷰 */}
      <div className="max-md:hidden">
        <div className="rounded-xl bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/60">
                <th className="text-left py-3 px-4 font-medium text-slate-500 w-16">
                  No.
                </th>
                <th className="text-center py-3 px-4 font-medium text-slate-500 w-20">
                  분류
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">
                  제목
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 w-24">
                  작성자
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 w-28">
                  작성일
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((notice) => (
                <tr
                  key={notice.id}
                  onClick={() => router.push(`/notices/${notice.id}`)}
                  className="border-b border-slate-100/60 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="py-2.5 px-4 text-slate-500 align-top">
                    {notice.no}
                  </td>
                  <td className="py-2.5 px-4 text-center align-top">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-medium ${CATEGORY_COLORS[notice.category]}`}
                    >
                      {notice.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 align-top">
                    <div className="flex items-center gap-1.5">
                      {notice.pinned && (
                        <Pin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className="text-sm font-medium text-slate-800">
                        {notice.title}
                      </span>
                      {notice.attachments.length > 0 && (
                        <Paperclip className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 max-w-xl">
                      {notice.content}
                    </p>
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 align-top">
                    {notice.author}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 align-top">
                    {notice.createdAt}
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-sm text-slate-400"
                  >
                    검색 결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 모바일: 카드 리스트 */}
      <div className="md:hidden space-y-3">
        {sorted.map((notice) => (
          <div
            key={notice.id}
            onClick={() => router.push(`/notices/${notice.id}`)}
            className="rounded-xl bg-slate-50 p-4 cursor-pointer active:bg-slate-100 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {notice.pinned && (
                  <Pin className="h-3.5 w-3.5 text-slate-400" />
                )}
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${CATEGORY_COLORS[notice.category]}`}
                >
                  {notice.category}
                </span>
              </div>
              <span className="text-xs text-slate-400">
                {notice.createdAt}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-800">
              {notice.title}
            </p>
            <p className="text-xs text-slate-500 line-clamp-2 mt-1">
              {notice.content}
            </p>
            <p className="text-xs text-slate-400 mt-2">{notice.author}</p>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-400">
            검색 결과가 없습니다.
          </div>
        )}
      </div>
    </motion.div>
  );
}
