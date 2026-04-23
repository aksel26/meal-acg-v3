"use client";

import { useState, useMemo } from "react";
import {
  EVENT_ALBUMS,
  EVENT_CATEGORIES,
  CATEGORY_COLORS,
  type EventCategory,
} from "./data";
import { Calendar, Images } from "lucide-react";

export default function AlbumsTab() {
  const [filter, setFilter] = useState<EventCategory | "전체">("전체");

  const filtered = useMemo(() => {
    if (filter === "전체") return EVENT_ALBUMS;
    return EVENT_ALBUMS.filter((a) => a.category === filter);
  }, [filter]);

  return (
    <div>
      {/* 카테고리 필터 */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(["전체", ...EVENT_CATEGORIES] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === cat
                ? "bg-slate-800 text-white"
                : "bg-gray-100 text-slate-500 hover:bg-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 앨범 그리드 */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Images size={32} className="mb-2" />
          <p className="text-sm">해당 카테고리의 앨범이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((album) => (
            <div
              key={album.id}
              className="group overflow-hidden rounded-xl bg-gray-50 transition-colors hover:bg-gray-100"
            >
              {/* 커버 플레이스홀더 */}
              <div className="flex h-40 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                <Images
                  size={32}
                  className="text-slate-300 transition-transform group-hover:scale-110"
                />
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CATEGORY_COLORS[album.category]}`}
                  >
                    {album.category}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Calendar size={11} />
                    {album.date}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-800">
                  {album.title}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {album.description}
                </p>
                <p className="mt-2 text-[11px] text-slate-400">
                  사진 {album.photoCount}장
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
