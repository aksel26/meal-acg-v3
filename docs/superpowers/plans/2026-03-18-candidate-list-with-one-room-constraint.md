# 지원자 명단 패널 탭 + 공고당 1룸 제약 통합 구현 계획

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CandidateListPanel에 룸별 탭 UI를 추가하고, 공고당 1룸 제약을 백엔드·프론트엔드 양쪽에서 강제한다.

**Architecture:** 백엔드 `POST /api/room-assignments/slot`에 1룸 검증 + `?replace=true` 교체를 추가한다. 프론트엔드는 기존 CandidateListPanel에 탭을 추가하고, RoomAssignDialog에 2-step 확인 플로우를 추가한다. AssignedWorkersTable의 RoomDropdown은 라디오(단일 선택) 방식으로 변경한다.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, TanStack Query, Tailwind CSS 4, Supabase

**Specs:**
- `docs/superpowers/specs/2026-03-16-candidate-list-panel-design.md`
- `docs/superpowers/specs/2026-03-18-one-room-per-assignment-design.md`

**Already Implemented (이전 계획에서 완료):**
- `AssignedWorkersTable.tsx`: `selectedIds`/`onToggle` props, 체크박스 컬럼
- `CandidateListPanel.tsx`: 체크박스 상태, bulk delete, 액션 바, RoomAssignDialog 통합
- `RoomAssignDialog.tsx`: Step 1 (룸 선택 + 기본 배정)
- `job-postings/[id]/page.tsx`: CandidateListPanel 사용 + `onEditWorker` prop 전달
- `lib/supabase/types.ts`: `AssignmentWithDetails.room_slots` 필드
- `use-room-assignment-mutations.ts`: `assignments.all` 무효화

---

## File Map

| 파일 | 작업 |
|------|------|
| `app/api/room-assignments/slot/route.ts` | Modify: 1룸 검증 + replace 로직 |
| `app/api/assignments/route.ts` | Modify: 자동 room_slots 1룸 제약 |
| `hooks/use-room-assignment-mutations.ts` | Modify: replace 파라미터 지원 |
| `components/job-postings/AssignedWorkersTable.tsx` | Modify: RoomDropdown → 라디오 단일 선택 + replace |
| `components/job-postings/RoomAssignDialog.tsx` | Modify: 2-step 확인 플로우 + assignments prop |
| `components/job-postings/CandidateListPanel.tsx` | Modify: 탭 UI + 필터링 + assignments prop 전달 |
| `app/(dashboard)/room-assignments/page.tsx` | Modify: 드래그앤드롭 replace 적용 |

모든 경로는 `apps/part-time-supervisor/` 기준 상대 경로.

---

## Chunk 1: 백엔드 — 1룸 제약 API

### Task 1: `POST /api/room-assignments/slot`에 1룸 검증 + replace 추가

**Files:**
- Modify: `app/api/room-assignments/slot/route.ts`

- [ ] **Step 1: 쿼리 파라미터 파싱 추가**

10번째 줄, `const body = await request.json();` 직후에 추가:

```typescript
const { searchParams } = new URL(request.url);
const replaceMode = searchParams.get("replace") === "true";
```

- [ ] **Step 2: 1룸 검증 로직 추가**

기존 중복 체크(83~92번째 줄, `isDuplicate` 블록) 이후, `const newSlot` 선언(94번째 줄) 앞에 삽입:

```typescript
// 1룸 제약: 다른 room의 슬롯이 이미 존재하는지 체크
const existingRooms = new Set(existingSlots.map((s) => s.room));
const hasOtherRoom = existingRooms.size > 0 && !existingRooms.has(room);

if (hasOtherRoom && !replaceMode) {
  const existingRoom = existingSlots[0]?.room ?? "";
  return NextResponse.json(
    { error: "already_assigned", existing_room: existingRoom },
    { status: 409 }
  );
}
```

- [ ] **Step 3: replace 교체 로직으로 updatedSlots 계산 변경**

기존 94~100번째 줄을 교체:

