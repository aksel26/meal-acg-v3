# 회의실 배정 기능 구현 계획

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 감독관이 날짜별로 지원자들을 회의실+1시간 슬롯에 배정할 수 있는 타임테이블 UI 구현

**Architecture:** assignments 테이블에 room_slots JSONB 컬럼 추가. 독립 페이지(/room-assignments) + 공고 상세 탭으로 타임테이블 UI 제공. 슬롯 추가/삭제는 원자적 Postgres JSONB 연산으로 동시성 안전.

**Tech Stack:** Next.js 15, React 19, TypeScript, Supabase (supervisor schema), TanStack React Query, Tailwind CSS, Radix UI (Popover), Lucide Icons

**주의:** 로컬 Supabase에서만 작업. `supabase db push` 절대 금지.

---

## Chunk 1: 데이터 레이어

### Task 1: DB 마이그레이션 — room_slots 컬럼 추가

**Files:**
- Create: `supabase/migrations/20260315_add_room_slots_to_assignments.sql`

- [ ] **Step 1: 마이그레이션 파일 생성**

```sql
-- supabase/migrations/20260315_add_room_slots_to_assignments.sql
ALTER TABLE supervisor.assignments
ADD COLUMN room_slots jsonb DEFAULT '[]';

ALTER TABLE supervisor.assignments
ADD CONSTRAINT room_slots_valid CHECK (
  jsonb_typeof(room_slots) = 'array'
);

COMMENT ON COLUMN supervisor.assignments.room_slots IS
  'Array of {date, start_time, end_time, room} objects for room assignments. Each slot is exactly 1 hour. KST timezone.';
```

- [ ] **Step 2: 로컬 Supabase에 적용**

Run: `supabase db reset`
Expected: 마이그레이션 성공, assignments 테이블에 room_slots 컬럼 추가됨

---

### Task 2: 타입 및 상수 정의

**Files:**
- Create: `apps/part-time-supervisor/lib/room-constants.ts`
- Modify: `apps/part-time-supervisor/lib/supabase/types.ts`

- [ ] **Step 1: room-constants.ts 생성**

```typescript
// apps/part-time-supervisor/lib/room-constants.ts
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
  date: string;       // KST "YYYY-MM-DD"
  start_time: string; // KST "HH:mm"
  end_time: string;   // KST "HH:mm" (start_time + 1hr)
  room: RoomId;
};

export function getRoomById(id: string) {
  return ROOMS.find((r) => r.id === id);
}

export function getRoomCapacity(roomId: string): number {
  return getRoomById(roomId)?.capacity ?? 0;
}
```

- [ ] **Step 2: Assignment 타입에 room_slots 추가**

`apps/part-time-supervisor/lib/supabase/types.ts`에서 Assignment 타입 수정:

```typescript
// 기존 Assignment 타입의 마지막 필드 뒤에 추가:
import type { RoomSlot } from "@/lib/room-constants";

export type Assignment = {
  // ... 기존 필드 유지
  assigned_at: string;
  updated_at: string;
  room_slots: RoomSlot[] | null;  // 추가
};
```

---

### Task 3: Query Keys 추가

**Files:**
- Modify: `apps/part-time-supervisor/lib/query-keys.ts`

- [ ] **Step 1: roomAssignments 키 추가**

`apps/part-time-supervisor/lib/query-keys.ts` 맨 마지막 항목 뒤에 추가:

```typescript
  roomAssignments: {
    all: ["roomAssignments"] as const,
    byDate: (date: string) => ["roomAssignments", date] as const,
    byDateAndJobPosting: (date: string, jobPostingId: string) =>
      ["roomAssignments", date, jobPostingId] as const,
  },
```

---

## Chunk 2: API 레이어

### Task 4: 회의실 배정 조회 API

**Files:**
- Create: `apps/part-time-supervisor/app/api/room-assignments/route.ts`

- [ ] **Step 1: GET 핸들러 작성**

