"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useInterviewPersonnel } from "@/hooks/use-interview-personnel";
import { PersonnelTable } from "@/components/interview/PersonnelTable";
import { PersonnelModal } from "@/components/interview/PersonnelModal";
import type { InterviewPersonnel } from "@/lib/interview-types";

const ROLE_TABS = [
  { value: "", label: "전체" },
  { value: "rp", label: "RP" },
  { value: "ft", label: "FT" },
  { value: "instructor", label: "강사" },
] as const;

export default function InterviewPersonnelPage() {
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<InterviewPersonnel | null>(null);

  const { data: personnel, isLoading } = useInterviewPersonnel(
    role || undefined,
    debouncedSearch || undefined
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {/* Role filter tabs */}
        <div className="flex items-center gap-1 rounded-lg border bg-white p-1">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setRole(tab.value)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                role === tab.value
                  ? "bg-slate-900 font-medium text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름 검색"
              className="h-10 w-48 rounded-lg border bg-white pl-9 pr-9 text-sm outline-none focus:border-slate-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => {
              setEditingPerson(null);
              setIsModalOpen(true);
            }}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            인력 등록
          </button>
        </div>
      </div>

      <PersonnelTable
        data={personnel ?? []}
        isLoading={isLoading}
        onEdit={(person) => {
          setEditingPerson(person);
          setIsModalOpen(true);
        }}
      />

      <PersonnelModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPerson(null);
        }}
        existing={editingPerson}
      />
    </div>
  );
}
