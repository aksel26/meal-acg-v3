# Phase 3: 출퇴근 관리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 유연근무제 기반 출퇴근 체크인/체크아웃 시스템을 구축하고, admin 앱에 출퇴근 현황 페이지 + user 앱에 체크인/아웃 위젯을 추가한다.

**Architecture:** `attendance_records` 테이블로 일별 출퇴근을 관리한다. 출근 08:00~10:00 초단위, 10:00 초과 시 자동 지각, 퇴근 가능 = 출근+9h, 초과근무 = 퇴근가능+2h 이후. User 앱에서 직원이 직접 체크인/아웃, Admin 앱에서 조회/수정.

**Tech Stack:** Supabase, Next.js 15, React 19, TanStack React Query, @repo/ui, dayjs

---

### Task 1: DB 마이그레이션 — attendance_records 테이블

**Files:**
- Create: `supabase/migrations/20260331200000_attendance_records.sql`

내용:
```sql
-- attendance_records 테이블
CREATE TABLE attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in_at timestamptz,
  check_out_at timestamptz,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'normal', 'late', 'early_leave', 'absent')),
  overtime_minutes integer NOT NULL DEFAULT 0,
  is_weekend boolean NOT NULL DEFAULT false,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(member_id, date)
);

CREATE INDEX idx_attendance_member_date ON attendance_records(member_id, date);
CREATE INDEX idx_attendance_date ON attendance_records(date);

CREATE TRIGGER set_attendance_updated_at
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE attendance_records IS '출퇴근 기록';
COMMENT ON COLUMN attendance_records.status IS 'pending=미출근, normal=정상, late=지각, early_leave=조퇴, absent=결근';
COMMENT ON COLUMN attendance_records.overtime_minutes IS '초과근무 분 (퇴근가능+2h 이후부터 계산)';
```

검증: `supabase db reset 2>&1 | tail -10`
커밋: `feat(db): attendance_records 출퇴근 기록 테이블 추가`

---

### Task 2: Supabase 타입 업데이트

**Files:**
- Modify: `apps/admin/lib/supabase/types.ts`
- Modify: `apps/user/lib/supabase/types.ts`

attendance_records 타입 추가 (Row/Insert/Update):
- id, member_id, date, check_in_at(nullable), check_out_at(nullable), status, overtime_minutes, is_weekend, note(nullable), created_at, updated_at

커밋: `chore(db): attendance_records 타입 추가`

---

### Task 3: Admin 출퇴근 API 라우트

**Files:**
- Create: `apps/admin/app/api/attendance/route.ts`
- Create: `apps/admin/app/api/attendance/[id]/route.ts`
- Create: `apps/admin/app/api/attendance/today/route.ts`

**GET /api/attendance**: 날짜/월별 전체 출퇴근 조회
- query: `date` (단일 날짜) 또는 `year` + `month` (월별)
- select: `*, member:members!attendance_records_member_id_fkey(id, full_name, position:positions!members_position_id_fkey(name))`
- order by member_id

**GET /api/attendance/today**: 오늘 출퇴근 현황 요약
- 오늘 날짜 기준 attendance_records 조회
- 전체 멤버 수 대비: 출근/미출근/지각/휴가(dayoffs) 카운트 계산
- 응답: `{ total, checkedIn, notCheckedIn, late, onLeave, lateMembers: [{name}], notCheckedInMembers: [{name}] }`

**PUT /api/attendance/[id]**: 관리자 수정
- body에서 check_in_at, check_out_at, status, overtime_minutes, note 업데이트
- status/overtime 자동 재계산은 하지 않음 (관리자 수동 override)

커밋: `feat(admin): 출퇴근 관리 API 라우트 추가`

---

### Task 4: User 앱 출퇴근 API

**Files:**
- Create: `apps/user/app/api/attendance/check-in/route.ts`
- Create: `apps/user/app/api/attendance/check-out/route.ts`
- Create: `apps/user/app/api/attendance/today/route.ts`

**POST /api/attendance/check-in**: 출근 체크인
- 현재 시간을 check_in_at으로 기록
- 10:00:00 KST 초과 시 status='late', 아니면 status='normal'
- 이미 오늘 레코드 있으면 409 "이미 출근했습니다."
- upsert 패턴: date=today, member_id=current user

