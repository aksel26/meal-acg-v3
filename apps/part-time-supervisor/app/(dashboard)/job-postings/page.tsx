"use client";

import { useState, useMemo } from "react";
import { useJobPostings } from "@/hooks/use-job-postings";
import JobPostingTable from "@/components/job-postings/JobPostingTable";
import JobPostingModal from "@/components/job-postings/JobPostingModal";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 10;

export default function JobPostingsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { data: jobPostings, isLoading } = useJobPostings();

  const totalPages = Math.ceil((jobPostings?.length ?? 0) / PAGE_SIZE);
  const paginatedData = useMemo(() => {
    if (!jobPostings) return [];
    const start = (currentPage - 1) * PAGE_SIZE;
    return jobPostings.slice(start, start + PAGE_SIZE);
  }, [jobPostings, currentPage]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-base text-slate-500">
          총 <span className="font-semibold text-slate-900">{jobPostings?.length ?? 0}</span>건
        </span>
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          공고 등록
        </button>
      </div>

      <JobPostingTable
        data={paginatedData}
        isLoading={isLoading}
        onEdit={(id) => setEditingId(id)}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
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
