# 휴가 2단계 승인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 휴가 승인을 `대기 → 가승인(1차) → 최종승인(2차)` 2단계로 개선하고, 각 단계 승인자·일시를 기록·표기하며, 가승인 시점부터 휴가를 확정으로 간주한다.

**Architecture:** `early_leave_requests`의 검증된 2단계 패턴을 `dayoffs`에 이식한다. 파생값(연차·식대·근태)의 "확정 휴가" 기준을 `approval_status='approved'`에서 `IN ('pre_approved','approved')`로 확장한다. 승인 상태 전이는 단일 진입점 RPC `resolve_leave_approval_atomic`에 집중된다.

**Tech Stack:** Next.js 15, Supabase(Postgres, plpgsql RPC), TypeScript, TanStack Query. 검증: `supabase/tests/*.sql`(pgTAP), `pnpm check-types`, `pnpm lint`, 로컬 OrbStack Supabase.

## Global Constraints

- 마이그레이션은 로컬 OrbStack에만 적용(`supabase migration up` / `supabase db reset`). **원격 DB·`supabase db push` 절대 금지** (운영 DB는 대표가 직접 관리)
- 커밋 메시지에 **`Co-Authored-By` 금지**. 커밋 메시지는 한글 prefix(feat/fix/refactor)
- 신규 JS 테스트 프레임워크 도입 금지. DB는 pgTAP(`supabase/tests/`), 앱은 `pnpm check-types` + `pnpm lint`
- "확정 휴가 상태" = `{pre_approved, approved}`. SQL은 `IN ('pre_approved','approved')` 인라인, TS는 공용 상수 `APPROVED_LEAVE_STATUSES`
- 라벨: 가승인(`pre_approved`) / 최종승인(`approved`)
- 빌드가 TS/ESLint 에러를 무시(`ignoreBuildErrors`/`ignoreDuringBuilds`)하므로 반드시 `pnpm check-types`·`pnpm lint` 수동 실행
- 스펙 원본: `docs/superpowers/specs/2026-07-24-leave-two-step-approval-design.md`

## File Structure

**신규:**
- `supabase/migrations/20260724130000_leave_two_step_approval.sql` — 스키마 + RPC + 파생값 + 가드 (단일 마이그레이션, 섹션 구분)
- `supabase/tests/leave_two_step_approval.sql` — pgTAP 검증
- `packages/utils/src/leave-status.ts` — `APPROVED_LEAVE_STATUSES` 공용 상수

**수정 (DB는 위 마이그레이션에서 함수 재정의):**
- 파생값 앱코드 7곳(§Task 6), API 라우트 3영역(§Task 7), UI 2앱(§Task 8), types.ts 2개(§Task 5)

**참조 원본(재정의 대상 함수의 현재 정의):**
- 승인 RPC: `supabase/migrations/20260722100100_leave_request_workflow_operations.sql`
- 연차 트리거: `supabase/migrations/20260722100000_leave_request_workflow_integrity.sql:101-160`
- 식대 뷰/트리거: `supabase/migrations/20260723100000_approved_leave_meal_impact.sql`
- dayoff 통계 RPC + 인덱스: `supabase/migrations/20260724110000_query_performance_indexes.sql`
- 편집 정책: `supabase/migrations/20260722100900_leave_request_update_policy.sql`
- 중복 가드: `supabase/migrations/20260722100000_...integrity.sql:14-43`

---

### Task 1: 스키마 마이그레이션 (컬럼 + CHECK + 중복가드)

**Files:**
- Create: `supabase/migrations/20260724130000_leave_two_step_approval.sql`

**Interfaces:**
- Produces: `dayoffs.first_approver_id`, `dayoffs.first_approved_at`, `dayoffs.final_approver_id`, `dayoffs.final_approved_at`; `approval_status`/`status` CHECK에 `'pre_approved'` 추가

- [ ] **Step 1: 마이그레이션 파일 생성 — 스키마 섹션 작성**

