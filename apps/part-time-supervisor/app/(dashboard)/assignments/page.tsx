"use client";

import { useState } from "react";
import { useAssignments } from "@/hooks/use-assignments";
import AssignmentTable from "@/components/assignments/AssignmentTable";
import AssignmentModal from "@/components/assignments/AssignmentModal";

export default function AssignmentsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: assignments, isLoading } = useAssignments();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">배정 목록</h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          배정 등록
        </button>
      </div>

      <AssignmentTable data={assignments || []} isLoading={isLoading} />

      <AssignmentModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
