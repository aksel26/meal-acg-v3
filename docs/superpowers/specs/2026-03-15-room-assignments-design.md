# 회의실 배정 기능 설계

## 개요

part-time-supervisor 앱에 **회의실 배정** 기능을 추가한다. 감독관이 날짜별로 지원자들을 회의실+시간 슬롯에 배정할 수 있는 타임테이블 UI를 제공한다.

## 요구사항

- 회의실 목록: C1, C2, R, G, 406-1, 406-2, 16층 (코드에 하드코딩)
- **엄격하게 1시간 단위** 시간 슬롯 (start_time + 1hr = end_time)
- 날짜 기준 배정, 공고 정보 파악 가능
- 회의실별 최대 수용 인원 설정 가능 (코드 상수, 0이면 무제한)
- 한 지원자가 같은 날 여러 슬롯에 다른 회의실 배정 가능
- 타임테이블 형태 UI (가로: 회의실, 세로: 시간)
- 시간 범위: 공고 근무시간 기본값 + 수동 조정
- 공고 선택 → 해당 공고 배정 지원자 표시
- 독립 페이지 `/room-assignments` + 공고 상세 페이지 탭
- 모든 날짜/시간 값은 **KST** 기준 (`@repo/utils` dayjs 유틸리티 사용)

## 데이터 모델

### 회의실 상수

`lib/room-constants.ts`에 정의:

```typescript
export const ROOMS = [
  { id: "C1", name: "C1", capacity: 0 },
  { id: "C2", name: "C2", capacity: 0 },
  { id: "R", name: "R", capacity: 0 },
  { id: "G", name: "G", capacity: 0 },
  { id: "406-1", name: "406-1", capacity: 0 },
  { id: "406-2", name: "406-2", capacity: 0 },
  { id: "16F", name: "16층", capacity: 0 },
] as const;

export type RoomId = (typeof ROOMS)[number]["id"];

export type RoomSlot = {
  date: string;       // KST date "YYYY-MM-DD" (e.g. "2026-03-15")
  start_time: string; // KST time "HH:mm" (e.g. "09:00")
  end_time: string;   // KST time "HH:mm" (항상 start_time + 1시간)
  room: RoomId;
};
```

capacity는 0이면 제한 없음, 양수면 해당 인원까지만 배정 가능.

### assignments 테이블 확장

```sql
ALTER TABLE supervisor.assignments
ADD COLUMN room_slots jsonb DEFAULT '[]';

-- JSONB 스키마 유효성 검사
ALTER TABLE supervisor.assignments
ADD CONSTRAINT room_slots_valid CHECK (
  jsonb_typeof(room_slots) = 'array'
);
```

기존 assignment(worker_id + job_posting_id) 중복 방지 로직 유지. 한 assignment에 여러 날짜/시간/회의실 슬롯을 JSONB 배열로 저장.

```json
[
  { "date": "2026-03-15", "start_time": "09:00", "end_time": "10:00", "room": "C1" },
  { "date": "2026-03-15", "start_time": "10:00", "end_time": "11:00", "room": "R" }
]
```

**슬롯 고유성:** 한 assignment 내에서 `(date, start_time, room)` 조합은 유일해야 한다. API에서 Zod 검증.

## 페이지 구조 & UI

### 독립 페이지: `/room-assignments`

**상단 컨트롤 (RoomAssignmentControls):**
- DatePicker — 기본값 오늘
- 공고 Select — 활성 공고 목록
- 시간 범위 — 공고 work_start~work_end 자동 반영, 수동 조정 가능

**메인 영역 (RoomTimetable):**

```
           | C1 (0/n) | C2 (0/n) | R (0/n) | G (0/n) | 406-1 | 406-2 | 16층 |
  09:00    |  김OO    |          |         |  박OO   |       |       |      |
  10:00    |  김OO    |  이OO    |         |         |       |       |      |
  11:00    |          |  이OO    |  최OO   |         |       |       |      |
```

- 가로축: 회의실 (헤더에 현재인원/최대인원, 시간 슬롯별 카운트)
- 세로축: 1시간 단위 시간 슬롯
- 빈 셀 클릭 → WorkerSelectPopover (미배정 지원자 선택)
- 배정된 셀 클릭 → 삭제 확인
- 수용 인원 초과 시 셀 색상 경고 (빨간 배경)

**우측 패널 (WorkerSidePanel):**
- 선택한 공고의 배정 지원자 목록
- 이미 회의실 배정된 지원자: 회의실명 표시
- 미배정 지원자 구분

### 공고 상세 페이지 탭

기존 `job-postings/[id]/page.tsx`에 "회의실 배정" 탭 추가:
- 해당 공고 지원자만 표시하는 간소화된 타임테이블
- 독립 페이지 이동 링크

## API 설계

### 조회

```
GET /api/room-assignments?date=2026-03-15&job_posting_id=xxx
```

- `date` 필수
- `job_posting_id` 선택 (필터)
- **모든 공고**의 assignments에서 room_slots를 조회하여 해당 date의 슬롯만 필터링 (전체 현황 파악)
- `job_posting_id` 지정 시 해당 공고만 필터

응답:
```typescript
{
  room_assignments: Array<{
    assignment_id: string;
    worker_id: string;
    worker_name: string;
    job_posting_id: string;
    job_posting_title: string;
    room: string;
    start_time: string;
    end_time: string;
  }>;
}
```

### 슬롯 추가

```
POST /api/room-assignments/slot
```

```typescript
{
  assignment_id: string;
  date: string;       // KST "YYYY-MM-DD"
  start_time: string; // KST "HH:mm"
  end_time: string;   // KST "HH:mm" (start_time + 1hr)
  room: string;
}
```