```sql
-- 20260724130000_leave_two_step_approval.sql
-- ============ SECTION 1: 스키마 ============

-- 1a. dayoffs 2단계 승인 컬럼
ALTER TABLE dayoffs
  ADD COLUMN IF NOT EXISTS first_approver_id uuid REFERENCES members(id),
  ADD COLUMN IF NOT EXISTS first_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS final_approver_id uuid REFERENCES members(id),
  ADD COLUMN IF NOT EXISTS final_approved_at timestamptz;

COMMENT ON COLUMN dayoffs.first_approver_id IS '1차 가승인자 (신청자 지정)';
COMMENT ON COLUMN dayoffs.final_approver_id IS '2차 최종승인자 (P&C)';

-- 1b. approval_status CHECK 에 pre_approved 추가
ALTER TABLE dayoffs DROP CONSTRAINT IF EXISTS dayoffs_approval_status_check;
ALTER TABLE dayoffs ADD CONSTRAINT dayoffs_approval_status_check
  CHECK (approval_status IN ('draft','pending','pre_approved','approved','rejected'));

-- 1c. approval_requests.status CHECK 에 pre_approved 추가
ALTER TABLE approval_requests DROP CONSTRAINT IF EXISTS approval_requests_status_check;
ALTER TABLE approval_requests ADD CONSTRAINT approval_requests_status_check
  CHECK (status IN ('pending','pre_approved','approved','rejected'));

-- 1d. 중복방지 가드: pre_approved 포함 (prevent_duplicate_active_dayoff 재정의)
--     원본 20260722100600_leave_request_concurrency_and_fingerprint.sql 의
--     최신 정의를 복사하되 IN ('pending','approved') → ('pending','pre_approved','approved') 2곳
```

> 실제 작성 시 `prevent_duplicate_active_dayoff` 함수 본문은 `20260722100600_leave_request_concurrency_and_fingerprint.sql`의 현행 정의를 그대로 복사한 뒤, `approval_status IN ('pending','approved')` 두 곳(L11, L23 해당)에 `'pre_approved'`만 추가한다.

- [ ] **Step 2: CHECK 제약 문자열 확인**

Run: `grep -n "approval_status_check\|status_check" supabase/migrations/20260331300000_approval_requests.sql`
Expected: 기존 CHECK 정의 확인 (기존 제약명이 다르면 Step 1의 DROP CONSTRAINT 이름을 실제 이름으로 맞춤)

- [ ] **Step 3: 로컬 DB 적용해서 스키마만 검증**

Run: `supabase db reset` (로컬 OrbStack 실행 중 가정)
Expected: 전체 마이그레이션 재적용 성공, 에러 없음

- [ ] **Step 4: 컬럼 존재 확인**

Run: `supabase db reset && psql "$LOCAL_DB_URL" -c "\d dayoffs" | grep -E "first_approver|final_approver"`
Expected: 4개 신규 컬럼 출력

- [ ] **Step 5: 커밋**

```bash
git add supabase/migrations/20260724130000_leave_two_step_approval.sql
git commit -m "feat(leave): 휴가 2단계 승인 스키마 (가승인 컬럼·CHECK·중복가드)"
```

---

### Task 2: 승인 RPC 확장 (`resolve_leave_approval_atomic`)

**Files:**
- Modify: `supabase/migrations/20260724130000_leave_two_step_approval.sql` (SECTION 2 추가)

**Interfaces:**
- Consumes: Task 1 스키마 (first/final 컬럼)
- Produces: RPC action `pre_approve`, `approve`(최종), `reject`, `revert`, `cancel`; 예외 `LEAVE_SAME_APPROVER_FORBIDDEN`

- [ ] **Step 1: 현행 RPC 정의 확인**

Run: `cat supabase/migrations/20260722100100_leave_request_workflow_operations.sql`
Expected: `resolve_leave_approval_atomic(p_approval_id, p_actor_id, p_action, p_require_assigned_approver, p_reject_reason)` 현행 본문 확인 (approve/reject/cancel 처리 로직)

- [ ] **Step 2: RPC 재정의 작성 (SECTION 2)**

기존 본문을 복사한 뒤 action 분기를 아래 표대로 확장한다. dayoffs와 approval_requests를 한 트랜잭션에서 동기 갱신하는 기존 구조 유지.

