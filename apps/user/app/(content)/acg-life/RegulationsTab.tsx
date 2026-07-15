"use client";

import { useState, useMemo } from "react";
import { REGULATION_CATEGORIES } from "./data";
import { Search, ChevronDown, Clock } from "lucide-react";

export default function RegulationsTab() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    if (!search.trim()) return REGULATION_CATEGORIES;
    const q = search.toLowerCase();
    return REGULATION_CATEGORIES.map((cat) => ({
      ...cat,
      regulations: cat.regulations.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.content.toLowerCase().includes(q),
      ),
    })).filter((cat) => cat.regulations.length > 0);
  }, [search]);

  const toggleCategory = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div>
      {/* 검색 바 */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="규정 검색"
          className="w-full rounded-lg bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-shadow focus:ring-2 focus:ring-slate-200"
        />
      </div>

      {/* 카테고리 아코디언 */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Search size={32} className="mb-2" />
          <p className="text-sm">검색 결과가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((category) => {
            const isOpen = expanded[category.id] ?? (search.trim() !== "");
            return (
              <div
                key={category.id}
                className="overflow-hidden rounded-xl bg-slate-50"
              >
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">
                      {category.title}
                    </h3>
                    <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                      {category.regulations.length}
                    </span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-200/60 px-4 pb-4">
                    {category.regulations.map((reg) => (
                      <div
                        key={reg.id}
                        className="mt-3 rounded-lg bg-white p-3"
                      >
                        <div className="mb-1.5 flex items-center justify-between">
                          <h4 className="text-sm font-medium text-slate-700">
                            {reg.title}
                          </h4>
                          <span className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Clock size={10} />
                            {reg.updatedAt}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-500">
                          {reg.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
