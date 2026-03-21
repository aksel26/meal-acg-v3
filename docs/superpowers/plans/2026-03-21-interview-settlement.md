# 면접교육 정산 관리 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 면접교육&검사 팀 전용 인력 관리 및 정산 기능을 part-time-supervisor 앱에 추가한다.

**Architecture:** 기존 `supervisor` 스키마에 면접교육 테이블 3개 추가. 사이드바를 1Depth/2Depth nested 구조로 재구성하고, 기존 페이지 URL을 `/supervisor/*`로 이동. 면접교육 페이지는 `/interview/*` 경로에 신규 생성. API 라우트는 `/api/interview/*` 네임스페이스.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Supabase (supervisor schema), TanStack React Query, Tailwind CSS 4, Motion, ExcelJS

**Spec:** `docs/superpowers/specs/2026-03-21-interview-settlement-design.md`

---

### Task 1: DB 마이그레이션 — 면접교육 테이블 생성

**Files:**
- Create: `supabase/migrations/20260321_interview_tables.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- =============================================================
-- Interview Education Tables
-- 면접교육&검사 팀 인력 관리 및 정산
-- =============================================================

-- interview_personnel (면접교육 인력)
CREATE TABLE supervisor.interview_personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  role text NOT NULL CHECK (role IN ('rp', 'ft', 'instructor')),
  bank_name text,
  account_number text,
  pay_type text NOT NULL CHECK (pay_type IN ('hourly', 'daily', 'contract')),
  default_pay_rate numeric(10, 2),
  contract_amount numeric(12, 2),
  memo text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_interview_personnel_role ON supervisor.interview_personnel(role);
CREATE INDEX idx_interview_personnel_status ON supervisor.interview_personnel(status);

-- interview_work_records (면접교육 근무기록)
CREATE TABLE supervisor.interview_work_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_id uuid NOT NULL REFERENCES supervisor.interview_personnel(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  work_hours numeric(4, 1) NOT NULL CHECK (work_hours >= 0),
  pay_rate_override numeric(10, 2),
  pay_type_override text CHECK (pay_type_override IN ('hourly', 'daily')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_interview_work_records_personnel ON supervisor.interview_work_records(personnel_id);
CREATE INDEX idx_interview_work_records_date ON supervisor.interview_work_records(work_date);

-- interview_expense_reports (지출결의서)
CREATE TABLE supervisor.interview_expense_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  title text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  total_labor_cost numeric(12, 2) NOT NULL DEFAULT 0,
  total_extra_cost numeric(12, 2) NOT NULL DEFAULT 0,
  grand_total numeric(12, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(year, month)
);

-- RLS
ALTER TABLE supervisor.interview_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor.interview_work_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor.interview_expense_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON supervisor.interview_personnel
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON supervisor.interview_work_records
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON supervisor.interview_expense_reports
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON supervisor.interview_personnel
  FOR EACH ROW EXECUTE FUNCTION supervisor.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON supervisor.interview_expense_reports
  FOR EACH ROW EXECUTE FUNCTION supervisor.update_updated_at();
```

- [ ] **Step 2: 커밋**

```bash
git add supabase/migrations/20260321_interview_tables.sql
git commit -m "feat: 면접교육 인력/근무기록/지출결의서 테이블 마이그레이션"
```

---

### Task 2: 사이드바 nested 메뉴 구조로 재구성

**Files:**
- Modify: `apps/part-time-supervisor/components/layout/Sidebar.tsx`

현재 flat `navItems` 배열을 1Depth/2Depth 구조로 변경한다.

- [ ] **Step 1: 사이드바 데이터 구조 변경**

`navItems` 배열을 다음 구조로 교체:

```typescript
type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type NavGroup = {
  label: string;
  icon: LucideIcon;
  children: NavItem[];
};

type NavEntry = NavItem | NavGroup;

const isGroup = (entry: NavEntry): entry is NavGroup => "children" in entry;

const navEntries: NavEntry[] = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  {
    label: "감독관",
    icon: Briefcase,
    children: [
      { href: "/supervisor/job-postings", label: "공고 관리", icon: Briefcase },
      { href: "/supervisor/workers", label: "지원자 관리", icon: Users },
      { href: "/room-assignments", label: "회의실 배정", icon: DoorOpen },
      { href: "/supervisor/cost-management", label: "정산 관리", icon: Calculator },
    ],
  },
  {
    label: "면접교육",
    icon: GraduationCap,
    children: [
      { href: "/interview/personnel", label: "인력 관리", icon: Users },
      { href: "/room-assignments", label: "회의실 배정", icon: DoorOpen },
      { href: "/interview/settlement", label: "정산 관리", icon: Calculator },
    ],
  },
];
```