```sql
-- ============ SECTION 2: 승인 RPC 2단계 확장 ============
CREATE OR REPLACE FUNCTION resolve_leave_approval_atomic(
  p_approval_id uuid,
  p_actor_id uuid,
  p_action text,           -- 'pre_approve' | 'approve' | 'reject' | 'revert' | 'cancel'
  p_require_assigned_approver boolean DEFAULT true,
  p_reject_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_req approval_requests%ROWTYPE;
  v_dayoff dayoffs%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM approval_requests WHERE id = p_approval_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'APPROVAL_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  SELECT * INTO v_dayoff FROM dayoffs WHERE id = v_req.related_id FOR UPDATE;

  -- 지정 승인자 검증 (pre_approve 에서만 강제; 관리자 대행 시 호출부가 false 전달)
  IF p_require_assigned_approver AND p_action = 'pre_approve'
     AND v_req.approver_id <> p_actor_id THEN
    RAISE EXCEPTION 'LEAVE_NOT_ASSIGNED_APPROVER' USING ERRCODE='42501';
  END IF;

  IF p_action = 'pre_approve' THEN
    IF v_dayoff.approval_status <> 'pending' THEN
      RAISE EXCEPTION 'LEAVE_INVALID_TRANSITION' USING ERRCODE='22023'; END IF;
    UPDATE dayoffs SET approval_status='pre_approved',
      first_approver_id=p_actor_id, first_approved_at=now()
      WHERE id=v_dayoff.id;
    UPDATE approval_requests SET status='pre_approved' WHERE id=p_approval_id;

  ELSIF p_action = 'approve' THEN
    IF v_dayoff.approval_status <> 'pre_approved' THEN
      RAISE EXCEPTION 'LEAVE_INVALID_TRANSITION' USING ERRCODE='22023'; END IF;
    IF v_dayoff.first_approver_id = p_actor_id THEN
      RAISE EXCEPTION 'LEAVE_SAME_APPROVER_FORBIDDEN' USING ERRCODE='42501'; END IF;
    UPDATE dayoffs SET approval_status='approved',
      final_approver_id=p_actor_id, final_approved_at=now(),
      approver_id=p_actor_id, approved_at=now()   -- 하위호환: approver_id=최종승인자
      WHERE id=v_dayoff.id;
    UPDATE approval_requests SET status='approved',
      resolved_by=p_actor_id, resolved_at=now() WHERE id=p_approval_id;

  ELSIF p_action = 'reject' THEN
    IF v_dayoff.approval_status NOT IN ('pending','pre_approved') THEN
      RAISE EXCEPTION 'LEAVE_INVALID_TRANSITION' USING ERRCODE='22023'; END IF;
    UPDATE dayoffs SET approval_status='rejected' WHERE id=v_dayoff.id;
    UPDATE approval_requests SET status='rejected',
      reject_reason=p_reject_reason, resolved_by=p_actor_id, resolved_at=now()
      WHERE id=p_approval_id;

  ELSIF p_action = 'revert' THEN   -- 가승인 취소
    IF v_dayoff.approval_status <> 'pre_approved' THEN
      RAISE EXCEPTION 'LEAVE_INVALID_TRANSITION' USING ERRCODE='22023'; END IF;
    UPDATE dayoffs SET approval_status='pending',
      first_approver_id=NULL, first_approved_at=NULL WHERE id=v_dayoff.id;
    UPDATE approval_requests SET status='pending' WHERE id=p_approval_id;

  ELSIF p_action = 'cancel' THEN   -- approved/rejected 되돌리기 (관리자)
    IF v_dayoff.approval_status NOT IN ('approved','rejected') THEN
      RAISE EXCEPTION 'LEAVE_INVALID_TRANSITION' USING ERRCODE='22023'; END IF;
    UPDATE dayoffs SET approval_status='pending',
      first_approver_id=NULL, first_approved_at=NULL,
      final_approver_id=NULL, final_approved_at=NULL,
      approver_id=NULL, approved_at=NULL WHERE id=v_dayoff.id;
    UPDATE approval_requests SET status='pending',
      reject_reason=NULL, resolved_by=NULL, resolved_at=NULL WHERE id=p_approval_id;
  ELSE
    RAISE EXCEPTION 'LEAVE_INVALID_ACTION' USING ERRCODE='22023';
  END IF;
END;
$$;
```