```typescript
// apps/part-time-supervisor/app/api/room-assignments/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import type { RoomSlot } from "@/lib/room-constants";

export async function GET(request: Request) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const jobPostingId = searchParams.get("job_posting_id");

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    let query = supabase
      .from("assignments")
      .select(
        "id, worker_id, job_posting_id, status, room_slots, worker:workers(id, name), job_posting:job_postings(id, title)"
      )
      .neq("status", "cancelled");

    if (jobPostingId) {
      query = query.eq("job_posting_id", jobPostingId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // room_slots에서 해당 date의 슬롯만 필터링하여 평탄화
    const roomAssignments = (data || []).flatMap((assignment) => {
      const slots: RoomSlot[] = assignment.room_slots || [];
      return slots
        .filter((slot) => slot.date === date)
        .map((slot) => ({
          assignment_id: assignment.id,
          worker_id: assignment.worker_id,
          worker_name: (assignment.worker as { id: string; name: string } | null)?.name || "",
          job_posting_id: assignment.job_posting_id,
          job_posting_title: (assignment.job_posting as { id: string; title: string } | null)?.title || "",
          room: slot.room,
          start_time: slot.start_time,
          end_time: slot.end_time,
        }));
    });

    return NextResponse.json({ room_assignments: roomAssignments });
  } catch (error) {
    console.error("GET /api/room-assignments error:", error);
    return NextResponse.json({ error: "Failed to fetch room assignments" }, { status: 500 });
  }
}
```

- [ ] **Step 2: PUT 핸들러 작성 (전체 저장)**

같은 파일에 추가:

```typescript
export async function PUT(request: Request) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const body = await request.json();
    const { assignment_id, room_slots } = body as {
      assignment_id: string;
      room_slots: RoomSlot[];
    };

    if (!assignment_id || !Array.isArray(room_slots)) {
      return NextResponse.json({ error: "assignment_id and room_slots required" }, { status: 400 });
    }

    // 1시간 단위 검증
    for (const slot of room_slots) {
      const start = parseInt(slot.start_time.split(":")[0], 10);
      const end = parseInt(slot.end_time.split(":")[0], 10);
      if (end - start !== 1) {
        return NextResponse.json({ error: "각 슬롯은 정확히 1시간이어야 합니다." }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from("assignments")
      .update({ room_slots })
      .eq("id", assignment_id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("PUT /api/room-assignments error:", error);
    return NextResponse.json({ error: "Failed to update room assignments" }, { status: 500 });
  }
}
```

---

### Task 5: 슬롯 추가/삭제 API

**Files:**
- Create: `apps/part-time-supervisor/app/api/room-assignments/slot/route.ts`
- Create: `apps/part-time-supervisor/app/api/room-assignments/slot/delete/route.ts`

- [ ] **Step 1: 슬롯 추가 API (POST)**

```typescript
// apps/part-time-supervisor/app/api/room-assignments/slot/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import { ROOMS, type RoomSlot } from "@/lib/room-constants";

export async function POST(request: Request) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const body = await request.json();
    const { assignment_id, date, start_time, end_time, room } = body as {
      assignment_id: string;
      date: string;
      start_time: string;
      end_time: string;
      room: string;
    };

    // 검증
    if (!assignment_id || !date || !start_time || !end_time || !room) {
      return NextResponse.json({ error: "모든 필드가 필요합니다." }, { status: 400 });
    }

    const startHour = parseInt(start_time.split(":")[0], 10);
    const endHour = parseInt(end_time.split(":")[0], 10);
    if (endHour - startHour !== 1) {
      return NextResponse.json({ error: "슬롯은 정확히 1시간이어야 합니다." }, { status: 400 });
    }

    const validRoom = ROOMS.find((r) => r.id === room);
    if (!validRoom) {
      return NextResponse.json({ error: "유효하지 않은 회의실입니다." }, { status: 400 });
    }

    // 수용 인원 체크 (capacity > 0인 경우만)
    if (validRoom.capacity > 0) {
      // 모든 non-cancelled assignments에서 같은 date+start_time+room 슬롯 카운트
      const { data: allAssignments } = await supabase
        .from("assignments")
        .select("id, room_slots")
        .neq("status", "cancelled");

      let count = 0;
      for (const a of allAssignments || []) {
        const slots: RoomSlot[] = a.room_slots || [];
        count += slots.filter(
          (s) => s.date === date && s.start_time === start_time && s.room === room
        ).length;
      }

      if (count >= validRoom.capacity) {
        return NextResponse.json(
          { error: "수용 인원 초과", current: count, capacity: validRoom.capacity },
          { status: 400 }
        );
      }
    }

    // 현재 assignment의 room_slots 가져오기
    const { data: current, error: fetchError } = await supabase
      .from("assignments")
      .select("room_slots")
      .eq("id", assignment_id)
      .single();

    if (fetchError) throw fetchError;

    const existingSlots: RoomSlot[] = current.room_slots || [];

    // 중복 체크
    const isDuplicate = existingSlots.some(
      (s) => s.date === date && s.start_time === start_time && s.room === room
    );
    if (isDuplicate) {
      return NextResponse.json({ error: "이미 배정된 슬롯입니다." }, { status: 409 });
    }

    const newSlot: RoomSlot = { date, start_time, end_time, room: room as RoomSlot["room"] };
    const updatedSlots = [...existingSlots, newSlot];

    // 원자적 업데이트 (updated_at 동시 갱신으로 낙관적 잠금 효과)
    const { data, error } = await supabase
      .from("assignments")
      .update({ room_slots: updatedSlots, updated_at: new Date().toISOString() })
      .eq("id", assignment_id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/room-assignments/slot error:", error);
    return NextResponse.json({ error: "Failed to add slot" }, { status: 500 });
  }
}
```

