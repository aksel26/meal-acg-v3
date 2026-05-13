# Phase 2: 연차 관리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 직급 기반 연차 부여/사용/잔여 추적 시스템을 구축하고, admin 앱에 연차 현황 페이지를 추가한다.

**Architecture:** `leave_types` 테이블에 연차 차감 관련 컬럼을 추가하고, `leave_balances` 테이블로 연도별 부여/사용/조정을 관리한다. `leave_adjustments` 테이블로 관리자 수동 조정 이력을 추적한다. dayoffs 등록/삭제 시 leave_balances.used를 자동 증감하는 트리거를 추가한다.

**Tech Stack:** Supabase (Postgres triggers), Next.js 15 App Router, React 19, TanStack React Query, @repo/ui

**참고:** 테스트 프레임워크 없음. 검증은 `pnpm check-types`와 브라우저 확인.

---

## 파일 구조

```
supabase/migrations/
  20260331100000_leave_management.sql       ← DB 스키마 (leave_types 확장 + leave_balances + leave_adjustments + 트리거)

apps/admin/
  app/api/leave-balances/route.ts           ← GET (전체 목록) + POST (연차 부여)
  app/api/leave-balances/[id]/route.ts      ← PUT (수동 조정)
  app/api/leave-balances/generate/route.ts  ← POST (연도별 일괄 부여)
  app/(dashboard)/leave-balances/page.tsx   ← 연차 현황 페이지
  hooks/useLeaveBalances.ts                 ← React Query hooks
  lib/query-keys.ts                         ← leaveBalances 키 추가
  lib/supabase/types.ts                     ← leave_balances, leave_adjustments 타입 추가
```

---

### Task 1: DB 마이그레이션 — leave_types 확장 + leave_balances + leave_adjustments

