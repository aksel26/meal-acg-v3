# 대시보드 리디자인 구현 계획

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** part-time-supervisor 앱의 대시보드를 날짜 범위 기반 공고별 종합 현황(출석/계약/회의실) 뷰로 완전 교체한다.

**Architecture:** API 한 번 호출로 공고+배정+인력 데이터를 가져오고, 2열 그리드 카드 + 확장 패널 UI로 표시. 문제 카드는 빨간 테두리로 강조.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, TanStack React Query, Tailwind CSS 4, Supabase (supervisor schema), @repo/ui (DateRangePicker), @repo/utils (KST dates)

**Spec:** `docs/superpowers/specs/2026-03-15-dashboard-redesign-design.md`

---

## Chunk 1: 기반 작업 (Query Keys + Hook + API)

### Task 1: Query Keys 확장

**Files:**
- Modify: `apps/part-time-supervisor/lib/query-keys.ts`

- [ ] **Step 1: `query-keys.ts`에 `byDateRange` 추가**

```typescript
// lib/query-keys.ts — dashboard 섹션만 수정
dashboard: {
  all: ["dashboard"] as const,
  byDateRange: (start: string, end: string) => ["dashboard", start, end] as const,
},
```

기존 `all`은 그대로 유지. `byDateRange`는 `["dashboard", start, end]`로 prefix match invalidation이 동작함.

- [ ] **Step 2: 커밋**

```bash
git add apps/part-time-supervisor/lib/query-keys.ts
git commit -m "feat(part-time-supervisor): dashboard queryKey에 byDateRange 추가"
```

---

### Task 2: Dashboard API 교체

**Files:**
- Modify: `apps/part-time-supervisor/app/api/dashboard/route.ts`

- [ ] **Step 1: API 라우트 완전 교체**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

type RoomSlot = {
  date: string;
  start_time: string;
  end_time: string;
  room: string;
};

type AssignmentRow = {
  id: string;
  attendance_status: "checked_in" | "confirmed" | null;
  contract_status: "signed" | "confirmed" | null;
  room_slots: RoomSlot[] | null;
  status: string;
  worker: { id: string; name: string; phone: string } | null;
};

