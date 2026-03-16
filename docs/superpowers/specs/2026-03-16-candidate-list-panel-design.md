# 공고 상세 - 지원자 명단 패널 설계

**날짜:** 2026-03-16
**대상 앱:** `apps/part-time-supervisor`
**관련 페이지:** `/job-postings/[id]`

---

## 개요

공고 상세 페이지의 지원자 명단에 룸별 탭 UI, 체크박스 다중 선택, 삭제·회의실 배정 액션을 추가한다.

---

## 사전 작업 (Prerequisites)

### 1. `useAddRoomSlot` 훅 쿼리 무효화 추가

`hooks/use-room-assignment-mutations.ts`의 `useAddRoomSlot` onSuccess에 `assignments.all` 무효화 추가:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.roomAssignments.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all }); // 추가
}
```

탭 목록이 `AssignmentWithDetails.room_slots`를 기반으로 하므로, 배정 후 탭이 즉시 갱신되려면 반드시 필요.

### 2. `AssignmentWithDetails` 타입 확장

`lib/supabase/types.ts`의 `AssignmentWithDetails`에 `room_slots` 필드 추가:

```ts
export type AssignmentWithDetails = Assignment & {
  worker?: { id: string; name: string; phone: string | null };
  job_posting?: { id: string; title: string };
  room_slots?: RoomSlot[];  // 추가
};
```

API 라우트(`/api/assignments`)에서 `room_slots`를 함께 반환하도록 수정 필요.

---

## 컴포넌트 구조

### 신규 파일

| 파일 | 역할 |
|------|------|
| `components/job-postings/CandidateListPanel.tsx` | 탭·체크박스·액션 바 상태 전담 |
| `components/job-postings/RoomAssignDialog.tsx` | 회의실 선택 모달 |

### 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `components/job-postings/AssignedWorkersTable.tsx` | 체크박스 컬럼 추가, 선택 상태는 prop으로 주입 |
| `app/(dashboard)/job-postings/[id]/page.tsx` | `AssignedWorkersTable` → `CandidateListPanel`로 교체 |
| `lib/supabase/types.ts` | `AssignmentWithDetails`에 `room_slots` 추가 |

---

## CandidateListPanel

### Props

```ts
type Props = {
  assignments: AssignmentWithDetails[];
  jobPosting: JobPosting;
  // 삭제는 컴포넌트 내부에서 fetch 직접 호출로 처리
};
```

### 탭 로직

- 탭 목록: `["전체", ...assignments의 room_slots에서 도출된 고유 RoomId]`
- 룸 탭은 실제 배정된 룸만 동적으로 표시
- 탭 라벨: `getRoomById(roomId)?.name` (예: "R룸", "G룸")
- 탭 배지: 해당 탭의 인원수 표시
- 탭 변경 시 `selectedIds` 초기화

### 탭 필터 조건

```ts
// 전체 탭: room_slots 유무와 무관하게 모든 assignments 표시
assignments

// 룸 탭 (예: RoomId 'R')
assignments.filter(a => a.room_slots?.some(s => s.room === 'R'))
```

### 체크박스 상태

```ts
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

- 전체 선택: 현재 탭의 모든 assignment ID 토글
- 탭 변경 시 `selectedIds` 초기화

---

## 액션 바

체크 항목이 1개 이상일 때 테이블 상단에 표시:

```
☑ 전체선택  |  N명 선택됨  [삭제]  [회의실 배정]
```

### [삭제] 동작

TanStack Query의 단일 mutation 인스턴스는 병렬 호출 시 상태가 덮어써지므로, API를 직접 호출한다:

```ts
// useDeleteAssignment의 mutate/mutateAsync 대신 fetch 직접 호출
const deleteIds = Array.from(selectedIds);
setIsDeleting(true);
try {
  await Promise.all(
    deleteIds.map(id =>
      fetch(`/api/assignments/${id}`, { method: "DELETE" }).then(r => {
        if (!r.ok) throw new Error(`삭제 실패: ${id}`);
      })
    )
  );
  queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  setSelectedIds(new Set());
} catch {
  toast.error("일부 삭제에 실패했습니다.");
} finally {
  setIsDeleting(false);
}
```

- `onDelete` prop 제거 — CandidateListPanel 내에서 직접 처리
- 삭제 진행 중 액션 바 전체 비활성화 (`isDeleting` 상태)
- 완료 후 `selectedIds` 초기화

### [회의실 배정]

`RoomAssignDialog` 열기.

---

## AssignedWorkersTable 변경

체크박스 컬럼을 첫 번째 컬럼으로 추가:

```ts
// 추가 props
selectedIds: Set<string>;
onToggle: (id: string) => void;
```

기존 개별 삭제·수정 액션은 유지.

---

## RoomAssignDialog

### Props

```ts
type Props = {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  jobPosting: JobPosting;
  selectedIds: Set<string>;
  onComplete: () => void;  // 배정 완료 후 selectedIds 초기화
};
```

### UI

- `ROOMS` 상수 전체를 라디오 버튼으로 표시
- `room.id` (RoomId) 를 값으로 사용 (표시는 `room.name`)
- 선택 룸 확인 후 [배정하기] 클릭

### 배정 시 생성되는 RoomSlot

```ts
{
  room: selectedRoomId,          // RoomId 타입 (예: 'R', 'G', 'C1')
  date: jobPosting.start_date,   // JobPosting.start_date (non-nullable)
  start_time: jobPosting.work_start ?? "09:00",
  end_time: jobPosting.work_end ?? "18:00",
}
```

### 배정 로직

`useAddRoomSlot` mutation을 단일 객체로 호출:

```ts
mutate({
  assignment_id: id,
  room: selectedRoomId,
  date: jobPosting.start_date,
  start_time: jobPosting.work_start ?? "09:00",
  end_time: jobPosting.work_end ?? "18:00",
});
```

- 선택된 각 assignment에 대해 `Promise.all(ids.map(id => mutateAsync({...})))` 병렬 호출
- **반드시 try/catch로 감싸고 실패 시 toast 에러 표시** (unhandled rejection 방지)
- 완료 후: dialog 닫기 + `onComplete()` 호출
- 쿼리 무효화: `queryKeys.roomAssignments.all`, `queryKeys.assignments.all` (useAddRoomSlot onSuccess에서 처리)
  - 탭 목록은 `assignments` 쿼리 데이터를 기반으로 하므로 `assignments.all` 무효화 필수

---

## 데이터 흐름

```
page.tsx
  └── CandidateListPanel
        ├── [탭 상태] activeTab: string
        ├── [선택 상태] selectedIds: Set<string>
        ├── [로딩 상태] isDeleting: boolean
        ├── AssignedWorkersTable (필터된 assignments + 체크박스)
        └── RoomAssignDialog (open 시)
```

---

## 엣지 케이스

| 상황 | 처리 |
|------|------|
| 배정된 룸 없음 | 탭은 "전체"만 표시 |
| 전체 선택 후 탭 변경 | selectedIds 초기화 |
| 삭제 중 배정 버튼 | 액션 바 전체 비활성화 |
| 배정된 룸이 있는 지원자에 추가 배정 | 중복 슬롯 허용 (API 레벨 관리) |
| `work_start`/`work_end` 없는 공고 | "09:00" / "18:00" fallback |