**Files:**
- Create: `supabase/migrations/20260331100000_leave_management.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- =============================================================
-- Phase 2: 연차 관리 스키마
-- leave_types 확장 + leave_balances + leave_adjustments + 자동 차감 트리거
-- =============================================================

-- 1. leave_types 테이블 확장
ALTER TABLE leave_types
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deducts_annual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deduction_amount decimal(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_separate_quota boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_quota integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN leave_types.is_system IS 'true=고정 유형(삭제/수정 불가)';
COMMENT ON COLUMN leave_types.deducts_annual IS '연차 잔여에서 차감 여부';
COMMENT ON COLUMN leave_types.deduction_amount IS '차감량 (0.25, 0.5, 1 등)';
COMMENT ON COLUMN leave_types.has_separate_quota IS '별도 할당 여부 (하계휴가 등)';
COMMENT ON COLUMN leave_types.default_quota IS '별도 할당 시 기본 일수';

-- 기존 16개 유형에 새 컬럼 값 설정
-- 고정 유형 (is_system = true)
UPDATE leave_types SET is_system = true WHERE id IN (1, 2, 3, 4, 5);
-- 지각(1): 차감 없음
UPDATE leave_types SET deducts_annual = false, deduction_amount = 0 WHERE id = 1;
-- 조퇴(2): 차감 없음
UPDATE leave_types SET deducts_annual = false, deduction_amount = 0 WHERE id = 2;
-- 오전반차(3): 0.5일 차감
UPDATE leave_types SET deducts_annual = true, deduction_amount = 0.5 WHERE id = 3;
-- 오후반차(4): 0.5일 차감
UPDATE leave_types SET deducts_annual = true, deduction_amount = 0.5 WHERE id = 4;
-- 연차(5): 1일 차감
UPDATE leave_types SET deducts_annual = true, deduction_amount = 1 WHERE id = 5;
-- 대체휴무(6, 11, 12): 차감 없음
UPDATE leave_types SET deducts_annual = false, deduction_amount = 0 WHERE id IN (6, 11, 12);
-- 경조휴무(7): 차감 없음
UPDATE leave_types SET deducts_annual = false, deduction_amount = 0 WHERE id = 7;
-- 특별휴무(8, 13, 14): 차감 없음
UPDATE leave_types SET deducts_annual = false, deduction_amount = 0 WHERE id IN (8, 13, 14);
-- 훈련(9, 15, 16): 차감 없음
UPDATE leave_types SET deducts_annual = false, deduction_amount = 0 WHERE id IN (9, 15, 16);
-- 휴무(10): 차감 없음
UPDATE leave_types SET deducts_annual = false, deduction_amount = 0 WHERE id = 10;

-- 반반차 유형 추가 (기존에 없음)
INSERT INTO leave_types (id, name, category, duration_type, include_in_stats, sort_order, is_system, deducts_annual, deduction_amount)
VALUES
  (17, '오전반반차', '반반차', 'morning', true, 17, true, true, 0.25),
  (18, '오후반반차', '반반차', 'afternoon', true, 18, true, true, 0.25)
ON CONFLICT (id) DO NOTHING;

-- 하계휴가 추가 (별도 할당)
INSERT INTO leave_types (id, name, category, duration_type, include_in_stats, sort_order, is_system, deducts_annual, deduction_amount, has_separate_quota, default_quota)
VALUES
  (19, '하계휴가', '하계휴가', 'full', true, 19, false, false, 0, true, 3)
ON CONFLICT (id) DO NOTHING;

-- 공제 추가
INSERT INTO leave_types (id, name, category, duration_type, include_in_stats, sort_order, is_system, deducts_annual, deduction_amount)
VALUES
  (20, '공제', '공제', 'full', true, 20, false, false, 0)
ON CONFLICT (id) DO NOTHING;

-- 무급휴가 추가
INSERT INTO leave_types (id, name, category, duration_type, include_in_stats, sort_order, is_system, deducts_annual, deduction_amount)
VALUES
  (21, '무급휴가', '무급휴가', 'full', true, 21, false, false, 0)
ON CONFLICT (id) DO NOTHING;

-- 2. leave_balances 테이블
CREATE TABLE leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  year integer NOT NULL,
  type text NOT NULL CHECK (type IN ('monthly', 'annual', 'summer')),
  granted decimal(5,2) NOT NULL DEFAULT 0,
  used decimal(5,2) NOT NULL DEFAULT 0,
  adjusted decimal(5,2) NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(member_id, year, type)
);

COMMENT ON TABLE leave_balances IS '연차/월차/하계휴가 잔여 관리';
COMMENT ON COLUMN leave_balances.type IS 'monthly=월차, annual=연차, summer=하계휴가';
COMMENT ON COLUMN leave_balances.granted IS '부여일수';
COMMENT ON COLUMN leave_balances.used IS '사용일수 (트리거 자동 계산)';
COMMENT ON COLUMN leave_balances.adjusted IS '관리자 조정 (+/-)';

CREATE INDEX idx_leave_balances_member_year ON leave_balances(member_id, year);

-- 3. leave_adjustments 테이블 (관리자 수동 조정 이력)
CREATE TABLE leave_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  balance_id uuid NOT NULL REFERENCES leave_balances(id) ON DELETE CASCADE,
  adjusted_by uuid NOT NULL REFERENCES members(id),
  amount decimal(5,2) NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE leave_adjustments IS '관리자 연차 수동 조정 이력';

CREATE INDEX idx_leave_adjustments_balance ON leave_adjustments(balance_id);

-- 4. updated_at 트리거
CREATE TRIGGER set_leave_balances_updated_at
  BEFORE UPDATE ON leave_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. dayoffs INSERT 시 leave_balances.used 자동 증가 트리거
CREATE OR REPLACE FUNCTION update_leave_balance_on_dayoff()
RETURNS TRIGGER AS $$
DECLARE
  v_deducts boolean;
  v_amount decimal(3,2);
  v_year integer;
BEGIN
  -- 새 레코드 INSERT 또는 소프트 삭제 해제
  IF TG_OP = 'INSERT' AND NEW.is_deleted = false THEN
    SELECT deducts_annual, deduction_amount INTO v_deducts, v_amount
    FROM leave_types WHERE id = NEW.leave_type_id;

    IF v_deducts AND v_amount > 0 THEN
      v_year := EXTRACT(YEAR FROM NEW.leave_date);
      UPDATE leave_balances
      SET used = used + v_amount
      WHERE member_id = NEW.target_id
        AND year = v_year
        AND type = 'annual';

      -- annual이 없으면 monthly에서 차감
      IF NOT FOUND THEN
        UPDATE leave_balances
        SET used = used + v_amount
        WHERE member_id = NEW.target_id
          AND year = v_year
          AND type = 'monthly';
      END IF;
    END IF;
  END IF;

  -- 소프트 삭제 시 used 감소
  IF TG_OP = 'UPDATE' AND OLD.is_deleted = false AND NEW.is_deleted = true THEN
    SELECT deducts_annual, deduction_amount INTO v_deducts, v_amount
    FROM leave_types WHERE id = NEW.leave_type_id;

    IF v_deducts AND v_amount > 0 THEN
      v_year := EXTRACT(YEAR FROM NEW.leave_date);
      UPDATE leave_balances
      SET used = GREATEST(used - v_amount, 0)
      WHERE member_id = NEW.target_id
        AND year = v_year
        AND type = 'annual';

      IF NOT FOUND THEN
        UPDATE leave_balances
        SET used = GREATEST(used - v_amount, 0)
        WHERE member_id = NEW.target_id
          AND year = v_year
          AND type = 'monthly';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dayoff_leave_balance
  AFTER INSERT OR UPDATE OF is_deleted ON dayoffs
  FOR EACH ROW EXECUTE FUNCTION update_leave_balance_on_dayoff();

-- 6. 연차 부여 RPC 함수
-- 특정 연도의 연차를 일괄 부여 (직급 기반)
CREATE OR REPLACE FUNCTION generate_annual_leave(p_year integer)
RETURNS integer AS $$
DECLARE
  v_member RECORD;
  v_days decimal(5,2);
  v_hire_days integer;
  v_years_since_hire integer;
  v_extra_days integer;
  v_count integer := 0;
BEGIN
  FOR v_member IN
    SELECT m.id, m.hire_date, m.position_id,
           p.annual_leave_days, p.leave_accrual_rule, p.name as position_name
    FROM members m
    JOIN positions p ON m.position_id = p.id
    LEFT JOIN member_statuses ms ON ms.member_id = m.id
      AND ms.status = '퇴사'
      AND (ms.end_date IS NULL OR ms.end_date >= (p_year || '-01-01')::date)
    WHERE ms.id IS NULL  -- 퇴사자 제외
  LOOP
    -- 연차 없는 직급 (인턴 등) 건너뛰기
    IF v_member.annual_leave_days = 0 THEN
      CONTINUE;
    END IF;

    -- hire_date가 없으면 건너뛰기
    IF v_member.hire_date IS NULL THEN
      CONTINUE;
    END IF;

    v_days := v_member.annual_leave_days;

    -- 입사 첫해: 비례연차 계산
    IF EXTRACT(YEAR FROM v_member.hire_date) = p_year - 1 THEN
      -- 전년도 재직일수
      v_hire_days := (p_year || '-01-01')::date - v_member.hire_date;
      IF v_hire_days > 0 THEN
        v_days := ROUND(15.0 * v_hire_days / 365, 1);
      ELSE
        v_days := 0;
      END IF;
    -- 입사 당해: 월차로 처리 (별도 monthly 타입)
    ELSIF EXTRACT(YEAR FROM v_member.hire_date) = p_year THEN
      -- 입사 다음 월부터 12월까지 월차
      v_days := 12 - EXTRACT(MONTH FROM v_member.hire_date);
      IF v_days < 0 THEN v_days := 0; END IF;

      INSERT INTO leave_balances (member_id, year, type, granted, note)
      VALUES (v_member.id, p_year, 'monthly', v_days, '입사 ' || EXTRACT(YEAR FROM v_member.hire_date) || '년 월차')
      ON CONFLICT (member_id, year, type) DO UPDATE SET granted = v_days;

      v_count := v_count + 1;
      CONTINUE;  -- 월차 처리했으므로 annual 건너뛰기
    END IF;

    -- 3년마다 +1일 가산 (선임 이상, leave_accrual_rule = '+1_per_3yr')
    IF v_member.leave_accrual_rule = '+1_per_3yr' THEN
      v_years_since_hire := EXTRACT(YEAR FROM age((p_year || '-01-01')::date, v_member.hire_date));
      v_extra_days := v_years_since_hire / 3;
      v_days := v_days + v_extra_days;
    END IF;

    INSERT INTO leave_balances (member_id, year, type, granted, note)
    VALUES (v_member.id, p_year, 'annual', v_days,
            v_member.position_name || ' 기본 ' || v_member.annual_leave_days || '일' ||
            CASE WHEN v_member.leave_accrual_rule = '+1_per_3yr' THEN ' + 근속가산' ELSE '' END)
    ON CONFLICT (member_id, year, type) DO UPDATE SET granted = v_days;

    v_count := v_count + 1;
  END LOOP;

  -- 하계휴가 일괄 부여
  INSERT INTO leave_balances (member_id, year, type, granted, note)
  SELECT m.id, p_year, 'summer', 3, '하계휴가 3일'
  FROM members m
  JOIN positions p ON m.position_id = p.id
  WHERE p.annual_leave_days > 0  -- 인턴 제외
    AND NOT EXISTS (
      SELECT 1 FROM member_statuses ms
      WHERE ms.member_id = m.id AND ms.status = '퇴사'
    )
  ON CONFLICT (member_id, year, type) DO NOTHING;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 2: 로컬 DB 적용 확인**

Run: `supabase db reset 2>&1 | tail -10`
Expected: `Finished supabase db reset`

주의: supabase start가 supervisor 스키마 문제로 실패할 수 있음. 그 경우:
1. `supabase/config.toml`에서 schemas에서 "supervisor" 임시 제거
2. `supabase start`
3. `supabase db reset`
4. schemas에 "supervisor" 복원

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/20260331100000_leave_management.sql
git commit -m "feat(db): 연차 관리 스키마 — leave_balances + leave_adjustments + 자동 차감 트리거"
```

