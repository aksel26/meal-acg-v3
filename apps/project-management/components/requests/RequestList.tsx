"use client";

import { ArrowDown, ArrowUp, RotateCcw, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { REQUEST_PRIORITIES, REQUEST_STATUSES } from "@/lib/request-constants";
import type { RequestRecord } from "@/lib/requests";
import { PriorityBadge, StatusBadge } from "@/components/requests/RequestBadge";

type DueDateSort = "" | "due_asc" | "due_desc";
type RequestListFilters = {
  teamFilter: string;
  customerFilter: string;
  assigneeFilter: string;
  statusFilter: string;
  priorityFilter: string;
  dueDateSort: DueDateSort;
};

export function RequestList({
  requests,
  emptyText,
}: {
  requests: RequestRecord[];
  emptyText: string;
}) {
  const pathname = usePathname();
  const storageKey = `request-list-filters:${pathname}`;
  const filtersLoadedRef = useRef(false);
  const [teamFilter, setTeamFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [dueDateSort, setDueDateSort] = useState<DueDateSort>("");

  const filterOptions = useMemo(
    () => ({
      teams: getUniqueSortedValues(requests.flatMap(getTeamNames)),
      customers: getUniqueSortedValues(
        requests.flatMap((request) => request.customer_names ?? []),
      ),
      assignees: getUniqueSortedValues(requests.flatMap(getAssigneeNames)),
    }),
    [requests],
  );

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) {
        filtersLoadedRef.current = true;
        return;
      }

      const filters = JSON.parse(saved) as Partial<RequestListFilters>;

      setTeamFilter(getRestoredValue(filters.teamFilter, filterOptions.teams));
      setCustomerFilter(
        getRestoredValue(filters.customerFilter, filterOptions.customers),
      );
      setAssigneeFilter(
        getRestoredValue(filters.assigneeFilter, filterOptions.assignees),
      );
      setStatusFilter(
        getRestoredValue(filters.statusFilter, [...REQUEST_STATUSES]),
      );
      setPriorityFilter(
        getRestoredValue(filters.priorityFilter, [...REQUEST_PRIORITIES]),
      );
      setDueDateSort(getRestoredDueDateSort(filters.dueDateSort));
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      filtersLoadedRef.current = true;
    }
  }, [
    filterOptions.assignees,
    filterOptions.customers,
    filterOptions.teams,
    storageKey,
  ]);

  useEffect(() => {
    if (!filtersLoadedRef.current) return;

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        teamFilter,
        customerFilter,
        assigneeFilter,
        statusFilter,
        priorityFilter,
        dueDateSort,
      } satisfies RequestListFilters),
    );
  }, [
    assigneeFilter,
    customerFilter,
    dueDateSort,
    priorityFilter,
    statusFilter,
    storageKey,
    teamFilter,
  ]);

  const filteredRequests = useMemo(
    () =>
      requests.filter((request) => {
        const teamMatched =
          !teamFilter || getTeamNames(request).includes(teamFilter);
        const customerMatched =
          !customerFilter ||
          (request.customer_names ?? []).includes(customerFilter);
        const assigneeMatched =
          !assigneeFilter || getAssigneeNames(request).includes(assigneeFilter);
        const statusMatched = !statusFilter || request.status === statusFilter;
        const priorityMatched =
          !priorityFilter || request.priority === priorityFilter;

        return (
          teamMatched &&
          customerMatched &&
          assigneeMatched &&
          statusMatched &&
          priorityMatched
        );
      }),
    [
      assigneeFilter,
      customerFilter,
      priorityFilter,
      requests,
      statusFilter,
      teamFilter,
    ],
  );

  const visibleRequests = useMemo(
    () =>
      dueDateSort
        ? [...filteredRequests].sort((a, b) =>
            compareByDueDate(a, b, dueDateSort),
          )
        : filteredRequests,
    [dueDateSort, filteredRequests],
  );

  const hasActiveFilter = Boolean(
    teamFilter ||
      customerFilter ||
      assigneeFilter ||
      statusFilter ||
      priorityFilter ||
      dueDateSort,
  );

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-[#f3f3f3] bg-white px-6 py-10 text-center">
        <p className="text-sm text-slate-500">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#f3f3f3] bg-white">
      <div className="flex flex-col gap-3 border-b border-[#f3f3f3] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-[#111111]">
          총 {visibleRequests.length.toLocaleString("ko-KR")}건
        </h2>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <FilterSelect
            value={teamFilter}
            options={filterOptions.teams}
            placeholder="전체 팀"
            onChange={setTeamFilter}
          />
          <FilterSelect
            value={customerFilter}
            options={filterOptions.customers}
            placeholder="전체 고객사"
            onChange={setCustomerFilter}
          />
          <FilterSelect
            value={assigneeFilter}
            options={filterOptions.assignees}
            placeholder="전체 담당자"
            onChange={setAssigneeFilter}
          />
          <FilterSelect
            value={statusFilter}
            options={[...REQUEST_STATUSES]}
            placeholder="전체 상태"
            onChange={setStatusFilter}
          />
          <FilterSelect
            value={priorityFilter}
            options={[...REQUEST_PRIORITIES]}
            placeholder="전체 우선순위"
            onChange={setPriorityFilter}
          />
          <div className="flex h-9 overflow-hidden rounded-md border border-[#eeeeee] bg-white">
            <SortButton
              active={dueDateSort === "due_asc"}
              icon={<ArrowUp size={13} strokeWidth={1.8} />}
              label="마감일"
              onClick={() =>
                setDueDateSort(dueDateSort === "due_asc" ? "" : "due_asc")
              }
            />
            <SortButton
              active={dueDateSort === "due_desc"}
              icon={<ArrowDown size={13} strokeWidth={1.8} />}
              label="마감일"
              onClick={() =>
                setDueDateSort(dueDateSort === "due_desc" ? "" : "due_desc")
              }
            />
          </div>
          <button
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md border border-[#eeeeee] px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!hasActiveFilter}
            onClick={() => {
              setTeamFilter("");
              setCustomerFilter("");
              setAssigneeFilter("");
              setStatusFilter("");
              setPriorityFilter("");
              setDueDateSort("");
            }}
            type="button"
          >
            <RotateCcw size={13} strokeWidth={1.6} />
            초기화
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[1240px]">
          <div className="grid grid-cols-[1fr_120px_160px_110px_110px_88px_80px_140px_140px] gap-3 border-b border-[#f3f3f3] bg-[#fafafa] px-4 py-2.5 text-[11px] font-medium uppercase tracking-widest text-slate-400">
            <span>요청</span>
            <span>유형</span>
            <span>고객사</span>
            <span>작성자</span>
            <span>마감일</span>
            <span>상태</span>
            <span>우선순위</span>
            <span>담당 팀</span>
            <span>담당</span>
          </div>
          {visibleRequests.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              필터에 맞는 요청이 없습니다.
            </div>
          ) : (
            <ul className="divide-y divide-[#f3f3f3]">
              {visibleRequests.map((request) => {
                const muted =
                  request.status === "완료" || request.status === "거절";

                return (
                  <li
                    key={request.id}
                    className="grid grid-cols-[1fr_120px_160px_110px_110px_88px_80px_140px_140px] gap-3 px-4 py-3 text-sm transition-colors hover:bg-[#fafafa]"
                  >
                    <Link href={`/requests/${request.id}`} className="min-w-0">
                      <p
                        className={`truncate font-medium ${
                          muted ? "text-slate-400" : "text-[#111111]"
                        }`}
                      >
                        {request.title}
                      </p>
                    </Link>
                    <div className="flex min-w-0 items-center text-xs text-slate-600">
                      <span className="truncate">
                        {request.request_type_name ?? "유형 미지정"}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center text-xs text-slate-600">
                      <span className="truncate">
                        {displayCustomerNames(request)}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center text-xs text-slate-600">
                      <span className="truncate">{request.requester_name}</span>
                    </div>
                    <div className="flex items-center text-xs text-slate-600 tabular-nums">
                      {request.due_date ?? (
                        <span className="text-slate-300">-</span>
                      )}
                    </div>
                    <div className="flex items-center">
                      <StatusBadge status={request.status} />
                    </div>
                    <div className="flex items-center">
                      <PriorityBadge priority={request.priority} />
                    </div>
                    <div className="flex min-w-0 items-center text-xs text-slate-600">
                      <span className="truncate">
                        {displayTeamNames(request)}
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                      <Users
                        size={13}
                        strokeWidth={1.5}
                        className="shrink-0 text-slate-300"
                      />
                      <span className="truncate">
                        {displayAssigneeNames(request)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function displayAssigneeNames(request: RequestRecord) {
  const names = getAssigneeNames(request);

  return names.length > 0 ? names.join(", ") : "미배정";
}

function displayTeamNames(request: RequestRecord) {
  const names = getTeamNames(request);

  return names.length > 0 ? names.join(", ") : "-";
}

function displayCustomerNames(request: RequestRecord) {
  return request.customer_names && request.customer_names.length > 0
    ? request.customer_names.join(", ")
    : "-";
}

function FilterSelect({
  value,
  options,
  placeholder,
  onChange,
}: {
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={placeholder}
      className="h-9 w-36 rounded-md border border-[#eeeeee] bg-white px-2.5 text-sm text-[#111111] outline-none transition-colors focus:border-[#111111] disabled:bg-[#fafafa] disabled:text-slate-400"
      disabled={options.length === 0}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function SortButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex min-w-[86px] items-center justify-center gap-1.5 border-r border-[#eeeeee] px-2.5 text-xs font-medium transition-colors last:border-r-0 ${
        active
          ? "bg-[#111111] text-white"
          : "bg-white text-slate-600 hover:bg-[#fafafa]"
      }`}
      onClick={onClick}
      type="button"
    >
      {icon}
      {label}
    </button>
  );
}

function compareByDueDate(
  a: RequestRecord,
  b: RequestRecord,
  sort: Exclude<DueDateSort, "">,
) {
  const aDue = a.due_date;
  const bDue = b.due_date;

  if (aDue && bDue) {
    const dateCompare = aDue.localeCompare(bDue);
    if (dateCompare !== 0) {
      return sort === "due_asc" ? dateCompare : -dateCompare;
    }
  } else if (aDue) {
    return -1;
  } else if (bDue) {
    return 1;
  }

  return b.created_at.localeCompare(a.created_at);
}

function getRestoredValue(value: unknown, options: string[]) {
  return typeof value === "string" && options.includes(value) ? value : "";
}

function getRestoredDueDateSort(value: unknown): DueDateSort {
  return value === "due_asc" || value === "due_desc" ? value : "";
}

function getTeamNames(request: RequestRecord) {
  if (request.team_names && request.team_names.length > 0)
    return request.team_names;
  return request.team_name ? [request.team_name] : [];
}

function getAssigneeNames(request: RequestRecord) {
  if (request.assignee_names && request.assignee_names.length > 0) {
    return request.assignee_names;
  }
  return request.assignee_name ? [request.assignee_name] : [];
}

function getUniqueSortedValues(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "ko"),
  );
}