- [ ] **Step 2: 그룹 토글 UI 구현**

그룹 메뉴 렌더링 추가. 현재 경로가 `children`의 `href` 중 하나와 prefix 매칭되면 자동 펼침:

```typescript
// 그룹의 자식 경로 중 현재 pathname이 매칭되면 자동 펼침
const isGroupActive = (group: NavGroup) =>
  group.children.some((child) =>
    child.href === "/" ? pathname === "/" : pathname.startsWith(child.href)
  );
```

그룹 헤더 클릭 시 토글, 활성 그룹은 항상 펼침. `lucide-react`에서 `GraduationCap`, `ChevronDown` 추가 import.

- [ ] **Step 3: 커밋**

```bash
git add apps/part-time-supervisor/components/layout/Sidebar.tsx
git commit -m "refactor: 사이드바 1Depth/2Depth nested 메뉴 구조로 재구성"
```

---

### Task 3: 기존 페이지 URL 이동 (`/supervisor/*`)

**Files:**
- Create: `apps/part-time-supervisor/app/(dashboard)/supervisor/job-postings/page.tsx`
- Create: `apps/part-time-supervisor/app/(dashboard)/supervisor/job-postings/[id]/page.tsx`
- Create: `apps/part-time-supervisor/app/(dashboard)/supervisor/workers/page.tsx`
- Create: `apps/part-time-supervisor/app/(dashboard)/supervisor/cost-management/page.tsx`
- Modify: `apps/part-time-supervisor/app/(dashboard)/job-postings/page.tsx` (삭제 또는 redirect)
- Modify: `apps/part-time-supervisor/app/(dashboard)/job-postings/[id]/page.tsx` (삭제 또는 redirect)
- Modify: `apps/part-time-supervisor/app/(dashboard)/workers/page.tsx` (삭제 또는 redirect)
- Modify: `apps/part-time-supervisor/app/(dashboard)/cost-management/page.tsx` (삭제 또는 redirect)

기존 페이지 컴포넌트를 그대로 재사용하되, 새 경로에 래퍼 페이지를 만든다. 기존 경로는 redirect로 변환.

- [ ] **Step 1: 새 경로에 페이지 파일 생성**

각 파일은 기존 컴포넌트를 그대로 import하여 렌더링:

`supervisor/job-postings/page.tsx`:
```typescript
import JobPostingsPage from "@/app/(dashboard)/job-postings/page";
export default JobPostingsPage;
```

또는 기존 파일을 새 경로로 이동하고, 기존 경로에 redirect를 남긴다:

```typescript
// apps/part-time-supervisor/app/(dashboard)/job-postings/page.tsx
import { redirect } from "next/navigation";
export default function Page() { redirect("/supervisor/job-postings"); }
```

**패턴:** 기존 파일 내용을 새 경로로 이동하고, 기존 경로에는 redirect만 남긴다. 이렇게 하면 기존 북마크/링크가 깨지지 않는다.

- [ ] **Step 2: 4개 페이지에 대해 반복**

| 기존 경로 | 새 경로 | 컴포넌트 |
|-----------|---------|----------|
| `/job-postings` | `/supervisor/job-postings` | 기존 page.tsx 내용 이동 |
| `/job-postings/[id]` | `/supervisor/job-postings/[id]` | 기존 [id]/page.tsx 내용 이동 |
| `/workers` | `/supervisor/workers` | 기존 page.tsx 내용 이동 |
| `/cost-management` | `/supervisor/cost-management` | 기존 page.tsx 내용 이동 |

- [ ] **Step 3: 빌드 확인**

Run: `pnpm build:part-time-supervisor`
Expected: 빌드 성공

- [ ] **Step 4: 커밋**

```bash
git add apps/part-time-supervisor/app/
git commit -m "refactor: 기존 페이지를 /supervisor/* 경로로 이동 및 redirect 설정"
```

---

### Task 4: Query Keys 및 타입 정의 확장

