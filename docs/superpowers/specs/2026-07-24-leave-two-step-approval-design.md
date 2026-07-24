# 휴가 2단계 승인 — 설계 문서

작성일: 2026-07-24
대상: admin + user 앱 (+ project-management 파생값)

## 1. 목적

휴가 승인을 1단계(단일 승인자)에서 2단계로 개선한다. 각 단계별 승인자와 일시를 기록·표기하고, 가승인 시점부터 휴가를 확정으로 간주한다.

## 2. 확정 요구사항

- **흐름:** `대기(pending) → 가승인(pre_approved) → 최종승인(approved)`, 어느 단계서든 반려(rejected)
- **1차 가승인:** 신청자가 지정한 승인자(팀장 등)가 **user 앱** 승인화면(`(content)/approvals`)에서 처리
- **2차 최종승인:** P&C 직원(admin `leave:approve` 권한 보유 가정)이 **admin 앱** 승인화면에서 처리 — 정상여부 판단 용도
- **동일인 금지:** 1차 가승인자와 2차 최종승인자가 같을 수 없다 (DB RPC에서 강제)
- **반려 주체:** 팀장은 대기 상태에서, P&C는 대기·가승인 상태 모두 반려 가능(가승인된 것도 되돌림 → 차감 복원)
- **직원 관점 확정 시점:** 팀장이 가승인하면 그 순간 "휴가 사용 승인"으로 간주 → 연차·식대·근태 파생값이 **가승인 시점**부터 적용. 최종승인은 P&C 사후 판단일 뿐 휴가 사용의 전제가 아님
- **가승인 휴가 편집(A안):** 가승인도 승인과 동일 취급 — 직원 수정 시 사유 필수, 삭제는 본인 가능, 파생값은 트리거 자동 재계산
- **라벨:** 가승인 / 최종승인

## 3. 핵심 원칙: "확정 휴가 상태" 집합

파생값(연차·식대·근태) 관점에서 `pre_approved`와 `approved`는 **동일하게 "확정 휴가"**로 취급한다.

- **TS:** 공용 상수 하나로 정의해 재사용
  ```ts
  export const APPROVED_LEAVE_STATUSES = ["pre_approved", "approved"] as const;
  ```
- **SQL:** `approval_status IN ('pre_approved','approved')` 인라인 (인덱스 술어 포함 — immutable helper는 인덱스에 못 쓰므로 인라인 유지)

## 4. 채택 접근 (A안)

`early_leave_requests`(조기퇴근)가 이미 검증한 2단계 패턴을 `dayoffs`에 이식한다.
- 대안 B(범용 `approval_steps` 테이블 신설) → 오버엔지니어링, 스킵
- 대안 C(범용 `approval_requests`에 2단계 컬럼) → overtime과 얽힘, 격리 나쁨, 스킵

## 5. 스키마 변경 (신규 마이그레이션)

파일명 예: `supabase/migrations/20260724130000_leave_two_step_approval.sql` (기존 최신 `20260724110000` 이후)

1. `dayoffs` 컬럼 추가:
   - `first_approver_id uuid REFERENCES members(id)`
   - `first_approved_at timestamptz`
   - `final_approver_id uuid REFERENCES members(id)`
   - `final_approved_at timestamptz`
2. CHECK 제약에 `'pre_approved'` 추가:
   - `dayoffs.approval_status` → `('draft','pending','pre_approved','approved','rejected')`
   - `approval_requests.status` → `('pending','pre_approved','approved','rejected')`
3. 중복방지 가드 `prevent_duplicate_active_dayoff` 재정의: `IN ('pending','approved')` → `('pending','pre_approved','approved')`
   - 원본: `20260722100000_leave_request_workflow_integrity.sql:21,28`, `20260722100600_leave_request_concurrency_and_fingerprint.sql:11,23`
4. (선택) 기존 `approved` 건 백필: `final_approver_id ← approver_id`, `final_approved_at ← approved_at` (과거 건도 최종승인자 표기)

