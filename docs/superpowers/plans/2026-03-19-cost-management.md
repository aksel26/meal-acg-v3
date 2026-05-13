# 비용관리 기능 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Part-time Supervisor 앱에 지원자별 월 단위 비용 산정 페이지 추가

**Architecture:** assignments 테이블에 단가 오버라이드 컬럼 추가, work_records 신규 테이블 생성. 비용관리 페이지에서 지원자별 월별 비용 조회/수정/엑셀 내보내기 제공.

**Tech Stack:** Next.js 15 App Router, Supabase (supervisor schema), TanStack React Query, Radix UI + Tailwind CSS 4, exceljs

**Spec:** `docs/superpowers/specs/2026-03-19-cost-management-design.md`

---

## File Structure

### 신규 파일
| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260319_work_records.sql` | DB 마이그레이션 (assignments 변경 + work_records 생성) |
| `apps/part-time-supervisor/lib/cost-utils.ts` | 근무 시간 계산, 금액 산정 유틸리티 |
| `apps/part-time-supervisor/app/api/cost-management/route.ts` | 월별 비용 산정 조회 API |
| `apps/part-time-supervisor/app/api/cost-management/export/route.ts` | 엑셀 내보내기 API |
| `apps/part-time-supervisor/app/api/work-records/route.ts` | 근무 기록 조회/수정 API |
| `apps/part-time-supervisor/app/api/work-records/generate/route.ts` | 근무 기록 일괄 생성 API |
| `apps/part-time-supervisor/app/api/assignments/[id]/pay-override/route.ts` | 단가 오버라이드 API |
| `apps/part-time-supervisor/hooks/use-cost-management.ts` | 비용 산정 조회 훅 |
| `apps/part-time-supervisor/hooks/use-work-records.ts` | 근무 기록 조회/수정/생성 훅 |
| `apps/part-time-supervisor/hooks/use-pay-override.ts` | 단가 오버라이드 훅 |
| `apps/part-time-supervisor/hooks/use-cost-export.ts` | 엑셀 내보내기 훅 |
| `apps/part-time-supervisor/app/(dashboard)/cost-management/page.tsx` | 비용관리 페이지 라우트 |
| `apps/part-time-supervisor/components/cost-management/CostManagementPage.tsx` | 메인 페이지 컴포넌트 |
| `apps/part-time-supervisor/components/cost-management/CostSummaryCards.tsx` | 요약 카드 |
| `apps/part-time-supervisor/components/cost-management/CostWorkerTable.tsx` | 지원자별 비용 테이블 |
| `apps/part-time-supervisor/components/cost-management/CostWorkerExpandedRow.tsx` | 펼침 행 (공고별 상세) |
| `apps/part-time-supervisor/components/cost-management/WorkRecordEditModal.tsx` | 근무 기록 편집 모달 |
| `apps/part-time-supervisor/components/cost-management/PayRateOverrideForm.tsx` | 단가 오버라이드 폼 |
| `apps/part-time-supervisor/components/cost-management/CostExportButton.tsx` | 엑셀 내보내기 버튼 |

### 수정 파일
| File | Change |
|------|--------|
| `apps/part-time-supervisor/lib/supabase/types.ts` | Assignment 타입에 오버라이드 필드 추가 + WorkRecord 타입 |
| `apps/part-time-supervisor/lib/query-keys.ts` | costManagement, workRecords 쿼리 키 추가 |
| `apps/part-time-supervisor/components/layout/Sidebar.tsx` | 비용 관리 메뉴 추가 |

---

## Task 1: DB 마이그레이션 + TypeScript 타입

**Files:**
- Create: `supabase/migrations/20260319_work_records.sql`
- Modify: `apps/part-time-supervisor/lib/supabase/types.ts`

- [ ] **Step 1: 마이그레이션 파일 생성**

```sql
-- =============================================================
-- Work Records + Assignment Pay Override Migration
-- =============================================================

-- assignments 테이블에 단가 오버라이드 컬럼 추가
ALTER TABLE supervisor.assignments
  ADD COLUMN pay_rate_override numeric CHECK (pay_rate_override IS NULL OR pay_rate_override > 0);
ALTER TABLE supervisor.assignments
  ADD COLUMN pay_type_override text CHECK (pay_type_override IS NULL OR pay_type_override IN ('hourly', 'daily'));

-- work_records (근무 기록)
CREATE TABLE supervisor.work_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id uuid NOT NULL REFERENCES supervisor.assignments(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  work_hours numeric(4,1) NOT NULL CHECK (work_hours >= 0 AND work_hours <= 24),
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(assignment_id, work_date)
);

CREATE INDEX idx_work_records_assignment_id ON supervisor.work_records(assignment_id);
CREATE INDEX idx_work_records_work_date ON supervisor.work_records(work_date);

-- RLS
ALTER TABLE supervisor.work_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON supervisor.work_records
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Grant
GRANT ALL ON supervisor.work_records TO service_role;

-- updated_at 트리거 (기존 supervisor 패턴)
CREATE TRIGGER set_updated_at BEFORE UPDATE ON supervisor.work_records
  FOR EACH ROW EXECUTE FUNCTION supervisor.update_updated_at();
```

- [ ] **Step 2: TypeScript 타입 업데이트**

`apps/part-time-supervisor/lib/supabase/types.ts`에서 `Assignment` 타입에 두 필드 추가:

```typescript
// Assignment 타입의 updated_at 뒤에 추가
pay_rate_override: number | null;
pay_type_override: "hourly" | "daily" | null;
```

같은 파일 하단에 `WorkRecord` 타입 추가:

```typescript
export type WorkRecord = {
  id: string;
  assignment_id: string;
  work_date: string;
  work_hours: number;
  note: string | null;
  created_at: string;
  updated_at: string;
};
```

- [ ] **Step 3: 로컬 DB에 마이그레이션 적용**

Supabase Studio SQL 에디터에서 마이그레이션 SQL 직접 실행 (기존 데이터 보존).
`supabase db reset`은 전체 DB를 삭제하므로 사용하지 않음.

- [ ] **Step 4: 타입 체크**

Run: `cd /Users/acg/Documents/meal-acg-v3 && pnpm check-types`
Expected: 기존 코드에서 Assignment 사용하는 곳에 에러 없어야 함 (새 필드는 nullable이므로)

- [ ] **Step 5: 커밋**

```bash
git add supabase/migrations/20260319_work_records.sql apps/part-time-supervisor/lib/supabase/types.ts
git commit -m "feat(part-time-supervisor): work_records 테이블 및 단가 오버라이드 스키마 추가"
```

---

## Task 2: 유틸리티 + 쿼리 키

**Files:**
- Create: `apps/part-time-supervisor/lib/cost-utils.ts`
- Modify: `apps/part-time-supervisor/lib/query-keys.ts`

- [ ] **Step 1: cost-utils.ts 생성**

```typescript
/**
 * 시간 문자열("HH:MM")을 시간(number)으로 변환
 */
