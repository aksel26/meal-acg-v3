"use client";

import { useState } from "react";
import { useWorkers } from "@/hooks/use-workers";
import WorkerTable from "@/components/workers/WorkerTable";
import WorkerModal from "@/components/workers/WorkerModal";
import WorkerDrawer from "@/components/workers/WorkerDrawer";

export default function WorkersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const { data: workers, isLoading } = useWorkers();

  const viewingWorker = workers?.find((w) => w.id === viewingId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div />
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          지원자 등록
        </button>
      </div>

      <WorkerTable
        data={workers || []}
        isLoading={isLoading}
        onView={(id) => setViewingId(id)}
      />

      <WorkerModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <WorkerDrawer
        workerId={viewingId}
        onClose={() => setViewingId(null)}
        onEdit={() => {
          setViewingId(null);
          setIsModalOpen(true);
        }}
      />
    </div>
  );
}