## 6. 파생값 로직 — `approved` → `IN ('pre_approved','approved')` 일괄 확장

가승인 시점부터 확정으로 간주하기 위해 아래를 모두 함께 바꾼다. (미조정 시 파생값 불일치)

### 6.1 DB (뷰·트리거·RPC·인덱스)
- **연차 차감 트리거** `update_leave_balance_on_dayoff` — `20260722100000_...integrity.sql:112,117`의 `v_old_effective`/`v_new_effective` 둘 다 확장 + 잔액 재백필(`:172,189` 대응)
  - *이중차감 방지 확인:* `pre_approved→approved` 전이 시 delta = +1−1 = 0. 반려 시 −1 복원. 두 판정을 동시에 바꿔야 정확
- **식대·근태 뷰** `user_monthly_stats` — `20260723100000_approved_leave_meal_impact.sql:47`(`approved_leave_totals` CTE), `:95`(`meal_totals`의 `NOT EXISTS`)
- **식대입력 차단 트리거** `prevent_meal_log_on_approved_leave` — 같은 파일 `:236`
- **월별 휴가통계 RPC** `get_dayoff_monthly_stats` — `20260724110000_query_performance_indexes.sql:46`
- **부분 인덱스 술어** — `20260724110000_...:6` (`WHERE ... approval_status='approved'` → `IN(...)`, 안 바꾸면 새 쿼리가 인덱스 못 탐)
- **테스트 SQL 기대값** — `supabase/tests/query_performance_regression*.sql`, `leave_request_workflow*.sql`, `leave_meal_impact*.sql` 갱신

### 6.2 앱 코드 (TS/TSX) — `APPROVED_LEAVE_STATUSES` 상수 사용
- admin `app/api/attendance/today/route.ts:62` (미체크인 집계에서 휴가자 제외)
- admin `app/api/leave-balances/usage-stats/route.ts:36` (연차 사용통계)
- admin `app/api/members/[id]/overview/route.ts:55` `isApprovedLeave` + `:63-64` `isPendingLeave` **쌍으로 수정** (pre_approved가 현재 "대기"로 오분류됨)
- user `app/api/calendar/meals/route.ts:74` (근태표시 병합)
- user `app/api/dashboard/calendar/route.ts:85` (대시보드 캘린더)
- user `app/(content)/profile/ProfileAttendanceTab.tsx:168` (목표근무일 계산)
- project-management `lib/projects.ts:201` (오늘 휴가중 배지)

### 6.3 검증만 필요 (직접 수정 대상 아님)
- 통계 RPC 소비자(`monthly/summary/member-spending/trends/export/slack/meals-stats`)는 `user_monthly_stats` 뷰 경유 → 뷰만 고치면 전파
- admin `/api/dayoffs` 리스트는 전건 조회(승인필터 없음) → 무관
- `incomplete-users`는 `meal_logs.attendance` 문자열 기반이라 dayoffs 승인상태 직접 참조 안 함. 가승인 휴가일도 기존 approved와 동일하게 동작하는지(식대차단 트리거로 meal_logs 부재 → 오분류 여부) 검증

## 7. 승인 RPC 확장: `resolve_leave_approval_atomic`

모든 승인 경로의 단일 진입점. `20260722100100_leave_request_workflow_operations.sql` 기준 확장.

| action | 전이 | 기록 | 권한/가드 |
|--------|------|------|-----------|
| `pre_approve` | `pending → pre_approved` | `first_approver_id=actor`, `first_approved_at=now` | 지정 승인자(`approval_requests.approver_id`) 또는 관리자 |
| `approve`(최종) | `pre_approved → approved` | `final_approver_id=actor`, `final_approved_at=now`, `approver_id=actor`(하위호환) | **`actor = first_approver_id`면 예외 `LEAVE_SAME_APPROVER_FORBIDDEN`** |
| `reject` | `pending`/`pre_approved → rejected` | `resolved_by`, `reject_reason` | 팀장(pending) / P&C(둘 다) |
| `revert` | `pre_approved → pending` | `first_approver_id/at` 클리어 | 관리자 또는 지정 승인자 |
| `cancel` | 기존대로 (approved/rejected 되돌리기) | first/final 클리어 | 관리자 |