---

### Task 2: Supabase 타입 업데이트

**Files:**
- Modify: `apps/admin/lib/supabase/types.ts`
- Modify: `apps/user/lib/supabase/types.ts`

- [ ] **Step 1: admin 타입 파일에 leave_balances, leave_adjustments 추가**

`apps/admin/lib/supabase/types.ts`의 `Database.public.Tables`에:

```typescript
leave_balances: {
  Row: {
    id: string
    member_id: string
    year: number
    type: string
    granted: number
    used: number
    adjusted: number
    note: string | null
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    member_id: string
    year: number
    type: string
    granted?: number
    used?: number
    adjusted?: number
    note?: string | null
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    member_id?: string
    year?: number
    type?: string
    granted?: number
    used?: number
    adjusted?: number
    note?: string | null
    created_at?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "leave_balances_member_id_fkey"
      columns: ["member_id"]
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
  ]
}

leave_adjustments: {
  Row: {
    id: string
    balance_id: string
    adjusted_by: string
    amount: number
    reason: string | null
    created_at: string
  }
  Insert: {
    id?: string
    balance_id: string
    adjusted_by: string
    amount: number
    reason?: string | null
    created_at?: string
  }
  Update: {
    id?: string
    balance_id?: string
    adjusted_by?: string
    amount?: number
    reason?: string | null
    created_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "leave_adjustments_balance_id_fkey"
      columns: ["balance_id"]
      referencedRelation: "leave_balances"
      referencedColumns: ["id"]
    }
  ]
}
```