```typescript
const newSlot: RoomSlot = {
  date,
  start_time,
  end_time,
  room: room as RoomSlot["room"],
};

let updatedSlots: RoomSlot[];
if (hasOtherRoom && replaceMode) {
  // 기존 슬롯의 room을 새 room으로 일괄 변경 (시간대 보존)
  const migratedSlots: RoomSlot[] = existingSlots.map((s) => ({
    ...s,
    room: room as RoomSlot["room"],
  }));
  // 새 슬롯이 이미 migrated에 포함되어 있으면 중복 추가하지 않음
  const alreadyExists = migratedSlots.some(
    (s) => s.date === date && s.start_time === start_time
  );
  updatedSlots = alreadyExists ? migratedSlots : [...migratedSlots, newSlot];
} else {
  updatedSlots = [...existingSlots, newSlot];
}
```

- [ ] **Step 4: 타입 체크**

```bash
cd apps/part-time-supervisor && pnpm exec tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음

---

### Task 2: assignments POST 자동 배정 1룸 제약 적용

**Files:**
- Modify: `app/api/assignments/route.ts:49`

- [ ] **Step 1: rooms 조건 변경**

49번째 줄을 변경:

```typescript
// 기존
if (jobPosting?.rooms && jobPosting.rooms.length > 0) {

// 변경: rooms가 정확히 1개일 때만 자동 배정
if (jobPosting?.rooms && jobPosting.rooms.length === 1) {
```

- [ ] **Step 2: 타입 체크**

```bash
cd apps/part-time-supervisor && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

---

## Chunk 2: 프론트엔드 훅 — replace 지원

### Task 3: `useAddRoomSlot` 훅에 replace 파라미터 지원

**Files:**
- Modify: `hooks/use-room-assignment-mutations.ts:6-23`

- [ ] **Step 1: SlotParams 타입에 replace 추가**

6~12번째 줄 교체:

```typescript
type SlotParams = {
  assignment_id: string;
  date: string;
  start_time: string;
  end_time: string;
  room: string;
  replace?: boolean;
};
```

- [ ] **Step 2: mutationFn에서 replace 쿼리스트링 전달**

18~28번째 줄 교체:

```typescript
mutationFn: async (data: SlotParams) => {
  const { replace, ...body } = data;
  const url = replace
    ? "/api/room-assignments/slot?replace=true"
    : "/api/room-assignments/slot";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to add slot");
  }
  return res.json();
},
```

- [ ] **Step 3: 타입 체크**

```bash
cd apps/part-time-supervisor && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

---

## Chunk 3: 기존 UI 호환성 수정

### Task 4: room-assignments 페이지 드래그앤드롭에 replace 적용

**Files:**
- Modify: `app/(dashboard)/room-assignments/page.tsx:102-108`

- [ ] **Step 1: handleDragEnd의 addSlot에 replace 추가**

102~108번째 줄 교체:

```typescript
await addSlot.mutateAsync({
  assignment_id: data.assignmentId,
  date: data.date,
  start_time: data.startTime,
  end_time: data.endTime,
  room: targetRoom,
  replace: true,
});
```

- [ ] **Step 2: 타입 체크**

```bash
cd apps/part-time-supervisor && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

---

### Task 5: AssignedWorkersTable RoomDropdown을 라디오(단일 선택) + replace로 변경

**Files:**
- Modify: `components/job-postings/AssignedWorkersTable.tsx:75-149`

현재 `RoomDropdown`은 체크박스로 다중 룸 토글. 1룸 제약에 맞게 라디오 버튼(단일 선택)으로 변경하고, 다른 룸 선택 시 `replace: true`를 사용한다.

- [ ] **Step 1: handleToggle 로직 변경**

101~107번째 줄 교체:

```typescript
const handleToggle = (roomId: string) => {
  if (currentRooms.includes(roomId)) {
    // 이미 선택된 룸 클릭 → 배정 해제
    deleteSlot.mutate(slotData(roomId));
  } else {
    // 다른 룸 선택 → replace로 교체 (기존 슬롯 room 변경)
    addSlot.mutate({ ...slotData(roomId), replace: currentRooms.length > 0 });
  }
  setOpen(false);
};
```

- [ ] **Step 2: 체크박스를 라디오 버튼으로 변경**

135~139번째 줄 교체:

```tsx
<input
  type="radio"
  name={`room-${assignmentId}`}
  checked={checked}
  onChange={() => handleToggle(room.id)}
  className="h-3.5 w-3.5 accent-indigo-600"
/>
```

- [ ] **Step 3: 타입 체크**

```bash
cd apps/part-time-supervisor && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

---

## Chunk 4: RoomAssignDialog 2-step 확인 플로우

### Task 6: RoomAssignDialog에 assignments prop + 확인 플로우 추가

**Files:**
- Modify: `components/job-postings/RoomAssignDialog.tsx`

- [ ] **Step 1: import 확장**

1~8번째 줄 교체:

```typescript
"use client";

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui/src/sonner";
import { queryKeys } from "@/lib/query-keys";
import { ROOMS, getRoomById } from "@/lib/room-constants";
import type { JobPosting, AssignmentWithDetails } from "@/lib/supabase/types";
```

- [ ] **Step 2: Props에 assignments 추가 + step 상태**

10~17번째 줄 교체:

```typescript
type Props = {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  selectedIds: Set<string>;
  jobPosting: JobPosting;
  assignments: AssignmentWithDetails[];
  onComplete: () => void;
};

type Step = "select" | "confirm";
```

- [ ] **Step 3: 컴포넌트 시그니처 + 상태 + 분류 로직**

19~31번째 줄 교체:

```typescript
export default function RoomAssignDialog({
  open,
  onClose,
  selectedCount,
  selectedIds,
  jobPosting,
  assignments,
  onComplete,
}: Props) {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [step, setStep] = useState<Step>("select");
  const queryClient = useQueryClient();

  // 이미 다른 룸이 배정된 지원자 분류
  const { alreadyAssigned, newAssignments, sourceRooms } = useMemo(() => {
    const selected = assignments.filter((a) => selectedIds.has(a.id));
    const already = selected.filter((a) => {
      const rooms = new Set(a.room_slots?.map((s) => s.room) ?? []);
      return rooms.size > 0 && (selectedRoom ? !rooms.has(selectedRoom) : false);
    });
    const fresh = selected.filter((a) => !already.includes(a));
    const sources = new Set(
      already.flatMap((a) => a.room_slots?.map((s) => s.room) ?? [])
    );
    return { alreadyAssigned: already, newAssignments: fresh, sourceRooms: sources };
  }, [assignments, selectedIds, selectedRoom]);

  if (!open) return null;
```

- [ ] **Step 4: slotBase 유지 (기존 33~40번째 줄 그대로)**

slotBase 계산은 기존 코드 유지.

- [ ] **Step 5: handleAssign을 교체 인식하도록 리팩토링 + handleNext 추가**

기존 `handleAssign` (42~79번째 줄)을 교체:

```typescript
const handleNext = () => {
  if (!selectedRoom) return;
  if (alreadyAssigned.length > 0) {
    setStep("confirm");
  } else {
    handleAssign(false);
  }
};

const handleAssign = async (withReplace: boolean) => {
  if (!selectedRoom) return;
  setIsAssigning(true);

  const calls = [
    // 신규 배정
    ...newAssignments.map((a) =>
      fetch("/api/room-assignments/slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignment_id: a.id, room: selectedRoom, ...slotBase }),
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "배정 실패");
        }
      })
    ),
    // 교체 배정
    ...(withReplace
      ? alreadyAssigned.map((a) =>
          fetch("/api/room-assignments/slot?replace=true", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assignment_id: a.id, room: selectedRoom, ...slotBase }),
          }).then(async (res) => {
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.error || "배정 실패");
            }
          })
        )
      : []),
  ];

  const results = await Promise.allSettled(calls);
  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  queryClient.invalidateQueries({ queryKey: queryKeys.roomAssignments.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.assignments.all });

  if (failed === 0) {
    toast.success(`${succeeded}명 배정 완료`);
  } else if (succeeded > 0) {
    toast.warning(`${succeeded}명 배정 완료, ${failed}명 실패`);
  } else {
    toast.error("배정에 실패했습니다.");
  }

  setIsAssigning(false);
  handleClose();
  onComplete();
};

