# 지원자 명단 패널 (CandidateListPanel) 구현 계획

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공고 상세 페이지의 지원자 명단에 룸별 탭, 체크박스 다중 선택, 삭제·회의실 배정 액션을 추가한다.

**Architecture:** `CandidateListPanel`이 탭·체크박스·액션 상태를 전담하고, 기존 `AssignedWorkersTable`은 체크박스 컬럼만 추가하여 `CandidateListPanel` 내부에서 재사용한다. `RoomAssignDialog`는 순수 UI 컴포넌트로 분리한다.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, TanStack Query, Tailwind CSS 4

---

## Chunk 1: 사전 작업 — 타입·API·훅 준비

### Task 1: AssignmentWithDetails 타입에 room_slots 추가

**Files:**
- Modify: `apps/part-time-supervisor/lib/supabase/types.ts:82-85`

- [ ] **Step 1: 타입 수정**

`lib/supabase/types.ts`의 `AssignmentWithDetails` (82번째 줄) 수정.
`types.ts`는 `lib/room-constants.ts`를 import하지 않으므로 인라인 타입을 사용한다:

```typescript
export type AssignmentWithDetails = Assignment & {
  worker?: { id: string; name: string; phone: string | null; status: string };
  job_posting?: { id: string; title: string; status: string };
  room_slots?: { date: string; start_time: string; end_time: string; room: string }[];
};
```

- [ ] **Step 2: 타입 체크**

```bash
cd apps/part-time-supervisor && pnpm exec tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음 (room_slots가 optional이므로 기존 코드 영향 없음)

---

### Task 2: assignments API room_slots 반환 확인

**Files:**
- Modify: `apps/part-time-supervisor/app/api/assignments/route.ts` (필요 시만)

- [ ] **Step 1: 기존 select 확인**

`/api/assignments/route.ts` 14번째 줄의 select 문자열이 `"*,"` 로 시작하는지 확인한다.
`*`는 `assignments` 테이블의 모든 컬럼(JSONB 포함)을 반환하므로 `room_slots`가 이미 포함된다.
→ **코드 변경 불필요.**

- [ ] **Step 2: 런타임 확인**

개발 서버 실행 후 브라우저 DevTools에서:

```
GET /api/assignments?job_posting_id=<임의ID>
```

응답 JSON 항목에 `room_slots` 필드가 존재하는지 확인.
존재하면 Task 2 완료. 없다면 select 문자열에 `room_slots` 를 명시적으로 추가:

```typescript
.select("*, room_slots, contract_status, ...")
```

---

### Task 3: useAddRoomSlot 훅에 assignments 쿼리 무효화 추가

**Files:**
- Modify: `apps/part-time-supervisor/hooks/use-room-assignment-mutations.ts:30-34`

- [ ] **Step 1: onSuccess에 assignments.all 무효화 추가**

`use-room-assignment-mutations.ts` 30~34번째 줄:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({
    queryKey: queryKeys.roomAssignments.all,
  });
  // assignments.all(= ["assignments"])은 prefix-match로
  // byJobPosting 쿼리도 포함 무효화 → 탭 목록 즉시 갱신
  queryClient.invalidateQueries({
    queryKey: queryKeys.assignments.all,
  });
},
```

- [ ] **Step 2: 타입 체크**