leave_types Row/Insert/Update에도 새 컬럼 추가:
- `is_system: boolean`
- `deducts_annual: boolean`
- `deduction_amount: number`
- `has_separate_quota: boolean`
- `default_quota: number`

- [ ] **Step 2: user 타입도 동일하게 업데이트**

- [ ] **Step 3: 커밋**

```bash
git add apps/admin/lib/supabase/types.ts apps/user/lib/supabase/types.ts
git commit -m "chore(db): leave_balances/leave_adjustments 타입 추가"
```

---

### Task 3: 연차 현황 API 라우트

**Files:**
- Create: `apps/admin/app/api/leave-balances/route.ts`
- Create: `apps/admin/app/api/leave-balances/[id]/route.ts`
- Create: `apps/admin/app/api/leave-balances/generate/route.ts`

- [ ] **Step 1: leave-balances/route.ts 작성**

GET: 연도별 전체 멤버 연차 현황 조회
- query params: `year` (필수)
- `supabase.from("leave_balances").select("*, member:members!leave_balances_member_id_fkey(id, full_name, position_id, hire_date, position:positions!members_position_id_fkey(name))").eq("year", year).order("member_id")`
- 응답: 멤버별 annual/monthly/summer 잔여 정보

POST: 개별 연차 수동 등록
- body: `{ member_id, year, type, granted, note }`
- insert + select + single