export function parseTime(time: string): number {
  const parts = time.split(":").map(Number);
  return (parts[0] ?? 0) + (parts[1] ?? 0) / 60;
}

/**
 * 공고의 시간 설정으로부터 기본 근무 시간 계산
 * null 대응: work_start/work_end null이면 8.0h, lunch null이면 공제 없음
 */
export function calculateDefaultWorkHours(
  workStart: string | null,
  workEnd: string | null,
  lunchStart: string | null,
  lunchEnd: string | null
): number {
  if (!workStart || !workEnd) return 8.0;

  let hours = parseTime(workEnd) - parseTime(workStart);
  if (lunchStart && lunchEnd) {
    hours -= parseTime(lunchEnd) - parseTime(lunchStart);
  }
  return Math.max(Math.round(hours * 10) / 10, 0);
}

/**
 * 금액 산정
 * 시급제: payRate × workHours
 * 일급제: payRate × 1 (일수 기준)
 */
export function calculateAmount(
  payType: "hourly" | "daily",
  payRate: number,
  workHours: number
): number {
  if (payType === "daily") return payRate;
  return payRate * workHours;
}

/**
 * 금액 포맷 (예: 1,500,000원)
 */
export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}
```

- [ ] **Step 2: query-keys.ts에 비용관리 키 추가**

`apps/part-time-supervisor/lib/query-keys.ts`의 `queryKeys` 객체 끝에 추가:

```typescript
  costManagement: {
    all: ["costManagement"] as const,
    byMonth: (year: number, month: number) =>
      ["costManagement", year, month] as const,
  },

  workRecords: {
    all: ["workRecords"] as const,
    byAssignment: (assignmentId: string) =>
      ["workRecords", assignmentId] as const,
  },
```

- [ ] **Step 3: 타입 체크**

Run: `pnpm check-types`

- [ ] **Step 4: 커밋**

```bash
git add apps/part-time-supervisor/lib/cost-utils.ts apps/part-time-supervisor/lib/query-keys.ts
git commit -m "feat(part-time-supervisor): 비용 계산 유틸리티 및 쿼리 키 추가"
```

---

## Task 3: 근무 기록 API (work-records)

**Files:**
- Create: `apps/part-time-supervisor/app/api/work-records/route.ts`
- Create: `apps/part-time-supervisor/app/api/work-records/generate/route.ts`

- [ ] **Step 1: work-records GET/POST route 생성**

`apps/part-time-supervisor/app/api/work-records/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

// GET: 특정 assignment의 근무 기록 조회
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const assignmentId = request.nextUrl.searchParams.get("assignment_id");
    if (!assignmentId) {
      return NextResponse.json({ error: "assignment_id is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("work_records")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("work_date", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/work-records error:", error);
    return NextResponse.json({ error: "Failed to fetch work records" }, { status: 500 });
  }
}