**Files:**
- Modify: `apps/part-time-supervisor/lib/query-keys.ts`
- Create: `apps/part-time-supervisor/lib/interview-types.ts`

- [ ] **Step 1: query-keys.ts에 면접교육 키 추가**

```typescript
interviewPersonnel: {
  all: ["interviewPersonnel"] as const,
  detail: (id: string) => ["interviewPersonnel", id] as const,
},

interviewWorkRecords: {
  all: ["interviewWorkRecords"] as const,
  byPersonnel: (personnelId: string) => ["interviewWorkRecords", personnelId] as const,
  byMonth: (year: number, month: number) => ["interviewWorkRecords", year, month] as const,
},

interviewSettlement: {
  all: ["interviewSettlement"] as const,
  byMonth: (year: number, month: number) => ["interviewSettlement", year, month] as const,
},

interviewExpenseReports: {
  all: ["interviewExpenseReports"] as const,
  byMonth: (year: number, month: number) => ["interviewExpenseReports", year, month] as const,
  detail: (id: string) => ["interviewExpenseReports", id] as const,
},
```

- [ ] **Step 2: interview-types.ts 작성**

```typescript
export type PersonnelRole = "rp" | "ft" | "instructor";
export type PersonnelPayType = "hourly" | "daily" | "contract";
export type PersonnelStatus = "active" | "inactive";
export type ExpenseReportStatus = "draft" | "finalized";

export type InterviewPersonnel = {
  id: string;
  name: string;
  phone: string | null;
  role: PersonnelRole;
  bank_name: string | null;
  account_number: string | null;
  pay_type: PersonnelPayType;
  default_pay_rate: number | null;
  contract_amount: number | null;
  memo: string | null;
  status: PersonnelStatus;
  created_at: string;
  updated_at: string;
};

export type InterviewWorkRecord = {
  id: string;
  personnel_id: string;
  work_date: string;
  work_hours: number;
  pay_rate_override: number | null;
  pay_type_override: "hourly" | "daily" | null;
  note: string | null;
  created_at: string;
};

export type ExpenseReportItem = {
  name: string;
  amount: number;
  note?: string;
};

export type InterviewExpenseReport = {
  id: string;
  year: number;
  month: number;
  title: string;
  items: ExpenseReportItem[];
  total_labor_cost: number;
  total_extra_cost: number;
  grand_total: number;
  status: ExpenseReportStatus;
  created_at: string;
  updated_at: string;
};
```

- [ ] **Step 3: 커밋**

```bash
git add apps/part-time-supervisor/lib/query-keys.ts apps/part-time-supervisor/lib/interview-types.ts
git commit -m "feat: 면접교육 query keys 및 타입 정의 추가"
```

---

### Task 5: 인력 관리 API (`/api/interview/personnel`)

**Files:**
- Create: `apps/part-time-supervisor/app/api/interview/personnel/route.ts`
- Create: `apps/part-time-supervisor/app/api/interview/personnel/[id]/route.ts`

- [ ] **Step 1: personnel/route.ts — GET(목록) + POST(추가)**

기존 `/api/workers/route.ts` 패턴을 따른다. `createServiceClient().schema("supervisor")`로 `interview_personnel` 테이블 CRUD.

GET: 전체 목록 반환 (role, status, search 필터 query param 지원)
POST: name, role, pay_type 필수. role에 따라 default_pay_rate 또는 contract_amount 설정.

- [ ] **Step 2: personnel/[id]/route.ts — GET, PATCH, DELETE**

기존 `/api/workers/[id]/route.ts` 패턴. params는 `Promise<{ id: string }>`.

GET: 단일 인력 상세 + 해당 인력의 근무기록 조회
PATCH: 부분 업데이트
DELETE: 삭제 (CASCADE로 근무기록도 삭제됨)

- [ ] **Step 3: 커밋**

```bash
git add apps/part-time-supervisor/app/api/interview/
git commit -m "feat: 면접교육 인력 관리 API (CRUD)"
```

---

### Task 6: 인력 관리 UI (`/interview/personnel`)

**Files:**
- Create: `apps/part-time-supervisor/app/(dashboard)/interview/personnel/page.tsx`
- Create: `apps/part-time-supervisor/hooks/use-interview-personnel.ts`
- Create: `apps/part-time-supervisor/components/interview/PersonnelTable.tsx`
- Create: `apps/part-time-supervisor/components/interview/PersonnelModal.tsx`

