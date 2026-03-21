"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import type { Worker } from "@/lib/supabase/types";
import { useWorkers } from "@/hooks/use-workers";
import WorkerTable from "@/components/workers/WorkerTable";
import WorkerModal from "@/components/workers/WorkerModal";
import WorkerDrawer from "@/components/workers/WorkerDrawer";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 10;

export default function WorkersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: workers, isLoading } = useWorkers();

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setCurrentPage(1);
  };

  const viewingWorker = workers?.find((w) => w.id === viewingId);

  const filteredWorkers = useMemo(() => {
    if (!workers) return [];
    if (!searchQuery.trim()) return workers;
    const query = searchQuery.trim().toLowerCase();
    return workers.filter(
      (w) =>
        w.name.toLowerCase().includes(query) ||
        (w.phone && w.phone.includes(query))
    );
  }, [workers, searchQuery]);

  const totalPages = Math.ceil(filteredWorkers.length / PAGE_SIZE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredWorkers.slice(start, start + PAGE_SIZE);
  }, [filteredWorkers, currentPage]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-base text-slate-500">
          총 <span className="font-semibold text-slate-900">{filteredWorkers.length}</span>명
          {searchQuery.trim() && workers && filteredWorkers.length !== workers.length && (
            <span className="text-xs text-slate-400">/ {workers.length}명</span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="이름 또는 전화번호 검색"
              className="w-56 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            검색
          </button>
          <button
            onClick={() => {
              setEditingWorker(null);
              setIsModalOpen(true);
            }}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            지원자 등록
          </button>
        </div>
      </div>

      <WorkerTable
        data={paginatedData}
        isLoading={isLoading}
        onView={(id) => setViewingId(id)}
        onEdit={(worker) => {
          setEditingWorker(worker);
          setIsModalOpen(true);
        }}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      <WorkerModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingWorker(null);
        }}
        existing={editingWorker}
      />

      <WorkerDrawer
        workerId={viewingId}
        onClose={() => setViewingId(null)}
        onEdit={() => {
          if (viewingWorker) {
            setEditingWorker(viewingWorker as Worker);
          }
          setViewingId(null);
          setIsModalOpen(true);
        }}
      />
    </div>
  );
}