// POST: 근무 기록 배치 upsert
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const { assignmentId, records } = await request.json();

    if (!assignmentId || !Array.isArray(records)) {
      return NextResponse.json({ error: "assignmentId and records are required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const upsertData = records.map((r: { workDate: string; workHours: number; note?: string }) => ({
      assignment_id: assignmentId,
      work_date: r.workDate,
      work_hours: r.workHours,
      note: r.note ?? null,
    }));

    const { data, error } = await supabase
      .from("work_records")
      .upsert(upsertData, { onConflict: "assignment_id,work_date" })
      .select();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("POST /api/work-records error:", error);
    return NextResponse.json({ error: "Failed to save work records" }, { status: 500 });
  }
}
```

- [ ] **Step 2: work-records/generate route 생성**

`apps/part-time-supervisor/app/api/work-records/generate/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { calculateDefaultWorkHours } from "@/lib/cost-utils";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const { assignmentId } = await request.json();
    if (!assignmentId) {
      return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // assignment + job_posting 정보 조회
    const { data: assignment, error: aError } = await supabase
      .from("assignments")
      .select("id, job_posting:job_postings(start_date, end_date, work_start, work_end, lunch_start, lunch_end)")
      .eq("id", assignmentId)
      .single();

    if (aError || !assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const jp = assignment.job_posting as {
      start_date: string; end_date: string;
      work_start: string | null; work_end: string | null;
      lunch_start: string | null; lunch_end: string | null;
    };

    // 기존 기록 조회
    const { data: existing } = await supabase
      .from("work_records")
      .select("work_date")
      .eq("assignment_id", assignmentId);

    const existingDates = new Set((existing ?? []).map((r) => r.work_date));

    // 공고 기간의 모든 날짜 생성
    const defaultHours = calculateDefaultWorkHours(
      jp.work_start, jp.work_end, jp.lunch_start, jp.lunch_end
    );

    const newRecords: { assignment_id: string; work_date: string; work_hours: number }[] = [];
    // KST 안전한 날짜 순회 — toISOString은 UTC 기준이므로 로컬 메서드 사용
    const start = new Date(jp.start_date + "T00:00:00");
    const end = new Date(jp.end_date + "T00:00:00");

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!existingDates.has(dateStr)) {
        newRecords.push({
          assignment_id: assignmentId,
          work_date: dateStr,
          work_hours: defaultHours,
        });
      }
    }

    if (newRecords.length > 0) {
      const { error: insertError } = await supabase
        .from("work_records")
        .insert(newRecords);
      if (insertError) throw insertError;
    }

    // 전체 목록 반환
    const { data: allRecords, error: fetchError } = await supabase
      .from("work_records")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("work_date", { ascending: true });

    if (fetchError) throw fetchError;
    return NextResponse.json(allRecords);
  } catch (error) {
    console.error("POST /api/work-records/generate error:", error);
    return NextResponse.json({ error: "Failed to generate work records" }, { status: 500 });
  }
}
```

- [ ] **Step 3: 타입 체크**

Run: `pnpm check-types`

- [ ] **Step 4: 커밋**

```bash
git add apps/part-time-supervisor/app/api/work-records/
git commit -m "feat(part-time-supervisor): 근무 기록 조회/수정/일괄생성 API 추가"
```

---

## Task 4: 단가 오버라이드 API

**Files:**
- Create: `apps/part-time-supervisor/app/api/assignments/[id]/pay-override/route.ts`

- [ ] **Step 1: pay-override route 생성**

```typescript
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const { payRate, payType } = await request.json();

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("assignments")
      .update({
        pay_rate_override: payRate ?? null,
        pay_type_override: payType ?? null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("PATCH /api/assignments/[id]/pay-override error:", error);
    return NextResponse.json({ error: "Failed to update pay override" }, { status: 500 });
  }
}
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm check-types`

- [ ] **Step 3: 커밋**

```bash
git add apps/part-time-supervisor/app/api/assignments/[id]/pay-override/
git commit -m "feat(part-time-supervisor): 단가 오버라이드 API 추가"
```

---

## Task 5: 월별 비용 산정 조회 API

**Files:**
- Create: `apps/part-time-supervisor/app/api/cost-management/route.ts`

- [ ] **Step 1: cost-management GET route 생성**

이 API는 assignments → work_records → job_postings → workers를 JOIN하여 지원자별 월별 비용을 집계. 핵심 로직:

1. 해당 월에 work_records가 있는 assignments 조회
2. assignment별 effective pay rate 결정 (오버라이드 ?? 공고 기본값)
3. 지원자별로 그룹핑하여 합산

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { calculateAmount } from "@/lib/cost-utils";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = request.nextUrl;
    const year = parseInt(searchParams.get("year") ?? "");
    const month = parseInt(searchParams.get("month") ?? "");
    const search = searchParams.get("search") ?? "";

    if (!year || !month) {
      return NextResponse.json({ error: "year and month are required" }, { status: 400 });
    }

    // 월의 시작/끝 날짜
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    const supabase = createServiceClient();

    // 해당 월의 work_records가 있는 assignments 조회 (worker, job_posting 포함)
    const { data: records, error } = await supabase
      .from("work_records")
      .select(`
        id, work_date, work_hours, note,
        assignment:assignments(
          id, pay_rate_override, pay_type_override, status,
          worker:workers(id, name),
          job_posting:job_postings(id, title, start_date, end_date, pay_rate, pay_type)
        )
      `)
      .gte("work_date", startDate)
      .lte("work_date", endDate)
      .order("work_date", { ascending: true });

    if (error) throw error;

    // 지원자별 → 공고별 그룹핑
    type WorkerGroup = {
      workerId: string;
      workerName: string;
      postings: Map<string, {
        jobPostingId: string;
        jobPostingTitle: string;
        assignmentId: string;
        startDate: string;
        endDate: string;
        payType: "hourly" | "daily";
        effectivePayRate: number;
        isOverridden: boolean;
        workDays: number;
        totalHours: number;
        subtotal: number;
      }>;
    };

    const workerMap = new Map<string, WorkerGroup>();

    for (const rec of records ?? []) {
      const a = rec.assignment as Record<string, unknown>;
      if (!a || a.status === "cancelled") continue;

      const worker = a.worker as { id: string; name: string } | null;
      const jp = a.job_posting as {
        id: string; title: string; start_date: string; end_date: string;
        pay_rate: number; pay_type: "hourly" | "daily";
      } | null;
      if (!worker || !jp) continue;

      // 검색 필터
      if (search && !worker.name.toLowerCase().includes(search.toLowerCase())) continue;

      const effectivePayRate = (a.pay_rate_override as number | null) ?? jp.pay_rate;
      const effectivePayType = (a.pay_type_override as string | null) as "hourly" | "daily" | null ?? jp.pay_type;
      const isOverridden = a.pay_rate_override != null || a.pay_type_override != null;

      if (!workerMap.has(worker.id)) {
        workerMap.set(worker.id, {
          workerId: worker.id,
          workerName: worker.name,
          postings: new Map(),
        });
      }
      const wg = workerMap.get(worker.id)!;

      const assignmentId = a.id as string;
      if (!wg.postings.has(assignmentId)) {
        wg.postings.set(assignmentId, {
          jobPostingId: jp.id,
          jobPostingTitle: jp.title,
          assignmentId,
          startDate: jp.start_date,
          endDate: jp.end_date,
          payType: effectivePayType,
          effectivePayRate,
          isOverridden,
          workDays: 0,
          totalHours: 0,
          subtotal: 0,
        });
      }
      const pg = wg.postings.get(assignmentId)!;
      // 0시간 기록은 미근무 — 일수/금액에서 제외 (통계용 시간만 누적)
      if (rec.work_hours > 0) {
        pg.workDays += 1;
        pg.totalHours += rec.work_hours;
        pg.subtotal += calculateAmount(effectivePayType, effectivePayRate, rec.work_hours);
      }
    }

    // 응답 형성
    let totalAmount = 0;
    let totalWorkHours = 0;
    let totalWorkDays = 0;

    const workers = Array.from(workerMap.values()).map((wg) => {
      const postings = Array.from(wg.postings.values());
      const workerTotal = postings.reduce((sum, p) => sum + p.subtotal, 0);
      const workerDays = postings.reduce((sum, p) => sum + p.workDays, 0);
      const workerHours = postings.reduce((sum, p) => sum + p.totalHours, 0);

      totalAmount += workerTotal;
      totalWorkDays += workerDays;
      totalWorkHours += workerHours;

      // posting level에서도 totalHours 반올림 (floating point 누적 오차 방지)
      const roundedPostings = postings.map((p) => ({
        ...p,
        totalHours: Math.round(p.totalHours * 10) / 10,
      }));

      return {
        workerId: wg.workerId,
        workerName: wg.workerName,
        totalAmount: workerTotal,
        totalWorkDays: workerDays,
        totalWorkHours: Math.round(workerHours * 10) / 10,
        postingCount: postings.length,
        postings: roundedPostings,
      };
    });

    // 금액 내림차순 정렬
    workers.sort((a, b) => b.totalAmount - a.totalAmount);

    return NextResponse.json({
      summary: {
        totalAmount,
        totalWorkers: workers.length,
        totalWorkHours: Math.round(totalWorkHours * 10) / 10,
        totalWorkDays,
      },
      workers,
    });
  } catch (error) {
    console.error("GET /api/cost-management error:", error);
    return NextResponse.json({ error: "Failed to fetch cost data" }, { status: 500 });
  }
}
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm check-types`