- [ ] **Step 1: use-interview-personnel.ts — 조회 훅**

기존 `use-workers.ts` 패턴. `useQuery`로 `/api/interview/personnel` 호출.

- [ ] **Step 2: PersonnelTable.tsx — 테이블 컴포넌트**

컬럼: 이름, 역할(RP/FT/강사 배지), 연락처, 급여유형, 단가/계약금, 상태
기존 `WorkerTable.tsx` 패턴. 역할별 배지 색상:
- RP: `bg-blue-50 text-blue-700`
- FT: `bg-emerald-50 text-emerald-700`
- 강사: `bg-purple-50 text-purple-700`

- [ ] **Step 3: PersonnelModal.tsx — 추가/수정 다이얼로그**

기존 `WorkerModal.tsx` 패턴. `@repo/ui/src/dialog` 사용.
역할 선택 시 급여 입력 필드 분기:
- RP 선택 → 급여유형(시급/일급) + 기본 단가 input
- FT/강사 선택 → 계약금 input

mutation은 `useMutation`으로 POST/PATCH, 성공 시 `queryClient.invalidateQueries({ queryKey: queryKeys.interviewPersonnel.all })`.

- [ ] **Step 4: personnel/page.tsx — 페이지 조합**

기존 `workers/page.tsx` 패턴. 검색, 역할 필터 탭, 페이지네이션, 추가 버튼.

- [ ] **Step 5: 빌드 확인**

Run: `pnpm build:part-time-supervisor`
Expected: 빌드 성공

- [ ] **Step 6: 커밋**

```bash
git add apps/part-time-supervisor/app/(dashboard)/interview/ apps/part-time-supervisor/hooks/use-interview-personnel.ts apps/part-time-supervisor/components/interview/
git commit -m "feat: 면접교육 인력 관리 페이지 및 컴포넌트"
```

---

### Task 7: 근무기록 API (`/api/interview/work-records`)

**Files:**
- Create: `apps/part-time-supervisor/app/api/interview/work-records/route.ts`
- Create: `apps/part-time-supervisor/app/api/interview/work-records/[id]/route.ts`

- [ ] **Step 1: work-records/route.ts — GET(월별) + POST(추가)**

GET: `year`, `month` query param으로 해당 월의 근무기록 조회. personnel 정보 join.
POST: `personnel_id`, `work_date`, `work_hours` 필수.

- [ ] **Step 2: work-records/[id]/route.ts — PATCH, DELETE**

PATCH: work_hours, pay_rate_override, pay_type_override, note 업데이트
DELETE: 단건 삭제

- [ ] **Step 3: 커밋**

```bash
git add apps/part-time-supervisor/app/api/interview/work-records/
git commit -m "feat: 면접교육 근무기록 API (CRUD)"
```

---

### Task 8: 정산 조회 API (`/api/interview/settlement`)

**Files:**
- Create: `apps/part-time-supervisor/app/api/interview/settlement/route.ts`
- Create: `apps/part-time-supervisor/app/api/interview/settlement/export/route.ts`

- [ ] **Step 1: settlement/route.ts — GET(월별 정산 조회)**

기존 `/api/cost-management/route.ts` 로직 패턴 참조. 핵심 차이:
- RP: `interview_work_records` 기반으로 시급/일급 산정 (`calculateAmount` 재사용)
- FT/강사: `interview_personnel.contract_amount` 그대로 합산 (근무기록 불필요)
- 응답 형태: `{ summary: { totalAmount, totalWorkers, totalWorkHours }, personnel: [...] }`
- 역할 필터 query param: `role` (optional)
- 이름 검색 query param: `search` (optional, name ILIKE 매칭)

```typescript
// RP 정산: work_records 기반
for (const rec of rpRecords) {
  const effectiveRate = rec.pay_rate_override ?? personnel.default_pay_rate;
  const effectiveType = rec.pay_type_override ?? personnel.pay_type;
  subtotal += calculateAmount(effectiveType, effectiveRate, rec.work_hours);
}

// FT/강사 정산: contract_amount 직접 사용
for (const p of contractPersonnel) {
  subtotal += p.contract_amount ?? 0;
}
```