> 주의: 위는 참조 골격이다. 실제 현행 함수에 존재하는 추가 로직(fingerprint, 예외 메시지 규약 등)이 있으면 병합한다. `p_require_assigned_approver`는 `cancel`/`approve`(관리자 최종) 경로에서 호출부가 false를 넘긴다.

- [ ] **Step 3: 확정건 approver 보호 가드 검토**

Run: `cat supabase/migrations/20260722101100_leave_approved_approver_guard.sql supabase/migrations/20260722101200_leave_resolved_approver_guard.sql`
Expected: `pre_approve`가 `first_approver_id`를 세팅할 때 이 가드에 걸리지 않는지 확인. 걸리면 SECTION 2에 가드 재정의를 추가해 `pre_approved` 진입을 허용

- [ ] **Step 4: 로컬 적용 + RPC 존재 확인**

Run: `supabase db reset && psql "$LOCAL_DB_URL" -c "\df resolve_leave_approval_atomic"`
Expected: 함수 시그니처 출력, 적용 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add supabase/migrations/20260724130000_leave_two_step_approval.sql
git commit -m "feat(leave): 승인 RPC 2단계 확장 (가승인/최종승인/동일인 금지/가승인취소)"
```

---

### Task 3: 파생값 확장 (연차·식대·근태·통계·인덱스)

**Files:**
- Modify: `supabase/migrations/20260724130000_leave_two_step_approval.sql` (SECTION 3)

**Interfaces:**
- Consumes: Task 1 스키마
- Produces: `update_leave_balance_on_dayoff`, `user_monthly_stats` 뷰, `prevent_meal_log_on_approved_leave`, `get_dayoff_monthly_stats`, 부분 인덱스 — 모두 `IN ('pre_approved','approved')` 기준

- [ ] **Step 1: 연차 트리거 재정의 (SECTION 3a)**

`20260722100000_...integrity.sql:101-160`의 `update_leave_balance_on_dayoff` 본문을 복사한 뒤 두 판정을 확장:

```sql
-- v_old_effective / v_new_effective 두 곳 모두:
--   OLD.approval_status = 'approved'  →  OLD.approval_status IN ('pre_approved','approved')
--   NEW.approval_status = 'approved'  →  NEW.approval_status IN ('pre_approved','approved')
-- 나머지 로직(apply_leave_balance_delta ±1, 키변경 복원)은 그대로.
-- 트리거 OF 컬럼 목록에 approval_status 이미 포함되어 재생성 불필요하나,
-- CREATE OR REPLACE FUNCTION 만으로 본문 교체됨.
```

또한 기존 잔액 재백필(신규 마이그레이션에서 1회 재계산):

```sql
-- 잔액 재백필: 확정 휴가(pre_approved 포함) 기준으로 used 재계산
-- 원본 20260722100000_...:162-196 의 백필 UPDATE 를 복사하되
-- d.approval_status = 'approved' → d.approval_status IN ('pre_approved','approved') (2곳)
```

- [ ] **Step 2: 식대 뷰·트리거 재정의 (SECTION 3b)**

`20260723100000_approved_leave_meal_impact.sql` 전체(뷰 `user_monthly_stats` L1-222 + 트리거 `prevent_meal_log_on_approved_leave` L224-255)를 복사한 뒤:

```sql
-- L47  approved_leave_totals CTE:  d.approval_status = 'approved'
--      → d.approval_status IN ('pre_approved','approved')
-- L95  meal_totals NOT EXISTS:     d.approval_status = 'approved'
--      → d.approval_status IN ('pre_approved','approved')
-- L236 prevent_meal_log_on_approved_leave: d.approval_status = 'approved'
--      → d.approval_status IN ('pre_approved','approved')
```

- [ ] **Step 3: dayoff 통계 RPC + 인덱스 재정의 (SECTION 3c)**

`20260724110000_query_performance_indexes.sql` 참조:

```sql
-- get_dayoff_monthly_stats 재정의: approval_status = 'approved'
--   → IN ('pre_approved','approved')  (원본 :46)
-- 부분 인덱스 재생성 (원본 :6):
DROP INDEX IF EXISTS <인덱스명>;
CREATE INDEX <인덱스명> ON dayoffs (target_id, leave_date)
  WHERE is_deleted = false AND approval_status IN ('pre_approved','approved');
