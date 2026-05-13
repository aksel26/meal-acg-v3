# 대시보드 면접교육 통합 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대시보드에 면접교육 공고 정보를 감독관과 동일한 수준으로 통합 표시

**Architecture:** 캘린더 API와 대시보드 API에 면접교육 공고 조회를 추가하고, 프론트엔드에서 유니온 타입으로 분기 렌더링한다. InterviewSummary 컴포넌트를 신설하여 면접교육 전용 통계 카드를 표시한다.

**Tech Stack:** Next.js 15 App Router, Supabase (supervisor 스키마), React Query, Tailwind CSS, Motion

**Spec:** `docs/superpowers/specs/2026-03-23-dashboard-interview-integration-design.md`

---

### Task 1: 캘린더 API에 면접교육 공고 추가

**Files:**
- Modify: `apps/part-time-supervisor/app/api/dashboard/calendar/route.ts`

- [ ] **Step 1: interview_job_postings 병렬 조회 추가**

기존 `job_postings` 쿼리 뒤에 `interview_job_postings` 쿼리를 병렬로 추가:

```typescript
const [supervisorRes, interviewRes] = await Promise.all([
  supabase
    .from("job_postings")
    .select("id, title, platform, start_date, end_date, status")
    .in("status", ["draft", "open", "in_progress"])
    .lte("start_date", monthEnd)
    .gte("end_date", monthStart),
  supabase
    .from("interview_job_postings")
    .select("id, title, platform, start_date, end_date, status")
    .in("status", ["draft", "open"])
    .lte("start_date", monthEnd)
    .gte("end_date", monthStart),
]);
```

- [ ] **Step 2: 응답에 type 필드 추가하여 통합**

```typescript
const jobPostings = [
  ...(supervisorRes.data ?? []).map((jp) => ({
    id: jp.id,
    title: jp.title,
    platform: jp.platform,
    startDate: jp.start_date,
    endDate: jp.end_date,
    status: jp.status,
    type: "supervisor" as const,
  })),
  ...(interviewRes.data ?? []).map((jp) => ({
    id: jp.id,
    title: jp.title,
    platform: jp.platform,
    startDate: jp.start_date,
    endDate: jp.end_date,
    status: jp.status,
    type: "interview" as const,
  })),
];
```

에러 처리: `interviewRes.error`도 체크하여 기존 에러 패턴과 동일하게 처리.

- [ ] **Step 3: 커밋**

```bash
git add apps/part-time-supervisor/app/api/dashboard/calendar/route.ts
git commit -m "feat(part-time-supervisor): 캘린더 API에 면접교육 공고 조회 추가"
```

---

### Task 2: 캘린더 훅 타입 업데이트

**Files:**
- Modify: `apps/part-time-supervisor/hooks/use-dashboard-calendar.ts`

- [ ] **Step 1: CalendarJobPosting과 DayJobLabel에 type 추가**

```typescript
export type CalendarJobPosting = {
  id: string;
  title: string;
  platform: string | null;
  startDate: string;
  endDate: string;
  status: string;
  type: "supervisor" | "interview";  // 추가
};

export type DayJobLabel = {
  id: string;
  title: string;
  platform: string | null;
  type: "supervisor" | "interview";  // 추가
};
```

- [ ] **Step 2: dayMap 생성에서 type 전파**

`existing.push()` 부분 (line 58-61)에 `type` 포함:

```typescript
existing.push({
  id: jp.id,
  title: jp.title,
  platform: jp.platform,
  type: jp.type,  // 추가
});
```

- [ ] **Step 3: 커밋**

```bash
git add apps/part-time-supervisor/hooks/use-dashboard-calendar.ts
git commit -m "feat(part-time-supervisor): 캘린더 훅에 공고 타입 구분 추가"
```

---

### Task 3: 캘린더 UI — 배지 제거 및 컬러 바 추가

**Files:**
- Modify: `apps/part-time-supervisor/components/dashboard/DashboardCalendar.tsx`

- [ ] **Step 1: CustomDayButton에서 배지 JSX 제거**

`DashboardCalendar.tsx`의 CustomDayButton 내부에서 배지 블록 삭제 (line 133-143):

```tsx
// 삭제할 부분:
{!modifiers.outside && count > 0 && (
  <span className={cn("absolute -top-1 -right-2.5 ...")}>+{count}</span>
)}
```

