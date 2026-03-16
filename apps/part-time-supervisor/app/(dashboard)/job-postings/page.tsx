"use client";

import { useState } from "react";
import { useJobPostings } from "@/hooks/use-job-postings";
import JobPostingTable from "@/components/job-postings/JobPostingTable";
import JobPostingModal from "@/components/job-postings/JobPostingModal";

export default function JobPostingsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { data: jobPostings, isLoading } = useJobPostings();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div />
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          공고 등록
        </button>
      </div>

      <JobPostingTable
        data={jobPostings || []}
        isLoading={isLoading}
        onEdit={(id) => setEditingId(id)}
      />

      <JobPostingModal
        open={isModalOpen || !!editingId}
        onClose={() => {
          setIsModalOpen(false);
          setEditingId(null);
        }}
        editingId={editingId}
      />
    </div>
  );
}