```

> Run: `grep -n "CREATE INDEX\|approval_status" supabase/migrations/20260724110000_query_performance_indexes.sql` 로 정확한 인덱스명·술어 확인 후 반영.

- [ ] **Step 4: 편집 정책 승인자 보존 수정 (SECTION 3d)**

`20260722100900_leave_request_update_policy.sql`의 `update_dayoff_atomic` 재정의(복사 후 수정):

```sql
-- L36-39 수정사유 필수 조건:
--   v_dayoff.approval_status = 'approved'
--   → v_dayoff.approval_status IN ('pre_approved','approved')
-- L80-85 승인자 보존 (approver_id/approved_at):
--   WHEN approval_status = 'approved' THEN v_approver_id ELSE NULL
--   → WHEN approval_status IN ('pre_approved','approved') THEN v_approver_id ELSE NULL
--   (동일하게 approved_at 조건도 IN (...) 으로)
-- ※ first_approver_id/final_approver_id 는 update_dayoff_atomic 에서 건드리지 않음(보존됨)
```

- [ ] **Step 5: 로컬 적용 검증**

Run: `supabase db reset`
Expected: 전체 재적용 성공, 함수/뷰/인덱스 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add supabase/migrations/20260724130000_leave_two_step_approval.sql
git commit -m "feat(leave): 가승인을 확정 휴가로 간주 — 연차·식대·근태 파생값 확장"
```

---

### Task 4: pgTAP 테스트 (DB 로직 검증)

**Files:**
- Create: `supabase/tests/leave_two_step_approval.sql`

**Interfaces:**
- Consumes: Task 1-3 (스키마, RPC, 파생값)

- [ ] **Step 1: 기존 테스트 패턴 확인**

Run: `ls supabase/tests/ && head -40 supabase/tests/leave_request_workflow*.sql`
Expected: pgTAP `plan()`/`ok()`/`is()` 사용 패턴, 시드/셋업 방식 확인

- [ ] **Step 2: 테스트 작성 — 핵심 시나리오**

기존 테스트의 셋업 헬퍼를 재사용해 아래를 검증하는 pgTAP 파일 작성:

```sql
-- 1. pre_approve: pending→pre_approved, first_approver_id 세팅
-- 2. approve(최종): pre_approved→approved, final_approver_id 세팅
-- 3. 동일인 금지: first_approver 가 approve 시 LEAVE_SAME_APPROVER_FORBIDDEN
-- 4. 연차 차감이 pre_approve 시점에 발생 (leave_balances.used +1)
-- 5. pre_approved→approved 전이 시 이중차감 없음 (used 그대로)
-- 6. reject(pre_approved) 시 차감 복원 (used -1)
-- 7. 식대차단: pre_approved 휴가일 meal_logs insert → APPROVED_LEAVE_MEAL_FORBIDDEN
-- 8. 잘못된 전이(pending→approve) → LEAVE_INVALID_TRANSITION
```

각 케이스는 `SELECT throws_ok(...)` / `SELECT is((SELECT used FROM leave_balances ...), N)` 형태로 실제 assert 포함.

- [ ] **Step 3: 테스트 실행**

Run: `supabase test db` (또는 `psql "$LOCAL_DB_URL" -f supabase/tests/leave_two_step_approval.sql`)
Expected: 모든 assert PASS

- [ ] **Step 4: 커밋**

```bash
git add supabase/tests/leave_two_step_approval.sql
git commit -m "test(leave): 2단계 승인·파생값 pgTAP 검증"
```

---

### Task 5: 타입 재생성 + 공용 상수