- [ ] **Step 2: settlement/export/route.ts — GET(Excel 내보내기)**

기존 `/api/cost-management/export/route.ts` 패턴. ExcelJS로 요약+상세 시트.
요약 시트: 이름, 역할, 연락처, 은행, 계좌번호, 급여유형, 근무일수, 산정금액
상세 시트: 이름, 날짜, 근무시간, 급여타입, 단가, 금액, 비고 (RP만)

- [ ] **Step 3: 커밋**

```bash
git add apps/part-time-supervisor/app/api/interview/settlement/
git commit -m "feat: 면접교육 정산 조회 및 Excel 내보내기 API"
```

---

### Task 9: 정산 페이지 UI (`/interview/settlement`)

**Files:**
- Create: `apps/part-time-supervisor/app/(dashboard)/interview/settlement/page.tsx`
- Create: `apps/part-time-supervisor/hooks/use-interview-settlement.ts`
- Create: `apps/part-time-supervisor/components/interview/SettlementPage.tsx`
- Create: `apps/part-time-supervisor/components/interview/SettlementTable.tsx`
- Create: `apps/part-time-supervisor/components/interview/SettlementExpandedRow.tsx`
- Create: `apps/part-time-supervisor/components/interview/SettlementExportButton.tsx`

- [ ] **Step 1: use-interview-settlement.ts — 조회 훅**

```typescript
export function useInterviewSettlement(year: number, month: number, role?: string, search?: string) {
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  if (role) params.set("role", role);
  if (search) params.set("search", search);

  return useQuery({
    queryKey: [...queryKeys.interviewSettlement.byMonth(year, month), role, search],
    queryFn: async () => {
      const res = await fetch(`/api/interview/settlement?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
}
```

- [ ] **Step 2: SettlementTable.tsx — 인력별 정산 테이블**

기존 `CostWorkerTable.tsx` 패턴. 컬럼: 이름, 역할(배지), 급여유형, 근무일수(RP만), 산정금액.
RP 행 클릭 시 `SettlementExpandedRow`로 날짜별 근무기록 확장.
FT/강사 행은 계약금 표시, 근무일수 컬럼은 `-`.

- [ ] **Step 3: SettlementExpandedRow.tsx — RP 상세 행**

기존 `CostWorkerExpandedRow.tsx` 패턴. 날짜, 근무시간, 단가, 금액, 비고 표시.

- [ ] **Step 4: SettlementExportButton.tsx**

기존 `CostExportButton.tsx` 패턴. `/api/interview/settlement/export` 호출.

- [ ] **Step 5: SettlementPage.tsx — 페이지 조합**

기존 `CostManagementPage.tsx` 패턴.
- 월 선택 (← 2026년 3월 →)
- 역할 필터 탭 ([전체] [RP] [FT] [강사])
- 이름 검색 (debounce)
- 요약 카드 (`CostSummaryCards` 재사용 또는 동일 패턴)
- 지출결의서 버튼 (Task 10에서 구현)
- Excel 내보내기 버튼

- [ ] **Step 6: settlement/page.tsx**

```typescript
import { SettlementPage } from "@/components/interview/SettlementPage";
export default function Page() { return <SettlementPage />; }
```

- [ ] **Step 7: 빌드 확인**

Run: `pnpm build:part-time-supervisor`
Expected: 빌드 성공

- [ ] **Step 8: 커밋**

```bash
git add apps/part-time-supervisor/app/(dashboard)/interview/settlement/ apps/part-time-supervisor/hooks/use-interview-settlement.ts apps/part-time-supervisor/components/interview/Settlement*
git commit -m "feat: 면접교육 정산 페이지 UI"
```

---

### Task 10: 지출결의서 API 및 UI

**Files:**
- Create: `apps/part-time-supervisor/app/api/interview/expense-reports/route.ts`
- Create: `apps/part-time-supervisor/app/api/interview/expense-reports/[id]/route.ts`
- Create: `apps/part-time-supervisor/components/interview/ExpenseReportDialog.tsx`
- Create: `apps/part-time-supervisor/hooks/use-expense-reports.ts`

- [ ] **Step 1: expense-reports/route.ts — GET + POST**

GET: `year`, `month` query param. 해당 월의 지출결의서 조회 (UNIQUE(year,month)이므로 단건).
POST: title, items(jsonb), year, month. `total_extra_cost`는 items 합산. `total_labor_cost`는 서버에서 해당 월의 정산 데이터를 직접 조회하여 산정 (클라이언트 전달 X). `grand_total = total_labor_cost + total_extra_cost`.

- [ ] **Step 2: expense-reports/[id]/route.ts — GET, PATCH, DELETE**

PATCH: title, items, status 업데이트. 금액 재계산.
DELETE: 삭제.

- [ ] **Step 3: use-expense-reports.ts — 훅**

`useQuery`로 GET, `useMutation`으로 POST/PATCH/DELETE. 성공 시 `queryKeys.interviewExpenseReports` invalidate.

- [ ] **Step 4: ExpenseReportDialog.tsx — 지출결의서 다이얼로그**

`@repo/ui/src/dialog` 사용. 구성:
- 제목 입력
- 인건비 합계 (자동 산정, 읽기 전용)
- 부가 비용 항목 동적 추가/삭제 (항목명, 금액, 비고)
- 총합 표시
- 저장(draft)/확정(finalized) 버튼

- [ ] **Step 5: SettlementPage에 지출결의서 버튼 연결**

`SettlementPage.tsx`에서 `ExpenseReportDialog` import하여 버튼 클릭 시 열기.

- [ ] **Step 6: 커밋**

```bash
git add apps/part-time-supervisor/app/api/interview/expense-reports/ apps/part-time-supervisor/components/interview/ExpenseReportDialog.tsx apps/part-time-supervisor/hooks/use-expense-reports.ts apps/part-time-supervisor/components/interview/SettlementPage.tsx
git commit -m "feat: 지출결의서 API 및 다이얼로그 UI"
```

---

### Task 11: 대시보드 면접교육 섹션 추가

**Files:**
- Modify: `apps/part-time-supervisor/app/api/dashboard/route.ts`
- Modify: `apps/part-time-supervisor/app/(dashboard)/page.tsx`

- [ ] **Step 1: 대시보드 API에 면접교육 데이터 추가**

기존 response에 `interview` 필드 추가:

```typescript
// 면접교육 활동 인력 수
const { count: activePersonnel } = await supabase
  .from("interview_personnel")
  .select("id", { count: "exact", head: true })
  .eq("status", "active");