- [ ] **Step 2: 슬롯 삭제 API (POST /slot/delete)**

```typescript
// apps/part-time-supervisor/app/api/room-assignments/slot/delete/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";
import type { RoomSlot } from "@/lib/room-constants";

export async function POST(request: Request) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const body = await request.json();
    const { assignment_id, date, start_time, end_time, room } = body as {
      assignment_id: string;
      date: string;
      start_time: string;
      end_time: string;
      room: string;
    };

    if (!assignment_id || !date || !start_time || !end_time || !room) {
      return NextResponse.json({ error: "모든 필드가 필요합니다." }, { status: 400 });
    }

    // 현재 room_slots 가져오기
    const { data: current, error: fetchError } = await supabase
      .from("assignments")
      .select("room_slots")
      .eq("id", assignment_id)
      .single();

    if (fetchError) throw fetchError;

    const existingSlots: RoomSlot[] = current.room_slots || [];
    const updatedSlots = existingSlots.filter(
      (s) => !(s.date === date && s.start_time === start_time && s.end_time === end_time && s.room === room)
    );

    const { data, error } = await supabase
      .from("assignments")
      .update({ room_slots: updatedSlots, updated_at: new Date().toISOString() })
      .eq("id", assignment_id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("POST /api/room-assignments/slot/delete error:", error);
    return NextResponse.json({ error: "Failed to delete slot" }, { status: 500 });
  }
}
```

---

### Task 6: 기존 assignments PUT에서 room_slots 직접 수정 차단

**Files:**
- Modify: `apps/part-time-supervisor/app/api/assignments/[id]/route.ts:12`

- [ ] **Step 1: PUT 핸들러에서 room_slots 필드 제거**

`apps/part-time-supervisor/app/api/assignments/[id]/route.ts`의 PUT 핸들러에서 body를 그대로 전달하지 않고 room_slots를 제외:

```typescript
// 기존: const body = await request.json();
// 변경:
const body = await request.json();
const { room_slots, ...updateData } = body;  // room_slots 제외
```

그리고 `.update(body)` → `.update(updateData)`로 변경.

---

## Chunk 3: 훅 레이어

### Task 7: 회의실 배정 조회 훅

**Files:**
- Create: `apps/part-time-supervisor/hooks/use-room-assignments.ts`

- [ ] **Step 1: 조회 훅 작성**

```typescript
// apps/part-time-supervisor/hooks/use-room-assignments.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export type RoomAssignmentItem = {
  assignment_id: string;
  worker_id: string;
  worker_name: string;
  job_posting_id: string;
  job_posting_title: string;
  room: string;
  start_time: string;
  end_time: string;
};

export function useRoomAssignments(date: string | null, jobPostingId?: string | null) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (jobPostingId) params.set("job_posting_id", jobPostingId);

  const queryKey = jobPostingId
    ? queryKeys.roomAssignments.byDateAndJobPosting(date!, jobPostingId)
    : queryKeys.roomAssignments.byDate(date!);

  return useQuery<{ room_assignments: RoomAssignmentItem[] }>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/room-assignments?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch room assignments");
      return res.json();
    },
    enabled: !!date,
  });
}
```

---

### Task 8: 회의실 배정 mutation 훅

**Files:**
- Create: `apps/part-time-supervisor/hooks/use-room-assignment-mutations.ts`

- [ ] **Step 1: mutation 훅 작성**