type JobPostingRow = {
  id: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  work_start: string;
  work_end: string;
  status: string;
  headcount: number;
  assignments: AssignmentRow[];
};

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const supabase = createServiceClient();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "start_date and end_date are required" },
        { status: 400 }
      );
    }

    const { data: rawJobPostings, error } = await supabase
      .from("job_postings")
      .select(
        `
        id, title, location, start_date, end_date, work_start, work_end, status, headcount,
        assignments(
          id, attendance_status, contract_status, room_slots, status,
          worker:workers(id, name, phone)
        )
      `
      )
      .in("status", ["open", "in_progress"])
      .lte("start_date", endDate)
      .gte("end_date", startDate);

    if (error) {
      console.error("Dashboard query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const jobPostings = (rawJobPostings as unknown as JobPostingRow[]) || [];

    let totalAssigned = 0;
    let totalAttendanceCompleted = 0;
    let totalContractCompleted = 0;

    const mappedJobPostings = jobPostings.map((jp) => {
      // cancelled 필터링
      const activeAssignments = jp.assignments.filter(
        (a) => a.status !== "cancelled"
      );

      const stats = {
        assigned: activeAssignments.length,
        attendanceCheckedIn: activeAssignments.filter(
          (a) => a.attendance_status === "checked_in"
        ).length,
        attendanceConfirmed: activeAssignments.filter(
          (a) => a.attendance_status === "confirmed"
        ).length,
        contractSigned: activeAssignments.filter(
          (a) => a.contract_status === "signed"
        ).length,
        contractConfirmed: activeAssignments.filter(
          (a) => a.contract_status === "confirmed"
        ).length,
      };

      const notAttended = activeAssignments.filter(
        (a) => a.attendance_status === null
      ).length;
      const notContracted = activeAssignments.filter(
        (a) => a.contract_status === null
      ).length;

      const hasIssues =
        stats.assigned > 0 &&
        (notAttended / stats.assigned >= 0.5 ||
          notContracted / stats.assigned >= 0.5);

      totalAssigned += stats.assigned;
      totalAttendanceCompleted += stats.attendanceConfirmed;
      totalContractCompleted += stats.contractConfirmed;

      return {
        id: jp.id,
        title: jp.title,
        location: jp.location,
        startDate: jp.start_date,
        endDate: jp.end_date,
        workStart: jp.work_start,
        workEnd: jp.work_end,
        status: jp.status,
        headcount: jp.headcount,
        workers: activeAssignments.map((a) => ({
          id: a.id,
          workerId: a.worker?.id ?? "",
          name: a.worker?.name ?? "",
          phone: a.worker?.phone ?? "",
          attendanceStatus: a.attendance_status,
          contractStatus: a.contract_status,
          roomSlots: a.room_slots,
        })),
        stats,
        hasIssues,
      };
    });

    return NextResponse.json({
      summary: {
        activeJobCount: mappedJobPostings.length,
        totalAssigned,
        attendanceCompleted: totalAttendanceCompleted,
        contractCompleted: totalContractCompleted,
      },
      jobPostings: mappedJobPostings,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/part-time-supervisor/app/api/dashboard/route.ts
git commit -m "feat(part-time-supervisor): 대시보드 API를 날짜 범위 기반 종합 현황으로 교체"
```

---

### Task 3: useDashboard 훅 생성

**Files:**
- Create: `apps/part-time-supervisor/hooks/use-dashboard.ts`

- [ ] **Step 1: 훅 파일 생성**

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { RoomSlot } from "@/lib/room-constants";

export type DashboardWorker = {
  id: string;
  workerId: string;
  name: string;
  phone: string;
  attendanceStatus: "checked_in" | "confirmed" | null;
  contractStatus: "signed" | "confirmed" | null;
  roomSlots: RoomSlot[] | null;
};

export type DashboardJobPosting = {
  id: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  workStart: string;
  workEnd: string;
  status: string;
  headcount: number;
  workers: DashboardWorker[];
  stats: {
    assigned: number;
    attendanceCheckedIn: number;
    attendanceConfirmed: number;
    contractSigned: number;
    contractConfirmed: number;
  };
  hasIssues: boolean;
};

export type DashboardData = {
  summary: {
    activeJobCount: number;
    totalAssigned: number;
    attendanceCompleted: number;
    contractCompleted: number;
  };
  jobPostings: DashboardJobPosting[];
};

export function useDashboard(startDate: string, endDate: string) {
  return useQuery<DashboardData>({
    queryKey: queryKeys.dashboard.byDateRange(startDate, endDate),
    queryFn: async () => {
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
      const res = await fetch(`/api/dashboard?${params}`);
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
    enabled: !!startDate && !!endDate,
  });
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/part-time-supervisor/hooks/use-dashboard.ts
git commit -m "feat(part-time-supervisor): useDashboard 훅 생성 (날짜 범위 파라미터)"
```

---

## Chunk 2: UI 컴포넌트 (Controls + Summary)

### Task 4: DashboardControls 컴포넌트

**Files:**
- Create: `apps/part-time-supervisor/components/dashboard/DashboardControls.tsx`

- [ ] **Step 1: 컴포넌트 생성**

날짜 범위 선택 + 프리셋 버튼(오늘/이번 주/이번 달). `@repo/ui`의 `DateRangePicker` 사용. `dayjs`로 날짜 계산.

```typescript
"use client";

import { DateRangePicker } from "@repo/ui/src/date-range-picker";
import { Button } from "@repo/ui/src/button";
import dayjs from "dayjs";

type Props = {
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
};

export function DashboardControls({ startDate, endDate, onChange }: Props) {
  const today = dayjs().format("YYYY-MM-DD");

  const presets = [
    {
      label: "오늘",
      onClick: () => onChange({ startDate: today, endDate: today }),
    },
    {
      label: "이번 주",
      onClick: () => {
        // 월요일 ~ 일요일 (dayjs 기본은 일요일 시작이므로 수동 계산)
        const day = dayjs().day(); // 0=Sun, 1=Mon, ...
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const monday = dayjs().add(diffToMonday, "day").format("YYYY-MM-DD");
        const sunday = dayjs().add(diffToMonday + 6, "day").format("YYYY-MM-DD");
        onChange({ startDate: monday, endDate: sunday });
      },
    },
    {
      label: "이번 달",
      onClick: () => {
        const first = dayjs().startOf("month").format("YYYY-MM-DD");
        const last = dayjs().endOf("month").format("YYYY-MM-DD");
        onChange({ startDate: first, endDate: last });
      },
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        onChange={onChange}
        className="w-auto"
      />
      <div className="flex gap-1.5">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            onClick={preset.onClick}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
```

> **주의:** dayjs 기본은 일요일 시작이므로 수동으로 월요일~일요일 계산. `dayjs`는 `"dayjs"`에서 직접 import (기존 코드베이스 패턴).

- [ ] **Step 2: 커밋**

```bash
git add apps/part-time-supervisor/components/dashboard/DashboardControls.tsx
git commit -m "feat(part-time-supervisor): DashboardControls 컴포넌트 — 날짜 범위 선택 + 프리셋"
```

---

### Task 5: DashboardSummary 컴포넌트

**Files:**
- Create: `apps/part-time-supervisor/components/dashboard/DashboardSummary.tsx`

- [ ] **Step 1: 컴포넌트 생성**

4개 요약 통계 카드. 출석/계약 비율에 따라 텍스트 색상 변경.

```typescript
import { Briefcase, Users, UserCheck, FileCheck } from "lucide-react";

type Props = {
  summary: {
    activeJobCount: number;
    totalAssigned: number;
    attendanceCompleted: number;
    contractCompleted: number;
  };
};

function getRateColor(completed: number, total: number): string {
  if (total === 0) return "";
  const rate = completed / total;
  if (rate >= 0.8) return "text-green-400";
  if (rate >= 0.5) return "text-yellow-400";
  return "text-red-400";
}

export function DashboardSummary({ summary }: Props) {
  const cards = [
    {
      label: "진행 중 공고",
      value: summary.activeJobCount,
      icon: Briefcase,
      color: "bg-blue-500/10 text-blue-400",
      valueColor: "",
      suffix: "",
    },
    {
      label: "총 배정 인원",
      value: summary.totalAssigned,
      icon: Users,
      color: "bg-slate-500/10 text-slate-400",
      valueColor: "",
      suffix: "",
    },
    {
      label: "출석 완료",
      value: summary.attendanceCompleted,
      icon: UserCheck,
      color: "bg-green-500/10 text-green-400",
      valueColor: getRateColor(summary.attendanceCompleted, summary.totalAssigned),
      suffix: ` / ${summary.totalAssigned}`,
    },
    {
      label: "계약 완료",
      value: summary.contractCompleted,
      icon: FileCheck,
      color: "bg-blue-500/10 text-blue-400",
      valueColor: getRateColor(summary.contractCompleted, summary.totalAssigned),
      suffix: ` / ${summary.totalAssigned}`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border p-4">
          <div className="flex items-center gap-2.5">
            <div className={`rounded-lg p-2 ${card.color}`}>
              <card.icon size={18} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${card.valueColor}`}>
                  {card.value}
                </span>
                {card.suffix && (
                  <span className="text-sm text-muted-foreground">{card.suffix}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/part-time-supervisor/components/dashboard/DashboardSummary.tsx
git commit -m "feat(part-time-supervisor): DashboardSummary 컴포넌트 — 요약 통계 4개 카드"
```

---

## Chunk 3: UI 컴포넌트 (카드 + 그리드)

### Task 6: JobPostingCard 컴포넌트

**Files:**
- Create: `apps/part-time-supervisor/components/dashboard/JobPostingCard.tsx`

- [ ] **Step 1: 컴포넌트 생성**

공고 요약 카드. 제목/기간/장소/상태 + 배정/출석/계약 미니 통계. 문제 카드는 빨간 테두리.

```typescript
import type { DashboardJobPosting } from "@/hooks/use-dashboard";
import { ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  jobPosting: DashboardJobPosting;
  isExpanded: boolean;
  onClick: () => void;
};

function getRateColor(completed: number, total: number): string {
  if (total === 0) return "text-muted-foreground";
  const rate = completed / total;
  if (rate >= 0.8) return "text-green-400";
  if (rate >= 0.5) return "text-yellow-400";
  return "text-red-400";
}

function getStatusLabel(status: string) {
  switch (status) {
    case "open": return "모집중";
    case "in_progress": return "진행중";
    default: return status;
  }
}

export function JobPostingCard({ jobPosting: jp, isExpanded, onClick }: Props) {
  const { stats } = jp;
  const notAttended = stats.assigned - stats.attendanceCheckedIn - stats.attendanceConfirmed;
  const notContracted = stats.assigned - stats.contractSigned - stats.contractConfirmed;

  const miniStats = [
    {
      label: "배정",
      value: `${stats.assigned}/${jp.headcount}`,
      color: "",
    },
    {
      label: "출석",
      value: `${stats.attendanceConfirmed}/${stats.assigned}`,
      color: getRateColor(stats.attendanceConfirmed, stats.assigned),
    },
    {
      label: "계약",
      value: `${stats.contractConfirmed}/${stats.assigned}`,
      color: getRateColor(stats.contractConfirmed, stats.assigned),
    },
  ];

  return (
    <div
      className={`cursor-pointer rounded-xl border p-4 transition-colors hover:bg-accent/50 ${
        jp.hasIssues ? "border-red-500" : ""
      } ${isExpanded ? "ring-2 ring-primary" : ""}`}
      onClick={onClick}
    >
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h4 className="font-semibold">{jp.title}</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {jp.startDate} ~ {jp.endDate} · {jp.location} · {jp.workStart}-{jp.workEnd}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
            {getStatusLabel(jp.status)}
          </span>
          {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </div>
      </div>

      {stats.assigned > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {miniStats.map((s) => (
            <div key={s.label} className="rounded-lg bg-muted/50 p-2 text-center">
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
              <div className={`text-lg font-semibold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">배정 인원 없음</p>
      )}

      {jp.hasIssues && stats.assigned > 0 && (
        <p className="mt-2 text-xs text-red-400">
          ⚠ {notAttended > 0 ? `미출석 ${notAttended}명` : ""}
          {notAttended > 0 && notContracted > 0 ? " · " : ""}
          {notContracted > 0 ? `미계약 ${notContracted}명` : ""}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/part-time-supervisor/components/dashboard/JobPostingCard.tsx
git commit -m "feat(part-time-supervisor): JobPostingCard 컴포넌트 — 공고 요약 카드 + 문제 감지"
```

---

### Task 7: JobPostingGrid 컴포넌트

**Files:**
- Create: `apps/part-time-supervisor/components/dashboard/JobPostingGrid.tsx`

- [ ] **Step 1: 컴포넌트 생성**

2열 그리드. 확장 패널은 해당 카드의 행 아래 전체 너비로 표시. 카드 클릭으로 확장/축소 토글.

```typescript
"use client";

import { useState } from "react";
import type { DashboardJobPosting } from "@/hooks/use-dashboard";
import { JobPostingCard } from "./JobPostingCard";
import { JobPostingDetail } from "./JobPostingDetail";

type Props = {
  jobPostings: DashboardJobPosting[];
};

export function JobPostingGrid({ jobPostings }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (jobPostings.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        선택한 기간에 해당하는 공고가 없습니다.
      </div>
    );
  }

  // 2열 그리드에서 행 단위로 그룹핑 (확장 패널 위치 계산)
  const rows: DashboardJobPosting[][] = [];
  for (let i = 0; i < jobPostings.length; i += 2) {
    rows.push(jobPostings.slice(i, i + 2));
  }

  const expandedJobPosting = jobPostings.find((jp) => jp.id === expandedId);

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">공고별 현황</h3>
      <div className="space-y-3">
        {rows.map((row, rowIdx) => {
          const rowHasExpanded = row.some((jp) => jp.id === expandedId);
          return (
            <div key={rowIdx}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {row.map((jp) => (
                  <JobPostingCard
                    key={jp.id}
                    jobPosting={jp}
                    isExpanded={jp.id === expandedId}
                    onClick={() =>
                      setExpandedId(expandedId === jp.id ? null : jp.id)
                    }
                  />
                ))}
              </div>
              {rowHasExpanded && expandedJobPosting && (
                <div className="mt-3">
                  <JobPostingDetail jobPosting={expandedJobPosting} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/part-time-supervisor/components/dashboard/JobPostingGrid.tsx
git commit -m "feat(part-time-supervisor): JobPostingGrid 컴포넌트 — 2열 그리드 + 행 단위 확장"
```

---

## Chunk 4: 확장 패널 (Detail 탭들)

### Task 8: JobPostingDetail 컴포넌트 (탭 컨테이너)

**Files:**
- Create: `apps/part-time-supervisor/components/dashboard/JobPostingDetail.tsx`

- [ ] **Step 1: 컴포넌트 생성**

확장 패널 컨테이너. 출석/계약/회의실 3개 탭 전환.

```typescript
"use client";

import { useState } from "react";
import type { DashboardJobPosting } from "@/hooks/use-dashboard";
import { JobPostingDetailAttendance } from "./JobPostingDetailAttendance";
import { JobPostingDetailContract } from "./JobPostingDetailContract";
import { JobPostingDetailRooms } from "./JobPostingDetailRooms";

type Props = {
  jobPosting: DashboardJobPosting;
};

const TABS = [
  { id: "attendance", label: "출석" },
  { id: "contract", label: "계약" },
  { id: "rooms", label: "회의실" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function JobPostingDetail({ jobPosting }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("attendance");

  if (jobPosting.workers.length === 0) {
    return (
      <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
        배정된 인원이 없습니다.
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-5">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-semibold">{jobPosting.title} — 상세 현황</h4>
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "attendance" && (
        <JobPostingDetailAttendance workers={jobPosting.workers} />
      )}
      {activeTab === "contract" && (
        <JobPostingDetailContract workers={jobPosting.workers} />
      )}
      {activeTab === "rooms" && (
        <JobPostingDetailRooms workers={jobPosting.workers} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/part-time-supervisor/components/dashboard/JobPostingDetail.tsx
git commit -m "feat(part-time-supervisor): JobPostingDetail 컴포넌트 — 확장 패널 탭 컨테이너"
```

---

### Task 9: JobPostingDetailAttendance 컴포넌트

**Files:**
- Create: `apps/part-time-supervisor/components/dashboard/JobPostingDetailAttendance.tsx`

- [ ] **Step 1: 컴포넌트 생성**

출석 탭 테이블. 이름, 연락처, 출석 상태, 계약 상태, 회의실 컬럼.

```typescript
import type { DashboardWorker } from "@/hooks/use-dashboard";

type Props = {
  workers: DashboardWorker[];
};

function getAttendanceBadge(status: DashboardWorker["attendanceStatus"]) {
  switch (status) {
    case "confirmed":
      return <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">출석확인</span>;
    case "checked_in":
      return <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400">확인대기</span>;
    default:
      return <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">미출석</span>;
  }
}

function getContractBadge(status: DashboardWorker["contractStatus"]) {
  switch (status) {
    case "confirmed":
      return <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">확인완료</span>;
    case "signed":
      return <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400">서명완료</span>;
    default:
      return <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">미서명</span>;
  }
}

function formatRoomSlots(worker: DashboardWorker): string {
  if (!worker.roomSlots || worker.roomSlots.length === 0) return "미배정";
  return worker.roomSlots
    .map((s) => `${s.room} (${s.start_time}-${s.end_time})`)
    .join(", ");
}

export function JobPostingDetailAttendance({ workers }: Props) {
  // 미출석 우선 정렬
  const sorted = [...workers].sort((a, b) => {
    const order: Record<string, number> = { null: 0, checked_in: 1, confirmed: 2 };
    const aOrder = order[a.attendanceStatus ?? "null"] ?? 0;
    const bOrder = order[b.attendanceStatus ?? "null"] ?? 0;
    return aOrder - bOrder;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-3 py-2">이름</th>
            <th className="px-3 py-2">연락처</th>
            <th className="px-3 py-2 text-center">출석 상태</th>
            <th className="px-3 py-2 text-center">계약 상태</th>
            <th className="px-3 py-2">회의실</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((w) => (
            <tr key={w.id} className="border-b last:border-0">
              <td className="px-3 py-2 font-medium">{w.name}</td>
              <td className="px-3 py-2 text-muted-foreground">{w.phone}</td>
              <td className="px-3 py-2 text-center">{getAttendanceBadge(w.attendanceStatus)}</td>
              <td className="px-3 py-2 text-center">{getContractBadge(w.contractStatus)}</td>
              <td className="px-3 py-2 text-muted-foreground">{formatRoomSlots(w)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/part-time-supervisor/components/dashboard/JobPostingDetailAttendance.tsx
git commit -m "feat(part-time-supervisor): 출석 탭 테이블 컴포넌트"
```

---

### Task 10: JobPostingDetailContract 컴포넌트

**Files:**
- Create: `apps/part-time-supervisor/components/dashboard/JobPostingDetailContract.tsx`

- [ ] **Step 1: 컴포넌트 생성**

계약 탭 테이블. 출석 탭과 동일 구조, 계약 상태 기준 정렬.

```typescript
import type { DashboardWorker } from "@/hooks/use-dashboard";

type Props = {
  workers: DashboardWorker[];
};

function getContractBadge(status: DashboardWorker["contractStatus"]) {
  switch (status) {
    case "confirmed":
      return <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">확인완료</span>;
    case "signed":
      return <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400">서명완료</span>;
    default:
      return <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">미서명</span>;
  }
}

function getAttendanceBadge(status: DashboardWorker["attendanceStatus"]) {
  switch (status) {
    case "confirmed":
      return <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">출석확인</span>;
    case "checked_in":
      return <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400">확인대기</span>;
    default:
      return <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">미출석</span>;
  }
}

export function JobPostingDetailContract({ workers }: Props) {
  // 미서명 우선 정렬
  const sorted = [...workers].sort((a, b) => {
    const order: Record<string, number> = { null: 0, signed: 1, confirmed: 2 };
    const aOrder = order[a.contractStatus ?? "null"] ?? 0;
    const bOrder = order[b.contractStatus ?? "null"] ?? 0;
    return aOrder - bOrder;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-3 py-2">이름</th>
            <th className="px-3 py-2">연락처</th>
            <th className="px-3 py-2 text-center">계약 상태</th>
            <th className="px-3 py-2 text-center">출석 상태</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((w) => (
            <tr key={w.id} className="border-b last:border-0">
              <td className="px-3 py-2 font-medium">{w.name}</td>
              <td className="px-3 py-2 text-muted-foreground">{w.phone}</td>
              <td className="px-3 py-2 text-center">{getContractBadge(w.contractStatus)}</td>
              <td className="px-3 py-2 text-center">{getAttendanceBadge(w.attendanceStatus)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/part-time-supervisor/components/dashboard/JobPostingDetailContract.tsx
git commit -m "feat(part-time-supervisor): 계약 탭 테이블 컴포넌트"
```

---

### Task 11: JobPostingDetailRooms 컴포넌트

**Files:**
- Create: `apps/part-time-supervisor/components/dashboard/JobPostingDetailRooms.tsx`

- [ ] **Step 1: 컴포넌트 생성**

회의실 탭. 방별 그룹핑 + 배정 인원 리스트. 미배정 인원 별도 섹션.

```typescript
import type { DashboardWorker } from "@/hooks/use-dashboard";
import { ROOMS, getRoomById } from "@/lib/room-constants";

type Props = {
  workers: DashboardWorker[];
};

type RoomGroup = {
  roomId: string;
  roomName: string;
  entries: Array<{
    workerName: string;
    startTime: string;
    endTime: string;
  }>;
};

export function JobPostingDetailRooms({ workers }: Props) {
  // 회의실별 그룹핑
  const roomMap = new Map<string, RoomGroup>();

  for (const worker of workers) {
    if (!worker.roomSlots || worker.roomSlots.length === 0) continue;
    for (const slot of worker.roomSlots) {
      if (!roomMap.has(slot.room)) {
        const room = getRoomById(slot.room);
        roomMap.set(slot.room, {
          roomId: slot.room,
          roomName: room?.name ?? slot.room,
          entries: [],
        });
      }
      roomMap.get(slot.room)!.entries.push({
        workerName: worker.name,
        startTime: slot.start_time,
        endTime: slot.end_time,
      });
    }
  }

  // ROOMS 순서대로 정렬 (배정 있는 방만)
  const orderedRooms = ROOMS
    .map((r) => roomMap.get(r.id))
    .filter((g): g is RoomGroup => g !== undefined);

  // 미배정 인원
  const unassigned = workers.filter(
    (w) => !w.roomSlots || w.roomSlots.length === 0
  );

  return (
    <div className="space-y-4">
      {orderedRooms.length === 0 && unassigned.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          회의실 배정 데이터가 없습니다.
        </p>
      )}

      {orderedRooms.map((group) => (
        <div key={group.roomId}>
          <h5 className="mb-1.5 text-sm font-semibold">{group.roomName}</h5>
          <div className="space-y-1 pl-3">
            {group.entries
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((entry, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  <span>{entry.workerName}</span>
                  <span className="text-muted-foreground">
                    {entry.startTime}-{entry.endTime}
                  </span>
                </div>
              ))}
          </div>
        </div>
      ))}

      {unassigned.length > 0 && (
        <div>
          <h5 className="mb-1.5 text-sm font-semibold text-muted-foreground">
            미배정 ({unassigned.length}명)
          </h5>
          <p className="pl-3 text-sm text-muted-foreground">
            {unassigned.map((w) => w.name).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/part-time-supervisor/components/dashboard/JobPostingDetailRooms.tsx
git commit -m "feat(part-time-supervisor): 회의실 탭 컴포넌트 — 방별 배정 인원 + 미배정"
```

---

## Chunk 5: 대시보드 페이지 통합 + 검증

### Task 12: 대시보드 페이지 교체

**Files:**
- Modify: `apps/part-time-supervisor/app/(dashboard)/page.tsx`

- [ ] **Step 1: page.tsx 완전 교체**

```typescript
"use client";

import { useState } from "react";
import dayjs from "dayjs";
import { useDashboard } from "@/hooks/use-dashboard";
import { DashboardControls } from "@/components/dashboard/DashboardControls";
import { DashboardSummary } from "@/components/dashboard/DashboardSummary";
import { JobPostingGrid } from "@/components/dashboard/JobPostingGrid";

export default function DashboardPage() {
  const today = dayjs().format("YYYY-MM-DD");
  const [dateRange, setDateRange] = useState({ startDate: today, endDate: today });

  const { data, isLoading } = useDashboard(dateRange.startDate, dateRange.endDate);

  return (
    <div className="space-y-6">
      <DashboardControls
        startDate={dateRange.startDate}
        endDate={dateRange.endDate}
        onChange={setDateRange}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          로딩 중...
        </div>
      ) : data ? (
        <>
          <DashboardSummary summary={data.summary} />
          <JobPostingGrid jobPostings={data.jobPostings} />
        </>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add apps/part-time-supervisor/app/\(dashboard\)/page.tsx
git commit -m "feat(part-time-supervisor): 대시보드 페이지 완전 교체 — 날짜 기반 종합 현황"
```

---

### Task 13: 빌드 검증

- [ ] **Step 1: 타입 체크**

```bash
cd apps/part-time-supervisor && pnpm check-types
```

타입 에러가 있으면 수정.

- [ ] **Step 2: 린트 체크**

```bash
pnpm lint
```

린트 에러가 있으면 수정.

- [ ] **Step 3: 빌드 확인**

```bash
pnpm build:part-time-supervisor
```

빌드 성공 확인.

- [ ] **Step 4: 브라우저에서 수동 확인**

`pnpm dev:part-time-supervisor`로 개발 서버 실행 후:
1. 대시보드 페이지 로드 → 오늘 날짜 기준 데이터 표시 확인
2. 날짜 범위 변경 → 데이터 갱신 확인
3. 프리셋 버튼(오늘/이번 주/이번 달) 동작 확인
4. 공고 카드 클릭 → 확장 패널 표시 확인
5. 탭 전환(출석/계약/회의실) 확인
6. 데이터 없는 날짜 → 빈 상태 메시지 확인