**Files:**
- Create: `packages/utils/src/leave-status.ts`
- Modify: `apps/admin/lib/supabase/types.ts`, `apps/user/lib/supabase/types.ts`

**Interfaces:**
- Produces: `APPROVED_LEAVE_STATUSES` (readonly `["pre_approved","approved"]`), `isApprovedLeaveStatus(s: string): boolean`

- [ ] **Step 1: 공용 상수 작성**

```ts
// packages/utils/src/leave-status.ts
export const APPROVED_LEAVE_STATUSES = ["pre_approved", "approved"] as const;

export type ApprovedLeaveStatus = (typeof APPROVED_LEAVE_STATUSES)[number];

/** 파생값(연차·식대·근태) 관점에서 "확정 휴가"인지 */
export function isApprovedLeaveStatus(status: string | null | undefined): boolean {
  return status === "pre_approved" || status === "approved";
}
```

- [ ] **Step 2: @repo/utils export 등록**

Run: `grep -n "export" packages/utils/src/index.ts | head`
그런 다음 `packages/utils/src/index.ts`(또는 package exports)에 `export * from "./leave-status";` 추가.

- [ ] **Step 3: 타입 재생성 (로컬 대상)**

Run: `supabase gen types typescript --local > apps/admin/lib/supabase/types.ts`
Expected: dayoffs Row/Insert/Update에 `first_approver_id`, `first_approved_at`, `final_approver_id`, `final_approved_at` 포함

> 원격 `--project-id` 사용 금지(로컬만). user 앱 types.ts도 동일하게 로컬 생성하거나, dayoffs 블록 4컬럼을 수동 반영.

- [ ] **Step 4: 타입 체크**

Run: `pnpm check-types`
Expected: PASS (신규 컬럼으로 인한 기존 코드 에러 없음)

- [ ] **Step 5: 커밋**

```bash
git add packages/utils/src/leave-status.ts packages/utils/src/index.ts apps/admin/lib/supabase/types.ts apps/user/lib/supabase/types.ts
git commit -m "feat(leave): 확정 휴가 상태 공용 상수 + dayoffs 2단계 컬럼 타입"
```

---

### Task 6: 앱 코드 파생값 확장 (7곳)

**Files:**
- Modify: `apps/admin/app/api/attendance/today/route.ts:62`
- Modify: `apps/admin/app/api/leave-balances/usage-stats/route.ts:36`
- Modify: `apps/admin/app/api/members/[id]/overview/route.ts:55,63-64`
- Modify: `apps/user/app/api/calendar/meals/route.ts:74`
- Modify: `apps/user/app/api/dashboard/calendar/route.ts:85`
- Modify: `apps/user/app/(content)/profile/ProfileAttendanceTab.tsx:168`
- Modify: `apps/project-management/lib/projects.ts:201`

**Interfaces:**
- Consumes: `isApprovedLeaveStatus` / `APPROVED_LEAVE_STATUSES` (Task 5)

- [ ] **Step 1: Supabase 쿼리 필터 확장 (admin/user route 5곳)**

각 파일에서 `.eq("approval_status", "approved")` → `.in("approval_status", APPROVED_LEAVE_STATUSES)` 로 변경하고 `@repo/utils`에서 import.

> 각 라인의 현재 표현을 먼저 확인: `grep -n "approval_status" <파일>`. `.eq(...)` 형태면 `.in(...)`으로, SQL 문자열이면 `IN (...)`으로. `attendance/today`, `leave-balances/usage-stats`, `calendar/meals`, `dashboard/calendar` 4곳 처리.

- [ ] **Step 2: members overview 분류 함수 쌍 수정**

`apps/admin/app/api/members/[id]/overview/route.ts` — `isApprovedLeave`(`:55`)와 `isPendingLeave`(`:63-64`)를 함께 수정:

```ts
// isApprovedLeave: status === 'approved'  →  isApprovedLeaveStatus(status)
// isPendingLeave: 기존 'pending' || 'pre_approved' 에서 pre_approved 제거 → 'pending' 만
//   (pre_approved 가 이제 확정 휴가로 분류되므로 대기 목록에서 빠져야 함)
```