```typescript
// apps/part-time-supervisor/hooks/use-room-assignment-mutations.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

type AddSlotParams = {
  assignment_id: string;
  date: string;
  start_time: string;
  end_time: string;
  room: string;
};

type DeleteSlotParams = AddSlotParams;

export function useAddRoomSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddSlotParams) => {
      const res = await fetch("/api/room-assignments/slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add slot");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roomAssignments.all });
    },
  });
}

export function useDeleteRoomSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DeleteSlotParams) => {
      const res = await fetch("/api/room-assignments/slot/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete slot");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roomAssignments.all });
    },
  });
}
```

---

## Chunk 4: UI 컴포넌트

### Task 9: 타임테이블 헤더 컴포넌트

**Files:**
- Create: `apps/part-time-supervisor/components/room-assignments/RoomTimetableHeader.tsx`

- [ ] **Step 1: 헤더 컴포넌트 작성**

```typescript
// apps/part-time-supervisor/components/room-assignments/RoomTimetableHeader.tsx
"use client";

import { ROOMS } from "@/lib/room-constants";
import type { RoomAssignmentItem } from "@/hooks/use-room-assignments";

type Props = {
  timeSlot: string; // "09:00" — 특정 시간의 인원수 계산용
  assignments: RoomAssignmentItem[];
};

export default function RoomTimetableHeader({ timeSlot, assignments }: Props) {
  return (
    <tr className="border-b bg-slate-50">
      <th className="w-20 px-3 py-2 text-left text-xs font-medium text-slate-500">시간</th>
      {ROOMS.map((room) => {
        const count = assignments.filter(
          (a) => a.room === room.id && a.start_time === timeSlot
        ).length;
        const isOver = room.capacity > 0 && count >= room.capacity;
        return (
          <th
            key={room.id}
            className="min-w-[100px] px-2 py-2 text-center text-xs font-medium text-slate-500"
          >
            <div>{room.name}</div>
            {room.capacity > 0 && (
              <div className={`text-[10px] ${isOver ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                {count}/{room.capacity}
              </div>
            )}
          </th>
        );
      })}
    </tr>
  );
}
```

---

### Task 10: 지원자 선택 팝오버

**Files:**
- Create: `apps/part-time-supervisor/components/room-assignments/WorkerSelectPopover.tsx`

- [ ] **Step 1: 팝오버 컴포넌트 작성**

```typescript
// apps/part-time-supervisor/components/room-assignments/WorkerSelectPopover.tsx
"use client";

import { useState } from "react";
import type { AssignmentWithDetails } from "@/lib/supabase/types";
import type { RoomAssignmentItem } from "@/hooks/use-room-assignments";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (assignment: AssignmentWithDetails) => void;
  availableAssignments: AssignmentWithDetails[];
  roomAssignments: RoomAssignmentItem[];
  date: string;
  timeSlot: string;
  room: string;
  anchorRect: { top: number; left: number } | null;
};

export default function WorkerSelectPopover({
  open,
  onClose,
  onSelect,
  availableAssignments,
  roomAssignments,
  date,
  timeSlot,
  room,
  anchorRect,
}: Props) {
  const [search, setSearch] = useState("");

  if (!open || !anchorRect) return null;

  // 해당 시간+회의실에 이미 배정된 worker_id 목록
  const assignedWorkerIds = new Set(
    roomAssignments
      .filter((ra) => ra.start_time === timeSlot && ra.room === room)
      .map((ra) => ra.worker_id)
  );

  const filtered = availableAssignments.filter((a) => {
    if (assignedWorkerIds.has(a.worker_id)) return false;
    if (!search) return true;
    return a.worker?.name?.includes(search);
  });

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-56 rounded-lg border bg-white p-2 shadow-lg"
        style={{ top: anchorRect.top, left: anchorRect.left }}
      >
        <input
          type="text"
          placeholder="이름 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2 w-full rounded border px-2 py-1 text-sm"
          autoFocus
        />
        <div className="max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-3 text-center text-xs text-slate-400">배정 가능한 지원자가 없습니다</div>
          ) : (
            filtered.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  onSelect(a);
                  onClose();
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100"
              >
                <span>{a.worker?.name || "이름 없음"}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
}
```

---

### Task 11: 타임테이블 셀 컴포넌트

**Files:**
- Create: `apps/part-time-supervisor/components/room-assignments/RoomTimetableCell.tsx`

- [ ] **Step 1: 셀 컴포넌트 작성**

```typescript
// apps/part-time-supervisor/components/room-assignments/RoomTimetableCell.tsx
"use client";

import { X } from "lucide-react";
import type { RoomAssignmentItem } from "@/hooks/use-room-assignments";
import { getRoomById } from "@/lib/room-constants";