**POST /api/attendance/check-out**: 퇴근 체크아웃
- 오늘 레코드의 check_in_at이 없으면 400 "출근 기록이 없습니다."
- check_out_at = 현재 시간
- expected_out = check_in_at + 9h
- check_out_at < expected_out 이면 status='early_leave'
- overtime 계산: check_out_at - expected_out - 2h > 0 이면 그 분 수, 아니면 0

**GET /api/attendance/today**: 내 오늘 출퇴근 상태
- 현재 로그인 유저의 오늘 attendance_record 반환
- 없으면 null

user 앱의 인증: Zustand useUserStore에서 userId 사용. API에서 사용자 ID를 request에서 가져오는 기존 패턴 참조.

커밋: `feat(user): 출퇴근 체크인/체크아웃 API 추가`

---

### Task 5: Admin Query Keys + Hooks

**Files:**
- Modify: `apps/admin/lib/query-keys.ts`
- Create: `apps/admin/hooks/useAttendance.ts`

query-keys에 추가:
```typescript
attendance: {
  all: ["attendance"] as const,
  byDate: (date: string) => ["attendance", date] as const,
  byMonth: (year: number, month: number) => ["attendance", "month", year, month] as const,
  today: ["attendance", "today"] as const,
},
```

useAttendance.ts:
- `useAttendanceByMonth(year, month)` — GET /api/attendance?year=&month=
- `useAttendanceToday()` — GET /api/attendance/today
- `useUpdateAttendance()` — PUT /api/attendance/[id] → invalidate attendance.all

커밋: `feat(admin): 출퇴근 React Query hooks 추가`

---

### Task 6: User 앱 출퇴근 Hook + 대시보드 위젯

**Files:**
- Create: `apps/user/hooks/useAttendance.ts`
- Modify: `apps/user/app/(content)/dashboard/page.tsx`

useAttendance.ts:
- `useMyAttendanceToday()` — GET /api/attendance/today
- `useCheckIn()` — POST /api/attendance/check-in → invalidate
- `useCheckOut()` — POST /api/attendance/check-out → invalidate

대시보드에 출퇴근 위젯 카드 추가 (기존 카드들 위에):
- 미출근 상태: "출근하기" 버튼 (큰 버튼, 현재 시각 표시)
- 출근 상태: 출근 시각 표시 + "퇴근하기" 버튼 + 퇴근 가능 시각 표시
- 퇴근 완료: 출근/퇴근 시각 + 근무시간 표시
- 지각 시: 빨간색 "지각" 뱃지

커밋: `feat(user): 대시보드 출퇴근 체크인/체크아웃 위젯 추가`

---

### Task 7: Admin 출퇴근 현황 페이지

**Files:**
- Create: `apps/admin/app/(dashboard)/attendance/page.tsx`

레이아웃:
- 상단: 날짜 선택 (년/월 + 일별 캘린더 또는 월별 뷰 토글)
- 오늘 요약 카드: 출근 N명 | 미출근 N명 | 지각 N명 | 휴가 N명
- 테이블: 이름 | 직급 | 출근시각 | 퇴근시각 | 근무시간 | 상태 | 초과근무 | 비고
- 상태 뱃지: normal=초록, late=빨강, early_leave=주황, pending=회색, absent=빨강
- 월별 뷰: 멤버별 월간 집계 (근무일수, 지각횟수, 조퇴횟수, 총 초과근무시간, 주말근무일수)

커밋: `feat(admin): 출퇴근 현황 페이지 추가`

---

### Task 8: 사이드바 메뉴 추가

**Files:**
- Modify: `apps/admin/components/Sidebar.tsx`

근태 관리 NavGroup에 "출퇴근 현황" 메뉴 추가 (휴가 관리 앞에):
```typescript
{ name: "출퇴근 현황", href: "/attendance", icon: UserCheck },
```

커밋: `feat(admin): 사이드바에 출퇴근 현황 메뉴 추가`

---

### Task 9: seed.sql + 최종 검증

seed에 출퇴근 샘플 데이터 추가 (오늘 기준 멤버별 출퇴근 기록).
`pnpm check-types` + `supabase db reset` + 브라우저 확인.

커밋: `chore(db): 출퇴근 시드 데이터 추가`