- [ ] **Step 3: ProfileAttendanceTab 근무일 계산 수정**

`apps/user/app/(content)/profile/ProfileAttendanceTab.tsx:168` — `leaveDays` 합계 조건의 `approval_status === "approved"` → `isApprovedLeaveStatus(approval_status)`.

- [ ] **Step 4: project-management 오늘 휴가중 배지**

`apps/project-management/lib/projects.ts:201` — `approval_status = 'approved'` 필터 → `IN ('pre_approved','approved')` (쿼리 형태에 맞춰).

- [ ] **Step 5: 타입 체크 + 린트**

Run: `pnpm check-types && pnpm lint`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add apps/admin apps/user apps/project-management
git commit -m "feat(leave): 가승인 휴가를 확정으로 간주 — 앱 파생값 필터 확장"
```

---

### Task 7: API 라우트 (승인 액션 매핑)

**Files:**
- Modify: `apps/user/app/api/approvals/route.ts` (PUT), `apps/user/hooks/use-approvals.ts`
- Modify: `apps/admin/app/api/approvals/[id]/route.ts` (PUT), `apps/admin/hooks/useApprovals.ts`
- Modify: `apps/user/app/api/approvals/route.ts` (GET), `apps/admin/app/api/approvals/route.ts` (GET) — 조인

**Interfaces:**
- Consumes: RPC `resolve_leave_approval_atomic` action (Task 2)
- Produces: 응답에 `first_approver`/`final_approver`(이름 포함)

- [ ] **Step 1: user 승인 = 가승인 매핑**

`apps/user/app/api/approvals/route.ts` PUT: 휴가(`related_table='dayoffs'`)이고 action='approve'일 때 RPC를 `p_action='pre_approve'`, `p_require_assigned_approver=true`로 호출. (근태수정·work_application 등 다른 종류는 기존 로직 유지)

> 현행 PUT 처리 확인: `grep -n "resolve_leave_approval_atomic\|action" apps/user/app/api/approvals/route.ts`

- [ ] **Step 2: admin 상태별 분기**

`apps/admin/app/api/approvals/[id]/route.ts` PUT의 dayoffs 분기(`:130-156`): action='approve'일 때 현재 `approval_status`가 `pending`이면 `pre_approve`(관리자 대행, `p_require_assigned_approver=false`), `pre_approved`이면 `approve`(최종). reject/cancel/revert는 action 그대로 전달. `requireAdminPermission("leave:approve")` 유지.

- [ ] **Step 3: 조회 API 조인 확장**

user·admin `GET /api/approvals`에서 related dayoffs 조회 시 `first_approver:members!dayoffs_first_approver_id_fkey(id,full_name)`, `final_approver:...final_approver_id_fkey(...)`를 select에 추가해 이름까지 반환.

> FK 이름 확인: `psql "$LOCAL_DB_URL" -c "\d dayoffs"` 의 Foreign-key constraints. 없으면 Task1에서 명시적으로 CONSTRAINT 이름 부여.

- [ ] **Step 4: hook 타입/액션 반영**

`use-approvals.ts`(user)·`useApprovals.ts`(admin)의 `ApprovalRequest`/related 타입에 `first_approver`/`final_approver`/`first_approved_at`/`final_approved_at` 추가. admin hook에 최종승인/가승인취소 mutation 필요 시 action 파라미터화.

- [ ] **Step 5: 타입 체크 + 린트**

Run: `pnpm check-types && pnpm lint`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add apps/user apps/admin
git commit -m "feat(leave): 승인 API 2단계 매핑 (user 가승인 / admin 최종승인·분기 / 조인)"
```

---

### Task 8: UI (승인 화면 버튼·상태·이력 표기)

**Files:**
- Modify: `apps/user/app/(content)/approvals/page.tsx` (또는 해당 컴포넌트)
- Modify: `apps/admin/app/(dashboard)/approvals/page.tsx`
- Modify: `apps/user/app/(content)/profile/ProfileAttendanceTab.tsx:104-109` (`DAYOFF_STATUS_LABELS`)

