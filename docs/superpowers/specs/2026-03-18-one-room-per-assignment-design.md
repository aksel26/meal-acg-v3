# 공고당 1룸 제약 설계

**날짜:** 2026-03-18
**대상 앱:** `apps/part-time-supervisor`
**선행 스펙:** `docs/superpowers/specs/2026-03-16-candidate-list-panel-design.md`

---

## 개요

지원자는 하나의 공고(assignment) 내에서 회의실 하나만 배정받을 수 있다. 이미 배정된 지원자에게 다른 룸을 배정하면, 확인 다이얼로그를 거쳐 기존 룸을 교체한다. 이 제약은 백엔드 API에서도 강제한다.

---

## 제약 정의

- **범위:** assignment 단위 (= 공고 x 지원자)
- **규칙:** 한 assignment의 `room_slots` 배열 내 모든 슬롯은 같은 `room` 값을 가져야 한다
- **다중 시간대:** 같은 room 내 여러 시간대 슬롯은 허용 (예: C1 9:00-10:00, C1 10:00-11:00)
- **교체:** 이미 다른 룸이 배정된 상태에서 새 룸을 배정하려면, 사용자 확인 후 기존 슬롯의 room을 새 room으로 일괄 변경

---

## 백엔드 변경

### `POST /api/room-assignments/slot` 수정

기존 중복 체크(같은 date+start_time+room) 이후에 "다른 룸 존재 여부" 검증을 추가한다.

#### 검증 흐름

```
요청 수신 → 필드 검증 → 룸 유효성 → 수용 인원 체크 → 현재 슬롯 조회
→ 동일 슬롯 중복 체크 (기존, 409)
→ [신규] 다른 룸 슬롯 존재 여부 체크
   ├─ 없음 → 슬롯 추가 (기존 동작)
   ├─ 있음 + replace=false → 409 { error: "already_assigned", existing_room }
   └─ 있음 + replace=true → 기존 슬롯 room을 새 room으로 일괄 변경 + 새 슬롯 추가
```

#### 쿼리 파라미터

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| `replace` | `"true"` | 없음 (false 취급) | 기존 룸 슬롯의 room을 새 room으로 일괄 변경 |

#### 에러 응답 (이미 배정됨)

```json
{
  "error": "already_assigned",
  "existing_room": "C1"
}
```

Status: `409 Conflict`

참고: 기존 에러 메시지는 한국어 문자열이지만, `already_assigned`는 프론트엔드에서 패턴 매칭에 사용하는 머신 리더블 코드이므로 영어를 사용한다. 프론트엔드는 `error === "already_assigned"`로 판별.

#### 교체 동작 (replace=true)

기존 슬롯의 시간대(date, start_time, end_time)는 보존하고 room만 새 room으로 변경한다. 이후 새 슬롯을 추가한다 (이미 같은 시간대가 있으면 중복 추가하지 않음).

```typescript
// 기존 슬롯의 room을 새 room으로 일괄 변경
const migratedSlots = existingSlots.map(s => ({ ...s, room: newSlot.room }));

// 새 슬롯이 이미 migrated에 포함되어 있는지 확인
const alreadyExists = migratedSlots.some(
  s => s.date === newSlot.date && s.start_time === newSlot.start_time
);
const updatedSlots = alreadyExists ? migratedSlots : [...migratedSlots, newSlot];

await supabase
  .from("assignments")
  .update({ room_slots: updatedSlots, updated_at: new Date().toISOString() })
  .eq("id", assignment_id)
  .select()
  .single();
```

#### 동시성 참고

read-check-update 시퀀스는 트랜잭션으로 감싸지 않는다. Supabase JSONB 컬럼 업데이트는 last-write-wins이지만, 이 앱은 단일 관리자가 사용하므로 동일 assignment에 대한 동시 쓰기 가능성은 극히 낮다.

### 기존 호환성

- **room-assignments 드래그앤드롭 페이지:** 1룸 제약이 적용되면 한 assignment의 모든 슬롯은 같은 room이다. 드래그앤드롭은 단일 슬롯을 이동(deleteSlot → addSlot)하는데, delete 후 나머지 슬롯이 이전 room에 남아 있으므로 addSlot이 `already_assigned`로 차단된다. **해결:** 드래그앤드롭 핸들러에서 `addSlot` 호출 시 `?replace=true`를 사용하도록 변경한다.
- **assignments POST (자동 room_slots 배정):** `route.ts:42-59`에서 job_posting의 rooms 배열로 자동 슬롯 생성. 여러 room이 rooms에 있으면 1룸 제약에 위배되므로, rooms가 정확히 1개일 때만 자동 배정한다.