const handleClose = () => {
  setSelectedRoom(null);
  setStep("select");
  onClose();
};

const handleBackToSelect = () => {
  setStep("select");
};

// 확인 메시지 생성
const confirmMessage = useMemo(() => {
  if (alreadyAssigned.length === 0) return "";
  const firstName = alreadyAssigned[0]?.worker?.name ?? "지원자";
  const count = alreadyAssigned.length;
  const targetName = getRoomById(selectedRoom ?? "")?.name ?? selectedRoom;

  if (sourceRooms.size === 1) {
    const sourceName = getRoomById([...sourceRooms][0])?.name ?? [...sourceRooms][0];
    return count === 1
      ? `${firstName}님이 이미 ${sourceName}에 배정되어 있습니다. ${targetName}(으)로 변경하시겠습니까?`
      : `${firstName} 외 ${count - 1}명이 이미 ${sourceName}에 배정되어 있습니다. ${targetName}(으)로 변경하시겠습니까?`;
  } else {
    return count === 1
      ? `${firstName}님이 이미 다른 회의실에 배정되어 있습니다. ${targetName}(으)로 변경하시겠습니까?`
      : `${firstName} 외 ${count - 1}명이 이미 다른 회의실에 배정되어 있습니다. ${targetName}(으)로 변경하시겠습니까?`;
  }
}, [alreadyAssigned, selectedRoom, sourceRooms]);
```

- [ ] **Step 6: JSX를 2-step 구조로 교체**

기존 return문(86~133번째 줄)을 교체:

```tsx
return (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="fixed inset-0 bg-black/40" onClick={handleClose} />
    <div className="relative z-10 w-80 rounded-2xl bg-white p-6 shadow-xl">
      {step === "select" ? (
        <>
          <h3 className="mb-1 text-base font-semibold">회의실 배정</h3>
          <p className="mb-4 text-sm text-slate-500">
            {selectedCount}명에게 회의실을 배정합니다
          </p>

          <div className="mb-6 space-y-1.5">
            {ROOMS.map((room) => (
              <label
                key={room.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                  selectedRoom === room.id
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="room"
                  value={room.id}
                  checked={selectedRoom === room.id}
                  onChange={() => setSelectedRoom(room.id)}
                  className="accent-blue-600"
                />
                <span className="text-sm font-medium">{room.name}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              취소
            </button>
            <button
              onClick={handleNext}
              disabled={!selectedRoom || isAssigning}
              className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
            >
              {isAssigning ? "배정 중..." : "배정하기"}
            </button>
          </div>
        </>
      ) : (
        <>
          <h3 className="mb-1 text-base font-semibold">회의실 변경 확인</h3>
          <p className="my-4 text-sm leading-relaxed text-slate-600">
            {confirmMessage}
          </p>
          {newAssignments.length > 0 && (
            <p className="mb-4 text-xs text-slate-400">
              나머지 {newAssignments.length}명은 신규 배정됩니다.
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleBackToSelect}
              className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              취소
            </button>
            <button
              onClick={() => handleAssign(true)}
              disabled={isAssigning}
              className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
            >
              {isAssigning ? "변경 중..." : "변경하기"}
            </button>
          </div>
        </>
      )}
    </div>
  </div>
);
```

- [ ] **Step 7: 타입 체크**

```bash
cd apps/part-time-supervisor && pnpm exec tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음

---

## Chunk 5: CandidateListPanel 탭 UI

### Task 7: CandidateListPanel에 탭 + 필터링 추가

**Files:**
- Modify: `components/job-postings/CandidateListPanel.tsx`

- [ ] **Step 1: import 확장**

1~9번째 줄 교체:

```typescript
"use client";

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui/src/sonner";
import { queryKeys } from "@/lib/query-keys";
import { getRoomById } from "@/lib/room-constants";
import type { AssignmentWithDetails, JobPosting, Worker } from "@/lib/supabase/types";
import AssignedWorkersTable from "./AssignedWorkersTable";
import RoomAssignDialog from "./RoomAssignDialog";
```

- [ ] **Step 2: 탭 상태 + 파생 데이터 추가**

26번째 줄 (`const queryClient`) 이후, 기존 `selectedIds` 상태 앞에 추가:

```typescript
const [activeTab, setActiveTab] = useState("전체");
```

그리고 `assignDialogOpen` 상태 이후(29번째 줄), `handleToggle` 이전에 추가:

```typescript
// 탭 목록: 전체 + 실제 배정된 룸
const tabs = useMemo(() => {
  const roomIds = new Set<string>();
  for (const a of assignments) {
    for (const slot of a.room_slots ?? []) {
      roomIds.add(slot.room);
    }
  }
  return ["전체", ...Array.from(roomIds)];
}, [assignments]);

// 현재 탭 필터링
const filtered = useMemo(() => {
  if (activeTab === "전체") return assignments;
  return assignments.filter((a) =>
    a.room_slots?.some((s) => s.room === activeTab)
  );
}, [assignments, activeTab]);

// 탭별 인원수
const tabCount = useMemo(() => {
  const map = new Map<string, number>();
  map.set("전체", assignments.length);
  for (const tab of tabs) {
    if (tab === "전체") continue;
    map.set(
      tab,
      assignments.filter((a) => a.room_slots?.some((s) => s.room === tab)).length
    );
  }
  return map;
}, [assignments, tabs]);

const handleTabChange = (tab: string) => {
  setActiveTab(tab);
  setSelectedIds(new Set());
};
```

- [ ] **Step 3: handleToggleAll과 isAllSelected를 filtered 기반으로 변경**

40~46번째 줄 교체:

```typescript
const handleToggleAll = () => {
  if (selectedIds.size === filtered.length) {
    setSelectedIds(new Set());
  } else {
    setSelectedIds(new Set(filtered.map((a) => a.id)));
  }
};
```

78번째 줄 교체:

```typescript
const isAllSelected = filtered.length > 0 && selectedIds.size === filtered.length;
```

- [ ] **Step 4: 탭 바 JSX 추가**

return문 내 `{/* 액션 바 */}` 주석 앞(82번째 줄)에 추가:

```tsx
{/* 탭 바 */}
<div className="mb-3 flex gap-1 border-b">
  {tabs.map((tab) => {
    const label = tab === "전체" ? "전체" : (getRoomById(tab)?.name ?? tab);
    const count = tabCount.get(tab) ?? 0;
    return (
      <button
        key={tab}
        onClick={() => handleTabChange(tab)}
        className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
          activeTab === tab
            ? "border-slate-900 text-slate-900"
            : "border-transparent text-slate-400 hover:text-slate-600"
        }`}
      >
        {label}
        <span
          className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
            activeTab === tab ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {count}
        </span>
      </button>
    );
  })}