// 이번 달 인건비 (RP work_records + FT/강사 contract_amount)
// ... 간략 산정 로직

return NextResponse.json({
  summary: { /* 기존 */ },
  jobPostings: [ /* 기존 */ ],
  interview: {
    activePersonnel: activePersonnel ?? 0,
    monthlyLaborCost,
    expenseReportStatus, // draft | finalized | null
  },
});
```

- [ ] **Step 2: 대시보드 페이지에 면접교육 카드 + 합산 카드 추가**

기존 대시보드 컴포넌트 아래에:
- 면접교육 섹션: 활동 인력 수, 이번달 인건비, 지출결의 상태
- 합산 섹션: 이번달 총 비용 (감독관 + 면접교육)

- [ ] **Step 3: 커밋**

```bash
git add apps/part-time-supervisor/app/api/dashboard/route.ts apps/part-time-supervisor/app/(dashboard)/page.tsx
git commit -m "feat: 대시보드에 면접교육 섹션 및 합산 추가"
```

---

### Task 12: 최종 확인 및 정리

- [ ] **Step 1: 전체 빌드 확인**

Run: `pnpm build:part-time-supervisor`
Expected: 빌드 성공

- [ ] **Step 2: 타입 체크**

Run: `pnpm check-types`
Expected: 기존 에러 외 신규 에러 없음

- [ ] **Step 3: 린트**

Run: `pnpm lint`
Expected: 통과

- [ ] **Step 4: 사이드바 네비게이션 수동 확인**

`pnpm dev:part-time-supervisor`로 로컬 실행 후 확인:
- 사이드바 1Depth/2Depth 토글 동작
- 각 메뉴 클릭 시 올바른 페이지 이동
- 기존 URL redirect 동작 (`/workers` → `/supervisor/workers`)
- 면접교육 인력 관리 CRUD
- 면접교육 정산 페이지 (역할 필터, 검색, 확장 행)
- 지출결의서 다이얼로그
- 대시보드 면접교육 섹션

- [ ] **Step 5: 최종 커밋 (필요시)**

누락된 파일이나 수정사항 정리.
