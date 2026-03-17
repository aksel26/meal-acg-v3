"use client";

import { useState } from "react";
import type { Worker } from "@/lib/supabase/types";
import { useWorkers } from "@/hooks/use-workers";
import WorkerTable from "@/components/workers/WorkerTable";
import WorkerModal from "@/components/workers/WorkerModal";
import WorkerDrawer from "@/components/workers/WorkerDrawer";

export default function WorkersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const { data: workers, isLoading } = useWorkers();

  const viewingWorker = workers?.find((w) => w.id === viewingId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div />
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
        data={workers || []}
        isLoading={isLoading}
        onView={(id) => setViewingId(id)}
        onEdit={(worker) => {
          setEditingWorker(worker);
          setIsModalOpen(true);
        }}
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