- [ ] **Step 3: 커밋**

```bash
git add apps/part-time-supervisor/app/api/cost-management/route.ts
git commit -m "feat(part-time-supervisor): 월별 비용 산정 조회 API 추가"
```

---

## Task 6: 엑셀 내보내기 API

**Files:**
- Create: `apps/part-time-supervisor/app/api/cost-management/export/route.ts`

- [ ] **Step 1: exceljs 의존성 확인**

Run: `grep '"exceljs"' apps/part-time-supervisor/package.json`

없으면: `cd apps/part-time-supervisor && pnpm add exceljs`

- [ ] **Step 2: export route 생성**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { calculateAmount, formatCurrency } from "@/lib/cost-utils";
import ExcelJS from "exceljs";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = request.nextUrl;
    const year = parseInt(searchParams.get("year") ?? "");
    const month = parseInt(searchParams.get("month") ?? "");

    if (!year || !month) {
      return NextResponse.json({ error: "year and month are required" }, { status: 400 });
    }

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    const supabase = createServiceClient();

    const { data: records, error } = await supabase
      .from("work_records")
      .select(`
        work_date, work_hours, note,
        assignment:assignments(
          id, pay_rate_override, pay_type_override, status,
          worker:workers(id, name, phone, bank_name, account_number),
          job_posting:job_postings(id, title, pay_rate, pay_type)
        )
      `)
      .gte("work_date", startDate)
      .lte("work_date", endDate)
      .order("work_date", { ascending: true });

    if (error) throw error;

    const workbook = new ExcelJS.Workbook();

    // 요약 시트
    const summarySheet = workbook.addWorksheet("요약");
    summarySheet.columns = [
      { header: "지원자명", key: "name", width: 15 },
      { header: "연락처", key: "phone", width: 15 },
      { header: "은행", key: "bank", width: 12 },
      { header: "계좌번호", key: "account", width: 20 },
      { header: "참여 공고 수", key: "postings", width: 14 },
      { header: "근무 일수", key: "days", width: 12 },
      { header: "총 근무 시간", key: "hours", width: 14 },
      { header: "산정 금액", key: "amount", width: 18 },
    ];

    // 데이터 집계 (cost-management route와 동일한 로직)
    type WorkerData = {
      name: string; phone: string | null; bankName: string | null; accountNumber: string | null;
      days: number; hours: number; amount: number; postingIds: Set<string>;
      details: { date: string; posting: string; hours: number; payType: string; rate: number; amount: number; note: string | null }[];
    };
    const workerMap = new Map<string, WorkerData>();

    for (const rec of records ?? []) {
      const a = rec.assignment as Record<string, unknown>;
      if (!a || a.status === "cancelled") continue;
      const worker = a.worker as { id: string; name: string; phone: string | null; bank_name: string | null; account_number: string | null } | null;
      const jp = a.job_posting as { id: string; title: string; pay_rate: number; pay_type: "hourly" | "daily" } | null;
      if (!worker || !jp) continue;

      const effectiveRate = (a.pay_rate_override as number | null) ?? jp.pay_rate;
      const effectiveType = ((a.pay_type_override as string | null) ?? jp.pay_type) as "hourly" | "daily";
      const amt = calculateAmount(effectiveType, effectiveRate, rec.work_hours);

      if (!workerMap.has(worker.id)) {
        workerMap.set(worker.id, {
          name: worker.name, phone: worker.phone,
          bankName: worker.bank_name, accountNumber: worker.account_number,
          days: 0, hours: 0, amount: 0, postingIds: new Set(), details: [],
        });
      }
      const wd = workerMap.get(worker.id)!;
      wd.days += 1;
      wd.hours += rec.work_hours;
      wd.amount += amt;
      wd.postingIds.add(jp.id);
      wd.details.push({
        date: rec.work_date, posting: jp.title,
        hours: rec.work_hours, payType: effectiveType === "hourly" ? "시급" : "일급",
        rate: effectiveRate, amount: amt, note: rec.note,
      });
    }

    // 요약 시트 채우기
    for (const wd of workerMap.values()) {
      summarySheet.addRow({
        name: wd.name, phone: wd.phone, bank: wd.bankName, account: wd.accountNumber,
        postings: wd.postingIds.size, days: wd.days,
        hours: Math.round(wd.hours * 10) / 10, amount: wd.amount,
      });
    }

    // 헤더 스타일
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" },
    };

    // 상세 시트
    const detailSheet = workbook.addWorksheet("상세");
    detailSheet.columns = [
      { header: "지원자명", key: "name", width: 15 },
      { header: "날짜", key: "date", width: 12 },
      { header: "공고명", key: "posting", width: 25 },
      { header: "급여 타입", key: "payType", width: 10 },
      { header: "단가", key: "rate", width: 14 },
      { header: "근무 시간", key: "hours", width: 12 },
      { header: "금액", key: "amount", width: 14 },
      { header: "비고", key: "note", width: 20 },
    ];

    for (const wd of workerMap.values()) {
      for (const d of wd.details) {
        detailSheet.addRow({
          name: wd.name, date: d.date, posting: d.posting,
          payType: d.payType, rate: d.rate,
          hours: d.hours, amount: d.amount, note: d.note ?? "",
        });
      }
    }

    detailSheet.getRow(1).font = { bold: true };
    detailSheet.getRow(1).fill = {
      type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" },
    };

    // 응답
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `비용산정_${year}년${month}월.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    console.error("GET /api/cost-management/export error:", error);
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}
```