- Zod 검증: end_time = start_time + 1시간, room이 유효한 RoomId
- **원자적 업데이트**: Postgres `jsonb_set` 또는 `|| (concatenation)` 연산자를 사용하여 단일 UPDATE문으로 슬롯 추가 (동시성 이슈 방지)
- **수용 인원 초과 검증**: 같은 date+start_time+room에 배정된 **모든 공고의 non-cancelled** assignment 총 인원 체크
- 초과 시 400 에러 (`{ error: "수용 인원 초과", current: N, capacity: M }`)

### 슬롯 삭제

```
POST /api/room-assignments/slot/delete
```

> DELETE 메서드 대신 POST 사용 (HTTP DELETE body 지원 이슈 방지)

```typescript
{
  assignment_id: string;
  date: string;
  start_time: string;
  end_time: string;   // 명시적 포함 (unambiguous matching)
  room: string;
}
```

- **원자적 업데이트**: JSONB 배열에서 매칭되는 슬롯을 제거하는 단일 UPDATE문

### 전체 저장

```
PUT /api/room-assignments
```

```typescript
{
  assignment_id: string;
  room_slots: RoomSlot[];
}
```

- assignment의 room_slots를 통째로 덮어씀
- Zod 검증: 모든 슬롯이 1시간 단위, 유효한 RoomId
- **수용 인원 검증**: 대상 assignment의 기존 슬롯은 카운트에서 제외 후, 새 슬롯 기준으로 검증

### 검증 규칙 (공통)

1. `end_time - start_time` = 정확히 1시간
2. `room`이 ROOMS 상수에 존재
3. 수용 인원: 해당 date+start_time+room의 **모든 공고**, **non-cancelled** assignment 기준
4. 기존 `PUT /api/assignments/[id]` 라우트에서 `room_slots` 필드 직접 수정 차단 (해당 필드는 room-assignments API를 통해서만 수정)

## 컴포넌트 구조

### 새 파일

```
components/room-assignments/
  RoomTimetable.tsx          # 메인 타임테이블 그리드
  RoomTimetableCell.tsx      # 개별 셀 (지원자 표시, 클릭 핸들링)
  RoomTimetableHeader.tsx    # 회의실 헤더 (이름 + 현재/최대 인원)
  WorkerSelectPopover.tsx    # 셀 클릭 시 지원자 선택 팝오버
  WorkerSidePanel.tsx        # 우측 지원자 목록 패널
  RoomAssignmentControls.tsx # 상단 컨트롤 (날짜, 공고, 시간 범위)

hooks/
  use-room-assignments.ts          # 조회 훅
  use-room-assignment-mutations.ts # 슬롯 추가/삭제 mutation 훅

lib/
  room-constants.ts          # ROOMS 상수, RoomSlot 타입

app/(dashboard)/room-assignments/
  page.tsx                   # 회의실 배정 독립 페이지

app/api/room-assignments/
  route.ts                   # GET (조회), PUT (전체 저장)
  slot/
    route.ts                 # POST (슬롯 추가)
    delete/route.ts          # POST (슬롯 삭제)
```

### Query Keys

```typescript
queryKeys.roomAssignments = {
  all: ["roomAssignments"],
  byDate: (date: string) => ["roomAssignments", date],
  byDateAndJobPosting: (date: string, jobPostingId: string) =>
    ["roomAssignments", date, jobPostingId],
};
```

### Query Invalidation

```typescript
// 슬롯 추가/삭제 시
queryClient.invalidateQueries({ queryKey: queryKeys.roomAssignments.all });
// assignments.all은 불필요 — 배정 목록 UI에서 room 정보를 표시하지 않으므로 생략
```

## 데이터 흐름

```
1. 페이지 로드
   → RoomAssignmentControls: 날짜(오늘) + 공고 선택
   → useRoomAssignments(date, jobPostingId)
   → GET /api/room-assignments?date=...&job_posting_id=...
   → RoomTimetable에 데이터 전달

2. 빈 셀 클릭
   → WorkerSelectPopover 표시 (미배정 지원자 목록)
   → 지원자 선택
   → POST /api/room-assignments/slot
   → invalidateQueries → 타임테이블 갱신

3. 배정된 셀 클릭
   → 삭제 확인
   → POST /api/room-assignments/slot/delete
   → invalidateQueries → 타임테이블 갱신
```

## 마이그레이션

```sql
-- supabase/migrations/20260315_add_room_slots_to_assignments.sql
ALTER TABLE supervisor.assignments
ADD COLUMN room_slots jsonb DEFAULT '[]';

ALTER TABLE supervisor.assignments
ADD CONSTRAINT room_slots_valid CHECK (
  jsonb_typeof(room_slots) = 'array'
);

COMMENT ON COLUMN supervisor.assignments.room_slots IS
  'Array of {date, start_time, end_time, room} objects for room assignments. Each slot is exactly 1 hour.';
```

## 기존 코드 수정

- `lib/supabase/types.ts` — Assignment 타입에 `room_slots: RoomSlot[] | null` 추가
- `lib/query-keys.ts` — `roomAssignments` 키 추가
- `components/layout/Sidebar.tsx` — "회의실 배정" 메뉴 추가
- `app/(dashboard)/job-postings/[id]/page.tsx` — "회의실 배정" 탭 추가
- `app/api/assignments/[id]/route.ts` — PUT 핸들러에서 `room_slots` 필드 제거 (직접 수정 차단)
- `app/api/assignments/route.ts` — GET select에 `room_slots` 포함