- [ ] **Step 2: 컬러 바 렌더링 추가**

배지 대신 날짜 숫자 아래에 컬러 바 추가. `labels`에서 type별로 존재 여부 판단:

```tsx
const hasSupervisor = labels.some((l) => l.type === "supervisor");
const hasInterview = labels.some((l) => l.type === "interview");

// 날짜 숫자 <span> 아래에 추가:
{!modifiers.outside && (hasSupervisor || hasInterview) && (
  <span className="flex flex-col items-center gap-0.5 mt-0.5">
    {hasSupervisor && (
      <span className="block h-[3px] w-3 rounded-full bg-blue-500" />
    )}
    {hasInterview && (
      <span className="block h-[3px] w-3 rounded-full bg-amber-500" />
    )}
  </span>
)}
```

기존 `<span className="relative inline-flex ...">` 래퍼를 flex-col로 변경하여 숫자와 바를 세로 정렬:

```tsx
<span className="relative flex flex-col items-center">
  <span className={cn("text-sm tabular-nums size-8 flex items-center justify-center rounded-full", ...)}>
    {day.date.getDate()}
  </span>
  {/* 컬러 바 */}
</span>
```

- [ ] **Step 3: 커밋**

```bash
git add apps/part-time-supervisor/components/dashboard/DashboardCalendar.tsx
git commit -m "style(part-time-supervisor): 캘린더 배지를 타입별 컬러 바로 교체"
```

---

### Task 4: 대시보드 API에 면접교육 공고 통합

**Files:**
- Modify: `apps/part-time-supervisor/app/api/dashboard/route.ts`

- [ ] **Step 1: 면접교육 공고 + 배정 조회 추가**

기존 면접교육 `Promise.all` (line 166-186)에 면접교육 공고 쿼리 추가:

```typescript
const [activePersonnelRes, interviewRecordsRes, interviewPersonnelRes, expenseReportRes, interviewJobPostingsRes] = await Promise.all([
  // ... 기존 4개 쿼리 유지 ...
  supabase
    .from("interview_job_postings")
    .select(`
      id, title, platform, start_date, end_date, work_start, work_end, status,
      total_headcount, pay_rate, pay_type,
      interview_job_assignments(id, pay_type, pay_rate, work_hours, status, note,
        personnel:interview_personnel(id, name, role, phone))
    `)
    .in("status", ["draft", "open"])
    .lte("start_date", endDate)
    .gte("end_date", startDate),
]);
```

- [ ] **Step 2: 면접교육 공고를 jobPostings에 통합**

면접교육 공고를 매핑하고 기존 `mappedJobPostings`에 합치기:

```typescript
const interviewJobPostings = (interviewJobPostingsRes.data ?? []).map((jp) => {
  const activeAssignments = (jp.interview_job_assignments ?? []).filter(
    (a: Record<string, unknown>) => a.status !== "cancelled"
  );

  return {
    type: "interview" as const,
    id: jp.id,
    title: jp.title,
    startDate: jp.start_date,
    endDate: jp.end_date,
    platform: jp.platform,
    assignments: activeAssignments.map((a: Record<string, unknown>) => {
      const p = a.personnel as Record<string, unknown> | null;
      return {
        id: a.id,
        name: (p?.name as string) ?? "-",
        role: (p?.role as string) ?? "other",
        payType: a.pay_type as string,
        payRate: a.pay_rate as number,
        workHours: a.work_hours as number | null,
        status: a.status as string,
      };
    }),
  };
});
```

- [ ] **Step 3: interview 통계 확장**

```typescript
// 면접교육 공고 기반 통계
let interviewTotalAssigned = 0;
let interviewEstimatedCost = 0;

for (const jp of interviewJobPostingsRes.data ?? []) {
  const activeAssignments = (jp.interview_job_assignments ?? []).filter(
    (a: Record<string, unknown>) => a.status !== "cancelled"
  );
  interviewTotalAssigned += activeAssignments.length;

  for (const a of activeAssignments) {
    const rec = a as Record<string, unknown>;
    const payType = rec.pay_type as "hourly" | "daily";
    const payRate = rec.pay_rate as number;
    const workHours = rec.work_hours as number | null;

    if (payType === "daily") {
      interviewEstimatedCost += payRate;
    } else {
      const hours = workHours ?? calculateDefaultWorkHours(
        jp.work_start, jp.work_end, null, null
      );
      interviewEstimatedCost += payRate * hours;
    }
  }
}
```