type Props = {
  timeSlot: string;
  room: string;
  assignments: RoomAssignmentItem[]; // 이 셀의 배정들
  allAssignmentsForSlot: RoomAssignmentItem[]; // 이 시간+회의실의 모든 배정 (인원 카운트용)
  onCellClick: (e: React.MouseEvent<HTMLTableCellElement>) => void;
  onRemove: (assignment: RoomAssignmentItem) => void;
};

export default function RoomTimetableCell({
  timeSlot,
  room,
  assignments,
  allAssignmentsForSlot,
  onCellClick,
  onRemove,
}: Props) {
  const roomInfo = getRoomById(room);
  const isOverCapacity = roomInfo && roomInfo.capacity > 0 && allAssignmentsForSlot.length > roomInfo.capacity;

  return (
    <td
      onClick={onCellClick}
      className={`min-w-[100px] cursor-pointer border-r px-1 py-1 align-top transition-colors hover:bg-blue-50 ${
        isOverCapacity ? "bg-red-50" : ""
      }`}
    >
      <div className="flex flex-wrap gap-1">
        {assignments.map((a) => (
          <span
            key={a.assignment_id}
            className="inline-flex items-center gap-0.5 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700"
          >
            {a.worker_name}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(a);
              }}
              className="ml-0.5 rounded-full p-0.5 hover:bg-blue-200"
            >
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
    </td>
  );
}
```

---

### Task 12: 우측 지원자 패널

**Files:**
- Create: `apps/part-time-supervisor/components/room-assignments/WorkerSidePanel.tsx`

- [ ] **Step 1: 사이드 패널 작성**

```typescript
// apps/part-time-supervisor/components/room-assignments/WorkerSidePanel.tsx
"use client";

import type { AssignmentWithDetails } from "@/lib/supabase/types";
import type { RoomAssignmentItem } from "@/hooks/use-room-assignments";

type Props = {
  assignments: AssignmentWithDetails[];
  roomAssignments: RoomAssignmentItem[];
  date: string;
};

export default function WorkerSidePanel({ assignments, roomAssignments, date }: Props) {
  // 해당 날짜에 회의실 배정된 worker_id → room 매핑
  const workerRoomMap = new Map<string, string[]>();
  for (const ra of roomAssignments) {
    const rooms = workerRoomMap.get(ra.worker_id) || [];
    if (!rooms.includes(ra.room)) rooms.push(ra.room);
    workerRoomMap.set(ra.worker_id, rooms);
  }

  const assigned = assignments.filter((a) => workerRoomMap.has(a.worker_id));
  const unassigned = assignments.filter((a) => !workerRoomMap.has(a.worker_id));

  return (
    <div className="w-64 shrink-0 rounded-xl border bg-white p-4">
      <h4 className="mb-3 text-sm font-semibold">지원자 목록</h4>

      {unassigned.length > 0 && (
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-medium text-orange-600">미배정 ({unassigned.length})</p>
          <div className="space-y-1">
            {unassigned.map((a) => (
              <div key={a.id} className="rounded bg-orange-50 px-2 py-1.5 text-sm">
                {a.worker?.name || "이름 없음"}
              </div>
            ))}
          </div>
        </div>
      )}

      {assigned.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-green-600">배정 완료 ({assigned.length})</p>
          <div className="space-y-1">
            {assigned.map((a) => {
              const rooms = workerRoomMap.get(a.worker_id) || [];
              return (
                <div key={a.id} className="flex items-center justify-between rounded bg-green-50 px-2 py-1.5 text-sm">
                  <span>{a.worker?.name || "이름 없음"}</span>
                  <span className="text-xs text-green-600">{rooms.join(", ")}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {assignments.length === 0 && (
        <p className="py-4 text-center text-xs text-slate-400">공고를 선택하세요</p>
      )}
    </div>
  );
}
```

---

### Task 13: 상단 컨트롤 컴포넌트

**Files:**
- Create: `apps/part-time-supervisor/components/room-assignments/RoomAssignmentControls.tsx`

- [ ] **Step 1: 컨트롤 컴포넌트 작성**

```typescript
// apps/part-time-supervisor/components/room-assignments/RoomAssignmentControls.tsx
"use client";

import type { JobPosting } from "@/lib/supabase/types";

type Props = {
  date: string;
  onDateChange: (date: string) => void;
  jobPostings: JobPosting[];
  selectedJobPostingId: string | null;
  onJobPostingChange: (id: string | null) => void;
  startHour: number;
  endHour: number;
  onStartHourChange: (hour: number) => void;
  onEndHourChange: (hour: number) => void;
};

export default function RoomAssignmentControls({
  date,
  onDateChange,
  jobPostings,
  selectedJobPostingId,
  onJobPostingChange,
  startHour,
  endHour,
  onStartHourChange,
  onEndHourChange,
}: Props) {
  const hourOptions = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-white p-4">
      {/* 날짜 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">날짜</label>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="rounded-lg border px-3 py-1.5 text-sm"
        />
      </div>

      {/* 공고 선택 */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">공고</label>
        <select
          value={selectedJobPostingId || ""}
          onChange={(e) => onJobPostingChange(e.target.value || null)}
          className="rounded-lg border px-3 py-1.5 text-sm"
        >
          <option value="">전체</option>
          {jobPostings.map((jp) => (
            <option key={jp.id} value={jp.id}>
              {jp.title}
            </option>
          ))}
        </select>
      </div>

      {/* 시간 범위 */}
      <div className="flex items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">시작</label>
          <select
            value={startHour}
            onChange={(e) => onStartHourChange(Number(e.target.value))}
            className="rounded-lg border px-3 py-1.5 text-sm"
          >
            {hourOptions.map((h) => (
              <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
            ))}
          </select>
        </div>
        <span className="pb-1.5 text-sm text-slate-400">~</span>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">종료</label>
          <select
            value={endHour}
            onChange={(e) => onEndHourChange(Number(e.target.value))}
            className="rounded-lg border px-3 py-1.5 text-sm"
          >
            {hourOptions.map((h) => (
              <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
```

---

### Task 14: 메인 타임테이블 컴포넌트

**Files:**
- Create: `apps/part-time-supervisor/components/room-assignments/RoomTimetable.tsx`

- [ ] **Step 1: 타임테이블 컴포넌트 작성**

```typescript
// apps/part-time-supervisor/components/room-assignments/RoomTimetable.tsx
"use client";

import { useState } from "react";
import { ROOMS } from "@/lib/room-constants";
import type { RoomAssignmentItem } from "@/hooks/use-room-assignments";
import type { AssignmentWithDetails } from "@/lib/supabase/types";
import { useAddRoomSlot, useDeleteRoomSlot } from "@/hooks/use-room-assignment-mutations";
import RoomTimetableCell from "./RoomTimetableCell";
import WorkerSelectPopover from "./WorkerSelectPopover";
import { toast } from "@repo/ui/src/sonner";

type Props = {
  date: string;
  startHour: number;
  endHour: number;
  roomAssignments: RoomAssignmentItem[];
  availableAssignments: AssignmentWithDetails[];
};

export default function RoomTimetable({
  date,
  startHour,
  endHour,
  roomAssignments,
  availableAssignments,
}: Props) {
  const [popover, setPopover] = useState<{
    open: boolean;
    timeSlot: string;
    room: string;
    anchorRect: { top: number; left: number } | null;
  }>({ open: false, timeSlot: "", room: "", anchorRect: null });

  const addSlot = useAddRoomSlot();
  const deleteSlot = useDeleteRoomSlot();

  const timeSlots = Array.from({ length: endHour - startHour }, (_, i) => {
    const hour = startHour + i;
    return `${String(hour).padStart(2, "0")}:00`;
  });

  const handleCellClick = (timeSlot: string, room: string, e: React.MouseEvent<HTMLTableCellElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover({
      open: true,
      timeSlot,
      room,
      anchorRect: { top: rect.bottom + 4, left: rect.left },
    });
  };

  const handleSelect = (assignment: AssignmentWithDetails) => {
    const endHourNum = parseInt(popover.timeSlot.split(":")[0], 10) + 1;
    const endTime = `${String(endHourNum).padStart(2, "0")}:00`;

    addSlot.mutate(
      {
        assignment_id: assignment.id,
        date,
        start_time: popover.timeSlot,
        end_time: endTime,
        room: popover.room,
      },
      {
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleRemove = (item: RoomAssignmentItem) => {
    deleteSlot.mutate(
      {
        assignment_id: item.assignment_id,
        date,
        start_time: item.start_time,
        end_time: item.end_time,
        room: item.room,
      },
      {
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="w-20 px-3 py-2 text-left text-xs font-medium text-slate-500">시간</th>
              {ROOMS.map((room) => {
                const totalForRoom = roomAssignments.filter((a) => a.room === room.id).length;
                return (
                  <th
                    key={room.id}
                    className="min-w-[100px] px-2 py-2 text-center text-xs font-medium text-slate-500"
                  >
                    <div>{room.name}</div>
                    {room.capacity > 0 && (
                      <div className="text-[10px] text-slate-400">
                        최대 {room.capacity}명
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((timeSlot) => (
              <tr key={timeSlot} className="border-b">
                <td className="px-3 py-2 text-xs font-medium text-slate-500">{timeSlot}</td>
                {ROOMS.map((room) => {
                  const cellAssignments = roomAssignments.filter(
                    (a) => a.start_time === timeSlot && a.room === room.id
                  );
                  return (
                    <RoomTimetableCell
                      key={room.id}
                      timeSlot={timeSlot}
                      room={room.id}
                      assignments={cellAssignments}
                      allAssignmentsForSlot={cellAssignments}
                      onCellClick={(e) => handleCellClick(timeSlot, room.id, e)}
                      onRemove={handleRemove}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <WorkerSelectPopover
        open={popover.open}
        onClose={() => setPopover((p) => ({ ...p, open: false }))}
        onSelect={handleSelect}
        availableAssignments={availableAssignments}
        roomAssignments={roomAssignments}
        date={date}
        timeSlot={popover.timeSlot}
        room={popover.room}
        anchorRect={popover.anchorRect}
      />
    </>
  );
}
```

---

## Chunk 5: 페이지 및 네비게이션

### Task 15: 회의실 배정 독립 페이지

**Files:**
- Create: `apps/part-time-supervisor/app/(dashboard)/room-assignments/page.tsx`

- [ ] **Step 1: 페이지 작성**

```typescript
// apps/part-time-supervisor/app/(dashboard)/room-assignments/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useRoomAssignments } from "@/hooks/use-room-assignments";
import { useAssignmentsByJobPosting } from "@/hooks/use-assignments";
import { useJobPostings } from "@/hooks/use-job-postings";
import RoomTimetable from "@/components/room-assignments/RoomTimetable";
import RoomAssignmentControls from "@/components/room-assignments/RoomAssignmentControls";
import WorkerSidePanel from "@/components/room-assignments/WorkerSidePanel";
import dayjs from "dayjs";

export default function RoomAssignmentsPage() {
  const today = dayjs().format("YYYY-MM-DD");
  const [date, setDate] = useState(today);
  const [selectedJobPostingId, setSelectedJobPostingId] = useState<string | null>(null);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);

  const { data: jobPostingsData } = useJobPostings();
  const jobPostings = useMemo(
    () => (jobPostingsData || []).filter((jp) => jp.status === "open" || jp.status === "in_progress"),
    [jobPostingsData]
  );

  // 공고 선택 시 근무시간 자동 반영
  const handleJobPostingChange = (id: string | null) => {
    setSelectedJobPostingId(id);
    if (id) {
      const jp = jobPostings.find((j) => j.id === id);
      if (jp?.work_start && jp?.work_end) {
        setStartHour(parseInt(jp.work_start.split(":")[0], 10));
        setEndHour(parseInt(jp.work_end.split(":")[0], 10));
      }
    }
  };

  // 전체 날짜 회의실 배정 (모든 공고)
  const { data: roomData } = useRoomAssignments(date);
  const roomAssignments = roomData?.room_assignments || [];

  // 선택한 공고의 배정된 지원자
  const { data: assignments } = useAssignmentsByJobPosting(selectedJobPostingId);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">회의실 배정</h3>

      <RoomAssignmentControls
        date={date}
        onDateChange={setDate}
        jobPostings={jobPostings}
        selectedJobPostingId={selectedJobPostingId}
        onJobPostingChange={handleJobPostingChange}
        startHour={startHour}
        endHour={endHour}
        onStartHourChange={setStartHour}
        onEndHourChange={setEndHour}
      />

      <div className="flex gap-4">
        <div className="flex-1">
          <RoomTimetable
            date={date}
            startHour={startHour}
            endHour={endHour}
            roomAssignments={roomAssignments}
            availableAssignments={assignments || []}
          />
        </div>

        <WorkerSidePanel
          assignments={assignments || []}
          roomAssignments={roomAssignments}
          date={date}
        />
      </div>
    </div>
  );
}
```

---

### Task 16: 사이드바에 메뉴 추가

**Files:**
- Modify: `apps/part-time-supervisor/components/layout/Sidebar.tsx:1-12`

- [ ] **Step 1: 사이드바 navItems에 회의실 배정 추가**

`apps/part-time-supervisor/components/layout/Sidebar.tsx`에서:

import 추가:
```typescript
import { Briefcase, Users, ClipboardList, LayoutDashboard, DoorOpen } from "lucide-react";
```

navItems 배열에 추가 (assignments 뒤):
```typescript
{ href: "/room-assignments", label: "회의실 배정", icon: DoorOpen },
```

---

### Task 17: 공고 상세 페이지에 회의실 배정 탭 추가

**Files:**
- Modify: `apps/part-time-supervisor/app/(dashboard)/job-postings/[id]/page.tsx`

- [ ] **Step 1: 탭 UI 추가**

`apps/part-time-supervisor/app/(dashboard)/job-postings/[id]/page.tsx`에서:

import 추가:
```typescript
import { useRoomAssignments } from "@/hooks/use-room-assignments";
import RoomTimetable from "@/components/room-assignments/RoomTimetable";
import Link from "next/link"; // 이미 있으면 생략
```

컴포넌트 내 상태 추가:
```typescript
const [activeTab, setActiveTab] = useState<"workers" | "rooms">("workers");
const today = dayjs().format("YYYY-MM-DD");
const [roomDate, setRoomDate] = useState(today);
const { data: roomData } = useRoomAssignments(roomDate, id);
const roomAssignments = roomData?.room_assignments || [];
```

Workers Table 섹션을 탭으로 감싸기:

기존 `{/* Workers Table */}` 부분을 탭 구조로 교체:

```tsx
{/* Tab Header */}
<div className="flex items-center gap-4 border-b">
  <button
    onClick={() => setActiveTab("workers")}
    className={`px-1 py-2 text-sm font-medium border-b-2 transition-colors ${
      activeTab === "workers"
        ? "border-slate-900 text-slate-900"
        : "border-transparent text-slate-400 hover:text-slate-600"
    }`}
  >
    지원자 명단
  </button>
  <button
    onClick={() => setActiveTab("rooms")}
    className={`px-1 py-2 text-sm font-medium border-b-2 transition-colors ${
      activeTab === "rooms"
        ? "border-slate-900 text-slate-900"
        : "border-transparent text-slate-400 hover:text-slate-600"
    }`}
  >
    회의실 배정
  </button>
</div>

{activeTab === "workers" ? (
  /* 기존 지원자 명단 코드 그대로 */
) : (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <input
        type="date"
        value={roomDate}
        onChange={(e) => setRoomDate(e.target.value)}
        className="rounded-lg border px-3 py-1.5 text-sm"
      />
      <Link
        href="/room-assignments"
        className="text-sm text-blue-600 hover:underline"
      >
        전체 현황 보기 →
      </Link>
    </div>
    <RoomTimetable
      date={roomDate}
      startHour={job.work_start ? parseInt(job.work_start.split(":")[0], 10) : 9}
      endHour={job.work_end ? parseInt(job.work_end.split(":")[0], 10) : 18}
      roomAssignments={roomAssignments}
      availableAssignments={assignments || []}
    />
  </div>
)}
```

---

## Chunk 6: 빌드 검증

### Task 18: 타입 체크 및 빌드 검증

- [ ] **Step 1: 타입 체크**

Run: `cd /Users/hyunmin/Documents/meal-v3 && pnpm check-types`
Expected: part-time-supervisor 앱에 새 타입 에러 없음 (기존 에러만 존재)

- [ ] **Step 2: 린트 체크**

Run: `cd /Users/hyunmin/Documents/meal-v3 && pnpm lint`
Expected: 새 린트 에러 없음

- [ ] **Step 3: 빌드**

Run: `cd /Users/hyunmin/Documents/meal-v3 && pnpm build:part-time-supervisor`
Expected: 빌드 성공

- [ ] **Step 4: 수동 테스트 확인 사항**

Run: `pnpm dev:part-time-supervisor`

확인 항목:
1. 사이드바에 "회의실 배정" 메뉴 표시됨
2. `/room-assignments` 페이지 접근 가능
3. 날짜 선택, 공고 선택 동작
4. 타임테이블 그리드 렌더링
5. 빈 셀 클릭 → 지원자 팝오버 표시
6. 지원자 선택 → 셀에 이름 태그 표시
7. 이름 태그의 X 클릭 → 삭제
8. 공고 상세 → 회의실 배정 탭 동작
9. 우측 패널: 미배정/배정 구분 표시