- [ ] **Step 3: 타입 체크**

Run: `pnpm check-types`

- [ ] **Step 4: 커밋**

```bash
git add apps/part-time-supervisor/app/api/cost-management/export/
git commit -m "feat(part-time-supervisor): 비용 산정 엑셀 내보내기 API 추가"
```

---

## Task 7: React Query 훅

**Files:**
- Create: `apps/part-time-supervisor/hooks/use-cost-management.ts`
- Create: `apps/part-time-supervisor/hooks/use-work-records.ts`
- Create: `apps/part-time-supervisor/hooks/use-pay-override.ts`
- Create: `apps/part-time-supervisor/hooks/use-cost-export.ts`

- [ ] **Step 1: use-cost-management.ts**

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export type CostPostingDetail = {
  jobPostingId: string;
  jobPostingTitle: string;
  assignmentId: string;
  startDate: string;
  endDate: string;
  payType: "hourly" | "daily";
  effectivePayRate: number;
  isOverridden: boolean;
  workDays: number;
  totalHours: number;
  subtotal: number;
};

export type CostWorkerData = {
  workerId: string;
  workerName: string;
  totalAmount: number;
  totalWorkDays: number;
  totalWorkHours: number;
  postingCount: number;
  postings: CostPostingDetail[];
};

export type CostManagementData = {
  summary: {
    totalAmount: number;
    totalWorkers: number;
    totalWorkHours: number;
    totalWorkDays: number;
  };
  workers: CostWorkerData[];
};

export function useCostManagement(year: number, month: number, search?: string) {
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  if (search) params.set("search", search);

  return useQuery<CostManagementData>({
    queryKey: [...queryKeys.costManagement.byMonth(year, month), search],
    queryFn: async () => {
      const res = await fetch(`/api/cost-management?${params}`);
      if (!res.ok) throw new Error("Failed to fetch cost data");
      return res.json();
    },
  });
}
```

- [ ] **Step 2: use-work-records.ts**

```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { WorkRecord } from "@/lib/supabase/types";

export function useWorkRecords(assignmentId: string | null) {
  return useQuery<WorkRecord[]>({
    queryKey: queryKeys.workRecords.byAssignment(assignmentId!),
    queryFn: async () => {
      const res = await fetch(`/api/work-records?assignment_id=${assignmentId}`);
      if (!res.ok) throw new Error("Failed to fetch work records");
      return res.json();
    },
    enabled: !!assignmentId,
  });
}

export function useGenerateWorkRecords() {
  const queryClient = useQueryClient();

  return useMutation<WorkRecord[], Error, { assignmentId: string }>({
    mutationFn: async ({ assignmentId }) => {
      const res = await fetch("/api/work-records/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });
      if (!res.ok) throw new Error("Failed to generate work records");
      return res.json();
    },
    onSuccess: (_, { assignmentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workRecords.byAssignment(assignmentId) });
    },
  });
}

export function useSaveWorkRecords() {
  const queryClient = useQueryClient();

  return useMutation<
    WorkRecord[],
    Error,
    { assignmentId: string; records: { workDate: string; workHours: number; note?: string }[] }
  >({
    mutationFn: async ({ assignmentId, records }) => {
      const res = await fetch("/api/work-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, records }),
      });
      if (!res.ok) throw new Error("Failed to save work records");
      return res.json();
    },
    onSuccess: (_, { assignmentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workRecords.byAssignment(assignmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.costManagement.all });
    },
  });
}
```

- [ ] **Step 3: use-pay-override.ts**

```typescript
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

type PayOverrideInput = {
  assignmentId: string;
  payRate: number | null;
  payType: "hourly" | "daily" | null;
};

export function usePayOverride() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, PayOverrideInput>({
    mutationFn: async ({ assignmentId, payRate, payType }) => {
      const res = await fetch(`/api/assignments/${assignmentId}/pay-override`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payRate, payType }),
      });
      if (!res.ok) throw new Error("Failed to update pay override");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.costManagement.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
    },
  });
}
```

- [ ] **Step 4: use-cost-export.ts**

```typescript
"use client";

import { useMutation } from "@tanstack/react-query";