`calculateDefaultWorkHours`는 이미 `lib/cost-utils.ts`에서 import 가능. route.ts 상단에 import 추가:

```typescript
import { calculateAmount, calculateDefaultWorkHours } from "@/lib/cost-utils";
```

기존 route.ts의 로컬 `parseTime`과 `calculateEstimatedCost` 함수는 `cost-utils.ts`의 것과 중복이지만, 기존 코드 변경 최소화를 위해 그대로 유지.

- [ ] **Step 4: 응답 구조 업데이트**

```typescript
return NextResponse.json({
  summary: {
    activeJobCount: mappedJobPostings.length,  // 감독관만
    totalAssigned,
    attendanceCompleted: totalAttendanceCompleted,
    contractCompleted: totalContractCompleted,
    totalEstimatedCost,
  },
  jobPostings: [
    ...mappedJobPostings.map((jp) => ({ ...jp, type: "supervisor" as const })),
    ...interviewJobPostings,
  ],
  interview: {
    activePersonnel: activePersonnelRes.count ?? 0,
    monthlyLaborCost: interviewLaborCost,
    expenseReportStatus: expenseReportRes.data?.status ?? null,
    activeJobCount: interviewJobPostings.length,
    totalAssigned: interviewTotalAssigned,
    totalEstimatedCost: interviewEstimatedCost,
  },
});
```

- [ ] **Step 5: 커밋**

```bash
git add apps/part-time-supervisor/app/api/dashboard/route.ts
git commit -m "feat(part-time-supervisor): 대시보드 API에 면접교육 공고 통합"
```

---

### Task 5: 대시보드 훅 타입 업데이트

**Files:**
- Modify: `apps/part-time-supervisor/hooks/use-dashboard.ts`

- [ ] **Step 1: 유니온 타입 정의**

기존 `DashboardJobPosting` 타입을 `DashboardSupervisorJobPosting`으로 rename하고 유니온 타입 추가:

```typescript
export type DashboardSupervisorJobPosting = {
  type: "supervisor";
  id: string;
  title: string;
  location: string | null;
  platform: string | null;
  workType: string | null;
  startDate: string;
  endDate: string;
  workStart: string | null;
  workEnd: string | null;
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
  payRate: number;
  payType: "hourly" | "daily";
  estimatedCost: number;
  hasIssues: boolean;
};

export type InterviewAssignmentRow = {
  id: string;
  name: string;
  role: string;
  payType: string;
  payRate: number;
  workHours: number | null;
  status: string;
};

export type DashboardInterviewJobPosting = {
  type: "interview";
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  platform: string | null;
  assignments: InterviewAssignmentRow[];
};

export type DashboardJobPosting =
  | DashboardSupervisorJobPosting
  | DashboardInterviewJobPosting;
```

- [ ] **Step 2: DashboardData의 interview 타입 확장**

```typescript
export type DashboardData = {
  summary: {
    activeJobCount: number;
    totalAssigned: number;
    attendanceCompleted: number;
    contractCompleted: number;
    totalEstimatedCost: number;
  };
  jobPostings: DashboardJobPosting[];
  interview?: {
    activePersonnel: number;
    monthlyLaborCost: number;
    expenseReportStatus: string | null;
    activeJobCount: number;
    totalAssigned: number;
    totalEstimatedCost: number;
  };
};
```

- [ ] **Step 3: 커밋**

```bash
git add apps/part-time-supervisor/hooks/use-dashboard.ts
git commit -m "feat(part-time-supervisor): 대시보드 유니온 타입 정의"
```

---

### Task 6: InterviewSummary 컴포넌트 신설

**Files:**
- Create: `apps/part-time-supervisor/components/dashboard/InterviewSummary.tsx`

- [ ] **Step 1: 컴포넌트 작성**

DashboardSummary와 동일한 카드 그리드 레이아웃, 면접교육 전용 카드 구성:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring, useTransform, motion } from "motion/react";
import { Briefcase, Users, UserCheck, Banknote, FileCheck } from "lucide-react";

type Props = {
  interview: {
    activeJobCount: number;
    totalAssigned: number;
    activePersonnel: number;
    monthlyLaborCost: number;
    expenseReportStatus: string | null;
  };
};