**Interfaces:**
- Consumes: Task 7 API 응답(first/final approver), Task 2 action

- [ ] **Step 1: 상태 라벨/뱃지에 가승인 추가**

- user·admin 승인화면 상태 뱃지 맵에 `pre_approved: "가승인"` 추가 (admin `page.tsx:57-78` 참고, `pre_approved` 이미 "가승인"으로 존재하는지 확인 — 조기퇴근용으로 있을 수 있음)
- `ProfileAttendanceTab.tsx:104-109` `DAYOFF_STATUS_LABELS`에 `pre_approved: "가승인"` 추가 + `:671` 뱃지 색: 가승인=청록/파랑, 최종승인(approved)=녹색

- [ ] **Step 2: user 승인화면 버튼 = "가승인"**

`apps/user/app/(content)/approvals` 휴가 건의 "승인" 버튼 라벨을 "가승인"으로. 반려 유지.

- [ ] **Step 3: admin 승인화면 상태별 버튼 분기**

`apps/admin/app/(dashboard)/approvals/page.tsx` 휴가 건: `pending`→"가승인", `pre_approved`→"최종승인"+"가승인 취소", 반려는 둘 다. early_leave `EarlyLeaveActions:795-847` 패턴 참고.

- [ ] **Step 4: 승인 이력 표기 (두 앱)**

승인자/처리일 표시부에 `가승인 {first_approver.full_name} · {first_approved_at} / 최종승인 {final_approver.full_name} · {final_approved_at}` 형식 추가. early_leave `approvalHistoryText`(`page.tsx:901-906`) 패턴 재사용. 날짜 포맷은 `@repo/utils` KST 유틸 사용.

- [ ] **Step 5: 타입 체크 + 린트**

Run: `pnpm check-types && pnpm lint`
Expected: PASS

- [ ] **Step 6: 로컬 수동 확인**

Run: `pnpm dev:user` / `pnpm dev:admin` 후 승인 흐름 시연 (신청 → user 가승인 → admin 최종승인, 동일인 최종승인 시 에러, 각 단계 표기 확인). Playwright MCP로 스크린샷 가능.

- [ ] **Step 7: 커밋**

```bash
git add apps/user apps/admin
git commit -m "feat(leave): 승인 UI 2단계 (가승인/최종승인 버튼·상태·이력 표기)"
```

---

### Task 9: 통합 검증

- [ ] **Step 1: 전체 재적용 + 테스트**

Run: `supabase db reset && supabase test db`
Expected: 마이그레이션·pgTAP 모두 PASS

- [ ] **Step 2: 타입·린트 전체**

Run: `pnpm check-types && pnpm lint`
Expected: PASS (max-warnings 0)

- [ ] **Step 3: incomplete-users 오분류 검증**

가승인 휴가일이 `/api/stats/incomplete-users`에서 "미입력자"로 잡히지 않는지 수동 확인(기존 approved와 동일 동작이어야 함). 오분류 시 별도 fix 커밋.

- [ ] **Step 4: 리스크 체크리스트 확인**

스펙 §13 항목(이중차감 상쇄, pending/pre_approved 분리, incomplete-users) 각각 검증 결과 기록.

---

## Self-Review (계획 작성자 확인 완료)

- **Spec coverage:** 스펙 §5(스키마)→T1, §6(파생값)→T3·T6, §7(RPC)→T2, §8(API)→T7, §9(UI)→T8, §10(타입)→T5, §11(제약)→Global Constraints, §13(리스크)→T9. 전 항목 매핑됨.
- **Placeholder scan:** 재정의 함수는 "원본 파일:라인 복사 후 이 지점을 이렇게 변경"으로 정확한 diff 명시(전체 200줄 복붙 대신). TBD/TODO 없음.
- **Type consistency:** `APPROVED_LEAVE_STATUSES`/`isApprovedLeaveStatus`(T5)를 T6에서 소비, RPC action 명(`pre_approve`/`approve`/`reject`/`revert`/`cancel`)이 T2·T7에서 일치, `first_approver_id`/`final_approver_id` 컬럼명이 T1·T2·T7·T8에서 일치.