- `dayoffs.approval_status`와 `approval_requests.status`를 한 트랜잭션에서 동기 갱신(기존 패턴 유지)
- 편집 시 승인자 보존 로직 수정: `20260722100900_leave_request_update_policy.sql:80-85`의 `WHEN approval_status = 'approved'` → `IN ('pre_approved','approved')` (가승인 휴가 수정 시 `first_approver_id` 유실 방지). `:36-39` 수정사유 필수 조건도 `pre_approved` 포함
- 확정건 approver 보호 가드(`20260722101200_...resolved_approver_guard.sql`)는 `approved/rejected` 대상이라 그대로. `20260722101100_...approved_approver_guard.sql`는 필요 시 pre_approved 진입 허용하도록 검토

## 8. API 라우트

- **user `PUT /api/approvals`:** 휴가(`related_table='dayoffs'`)에 대한 지정 승인자의 승인 = `pre_approve`로 매핑. UI 버튼도 "가승인". 근태수정·work_application 등 다른 종류는 1단계 그대로
- **admin `PUT /api/approvals/[id]`:** dayoffs가 `pending`이면 가승인 대행 / `pre_approved`면 최종승인 / 반려는 둘 다. `requireAdminPermission("leave:approve")` 게이트. 동일인 금지는 RPC가 강제
- **조회 API (user `GET /api/approvals`, admin `GET /api/approvals`):** related dayoffs 조인 시 `first_approver`·`final_approver`를 members 조인해 이름까지 반환

## 9. UI 표기 (두 앱)

- 승인 이력: `가승인 {이름} · {일시} / 최종승인 {이름} · {일시}` (early_leave `approvalHistoryText` 패턴 재사용 — `apps/admin/app/(dashboard)/approvals/page.tsx:901-906`)
- **user `(content)/approvals`:** 휴가 "승인" → "가승인" 버튼, 상태 뱃지에 "가승인" 추가
- **admin `(dashboard)/approvals/page.tsx`:** 상태별 "가승인"/"최종승인" 버튼 분기(early_leave `EarlyLeaveActions:795-847` 패턴 참고), 승인자/처리일 컬럼에 2단계 이력 표시
- **`DAYOFF_STATUS_LABELS`** (`ProfileAttendanceTab.tsx:104-109`)에 `pre_approved: "가승인"` 추가 (현재 "-"로 표시됨). 뱃지 색은 가승인=청록/파랑, 최종승인=녹색 정도로 구분

## 10. 타입

`apps/admin/lib/supabase/types.ts` + `apps/user/lib/supabase/types.ts` dayoffs Row/Insert/Update에 4개 신규 컬럼 반영. 로컬 OrbStack DB에 마이그레이션 적용 후 `supabase gen types`(로컬 대상). **원격 `db push` 금지.**

## 11. 마이그레이션/배포 제약

- 로컬 OrbStack에 `supabase migration up`으로만 적용. 원격 DB·`supabase db push` 절대 금지(운영 DB는 대표가 직접 관리)
- 커밋 메시지에 `Co-Authored-By` 금지

## 12. 범위 밖 (이번 작업 제외)

- 휴가 신청 폼의 승인자 선택 UI (이미 존재: `leave-request/page.tsx:181-213`)
- work_applications(시간외/주말근무) 승인 흐름 (자체 다중승인 RPC 보유)
- P&C팀 소속을 `teams.name`으로 강제 검증하는 로직 (권한 부여 = P&C 지정으로 간주)

## 13. 리스크 / 확인 필요

- `incomplete-users` 오분류 여부 (6.3)
- 기존 `pending` 백필 데이터가 `pre_approved`와 섞이지 않는지
- 가승인 상태에서 직원이 날짜 변경 시 트리거 재계산이 old(pre_approved)→new(pre_approved)로 정상 상쇄되는지