function formatCost(cost: number): string {
  return new Intl.NumberFormat("ko-KR").format(cost);
}

function NumberTicker({
  value,
  prefix = "",
  format,
}: {
  value: number;
  prefix?: string;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 120, damping: 20, mass: 0.5 });
  const display = useTransform(spring, (v) => {
    const rounded = Math.round(v);
    const formatted = format ? format(rounded) : String(rounded);
    return `${prefix}${formatted}`;
  });

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return <motion.span ref={ref}>{display}</motion.span>;
}

export function InterviewSummary({ interview }: Props) {
  const cards = [
    {
      label: "진행 중 공고",
      value: interview.activeJobCount,
      icon: Briefcase,
      isCost: false,
    },
    {
      label: "총 배정 인원",
      value: interview.totalAssigned,
      icon: Users,
      isCost: false,
    },
    {
      label: "활동 인력",
      value: interview.activePersonnel,
      icon: UserCheck,
      isCost: false,
    },
    {
      label: "이번달 인건비",
      value: interview.monthlyLaborCost,
      icon: Banknote,
      isCost: true,
    },
    {
      label: "지출결의 상태",
      value: 0,
      icon: FileCheck,
      isCost: false,
      isStatus: true,
      statusValue: interview.expenseReportStatus,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl bg-white p-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
            <div className="flex items-baseline gap-2">
              {"isStatus" in card && card.isStatus ? (
                <span className="text-lg font-bold">
                  {card.statusValue === "finalized" ? (
                    <span className="text-green-600">확정</span>
                  ) : card.statusValue === "draft" ? (
                    <span className="text-amber-600">작성중</span>
                  ) : (
                    <span className="text-muted-foreground">미작성</span>
                  )}
                </span>
              ) : card.isCost ? (
                <span className="tabular-nums text-lg font-bold leading-tight">
                  <NumberTicker value={card.value} prefix="₩" format={formatCost} />
                </span>
              ) : (
                <span className="tabular-nums text-2xl font-bold">
                  <NumberTicker value={card.value} />
                </span>
              )}
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
git add apps/part-time-supervisor/components/dashboard/InterviewSummary.tsx
git commit -m "feat(part-time-supervisor): InterviewSummary 컴포넌트 신설"
```

---

### Task 7: DashboardSummary 제목에 감독관 도트 추가

**Files:**
- Modify: `apps/part-time-supervisor/components/dashboard/DashboardSummary.tsx`

- [ ] **Step 1: 제목 라인 수정**

`DashboardSummary.tsx` line 131의 `<h3>` 태그에 파란 도트 추가:

```tsx
<h3 className="text-sm font-semibold text-muted-foreground">
  <span className="inline-block size-2 rounded-full bg-blue-500 mr-1.5 align-middle" />
  감독관 {dateLabel} 요약 현황
</h3>
```

- [ ] **Step 2: 커밋**

```bash
git add apps/part-time-supervisor/components/dashboard/DashboardSummary.tsx
git commit -m "style(part-time-supervisor): 감독관 요약에 파란 도트 추가"
```

---

### Task 8: 대시보드 페이지 통합

**Files:**
- Modify: `apps/part-time-supervisor/app/(dashboard)/page.tsx`

- [ ] **Step 1: InterviewSummary import 및 면접교육 요약 섹션 추가**

```tsx
import { InterviewSummary } from "@/components/dashboard/InterviewSummary";
```

기존 면접교육 현황 섹션 (line 230-264)을 교체:

```tsx
{/* 면접교육 요약 */}
{data.interview && (
  <div className="space-y-3">
    <h3 className="text-sm font-semibold text-muted-foreground">
      <span className="inline-block size-2 rounded-full bg-amber-500 mr-1.5 align-middle" />
      면접교육 요약 현황
    </h3>
    <InterviewSummary interview={data.interview} />
    {/* 합산 카드 */}
    <div className="rounded-xl bg-slate-900 p-4 text-white">
      <p className="text-xs text-slate-400 mb-1">이번달 총 비용 (감독관 + 면접교육)</p>
      <p className="text-2xl font-bold tabular-nums">
        ₩{new Intl.NumberFormat("ko-KR").format(
          (data.summary.totalEstimatedCost ?? 0) + (data.interview.monthlyLaborCost ?? 0)
        )}
      </p>
    </div>
  </div>
)}
```

- [ ] **Step 2: 공고별 현황에 타입 도트 추가**

공고 리스트 아이템 (line 163-196)에서 제목 앞에 타입 도트 추가:

```tsx
<p className="text-sm font-medium truncate">
  <span className={`inline-block size-1.5 rounded-full mr-1.5 align-middle ${
    jp.type === "interview" ? "bg-amber-500" : "bg-blue-500"
  }`} />
  {jp.title}
</p>
```

- [ ] **Step 3: 공고 클릭 시 타입별 분기 렌더링**

`expandedJob` 렌더링 블록 (line 287-349)에서 `type`으로 분기:

```tsx
{(() => {
  const expandedJob = filteredJobPostings.find((jp) => jp.id === expandedJobId);
  if (!expandedJob) {
    return (/* 기존 빈 상태 유지 */);
  }

  return (
    <motion.div key={expandedJob.id} /* 기존 animation props */>
      <div className="flex items-center justify-between">
        <Link
          href={expandedJob.type === "interview"
            ? `/interview/job-postings/${expandedJob.id}`
            : `/supervisor/job-postings/${expandedJob.id}`
          }
          className="group/link flex items-center gap-1 text-sm font-semibold hover:text-blue-600 transition-colors"
        >
          <span className={`inline-block size-1.5 rounded-full mr-1 ${
            expandedJob.type === "interview" ? "bg-amber-500" : "bg-blue-500"
          }`} />
          {expandedJob.title}
          <ExternalLink size={13} className="text-muted-foreground group-hover/link:text-blue-600 transition-colors" />
        </Link>
        <span className="text-xs text-muted-foreground">
          {expandedJob.type === "supervisor"
            ? `${expandedJob.workers.length}명 배정`
            : `${expandedJob.assignments.length}명 배정`
          }
        </span>
      </div>

      {expandedJob.type === "supervisor" ? (
        /* 기존 감독관 workers 테이블 그대로 */
      ) : (
        /* 면접교육 assignments 테이블 */
        expandedJob.assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">배정된 인력이 없습니다</p>
        ) : (
          <div className="rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">이름</th>
                  <th className="px-3 py-2 text-left font-medium">역할</th>
                  <th className="px-3 py-2 text-left font-medium">급여유형</th>
                  <th className="px-3 py-2 text-right font-medium">급여</th>
                  <th className="px-3 py-2 text-left font-medium">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {expandedJob.assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 bg-white">
                    <td className="px-3 py-2">{a.name}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {a.role === "rp" ? "RP" : a.role === "ft" ? "FT" : a.role === "instructor" ? "강사" : "기타"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {a.payType === "daily" ? "일급" : "시급"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs">
                      ₩{new Intl.NumberFormat("ko-KR").format(a.payRate)}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-xs ${
                        a.status === "completed" ? "text-green-600" :
                        a.status === "cancelled" ? "text-red-500" :
                        "text-muted-foreground"
                      }`}>
                        {a.status === "assigned" ? "배정" : a.status === "completed" ? "완료" : "취소"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </motion.div>
  );
})()}
```

- [ ] **Step 4: filteredJobPostings 필터 확인**

기존 필터 (line 130-136)는 `jp.endDate >= selectedDateStr`로 필터하므로 면접교육 공고도 동일하게 동작 (둘 다 `endDate` 필드 있음). 변경 불필요.

- [ ] **Step 5: 커밋**

```bash
git add apps/part-time-supervisor/app/(dashboard)/page.tsx
git commit -m "feat(part-time-supervisor): 대시보드에 면접교육 공고 통합 표시"
```

---

### Task 9: 타입 체크 및 최종 확인

**Files:** 없음 (검증 단계)

- [ ] **Step 1: TypeScript 타입 체크**

```bash
cd /Users/acg/Documents/meal-acg-v3 && pnpm check-types
```

타입 에러가 있으면 수정. 특히 `page.tsx`에서 유니온 타입 내로잉이 올바른지 확인.

- [ ] **Step 2: 빌드 확인**

```bash
pnpm build:part-time-supervisor
```

- [ ] **Step 3: 최종 커밋 (필요 시)**

타입/빌드 에러 수정 후 커밋.