- [ ] **Step 2: leave-balances/[id]/route.ts 작성**

PUT: 관리자 수동 조정
- body: `{ adjustment, reason }` (adjustment는 +/- 값)
- 트랜잭션으로: leave_adjustments에 INSERT + leave_balances.adjusted 업데이트
- `adjusted = adjusted + adjustment`

- [ ] **Step 3: leave-balances/generate/route.ts 작성**

POST: 연도별 일괄 부여
- body: `{ year }`
- RPC 호출: `supabase.rpc("generate_annual_leave", { p_year: year })`
- 응답: `{ generated: count }`

- [ ] **Step 4: 타입 체크**

Run: `cd apps/admin && npx tsc --noEmit 2>&1 | tail -5`
Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add apps/admin/app/api/leave-balances/
git commit -m "feat(admin): 연차 현황 API — 조회/수동등록/조정/일괄부여"
```

---

### Task 4: Query Keys + React Query Hooks

**Files:**
- Modify: `apps/admin/lib/query-keys.ts`
- Create: `apps/admin/hooks/useLeaveBalances.ts`

- [ ] **Step 1: query-keys.ts에 추가**

```typescript
leaveBalances: {
  all: ["leaveBalances"] as const,
  byYear: (year: number) => ["leaveBalances", year] as const,
},
```

- [ ] **Step 2: useLeaveBalances.ts 작성**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@repo/ui/src/sonner";

export interface LeaveBalance {
  id: string;
  member_id: string;
  year: number;
  type: string;       // 'monthly' | 'annual' | 'summer'
  granted: number;
  used: number;
  adjusted: number;
  note: string | null;
  member: {
    id: string;
    full_name: string;
    hire_date: string | null;
    position: { name: string } | null;
  };
}

export function useLeaveBalances(year: number) {
  return useQuery<LeaveBalance[]>({
    queryKey: queryKeys.leaveBalances.byYear(year),
    queryFn: async () => {
      const res = await fetch(`/api/leave-balances?year=${year}`);
      if (!res.ok) throw new Error("Failed to fetch leave balances");
      return res.json();
    },
  });
}

export function useGenerateLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (year: number) => {
      const res = await fetch("/api/leave-balances/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate");
      }
      return res.json();
    },
    onSuccess: (data, year) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveBalances.byYear(year) });
      toast.success(`${data.generated}명의 연차가 부여되었습니다.`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useAdjustLeaveBalance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, adjustment, reason }: { id: string; adjustment: number; reason: string }) => {
      const res = await fetch(`/api/leave-balances/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adjustment, reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to adjust");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveBalances.all });
      toast.success("연차가 조정되었습니다.");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
