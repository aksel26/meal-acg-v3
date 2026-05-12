"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Inbox,
  Loader2,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/src/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/src/popover";
import type { RequestRecord } from "@/lib/requests";

type MasterMember = {
  id: string;
  full_name: string;
  role: string | null;
  member_role: string | null;
  team_id: string | null;
};

export function RequestSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [members, setMembers] = useState<MasterMember[]>([]);
  const [customerGroups, setCustomerGroups] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch("/api/requests").then((response) => response.json()),
      fetch("/api/masters").then((response) => response.json()),
    ])
      .then(([requestsPayload, mastersPayload]) => {
        if (cancelled) return;
        setRequests(Array.isArray(requestsPayload) ? requestsPayload : []);
        setMembers(mastersPayload.members ?? []);
        const groups: string[] = mastersPayload.customerGroups ?? [];
        const affiliateNames: string[] = (mastersPayload.clients ?? [])
          .map((client: { name: string }) => client.name)
          .filter(Boolean);
        const merged = Array.from(new Set([...groups, ...affiliateNames])).sort(
          (a, b) => a.localeCompare(b, "ko-KR"),
        );
        setCustomerGroups(merged);
      })
      .catch(() => {
        if (cancelled) return;
        setRequests([]);
        setMembers([]);
        setCustomerGroups([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setKeyword("");
      setSelectedCustomers([]);
      setSelectedAssigneeIds([]);
    }
  }, [open]);

  const filteredRequests = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return requests
      .filter((request) => {
        if (k) {
          const haystack = [
            request.title,
            request.body,
            request.requester_name,
            request.request_type_name,
            ...(request.assignee_names ?? []),
            ...(request.customer_names ?? []),
            ...(request.affiliate_names ?? []),
            ...(request.team_names ?? []),
          ]
            .filter((value): value is string => Boolean(value))
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(k)) return false;
        }
        if (selectedCustomers.length > 0) {
          const pool = [
            ...(request.customer_names ?? []),
            ...(request.affiliate_names ?? []),
          ];
          if (!selectedCustomers.some((value) => pool.includes(value))) {
            return false;
          }
        }
        if (selectedAssigneeIds.length > 0) {
          const ids = request.assignee_ids ?? [];
          if (!selectedAssigneeIds.some((id) => ids.includes(id))) {
            return false;
          }
        }
        return true;
      })
      .slice(0, 50);
  }, [requests, keyword, selectedCustomers, selectedAssigneeIds]);

  const hasFilter =
    keyword.trim() !== "" ||
    selectedCustomers.length > 0 ||
    selectedAssigneeIds.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85vh] gap-0 overflow-hidden p-0"
        style={{
          width: "min(720px, calc(100vw - 2rem))",
          maxWidth: "min(720px, calc(100vw - 2rem))",
        }}
        onInteractOutside={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest("[data-radix-popper-content-wrapper]")) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="border-b border-[#f3f3f3] px-5 py-4">
          <DialogTitle>업무 요청 검색</DialogTitle>
        </DialogHeader>
        <div className="border-b border-[#f3f3f3] px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-md border border-[#e5e7eb] px-3 transition-colors focus-within:border-[#111111]">
              <Search size={15} strokeWidth={1.5} className="shrink-0 text-slate-400" />
              <input
                autoFocus
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="제목, 내용, 작성자, 담당자, 고객사로 검색"
              />
            </div>
            <MultiSelectDropdown
              label="고객사 / 그룹사"
              placeholder="고객사 선택"
              options={customerGroups.map((value) => ({ value, label: value }))}
              selected={selectedCustomers}
              onToggle={(value) =>
                setSelectedCustomers((current) =>
                  current.includes(value)
                    ? current.filter((item) => item !== value)
                    : [...current, value],
                )
              }
              onClear={() => setSelectedCustomers([])}
              countSuffix="개 선택"
            />
            <MultiSelectDropdown
              label="담당자"
              placeholder="담당자 선택"
              options={members.map((member) => ({
                value: member.id,
                label: member.full_name,
                secondary: member.member_role || member.role || undefined,
              }))}
              selected={selectedAssigneeIds}
              onToggle={(value) =>
                setSelectedAssigneeIds((current) =>
                  current.includes(value)
                    ? current.filter((item) => item !== value)
                    : [...current, value],
                )
              }
              onClear={() => setSelectedAssigneeIds([])}
              countSuffix="명 선택"
              searchable
            />
            {hasFilter && (
              <button
                type="button"
                onClick={() => {
                  setKeyword("");
                  setSelectedCustomers([]);
                  setSelectedAssigneeIds([]);
                }}
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-md px-3 text-xs font-medium text-slate-500 transition-colors hover:bg-[#f9f9fa] hover:text-[#111111]"
              >
                초기화
              </button>
            )}
          </div>
        </div>
        <div className="max-h-[55vh] overflow-y-auto px-2 py-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 px-3 py-12 text-slate-400">
              <Loader2
                size={22}
                strokeWidth={1.6}
                className="animate-spin text-slate-400"
              />
              <p className="text-xs">불러오는 중...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-3 py-12 text-center">
              <Inbox size={28} strokeWidth={1.4} className="text-slate-300" />
              <p className="text-sm text-slate-500">
                {hasFilter ? "조건에 맞는 요청이 없습니다." : "요청이 없습니다."}
              </p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {filteredRequests.map((request) => (
                <li key={request.id}>
                  <Link
                    href={`/requests/${request.id}`}
                    onClick={() => onOpenChange(false)}
                    className="block rounded-md px-3 py-2.5 transition-colors hover:bg-[#fafafa]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-[#111111]">
                        {request.title}
                      </p>
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {request.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {request.requester_name}
                      {request.assignee_names && request.assignee_names.length > 0
                        ? ` → ${request.assignee_names.join(", ")}`
                        : " → 미배정"}
                      {request.customer_names && request.customer_names.length > 0
                        ? ` · ${request.customer_names.join(", ")}`
                        : ""}
                    </p>
                  </Link>
                </li>
              ))}
              {requests.length > filteredRequests.length && (
                <li className="px-3 py-2 text-center text-[11px] text-slate-400">
                  상위 {filteredRequests.length}건만 표시됩니다.
                </li>
              )}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type DropdownOption = {
  value: string;
  label: string;
  secondary?: string;
};

function MultiSelectDropdown({
  label,
  placeholder,
  options,
  selected,
  onToggle,
  onClear,
  countSuffix,
  searchable = false,
}: {
  label: string;
  placeholder: string;
  options: DropdownOption[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  countSuffix: string;
  searchable?: boolean;
}) {
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    if (!searchable || !search.trim()) return options;
    const k = search.trim().toLowerCase();
    return options.filter((option) =>
      [option.label, option.secondary]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(k)),
    );
  }, [options, search, searchable]);

  const triggerLabel =
    selected.length > 0
      ? `${label} · ${selected.length}${countSuffix}`
      : label;

  return (
    <Popover modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors ${
            selected.length > 0
              ? "border-[#111111] bg-[#111111] text-white"
              : "border-[#e5e7eb] bg-white text-slate-600 hover:border-slate-300 hover:text-[#111111]"
          }`}
        >
          <span>{triggerLabel}</span>
          <ChevronDown size={13} strokeWidth={1.5} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        {searchable && (
          <input
            className="mb-2 h-9 w-full rounded-md border border-[#e5e7eb] px-2.5 text-sm outline-none focus:border-[#111111]"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`${placeholder} 검색`}
          />
        )}
        <div className="max-h-56 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-slate-400">
              항목이 없습니다.
            </p>
          ) : (
            filteredOptions.map((option) => {
              const checked = selected.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onToggle(option.value)}
                  onMouseDown={(event) => event.preventDefault()}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-[#f9f9fa]"
                >
                  <span
                    className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                      checked
                        ? "border-[#111111] bg-[#111111] text-white"
                        : "border-[#d4d8de]"
                    }`}
                  >
                    {checked && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.secondary && (
                      <span className="block truncate text-[11px] text-slate-400">
                        {option.secondary}
                      </span>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>
        {selected.length > 0 && (
          <div className="mt-2 border-t border-[#f3f3f3] pt-2">
            <button
              type="button"
              onClick={onClear}
              className="w-full rounded-md px-2 py-1.5 text-left text-xs font-medium text-slate-500 transition-colors hover:bg-[#f9f9fa] hover:text-[#111111]"
            >
              선택 모두 해제
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
