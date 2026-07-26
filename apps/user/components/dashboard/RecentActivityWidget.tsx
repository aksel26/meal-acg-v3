"use client";

import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { useRecentActivity } from "@/hooks/use-recent-activity";

export function RecentActivityWidget() {
  const { data, isLoading } = useRecentActivity();

  return (
    <section className="rounded-xl bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#111111]">최근 활동</h2>
          <p className="mt-1 text-xs text-slate-400">전체 인원에게 표시됩니다.</p>
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500">
          <MessageSquareText size={18} strokeWidth={1.5} />
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {isLoading || !data ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-lg bg-[#f9f9fa]"
              />
            ))}
          </div>
        ) : (
          <>
            <ActivityGroup
              title="프로젝트"
              emptyText="최근 프로젝트가 없습니다."
              items={data.projects.map((project) => ({
                href: `/projects/${project.id}`,
                title: project.title,
                meta: `${project.ownerName ?? "담당자 미지정"} · ${project.status}`,
                date: project.createdAt,
              }))}
            />
            <ActivityGroup
              title="요청"
              emptyText="최근 요청이 없습니다."
              items={data.requests.map((request) => ({
                href: `/requests/${request.id}`,
                title: request.title,
                meta: `${request.requesterName} · ${request.status}`,
                date: request.createdAt,
              }))}
            />
            <ActivityGroup
              title="댓글"
              emptyText="최근 댓글이 없습니다."
              items={data.comments.map((comment) => ({
                href: `/requests/${comment.requestId}`,
                title: comment.body,
                meta: `${comment.authorName} · ${comment.requestTitle}`,
                date: comment.createdAt,
              }))}
            />
          </>
        )}
      </div>
    </section>
  );
}

function ActivityGroup({
  title,
  emptyText,
  items,
}: {
  title: string;
  emptyText: string;
  items: { href: string; title: string; meta: string; date: string }[];
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{title}</p>
      <div className="mt-2 space-y-1.5">
        {items.length === 0 ? (
          <p className="rounded-lg bg-[#f9f9fa] px-3 py-2 text-xs text-slate-400">
            {emptyText}
          </p>
        ) : (
          items.map((item) => (
            <Link
              key={`${title}-${item.href}-${item.date}`}
              href={item.href}
              className="block rounded-lg bg-[#f9f9fa] px-3 py-2 transition hover:bg-slate-100"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-xs font-medium text-[#111111]">
                  {item.title}
                </p>
                <span className="shrink-0 text-[11px] text-slate-400">
                  {formatActivityDate(item.date)}
                </span>
              </div>
              <p className="mt-1 truncate text-[11px] text-slate-400">{item.meta}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function formatActivityDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  });
}