</div>
```

- [ ] **Step 5: AssignedWorkersTable에 filtered 전달**

115~123번째 줄의 `assignments={assignments}` → `assignments={filtered}` 변경:

```tsx
<AssignedWorkersTable
  jobPostingId={jobPostingId}
  job={jobPosting}
  assignments={filtered}
  isLoading={isLoading}
  selectedIds={selectedIds}
  onToggle={handleToggle}
  onEditWorker={onEditWorker}
/>
```

- [ ] **Step 6: RoomAssignDialog에 assignments prop 추가**

126~133번째 줄의 `<RoomAssignDialog>`에 `assignments` prop 추가:

```tsx
<RoomAssignDialog
  open={assignDialogOpen}
  onClose={() => setAssignDialogOpen(false)}
  selectedCount={selectedIds.size}
  selectedIds={selectedIds}
  jobPosting={jobPosting}
  assignments={assignments}
  onComplete={() => setSelectedIds(new Set())}
/>
```

- [ ] **Step 7: 타입 체크**

```bash
cd apps/part-time-supervisor && pnpm exec tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음

---

## Chunk 6: 수동 동작 확인

### Task 8: 통합 동작 확인

- [ ] **Step 1: 개발 서버 실행**

```bash
pnpm dev:part-time-supervisor
```

- [ ] **Step 2: 기본 동작 확인**

확인 항목:
1. 공고 상세 페이지 접속 → "전체" 탭 표시
2. 배정된 룸이 있으면 해당 룸 탭도 표시
3. 탭 클릭 → 해당 룸 지원자만 필터링
4. 탭 변경 → selectedIds 초기화
5. 체크박스 클릭 → 행 하이라이트 + 액션 바 표시
6. 전체선택 → 현재 탭의 모든 체크박스 선택

- [ ] **Step 3: 1룸 제약 동작 확인**

확인 항목:
1. [회의실 배정] → 룸 선택 → 신규 지원자만 → 바로 배정 완료
2. [회의실 배정] → 룸 선택 → 이미 배정된 지원자 포함 → Step 2 확인 메시지 표시 → "변경하기" → 교체 완료
3. [회의실 배정] → Step 2에서 "취소" → Step 1로 복귀
4. RoomDropdown에서 라디오 버튼으로 룸 변경 → replace 동작 확인
5. room-assignments 페이지: 드래그앤드롭으로 룸 이동 정상 동작