### 기존 데이터 호환

새 검증은 **신규 쓰기(POST)에만 적용**된다. 기존에 생성된 multi-room 슬롯은 그대로 유지(grandfathered). 기존 데이터가 많지 않고, 새 배정 시 `replace=true`로 자연스럽게 정리된다.

---

## 프론트엔드 변경

### RoomAssignDialog 수정

#### Props 확장

```typescript
type Props = {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  selectedIds: Set<string>;
  jobPosting: JobPosting;
  assignments: AssignmentWithDetails[];  // 추가: 룸 배정 상태 확인용
  onComplete: () => void;
};
```

#### 2-step 다이얼로그 플로우

```
Step 1: 룸 선택 (기존 UI)
  ↓ [배정하기] 클릭
  ↓ 선택된 지원자 중 이미 다른 룸 배정자 분류
  ↓
  ├─ 교체 대상 없음 → 바로 API 호출
  └─ 교체 대상 있음 → Step 2로 전환
      Step 2: 확인 메시지 표시
      ├─ 단일 소스 룸: "OOO 외 N명이 이미 [C1]에 배정되어 있습니다. [R]로 변경하시겠습니까?"
      ├─ 다중 소스 룸: "OOO 외 N명이 이미 다른 회의실에 배정되어 있습니다. [R]로 변경하시겠습니까?"
      ├─ [변경] → replace=true로 API 호출
      └─ [취소] → Step 1로 복귀
```

#### 지원자 분류 로직

```typescript
const selectedAssignments = assignments.filter(a => selectedIds.has(a.id));

// 이미 다른 룸이 배정된 지원자
const alreadyAssigned = selectedAssignments.filter(a => {
  const rooms = new Set(a.room_slots?.map(s => s.room) ?? []);
  return rooms.size > 0 && !rooms.has(selectedRoom);
});

// 신규 배정 (룸 미배정 또는 같은 룸)
const newAssignments = selectedAssignments.filter(a => !alreadyAssigned.includes(a));

// 확인 메시지용: 소스 룸 목록
const sourceRooms = new Set(
  alreadyAssigned.flatMap(a => a.room_slots?.map(s => s.room) ?? [])
);
```

#### API 호출

```typescript
// 신규 배정: replace 불필요
const newCalls = newAssignments.map(a =>
  fetch("/api/room-assignments/slot", { ... })
);

// 교체 배정: replace=true
const replaceCalls = alreadyAssigned.map(a =>
  fetch("/api/room-assignments/slot?replace=true", { ... })
);

const results = await Promise.allSettled([...newCalls, ...replaceCalls]);
```

### room-assignments 드래그앤드롭 페이지 수정

`page.tsx`의 `handleDragEnd`에서 `addSlot` 호출 시 `replace=true` 전달:

```typescript
// 기존
await addSlot.mutateAsync({ assignment_id, date, start_time, end_time, room: targetRoom });

// 변경: replace=true 추가하여 1룸 제약 충돌 방지
await addSlot.mutateAsync({ assignment_id, date, start_time, end_time, room: targetRoom, replace: true });
```

`useAddRoomSlot` 훅에서 `replace` 파라미터를 쿼리스트링으로 전달하도록 수정.

---

## 기존 CandidateListPanel 스펙 변경점

| 항목 | 기존 | 변경 |
|------|------|------|
| 엣지 케이스: 이미 배정된 지원자에 추가 배정 | 중복 슬롯 허용 | 확인 후 교체 |
| RoomAssignDialog props | selectedIds, jobPosting 등 | + `assignments` 추가 |
| room_slots 배열 의미 | 한 assignment에 여러 room 가능 | 한 assignment에 한 room만 (다중 시간대는 허용) |

변경 없는 부분: CandidateListPanel 탭 로직, 체크박스, 전체선택, 삭제 동작, AssignedWorkersTable 체크박스 컬럼, page.tsx 통합, 쿼리 무효화 패턴.

---

## assignments POST 자동 배정 수정

`/api/assignments/route.ts:42-59`에서 job_posting의 `rooms` 배열 전체로 슬롯을 생성하는 로직이 1룸 제약에 위배될 수 있다. rooms 배열에 여러 room이 있을 경우 room_slots 자동 배정을 생략한다 (수동 배정으로 전환).

```typescript
// 기존: rooms 전체로 슬롯 생성
// 변경: rooms가 정확히 1개일 때만 자동 배정
if (jobPosting?.rooms && jobPosting.rooms.length === 1) {
  // 1개 room만 자동 배정
}
```