```

- [ ] **Step 3: 타입 체크 + 커밋**

```bash
git add apps/admin/lib/query-keys.ts apps/admin/hooks/useLeaveBalances.ts
git commit -m "feat(admin): 연차 현황 React Query hooks 추가"
```

---

### Task 5: 연차 현황 페이지 UI

**Files:**
- Create: `apps/admin/app/(dashboard)/leave-balances/page.tsx`

- [ ] **Step 1: 페이지 작성**

"use client" 페이지. 구성:

**상단:**
- 연도 선택 (좌우 화살표 + 년도 표시)
- "연차 일괄 부여" 버튼 → AlertDialog 확인 → `useGenerateLeave().mutate(year)`

**테이블:**
- 컬럼: 이름 | 직급 | 입사일 | 유형 | 부여 | 사용 | 조정 | 잔여(부여+조정-사용) | 관리
- 멤버별로 annual/monthly/summer 행이 여러 개일 수 있음
- 멤버 이름은 첫 행에만 표시 (rowspan 대신 같은 멤버 그룹화)

**조정 버튼:**
- 클릭 → Dialog: 조정량(+/- 숫자 입력) + 사유(텍스트) + 확인
- `useAdjustLeaveBalance().mutate({ id, adjustment, reason })`

**스타일:** 기존 admin 테이블 패턴 (rounded-xl border bg-white, slate 컬러)

**잔여 컬럼 색상:**
- 양수: text-slate-900
- 0: text-slate-400
- 음수: text-rose-600

- [ ] **Step 2: 타입 체크**

Run: `cd apps/admin && npx tsc --noEmit 2>&1 | tail -5`

- [ ] **Step 3: 커밋**

```bash
git add "apps/admin/app/(dashboard)/leave-balances/"
git commit -m "feat(admin): 연차 현황 페이지 UI — 부여/사용/잔여 테이블 + 수동 조정"
```

---

### Task 6: 사이드바에 연차 현황 메뉴 추가

**Files:**
- Modify: `apps/admin/components/Sidebar.tsx`

- [ ] **Step 1: 근태 관리 그룹에 메뉴 추가**

현재 근태 관리 NavGroup:
```typescript
{
  name: "근태 관리",
  icon: CalendarClock,
  items: [
    { name: "휴가 관리", href: "/dayoffs", icon: CalendarDays },
  ],
},
```

추가:
```typescript
{ name: "연차 현황", href: "/leave-balances", icon: BarChart3 },
```

`BarChart3`는 이미 import되어 있음.

- [ ] **Step 2: 타입 체크 + 커밋**

```bash
git add apps/admin/components/Sidebar.tsx
git commit -m "feat(admin): 사이드바 근태 관리에 연차 현황 메뉴 추가"
```

---

### Task 7: seed.sql에 연차 시드 데이터 추가

**Files:**
- Modify: `supabase/seed.sql`

- [ ] **Step 1: seed.sql 끝부분에 연차 시드 데이터 추가**

```sql
-- ============================================================
-- 연차 시드 데이터 (2026년)
-- ============================================================

-- RPC로 2026년 연차 일괄 부여
SELECT generate_annual_leave(2026);
```

- [ ] **Step 2: DB reset 확인**

Run: `supabase db reset 2>&1 | tail -10`

- [ ] **Step 3: 커밋**

```bash
git add supabase/seed.sql
git commit -m "chore(db): 연차 시드 데이터 추가 (2026년 일괄 부여)"
```

---

### Task 8: 최종 검증

- [ ] **Step 1: 전체 타입 체크**

Run: `pnpm check-types 2>&1 | tail -20`
Expected: admin, part-time-supervisor 통과

- [ ] **Step 2: DB 리셋 검증**

Run: `supabase db reset 2>&1 | tail -10`
Expected: 모든 마이그레이션 + 시드 + generate_annual_leave 성공

- [ ] **Step 3: 브라우저 검증**

Run: `pnpm dev:admin`
확인 사항:
1. 사이드바 "근태 관리 > 연차 현황" 메뉴 노출
2. 연차 현황 페이지: 2026년 기준 멤버별 연차/월차/하계휴가 표시
3. "연차 일괄 부여" 버튼 동작
4. 수동 조정 Dialog 동작
5. 휴가 관리에서 연차 등록 시 leave_balances.used 자동 증가 확인