export function useCostExport() {
  return useMutation<void, Error, { year: number; month: number }>({
    mutationFn: async ({ year, month }) => {
      const res = await fetch(`/api/cost-management/export?year=${year}&month=${month}`);
      if (!res.ok) throw new Error("Failed to export");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `비용산정_${year}년${month}월.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });
}
```

- [ ] **Step 5: 타입 체크**

Run: `pnpm check-types`

- [ ] **Step 6: 커밋**

```bash
git add apps/part-time-supervisor/hooks/use-cost-management.ts apps/part-time-supervisor/hooks/use-work-records.ts apps/part-time-supervisor/hooks/use-pay-override.ts apps/part-time-supervisor/hooks/use-cost-export.ts
git commit -m "feat(part-time-supervisor): 비용관리 React Query 훅 추가"
```

---

## Task 8: 사이드바 + 페이지 라우트

**Files:**
- Modify: `apps/part-time-supervisor/components/layout/Sidebar.tsx`
- Create: `apps/part-time-supervisor/app/(dashboard)/cost-management/page.tsx`

- [ ] **Step 1: 사이드바에 비용 관리 메뉴 추가**

`apps/part-time-supervisor/components/layout/Sidebar.tsx`:

import에 `Calculator` 추가:
```typescript
import { Briefcase, Users, LayoutDashboard, DoorOpen, Calculator } from "lucide-react";
```

navItems 배열에 추가:
```typescript
{ href: "/cost-management", label: "비용 관리", icon: Calculator },
```

- [ ] **Step 2: 페이지 라우트 생성**

`apps/part-time-supervisor/app/(dashboard)/cost-management/page.tsx`:

```typescript
import { CostManagementPage } from "@/components/cost-management/CostManagementPage";

export default function CostManagement() {
  return <CostManagementPage />;
}
```

- [ ] **Step 3: 커밋**

```bash
git add apps/part-time-supervisor/components/layout/Sidebar.tsx apps/part-time-supervisor/app/\(dashboard\)/cost-management/page.tsx
git commit -m "feat(part-time-supervisor): 비용관리 사이드바 메뉴 및 페이지 라우트 추가"
```

---

## Task 9: CostManagementPage + CostSummaryCards

**Files:**
- Create: `apps/part-time-supervisor/components/cost-management/CostManagementPage.tsx`
- Create: `apps/part-time-supervisor/components/cost-management/CostSummaryCards.tsx`

- [ ] **Step 1: CostSummaryCards 생성**

```typescript
"use client";

import { Calculator, Users, Clock, CalendarDays } from "lucide-react";
import { formatCurrency } from "@/lib/cost-utils";

type Props = {
  totalAmount: number;
  totalWorkers: number;
  totalWorkHours: number;
  totalWorkDays: number;
};

const cards = [
  { key: "amount", label: "총 산정 금액", icon: Calculator, color: "text-emerald-600" },
  { key: "workers", label: "총 근무 인원", icon: Users, color: "text-blue-600" },
  { key: "hours", label: "총 근무 시간", icon: Clock, color: "text-amber-600" },
  { key: "days", label: "총 근무 일수", icon: CalendarDays, color: "text-purple-600" },
] as const;

export function CostSummaryCards({ totalAmount, totalWorkers, totalWorkHours, totalWorkDays }: Props) {
  const values = {
    amount: formatCurrency(totalAmount),
    workers: `${totalWorkers}명`,
    hours: `${totalWorkHours}h`,
    days: `${totalWorkDays}일`,
  };

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.key} className="rounded-xl border bg-white p-5">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Icon size={16} className={card.color} />
              {card.label}
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {values[card.key]}
            </p>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: CostManagementPage 생성**

```typescript
"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { useCostManagement } from "@/hooks/use-cost-management";
import { CostSummaryCards } from "./CostSummaryCards";
import { CostWorkerTable } from "./CostWorkerTable";
import { CostExportButton } from "./CostExportButton";

export function CostManagementPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { data, isLoading } = useCostManagement(year, month, debouncedSearch);

  // 검색 디바운스 — useEffect로 타이머 정리
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // 월 변경
  const handleMonthChange = (direction: -1 | 1) => {
    let newMonth = month + direction;
    let newYear = year;
    if (newMonth < 1) { newMonth = 12; newYear--; }
    if (newMonth > 12) { newMonth = 1; newYear++; }
    setYear(newYear);
    setMonth(newMonth);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">비용 관리</h1>
        <CostExportButton year={year} month={month} />
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
          <button onClick={() => handleMonthChange(-1)} className="text-slate-400 hover:text-slate-600">
            ←
          </button>
          <span className="min-w-[100px] text-center font-medium text-slate-900">
            {year}년 {month}월
          </span>
          <button onClick={() => handleMonthChange(1)} className="text-slate-400 hover:text-slate-600">
            →
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="지원자 이름 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
          />
        </div>
      </div>

      {/* 요약 카드 */}
      {data && (
        <CostSummaryCards
          totalAmount={data.summary.totalAmount}
          totalWorkers={data.summary.totalWorkers}
          totalWorkHours={data.summary.totalWorkHours}
          totalWorkDays={data.summary.totalWorkDays}
        />
      )}

      {/* 테이블 */}
      <CostWorkerTable
        workers={data?.workers ?? []}
        isLoading={isLoading}
      />
    </div>
  );
}
```

- [ ] **Step 3: 타입 체크**

Run: `pnpm check-types`

- [ ] **Step 4: 커밋**

```bash
git add apps/part-time-supervisor/components/cost-management/CostManagementPage.tsx apps/part-time-supervisor/components/cost-management/CostSummaryCards.tsx
git commit -m "feat(part-time-supervisor): 비용관리 메인 페이지 및 요약 카드 컴포넌트 추가"
```

---

## Task 10: CostWorkerTable + CostWorkerExpandedRow

**Files:**
- Create: `apps/part-time-supervisor/components/cost-management/CostWorkerTable.tsx`
- Create: `apps/part-time-supervisor/components/cost-management/CostWorkerExpandedRow.tsx`

- [ ] **Step 1: CostWorkerExpandedRow 생성**

```typescript
"use client";

import { formatCurrency } from "@/lib/cost-utils";
import type { CostPostingDetail } from "@/hooks/use-cost-management";

type Props = {
  postings: CostPostingDetail[];
  onEditClick: (posting: CostPostingDetail) => void;
};

export function CostWorkerExpandedRow({ postings, onEditClick }: Props) {
  return (
    <div className="bg-slate-50 px-6 py-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="pb-2 font-medium">공고명</th>
            <th className="pb-2 font-medium">기간</th>
            <th className="pb-2 font-medium">급여 타입</th>
            <th className="pb-2 font-medium text-right">단가</th>
            <th className="pb-2 font-medium text-right">근무 일수</th>
            <th className="pb-2 font-medium text-right">총 시간</th>
            <th className="pb-2 font-medium text-right">소계</th>
            <th className="pb-2 font-medium text-right">수정</th>
          </tr>
        </thead>
        <tbody>
          {postings.map((p) => (
            <tr key={p.assignmentId} className="border-b last:border-0">
              <td className="py-2.5 text-slate-900">{p.jobPostingTitle}</td>
              <td className="py-2.5 text-slate-600">
                {p.startDate.slice(5)} ~ {p.endDate.slice(5)}
              </td>
              <td className="py-2.5">
                <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                  p.payType === "hourly" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                }`}>
                  {p.payType === "hourly" ? "시급" : "일급"}
                </span>
                {p.isOverridden && (
                  <span className="ml-1 text-xs text-orange-500">커스텀</span>
                )}
              </td>
              <td className="py-2.5 text-right text-slate-900">
                {formatCurrency(p.effectivePayRate)}
              </td>
              <td className="py-2.5 text-right text-slate-600">{p.workDays}일</td>
              <td className="py-2.5 text-right text-slate-600">{p.totalHours}h</td>
              <td className="py-2.5 text-right font-medium text-slate-900">
                {formatCurrency(p.subtotal)}
              </td>
              <td className="py-2.5 text-right">
                <button
                  onClick={() => onEditClick(p)}
                  className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                >
                  수정
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: CostWorkerTable 생성**

```typescript
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/cost-utils";
import type { CostWorkerData, CostPostingDetail } from "@/hooks/use-cost-management";
import { CostWorkerExpandedRow } from "./CostWorkerExpandedRow";
import { WorkRecordEditModal } from "./WorkRecordEditModal";

type Props = {
  workers: CostWorkerData[];
  isLoading: boolean;
};

export function CostWorkerTable({ workers, isLoading }: Props) {
  const [expandedWorker, setExpandedWorker] = useState<string | null>(null);
  const [editingPosting, setEditingPosting] = useState<CostPostingDetail | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-slate-400">
        불러오는 중...
      </div>
    );
  }

  if (workers.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-slate-400">
        해당 월에 근무 기록이 없습니다.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-slate-500">
              <th className="px-4 py-3 font-medium w-8"></th>
              <th className="px-4 py-3 font-medium">지원자명</th>
              <th className="px-4 py-3 font-medium text-right">참여 공고</th>
              <th className="px-4 py-3 font-medium text-right">근무 일수</th>
              <th className="px-4 py-3 font-medium text-right">총 근무 시간</th>
              <th className="px-4 py-3 font-medium text-right">산정 금액</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((w) => {
              const isExpanded = expandedWorker === w.workerId;
              return (
                <Fragment key={w.workerId}>
                  <tr
                    className="cursor-pointer border-b hover:bg-slate-50"
                    onClick={() => setExpandedWorker(isExpanded ? null : w.workerId)}
                  >
                    <td className="px-4 py-3 text-slate-400">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{w.workerName}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{w.postingCount}건</td>
                    <td className="px-4 py-3 text-right text-slate-600">{w.totalWorkDays}일</td>
                    <td className="px-4 py-3 text-right text-slate-600">{w.totalWorkHours}h</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      {formatCurrency(w.totalAmount)}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <CostWorkerExpandedRow
                          postings={w.postings}
                          onEditClick={setEditingPosting}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingPosting && (
        <WorkRecordEditModal
          assignmentId={editingPosting.assignmentId}
          currentPayRate={editingPosting.effectivePayRate}
          currentPayType={editingPosting.payType}
          isOverridden={editingPosting.isOverridden}
          onClose={() => setEditingPosting(null)}
        />
      )}
    </>
  );
}
```

참고: `Fragment` import 필요 → `import { Fragment, useState } from "react";`

- [ ] **Step 3: 타입 체크**

Run: `pnpm check-types`

- [ ] **Step 4: 커밋**

```bash
git add apps/part-time-supervisor/components/cost-management/CostWorkerTable.tsx apps/part-time-supervisor/components/cost-management/CostWorkerExpandedRow.tsx
git commit -m "feat(part-time-supervisor): 지원자별 비용 테이블 및 펼침 행 컴포넌트 추가"
```

---

## Task 11: WorkRecordEditModal + PayRateOverrideForm

**Files:**
- Create: `apps/part-time-supervisor/components/cost-management/WorkRecordEditModal.tsx`
- Create: `apps/part-time-supervisor/components/cost-management/PayRateOverrideForm.tsx`

- [ ] **Step 1: PayRateOverrideForm 생성**

```typescript
"use client";

import { useState } from "react";
import { usePayOverride } from "@/hooks/use-pay-override";
import { toast } from "@repo/ui/src/sonner";

type Props = {
  assignmentId: string;
  currentPayRate: number;
  currentPayType: "hourly" | "daily";
  isOverridden: boolean;
};

export function PayRateOverrideForm({ assignmentId, currentPayRate, currentPayType, isOverridden }: Props) {
  const [enabled, setEnabled] = useState(isOverridden);
  const [payRate, setPayRate] = useState(currentPayRate);
  const [payType, setPayType] = useState(currentPayType);
  const payOverride = usePayOverride();

  const handleSave = () => {
    payOverride.mutate(
      {
        assignmentId,
        payRate: enabled ? payRate : null,
        payType: enabled ? payType : null,
      },
      {
        onSuccess: () => toast.success("단가가 변경되었습니다."),
        onError: () => toast.error("단가 변경에 실패했습니다."),
      }
    );
  };

  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded"
          />
          커스텀 단가 사용
        </label>
      </div>

      {enabled && (
        <div className="mt-3 flex items-center gap-3">
          <select
            value={payType}
            onChange={(e) => setPayType(e.target.value as "hourly" | "daily")}
            className="rounded-lg border px-3 py-1.5 text-sm"
          >
            <option value="hourly">시급</option>
            <option value="daily">일급</option>
          </select>
          <input
            type="number"
            value={payRate}
            onChange={(e) => setPayRate(Number(e.target.value))}
            className="w-32 rounded-lg border px-3 py-1.5 text-sm text-right"
            min={0}
          />
          <span className="text-sm text-slate-500">원</span>
          <button
            onClick={handleSave}
            disabled={payOverride.isPending}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
          >
            적용
          </button>
        </div>
      )}

      {!enabled && isOverridden && (
        <button
          onClick={handleSave}
          disabled={payOverride.isPending}
          className="mt-2 text-sm text-red-500 hover:underline"
        >
          커스텀 단가 제거
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: WorkRecordEditModal 생성**

```typescript
"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useWorkRecords, useGenerateWorkRecords, useSaveWorkRecords } from "@/hooks/use-work-records";
import { PayRateOverrideForm } from "./PayRateOverrideForm";
import { toast } from "@repo/ui/src/sonner";
import type { WorkRecord } from "@/lib/supabase/types";

type Props = {
  assignmentId: string;
  currentPayRate: number;
  currentPayType: "hourly" | "daily";
  isOverridden: boolean;
  onClose: () => void;
};

type EditableRecord = {
  workDate: string;
  workHours: number;
  note: string;
};

export function WorkRecordEditModal({ assignmentId, currentPayRate, currentPayType, isOverridden, onClose }: Props) {
  const { data: records, isLoading } = useWorkRecords(assignmentId);
  const { mutate: generateMutate, isPending: isGenerating } = useGenerateWorkRecords();
  const saveRecords = useSaveWorkRecords();
  const [editableRecords, setEditableRecords] = useState<EditableRecord[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // 모달 진입 시 일괄 생성 트리거 — mutate는 TanStack Query v5에서 stable reference
  useEffect(() => {
    generateMutate({ assignmentId });
  }, [assignmentId, generateMutate]);

  // records 변경 시 editable 상태 동기화
  useEffect(() => {
    if (records) {
      setEditableRecords(
        records.map((r) => ({
          workDate: r.work_date,
          workHours: r.work_hours,
          note: r.note ?? "",
        }))
      );
    }
  }, [records]);

  const handleHoursChange = (index: number, value: number) => {
    setEditableRecords((prev) =>
      prev.map((r, i) => (i === index ? { ...r, workHours: value } : r))
    );
    setHasChanges(true);
  };

  const handleNoteChange = (index: number, value: string) => {
    setEditableRecords((prev) =>
      prev.map((r, i) => (i === index ? { ...r, note: value } : r))
    );
    setHasChanges(true);
  };

  const handleSave = () => {
    saveRecords.mutate(
      { assignmentId, records: editableRecords },
      {
        onSuccess: () => {
          toast.success("근무 기록이 저장되었습니다.");
          setHasChanges(false);
        },
        onError: () => toast.error("저장에 실패했습니다."),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">근무 기록 편집</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* 내용 */}
        <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4">
          {/* 단가 오버라이드 */}
          <PayRateOverrideForm
            assignmentId={assignmentId}
            currentPayRate={currentPayRate}
            currentPayType={currentPayType}
            isOverridden={isOverridden}
          />

          {/* 근무 기록 테이블 */}
          {isLoading || isGenerating ? (
            <div className="flex h-20 items-center justify-center text-slate-400">
              불러오는 중...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="pb-2 font-medium">날짜</th>
                  <th className="pb-2 font-medium text-right">근무 시간</th>
                  <th className="pb-2 font-medium">비고</th>
                </tr>
              </thead>
              <tbody>
                {editableRecords.map((r, i) => (
                  <tr key={r.workDate} className="border-b last:border-0">
                    <td className="py-2 text-slate-900">{r.workDate}</td>
                    <td className="py-2 text-right">
                      <input
                        type="number"
                        value={r.workHours}
                        onChange={(e) => handleHoursChange(i, parseFloat(e.target.value) || 0)}
                        className="w-20 rounded border px-2 py-1 text-right text-sm"
                        min={0}
                        max={24}
                        step={0.5}
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="text"
                        value={r.note}
                        onChange={(e) => handleNoteChange(i, e.target.value)}
                        placeholder="비고"
                        className="w-full rounded border px-2 py-1 text-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            닫기
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saveRecords.isPending}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saveRecords.isPending ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

참고: `CostWorkerExpandedRow`에서 `onEditClick(posting)` 으로 `CostPostingDetail` 전체를 전달하고, `CostWorkerTable`에서 `editingPosting` 상태로 관리하여 `WorkRecordEditModal`에 단가 정보를 props로 전달.

- [ ] **Step 3: 타입 체크**

Run: `pnpm check-types`

- [ ] **Step 4: 커밋**

```bash
git add apps/part-time-supervisor/components/cost-management/WorkRecordEditModal.tsx apps/part-time-supervisor/components/cost-management/PayRateOverrideForm.tsx
git commit -m "feat(part-time-supervisor): 근무 기록 편집 모달 및 단가 오버라이드 폼 추가"
```

---

## Task 12: CostExportButton

**Files:**
- Create: `apps/part-time-supervisor/components/cost-management/CostExportButton.tsx`

- [ ] **Step 1: CostExportButton 생성**

```typescript
"use client";

import { Download } from "lucide-react";
import { useCostExport } from "@/hooks/use-cost-export";
import { toast } from "@repo/ui/src/sonner";

type Props = {
  year: number;
  month: number;
};

export function CostExportButton({ year, month }: Props) {
  const exportMutation = useCostExport();

  const handleExport = () => {
    exportMutation.mutate(
      { year, month },
      {
        onSuccess: () => toast.success("엑셀 파일이 다운로드되었습니다."),
        onError: () => toast.error("내보내기에 실패했습니다."),
      }
    );
  };

  return (
    <button
      onClick={handleExport}
      disabled={exportMutation.isPending}
      className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
    >
      <Download size={16} />
      {exportMutation.isPending ? "내보내는 중..." : "엑셀 내보내기"}
    </button>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm check-types`

- [ ] **Step 3: 커밋**

```bash
git add apps/part-time-supervisor/components/cost-management/CostExportButton.tsx
git commit -m "feat(part-time-supervisor): 비용 산정 엑셀 내보내기 버튼 추가"
```

---

## Task 13: 통합 확인 및 빌드

- [ ] **Step 1: 타입 체크**

Run: `pnpm check-types`

- [ ] **Step 2: 린트**

Run: `pnpm lint`

- [ ] **Step 3: 빌드**

Run: `pnpm build:part-time-supervisor`

- [ ] **Step 4: dev 서버 확인**

Run: `pnpm dev:part-time-supervisor`

브라우저에서 `http://localhost:3002/cost-management` 접속하여:
- 사이드바에 "비용 관리" 메뉴가 보이는지
- 월 선택/검색 필터가 동작하는지
- 지원자 목록 테이블이 렌더링되는지 (데이터 없으면 빈 상태 메시지)
- 엑셀 내보내기 버튼이 있는지

- [ ] **Step 5: 최종 커밋**

남은 변경사항이 있으면:
```bash
git add -A
git commit -m "feat(part-time-supervisor): 비용관리 기능 통합 및 최종 수정"
```