```bash
cd apps/part-time-supervisor && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

---

## Chunk 2: AssignedWorkersTable 체크박스 컬럼 추가

> **관계 명확화:** `AssignedWorkersTable`은 `CandidateListPanel` 내부에서 재사용된다.
> Task 4(체크박스 props 추가)는 Task 6(CandidateListPanel)의 필수 선행 작업이다.

### Task 4: 체크박스 props 추가 및 첫 번째 컬럼에 렌더링

**Files:**
- Modify: `apps/part-time-supervisor/components/job-postings/AssignedWorkersTable.tsx`

- [ ] **Step 1: Props 타입 확장**

`AssignedWorkersTable` 컴포넌트 시그니처 수정 (124번째 줄):

```typescript
export default function AssignedWorkersTable({
  jobPostingId,
  job,
  assignments,
  isLoading,
  selectedIds = new Set(),
  onToggle,
}: {
  jobPostingId: string;
  job: JobPosting;
  assignments: AssignmentWithDetails[];
  isLoading: boolean;
  selectedIds?: Set<string>;      // optional — 없으면 체크박스 컬럼 미표시
  onToggle?: (id: string) => void;
}) {
```

- [ ] **Step 2: 테이블 헤더에 체크박스 컬럼 추가**

`<thead>` 내 No. `<th>` 앞에 조건부 컬럼 추가:

```tsx
<thead>
  <tr className="border-b bg-slate-50 text-left">
    {onToggle && (
      <th className="w-10 px-3 py-3 text-center" />
    )}
    <th className="px-4 py-3 font-medium text-center w-12">No.</th>
    {/* 기존 헤더 유지 */}
```

- [ ] **Step 3: 테이블 바디에 체크박스 셀 추가**

각 `<tr>` 첫 번째 `<td>` 앞에 추가:

```tsx
<tr
  key={a.id}
  className={`border-b last:border-0 hover:bg-slate-50/50 ${
    selectedIds.has(a.id) ? "bg-blue-50/40" : ""
  }`}
>
  {onToggle && (
    <td className="px-3 py-3 text-center">
      <input
        type="checkbox"
        checked={selectedIds.has(a.id)}
        onChange={() => onToggle(a.id)}
        className="h-4 w-4 rounded border-slate-300 accent-blue-600"
      />
    </td>
  )}
  <td className="px-4 py-3 text-center text-slate-400">{idx + 1}</td>
  {/* 기존 셀 유지 */}
```

- [ ] **Step 4: 타입 체크**

```bash
cd apps/part-time-supervisor && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

---

## Chunk 3: 신규 컴포넌트 생성

### Task 5: RoomAssignDialog 생성

**Files:**
- Create: `apps/part-time-supervisor/components/job-postings/RoomAssignDialog.tsx`

- [ ] **Step 1: 파일 생성**

`Promise.allSettled`를 사용하여 개별 배정 결과를 수집하고 부분 성공/실패를 toast로 보고한다.
단일 mutation 인스턴스를 병렬 호출하는 대신 직접 fetch를 사용한다.

```typescript
"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui/src/sonner";
import { queryKeys } from "@/lib/query-keys";
import { ROOMS } from "@/lib/room-constants";
import type { JobPosting } from "@/lib/supabase/types";

type Props = {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  selectedIds: Set<string>;
  jobPosting: JobPosting;
  onComplete: () => void;
};

export default function RoomAssignDialog({
  open,
  onClose,
  selectedCount,
  selectedIds,
  jobPosting,
  onComplete,
}: Props) {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const queryClient = useQueryClient();

  if (!open) return null;

  const slotBase = {
    date: jobPosting.start_date,
    start_time: jobPosting.work_start ?? "09:00",
    end_time: jobPosting.work_end ?? "18:00",
  };

  const handleAssign = async () => {
    if (!selectedRoom) return;
    setIsAssigning(true);

    // Promise.allSettled: 일부 실패해도 나머지 결과 수집
    const results = await Promise.allSettled(
      Array.from(selectedIds).map((assignmentId) =>
        fetch("/api/room-assignments/slot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignment_id: assignmentId, room: selectedRoom, ...slotBase }),
        }).then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "배정 실패");
          }
        })
      )
    );

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
    setSelectedRoom(null);
    onComplete();
    onClose();
  };

  const handleClose = () => {
    setSelectedRoom(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative z-10 w-80 rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-base font-semibold">회의실 배정</h3>
        <p className="mb-4 text-sm text-slate-500">{selectedCount}명에게 회의실을 배정합니다</p>

        <div className="space-y-1.5 mb-6">
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
            onClick={handleAssign}
            disabled={!selectedRoom || isAssigning}
            className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {isAssigning ? "배정 중..." : "배정하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

```bash
cd apps/part-time-supervisor && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: 에러 없음

---

### Task 6: CandidateListPanel 생성

**Files:**
- Create: `apps/part-time-supervisor/components/job-postings/CandidateListPanel.tsx`

- [ ] **Step 1: 파일 생성**

bulk delete도 `Promise.allSettled`로 부분 성공/실패를 처리한다.

```typescript
"use client";

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@repo/ui/src/sonner";
import { queryKeys } from "@/lib/query-keys";
import { getRoomById } from "@/lib/room-constants";
import type { AssignmentWithDetails, JobPosting } from "@/lib/supabase/types";
import AssignedWorkersTable from "./AssignedWorkersTable";
import RoomAssignDialog from "./RoomAssignDialog";

type Props = {
  jobPostingId: string;
  jobPosting: JobPosting;
  assignments: AssignmentWithDetails[];
  isLoading: boolean;
};

export default function CandidateListPanel({
  jobPostingId,
  jobPosting,
  assignments,
  isLoading,
}: Props) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("전체");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  // 탭 목록: 전체 + 실제 배정된 룸 (room_slots 기반)
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

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((a) => a.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`선택한 ${selectedIds.size}명을 명단에서 삭제하시겠습니까?`)) return;
    setIsDeleting(true);

    // Promise.allSettled: 일부 실패해도 성공한 항목은 반영
    const results = await Promise.allSettled(
      Array.from(selectedIds).map((id) =>
        fetch(`/api/assignments/${id}`, { method: "DELETE" }).then((res) => {
          if (!res.ok) throw new Error(`삭제 실패: ${id}`);
        })
      )
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    queryClient.invalidateQueries({ queryKey: queryKeys.assignments.byJobPosting(jobPostingId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.jobPostings.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    setSelectedIds(new Set());
    setIsDeleting(false);

    if (failed === 0) {
      toast.success(`${succeeded}명 삭제되었습니다.`);
    } else if (succeeded > 0) {
      toast.warning(`${succeeded}명 삭제 완료, ${failed}명 실패`);
    } else {
      toast.error("삭제에 실패했습니다.");
    }
  };

  const isAllSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  return (
    <div>
      {/* 탭 바 */}
      <div className="mb-3 flex gap-1 border-b">
        {tabs.map((tab) => {
          const label = tab === "전체" ? "전체" : (getRoomById(tab)?.name ?? tab);
          const count = tabCount.get(tab) ?? 0;
          return (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {label}
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                activeTab === tab ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 액션 바 — 1개 이상 선택 시 표시 */}
      {selectedIds.size > 0 && (
        <div className="mb-2 flex items-center gap-3 rounded-lg border bg-blue-50/50 px-4 py-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={handleToggleAll}
              className="h-4 w-4 rounded border-slate-300 accent-blue-600"
            />
            전체선택
          </label>
          <span className="text-sm text-slate-500">{selectedIds.size}명 선택됨</span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </button>
            <button
              onClick={() => setAssignDialogOpen(true)}
              disabled={isDeleting}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40"
            >
              회의실 배정
            </button>
          </div>
        </div>
      )}

      {/* 지원자 테이블 — AssignedWorkersTable을 내부에서 재사용 */}
      <AssignedWorkersTable
        jobPostingId={jobPostingId}
        job={jobPosting}
        assignments={filtered}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onToggle={handleToggle}
      />

      {/* 배정 다이얼로그 */}
      <RoomAssignDialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        selectedCount={selectedIds.size}
        selectedIds={selectedIds}
        jobPosting={jobPosting}
        onComplete={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

```bash
cd apps/part-time-supervisor && pnpm exec tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음

---

## Chunk 4: 페이지 통합

### Task 7: job-postings/[id]/page.tsx에서 CandidateListPanel 적용

**Files:**
- Modify: `apps/part-time-supervisor/app/(dashboard)/job-postings/[id]/page.tsx`

- [ ] **Step 1: import 교체**

`page.tsx` 21번째 줄:

```typescript
// 기존
import AssignedWorkersTable from "@/components/job-postings/AssignedWorkersTable";

// 교체
import CandidateListPanel from "@/components/job-postings/CandidateListPanel";
```

- [ ] **Step 2: 컴포넌트 교체**

`page.tsx` 152번째 줄 근처:

```tsx
{/* 기존 */}
<AssignedWorkersTable
  jobPostingId={id}
  job={job}
  assignments={assignments || []}
  isLoading={assignmentsLoading}
/>

{/* 교체 */}
<CandidateListPanel
  jobPostingId={id}
  jobPosting={job}
  assignments={assignments || []}
  isLoading={assignmentsLoading}
/>
```

- [ ] **Step 3: 타입 체크**

```bash
cd apps/part-time-supervisor && pnpm exec tsc --noEmit 2>&1 | head -30
```

Expected: 에러 없음

- [ ] **Step 4: 수동 동작 확인**

```bash
pnpm dev:part-time-supervisor
```

확인 항목:
1. 공고 상세 페이지 접속 → "전체" 탭만 표시됨 (배정된 룸 없을 때)
2. 체크박스 클릭 → 행 하이라이트 + 액션 바 표시
3. 전체선택 → 현재 탭의 모든 체크박스 선택
4. 탭 변경 → selectedIds 초기화
5. [삭제] → confirm → Promise.allSettled → 성공/실패 toast
6. [회의실 배정] → 다이얼로그 열림 → 룸 선택 → 배정하기 → Promise.allSettled → toast
7. 배정 후 해당 룸 탭 자동 추가, 클릭 시 해당 지원자만 표시
