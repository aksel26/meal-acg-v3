"use client";

import { useState, useMemo } from "react";
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
  const { data: workers, isLoading } = useWorkers();

  const viewingWorker = workers?.find((w) => w.id === viewingId);
  const totalPages = Math.ceil((workers?.length ?? 0) / PAGE_SIZE);
  const paginatedData = useMemo(() => {
    if (!workers) return [];
    const start = (currentPage - 1) * PAGE_SIZE;
    return workers.slice(start, start + PAGE_SIZE);
  }, [workers, currentPage]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-base text-slate-500">
          총 <span className="font-semibold text-slate-900">{workers?.length ?? 0}</span>명
        </span>
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
