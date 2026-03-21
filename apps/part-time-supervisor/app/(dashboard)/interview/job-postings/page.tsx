"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { useInterviewJobPostings } from "@/hooks/use-interview-job-postings";
import { InterviewJobPostingTable } from "@/components/interview/InterviewJobPostingTable";
import { InterviewJobPostingModal } from "@/components/interview/InterviewJobPostingModal";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 10;

export default function InterviewJobPostingsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: jobPostings, isLoading } = useInterviewJobPostings();

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setCurrentPage(1);
  };

  const filteredPostings = useMemo(() => {
    if (!jobPostings) return [];
    if (!searchQuery.trim()) return jobPostings;
    const query = searchQuery.trim().toLowerCase();
    return jobPostings.filter((p) => p.title.toLowerCase().includes(query));
  }, [jobPostings, searchQuery]);

  const totalPages = Math.ceil(filteredPostings.length / PAGE_SIZE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPostings.slice(start, start + PAGE_SIZE);
  }, [filteredPostings, currentPage]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-base text-slate-500">
          총{" "}
          <span className="font-semibold text-slate-900">
            {filteredPostings.length}
          </span>
          건
          {searchQuery.trim() &&
            jobPostings &&
            filteredPostings.length !== jobPostings.length && (
              <span className="text-xs text-slate-400">
                {" "}
                / {jobPostings.length}건
              </span>
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
              placeholder="공고명 검색"
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
            onClick={() => setIsModalOpen(true)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            공고 등록
          </button>
        </div>
      </div>

      <InterviewJobPostingTable
        data={paginatedData}
        isLoading={isLoading}
        onEdit={(id) => setEditingId(id)}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      <InterviewJobPostingModal
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
