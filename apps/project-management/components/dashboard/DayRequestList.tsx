"use client";

import Link from "next/link";
import dayjs from "dayjs";
import { CalendarOff } from "lucide-react";
import type { RequestRecord } from "@/lib/requests";
import { PriorityBadge, StatusBadge } from "@/components/requests/RequestBadge";

const WEEKDAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"];

function formatHeader(date: string) {
  const d = dayjs(date);
  return `${d.format("M월 D일")} (${WEEKDAY_LABEL[d.day()]})`;
}

interface DayRequestListProps {
  selectedDate: string;
  requests: RequestRecord[];
}

export function DayRequestList({ selectedDate, requests }: DayRequestListProps) {
  const dayRequests = requests
    .filter((r) => r.due_date === selectedDate)
    .sort((a, b) => a.priority.localeCompare(b.priority));

  const undatedCount = requests.filter((r) => !r.due_date).length;

  return (
    <div className="flex h-full flex-col rounded-xl border border-[#f3f3f3] bg-white">
      <div className="border-b border-[#f3f3f3] px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
          마감 일정
        </p>
        <p className="mt-1 text-base font-semibold text-[#111111]">
          {formatHeader(selectedDate)}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          내가 담당하는 요청 {dayRequests.length}건
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {dayRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <CalendarOff size={20} strokeWidth={1.5} className="mb-2 text-slate-300" />
            <p className="text-sm text-slate-500">
              이 날 마감인 요청이 없습니다.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#f3f3f3]">
            {dayRequests.map((request) => (
              <li key={request.id}>
                <Link
                  href={`/requests/${request.id}`}
                  className="block px-4 py-3 transition-colors hover:bg-[#fafafa]"
                >
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <StatusBadge status={request.status} />
                    <PriorityBadge priority={request.priority} />
                  </div>
                  <p className="truncate text-sm font-medium text-[#111111]">
                    {request.title}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {request.requester_name}
                    {request.request_type_name
                      ? ` · ${request.request_type_name}`
                      : ""}
                    {request.customer_names?.length ? ` · ${request.customer_names.join(", ")}` : ""}
                    {request.affiliate_names?.length ? ` · ${request.affiliate_names.join(", ")}` : ""}
                    {displayTeamNames(request) ? ` · ${displayTeamNames(request)}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {undatedCount > 0 && (
        <div className="border-t border-[#f3f3f3] px-4 py-3">
          <Link
            href="/queue"
            className="flex items-center justify-between text-xs text-slate-500 transition-colors hover:text-[#111111]"
          >
            <span>마감일 미정 {undatedCount}건</span>
            <span aria-hidden>→</span>
          </Link>
        </div>
      )}
    </div>
  );
}

function displayTeamNames(request: RequestRecord) {
  const names =
    request.team_names && request.team_names.length > 0
      ? request.team_names
      : request.team_name
        ? [request.team_name]
        : [];

  return names.join(", ");
}
