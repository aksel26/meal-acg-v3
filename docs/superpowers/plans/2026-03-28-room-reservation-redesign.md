# 회의실 예약 타임라인 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 감독관/면접교육 통합 회의실 타임라인 예약 시스템 구축 (드래그 생성, 드래그앤드롭 이동, 리사이즈)

**Architecture:** 새 `supervisor.room_reservations` 테이블 + REST API + 순수 마우스 이벤트 기반 타임라인 UI. 기존 `assignments.room_slots` 시스템은 유지하되 새 페이지는 독립적인 예약 시스템 사용.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, TanStack React Query, Supabase (service client)

---

### Task 1: DB 마이그레이션 — room_reservations 테이블

**Files:**
- Create: `supabase/migrations/20260329_room_reservations.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- 회의실 예약 테이블
CREATE TABLE supervisor.room_reservations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     text NOT NULL,
  date        date NOT NULL,
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  type        text NOT NULL CHECK (type IN ('supervisor', 'interview')),
  title       text,
  content     text,
  reserved_by text NOT NULL,
  cc_members  text[] DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_room_reservations_date ON supervisor.room_reservations(date);
CREATE INDEX idx_room_reservations_room_date ON supervisor.room_reservations(room_id, date);

ALTER TABLE supervisor.room_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON supervisor.room_reservations
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

GRANT ALL ON supervisor.room_reservations TO service_role;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON supervisor.room_reservations
  FOR EACH ROW EXECUTE FUNCTION supervisor.update_updated_at();
```

- [ ] **Step 2: 로컬 DB 적용 확인**

Run: `supabase db reset 2>&1 | tail -5`
Expected: `Finished supabase db reset` (에러 없음)

- [ ] **Step 3: 시드 데이터 추가**

`supabase/seed.sql` 끝에 샘플 예약 추가:

```sql
-- 회의실 예약 샘플
DELETE FROM supervisor.room_reservations;
INSERT INTO supervisor.room_reservations (id, room_id, date, start_time, end_time, type, title, content, reserved_by, cc_members) VALUES
  ('r1000000-0000-0000-0000-000000000001', 'C1', '2026-03-28', '09:00', '11:00', 'supervisor', '서울시청 민원안내 감독', '감독관 배치 미팅', '김관리', '{"이철수","박영희"}'),
  ('r1000000-0000-0000-0000-000000000002', 'C1', '2026-03-28', '13:00', '16:00', 'interview', '3월 2차 면접교육', '면접위원 교육 진행', '김관리', '{"최민수"}'),
  ('r1000000-0000-0000-0000-000000000003', 'C2', '2026-03-28', '09:00', '12:00', 'interview', '3월 2차 면접교육 B반', NULL, '김관리', '{}'),
  ('r1000000-0000-0000-0000-000000000004', 'R', '2026-03-28', '09:00', '13:00', 'supervisor', '강남역 설문조사 브리핑', '설문 문항 검토', '김관리', '{"정수진"}'),
  ('r1000000-0000-0000-0000-000000000005', '406-2', '2026-03-28', '10:00', '15:00', 'supervisor', '홍대 카페 시식 준비', NULL, '김관리', '{}');
```

- [ ] **Step 4: 시드 적용 확인**

Run: `supabase db reset 2>&1 | tail -5`
Expected: `Finished supabase db reset`

- [ ] **Step 5: 커밋**

```
feat(db): room_reservations 테이블 + 시드 데이터
```

---

### Task 2: API — 예약 CRUD + 직원 목록

**Files:**
- Create: `apps/part-time-supervisor/app/api/room-reservations/route.ts`
- Create: `apps/part-time-supervisor/app/api/room-reservations/[id]/route.ts`
- Create: `apps/part-time-supervisor/app/api/members/route.ts`

- [ ] **Step 1: GET/POST /api/room-reservations 작성**

`apps/part-time-supervisor/app/api/room-reservations/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

function isValidTime(t: string): boolean {
  const [, min] = t.split(":");
  return min === "00" || min === "30";
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const date = request.nextUrl.searchParams.get("date");
    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("room_reservations")
      .select("*")
      .eq("date", date)
      .order("start_time", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("GET /api/room-reservations error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { room_id, date, start_time, end_time, type, title, content, cc_members } = body;

    if (!room_id || !date || !start_time || !end_time || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!isValidTime(start_time) || !isValidTime(end_time)) {
      return NextResponse.json({ error: "Times must be on 30-min boundaries" }, { status: 400 });
    }
    if (end_time <= start_time) {
      return NextResponse.json({ error: "end_time must be after start_time" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 충돌 체크
    const { data: conflicts } = await supabase
      .from("room_reservations")
      .select("id, title, start_time, end_time")
      .eq("room_id", room_id)
      .eq("date", date)
      .lt("start_time", end_time)
      .gt("end_time", start_time);

    const { data, error } = await supabase
      .from("room_reservations")
      .insert({
        room_id,
        date,
        start_time,
        end_time,
        type,
        title: title ?? null,
        content: content ?? null,
        reserved_by: session.fullName,
        cc_members: cc_members ?? [],
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      ...data,
      warning: (conflicts?.length ?? 0) > 0,
      conflicts: conflicts ?? [],
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/room-reservations error:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
```

- [ ] **Step 2: PATCH/DELETE /api/room-reservations/[id] 작성**

`apps/part-time-supervisor/app/api/room-reservations/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

function isValidTime(t: string): boolean {
  const [, min] = t.split(":");
  return min === "00" || min === "30";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // 시간 검증
    if (body.start_time && !isValidTime(body.start_time)) {
      return NextResponse.json({ error: "start_time must be on 30-min boundary" }, { status: 400 });
    }
    if (body.end_time && !isValidTime(body.end_time)) {
      return NextResponse.json({ error: "end_time must be on 30-min boundary" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 충돌 체크 (시간/회의실 변경 시)
    let conflicts: unknown[] = [];
    if (body.room_id || body.start_time || body.end_time) {
      const { data: current } = await supabase
        .from("room_reservations")
        .select("*")
        .eq("id", id)
        .single();

      if (current) {
        const roomId = body.room_id ?? current.room_id;
        const date = body.date ?? current.date;
        const startTime = body.start_time ?? current.start_time;
        const endTime = body.end_time ?? current.end_time;

        if (endTime <= startTime) {
          return NextResponse.json({ error: "end_time must be after start_time" }, { status: 400 });
        }

        const { data: overlaps } = await supabase
          .from("room_reservations")
          .select("id, title, start_time, end_time")
          .eq("room_id", roomId)
          .eq("date", date)
          .lt("start_time", endTime)
          .gt("end_time", startTime)
          .neq("id", id);

        conflicts = overlaps ?? [];
      }
    }

    const { data, error } = await supabase
      .from("room_reservations")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      ...data,
      warning: conflicts.length > 0,
      conflicts,
    });
  } catch (error) {
    console.error("PATCH /api/room-reservations/[id] error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    const { error } = await supabase
      .from("room_reservations")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/room-reservations/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
```

- [ ] **Step 3: GET /api/members 작성**

`apps/part-time-supervisor/app/api/members/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth();
    const supabase = createServiceClient();

    // public 스키마의 members 테이블 조회 — service client는 supervisor 스키마 기본이므로 schema 지정
    const { data, error } = await supabase
      .schema("public")
      .from("members")
      .select("id, full_name")
      .order("full_name", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("GET /api/members error:", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}
```

- [ ] **Step 4: 타입 체크**

Run: `pnpm --filter=part-time-supervisor check-types 2>&1 | tail -5`
Expected: 에러 없음

- [ ] **Step 5: 커밋**

```
feat(api): 회의실 예약 CRUD + 직원 목록 API
```

---

### Task 3: React Query Hooks

**Files:**
- Create: `apps/part-time-supervisor/hooks/use-room-reservations-new.ts`
- Create: `apps/part-time-supervisor/hooks/use-room-reservation-new-mutations.ts`
- Create: `apps/part-time-supervisor/hooks/use-members.ts`
- Modify: `apps/part-time-supervisor/lib/query-keys.ts`

- [ ] **Step 1: query-keys에 추가**

`lib/query-keys.ts`에 추가:

```typescript
roomReservations: {
  all: ["roomReservations"] as const,
  byDate: (date: string) => ["roomReservations", date] as const,
},

members: {
  all: ["members"] as const,
},
```

- [ ] **Step 2: use-room-reservations-new.ts 작성**

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export type RoomReservation = {
  id: string;
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  type: "supervisor" | "interview";
  title: string | null;
  content: string | null;
  reserved_by: string;
  cc_members: string[];
  created_at: string;
  updated_at: string;
};

export function useRoomReservations(date: string) {
  return useQuery<RoomReservation[]>({
    queryKey: queryKeys.roomReservations.byDate(date),
    queryFn: async () => {
      const res = await fetch(`/api/room-reservations?date=${date}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!date,
  });
}
```

- [ ] **Step 3: use-room-reservation-new-mutations.ts 작성**

```typescript
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export function useCreateRoomReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      room_id: string;
      date: string;
      start_time: string;
      end_time: string;
      type: "supervisor" | "interview";
      title?: string;
      content?: string;
      cc_members?: string[];
    }) => {
      const res = await fetch("/api/room-reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.roomReservations.all });
    },
  });
}

export function useUpdateRoomReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & Record<string, unknown>) => {
      const res = await fetch(`/api/room-reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.roomReservations.all });
    },
  });
}

export function useDeleteRoomReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/room-reservations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.roomReservations.all });
    },
  });
}
```

- [ ] **Step 4: use-members.ts 작성**

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export type Member = {
  id: string;
  full_name: string;
};

export function useMembers() {
  return useQuery<Member[]>({
    queryKey: queryKeys.members.all,
    queryFn: async () => {
      const res = await fetch("/api/members");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 5: 타입 체크 + 커밋**

Run: `pnpm --filter=part-time-supervisor check-types`

```
feat(hooks): 회의실 예약 React Query hooks + 직원 목록 hook
```

---

### Task 4: TimelineGrid 컴포넌트 — 기본 그리드 렌더링

**Files:**
- Create: `apps/part-time-supervisor/components/room-reservations/TimelineGrid.tsx`

- [ ] **Step 1: TimelineGrid 작성 — 그리드 + 헤더 + 회의실 행**

```typescript
"use client";

import { useRef, useState, useCallback } from "react";
import { ROOMS } from "@/lib/room-constants";
import type { RoomReservation } from "@/hooks/use-room-reservations-new";
import { ReservationBlock } from "./ReservationBlock";

const START_HOUR = 9;
const END_HOUR = 21;
const SLOT_COUNT = (END_HOUR - START_HOUR) * 2; // 24 slots (30min each)
const ROOM_LABEL_WIDTH = 80; // px

type DragState =
  | { mode: "idle" }
  | { mode: "create"; roomId: string; startSlot: number; endSlot: number }
  | { mode: "move"; reservationId: string; originRoomId: string; currentRoomId: string; offsetSlots: number }
  | { mode: "resize"; reservationId: string; edge: "left" | "right"; startSlot: number; endSlot: number };

type Props = {
  reservations: RoomReservation[];
  onCreateRequest: (roomId: string, startTime: string, endTime: string) => void;
  onMoveReservation: (id: string, roomId: string) => void;
  onResizeReservation: (id: string, startTime: string, endTime: string) => void;
  onClickReservation: (reservation: RoomReservation) => void;
};

function slotToTime(slot: number): string {
  const totalMinutes = START_HOUR * 60 + slot * 30;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeToSlot(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return ((h! * 60 + m!) - START_HOUR * 60) / 30;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function TimelineGrid({
  reservations,
  onCreateRequest,
  onMoveReservation,
  onResizeReservation,
  onClickReservation,
}: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState>({ mode: "idle" });

  const getSlotFromX = useCallback((clientX: number): number => {
    if (!gridRef.current) return 0;
    const rect = gridRef.current.getBoundingClientRect();
    const x = clientX - rect.left - ROOM_LABEL_WIDTH;
    const slotWidth = (rect.width - ROOM_LABEL_WIDTH) / SLOT_COUNT;
    return clamp(Math.round(x / slotWidth), 0, SLOT_COUNT);
  }, []);

  const getRoomFromY = useCallback((clientY: number): string | null => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const headerHeight = 36;
    const y = clientY - rect.top - headerHeight;
    const rowHeight = (rect.height - headerHeight) / ROOMS.length;
    const idx = Math.floor(y / rowHeight);
    return idx >= 0 && idx < ROOMS.length ? ROOMS[idx]!.id : null;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, roomId: string) => {
    if (e.button !== 0) return;
    const slot = getSlotFromX(e.clientX);
    // 빈 영역 드래그 → 생성
    setDrag({ mode: "create", roomId, startSlot: slot, endSlot: slot });
  }, [getSlotFromX]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (drag.mode === "idle") return;

    if (drag.mode === "create") {
      const slot = getSlotFromX(e.clientX);
      setDrag((prev) => prev.mode === "create" ? { ...prev, endSlot: slot } : prev);
    } else if (drag.mode === "move") {
      const roomId = getRoomFromY(e.clientY);
      if (roomId) {
        setDrag((prev) => prev.mode === "move" ? { ...prev, currentRoomId: roomId } : prev);
      }
    } else if (drag.mode === "resize") {
      const slot = getSlotFromX(e.clientX);
      setDrag((prev) => {
        if (prev.mode !== "resize") return prev;
        if (prev.edge === "left") {
          return { ...prev, startSlot: Math.min(slot, prev.endSlot - 1) };
        } else {
          return { ...prev, endSlot: Math.max(slot, prev.startSlot + 1) };
        }
      });
    }
  }, [drag.mode, getSlotFromX, getRoomFromY]);

  const handleMouseUp = useCallback(() => {
    if (drag.mode === "create") {
      const s = Math.min(drag.startSlot, drag.endSlot);
      const e = Math.max(drag.startSlot, drag.endSlot);
      if (e > s) {
        onCreateRequest(drag.roomId, slotToTime(s), slotToTime(e));
      }
    } else if (drag.mode === "move") {
      if (drag.currentRoomId !== drag.originRoomId) {
        onMoveReservation(drag.reservationId, drag.currentRoomId);
      }
    } else if (drag.mode === "resize") {
      onResizeReservation(
        drag.reservationId,
        slotToTime(drag.startSlot),
        slotToTime(drag.endSlot),
      );
    }
    setDrag({ mode: "idle" });
  }, [drag, onCreateRequest, onMoveReservation, onResizeReservation]);

  const handleBlockDragStart = useCallback((reservationId: string, roomId: string) => {
    setDrag({ mode: "move", reservationId, originRoomId: roomId, currentRoomId: roomId, offsetSlots: 0 });
  }, []);

  const handleBlockResizeStart = useCallback((reservationId: string, edge: "left" | "right", reservation: RoomReservation) => {
    setDrag({
      mode: "resize",
      reservationId,
      edge,
      startSlot: timeToSlot(reservation.start_time),
      endSlot: timeToSlot(reservation.end_time),
    });
  }, []);

  // 시간 헤더 생성
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  return (
    <div
      ref={gridRef}
      className="select-none overflow-x-auto rounded-lg border bg-white"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 시간 헤더 */}
      <div className="flex border-b bg-slate-50" style={{ minWidth: 900 }}>
        <div className="shrink-0 border-r px-3 py-2" style={{ width: ROOM_LABEL_WIDTH }} />
        {hours.map((h) => (
          <div
            key={h}
            className="flex-1 border-r py-2 text-center text-xs text-slate-500"
            style={{ minWidth: (900 - ROOM_LABEL_WIDTH) / (END_HOUR - START_HOUR) }}
          >
            {String(h).padStart(2, "0")}:00
          </div>
        ))}
      </div>

      {/* 회의실 행 */}
      {ROOMS.map((room) => {
        const roomReservations = reservations.filter((r) => r.room_id === room.id);

        // 생성 드래그 하이라이트
        let createHighlight: { left: string; width: string } | null = null;
        if (drag.mode === "create" && drag.roomId === room.id) {
          const s = Math.min(drag.startSlot, drag.endSlot);
          const e = Math.max(drag.startSlot, drag.endSlot);
          createHighlight = {
            left: `${(s / SLOT_COUNT) * 100}%`,
            width: `${((e - s) / SLOT_COUNT) * 100}%`,
          };
        }

        // 이동 중 하이라이트
        const isMoveTarget = drag.mode === "move" && drag.currentRoomId === room.id;

        return (
          <div
            key={room.id}
            className={`flex border-b last:border-b-0 ${isMoveTarget ? "bg-blue-50/50" : ""}`}
            style={{ minWidth: 900, minHeight: 52 }}
          >
            {/* 회의실 라벨 */}
            <div
              className="shrink-0 border-r bg-slate-50 px-3 py-2"
              style={{ width: ROOM_LABEL_WIDTH }}
            >
              <div className="text-sm font-semibold text-slate-900">{room.name}</div>
              <div className="text-xs text-slate-400">{room.capacity}명</div>
            </div>

            {/* 슬롯 영역 */}
            <div
              className="relative flex-1 cursor-crosshair"
              onMouseDown={(e) => {
                // 블록 위에서는 무시 (블록이 자체 처리)
                if ((e.target as HTMLElement).closest("[data-reservation]")) return;
                handleMouseDown(e, room.id);
              }}
            >
              {/* 30분 그리드 라인 */}
              {Array.from({ length: SLOT_COUNT }, (_, i) => (
                <div
                  key={i}
                  className={`absolute top-0 bottom-0 ${i % 2 === 0 ? "border-l border-slate-200" : "border-l border-slate-100"}`}
                  style={{ left: `${(i / SLOT_COUNT) * 100}%` }}
                />
              ))}

              {/* 생성 드래그 하이라이트 */}
              {createHighlight && (
                <div
                  className="absolute top-1 bottom-1 rounded border-2 border-dashed border-blue-400 bg-blue-100/40"
                  style={createHighlight}
                />
              )}

              {/* 예약 블록들 */}
              {roomReservations.map((r) => {
                let startSlot = timeToSlot(r.start_time);
                let endSlot = timeToSlot(r.end_time);

                // 리사이즈 중이면 임시 위치 사용
                if (drag.mode === "resize" && drag.reservationId === r.id) {
                  startSlot = drag.startSlot;
                  endSlot = drag.endSlot;
                }

                return (
                  <ReservationBlock
                    key={r.id}
                    reservation={r}
                    left={`${(startSlot / SLOT_COUNT) * 100}%`}
                    width={`${((endSlot - startSlot) / SLOT_COUNT) * 100}%`}
                    isDragging={drag.mode === "move" && drag.reservationId === r.id}
                    onClick={() => onClickReservation(r)}
                    onDragStart={() => handleBlockDragStart(r.id, r.room_id)}
                    onResizeStart={(edge) => handleBlockResizeStart(r.id, edge, r)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm --filter=part-time-supervisor check-types`

- [ ] **Step 3: 커밋**

```
feat(ui): TimelineGrid 컴포넌트 — 그리드 + 드래그/이동/리사이즈 로직
```

---

### Task 5: ReservationBlock 컴포넌트

**Files:**
- Create: `apps/part-time-supervisor/components/room-reservations/ReservationBlock.tsx`

- [ ] **Step 1: 예약 블록 컴포넌트 작성**

```typescript
"use client";

import type { RoomReservation } from "@/hooks/use-room-reservations-new";

type Props = {
  reservation: RoomReservation;
  left: string;
  width: string;
  isDragging: boolean;
  onClick: () => void;
  onDragStart: () => void;
  onResizeStart: (edge: "left" | "right") => void;
};

const TYPE_STYLES = {
  supervisor: {
    bg: "bg-blue-100",
    border: "border-l-blue-500",
    text: "text-blue-800",
    label: "감독관",
  },
  interview: {
    bg: "bg-indigo-100",
    border: "border-l-indigo-500",
    text: "text-indigo-800",
    label: "면접교육",
  },
} as const;

export function ReservationBlock({
  reservation,
  left,
  width,
  isDragging,
  onClick,
  onDragStart,
  onResizeStart,
}: Props) {
  const style = TYPE_STYLES[reservation.type];

  return (
    <div
      data-reservation={reservation.id}
      className={`group absolute top-1 bottom-1 flex items-center overflow-hidden rounded border-l-[3px] px-2 text-xs transition-shadow ${style.bg} ${style.border} ${style.text} ${isDragging ? "opacity-50 shadow-lg" : "cursor-grab hover:shadow-md"}`}
      style={{ left, width }}
      onMouseDown={(e) => {
        e.stopPropagation();
        // 리사이즈 핸들이 아니면 이동
        if (!(e.target as HTMLElement).dataset.resize) {
          onDragStart();
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* 좌측 리사이즈 핸들 */}
      <div
        data-resize="left"
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize opacity-0 group-hover:opacity-100"
        onMouseDown={(e) => {
          e.stopPropagation();
          onResizeStart("left");
        }}
      />

      {/* 내용 */}
      <span className="truncate font-medium">
        {style.label}{reservation.title ? ` - ${reservation.title}` : ""}
      </span>

      {/* 우측 리사이즈 핸들 */}
      <div
        data-resize="right"
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize opacity-0 group-hover:opacity-100"
        onMouseDown={(e) => {
          e.stopPropagation();
          onResizeStart("right");
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```
feat(ui): ReservationBlock 컴포넌트 — 블록 표시 + 리사이즈 핸들
```

---

### Task 6: ReservationDialog 컴포넌트 — 예약 생성/수정

**Files:**
- Create: `apps/part-time-supervisor/components/room-reservations/ReservationDialog.tsx`

- [ ] **Step 1: Dialog 컴포넌트 작성**

```typescript
"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "@repo/ui/src/sonner";
import { useMembers } from "@/hooks/use-members";
import { useCreateRoomReservation, useUpdateRoomReservation, useDeleteRoomReservation } from "@/hooks/use-room-reservation-new-mutations";
import { getRoomById } from "@/lib/room-constants";
import type { RoomReservation } from "@/hooks/use-room-reservations-new";

type Props = {
  open: boolean;
  onClose: () => void;
  date: string;
  // 신규 생성 시
  roomId?: string;
  startTime?: string;
  endTime?: string;
  // 수정 시
  reservation?: RoomReservation;
};

export function ReservationDialog({ open, onClose, date, roomId, startTime, endTime, reservation }: Props) {
  const isEdit = !!reservation;
  const { data: members } = useMembers();
  const createMutation = useCreateRoomReservation();
  const updateMutation = useUpdateRoomReservation();
  const deleteMutation = useDeleteRoomReservation();

  const [type, setType] = useState<"supervisor" | "interview">("supervisor");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [ccMembers, setCcMembers] = useState<string[]>([]);
  const [ccSearch, setCcSearch] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (reservation) {
      setType(reservation.type);
      setTitle(reservation.title ?? "");
      setContent(reservation.content ?? "");
      setCcMembers(reservation.cc_members ?? []);
    } else {
      setType("supervisor");
      setTitle("");
      setContent("");
      setCcMembers([]);
    }
    setCcSearch("");
    setShowDeleteConfirm(false);
  }, [reservation, open]);

  const effectiveRoomId = reservation?.room_id ?? roomId ?? "";
  const effectiveStart = reservation?.start_time?.slice(0, 5) ?? startTime ?? "";
  const effectiveEnd = reservation?.end_time?.slice(0, 5) ?? endTime ?? "";
  const room = getRoomById(effectiveRoomId);

  const filteredMembers = (members ?? []).filter(
    (m) =>
      !ccMembers.includes(m.full_name) &&
      m.full_name.includes(ccSearch),
  );

  const handleSubmit = async () => {
    try {
      if (isEdit) {
        const res = await updateMutation.mutateAsync({
          id: reservation!.id,
          type,
          title: title || null,
          content: content || null,
          cc_members: ccMembers,
        });
        if (res.warning) toast.warning("해당 시간에 다른 예약이 있습니다.");
        else toast.success("수정되었습니다.");
      } else {
        const res = await createMutation.mutateAsync({
          room_id: effectiveRoomId,
          date,
          start_time: effectiveStart,
          end_time: effectiveEnd,
          type,
          title: title || undefined,
          content: content || undefined,
          cc_members: ccMembers,
        });
        if (res.warning) toast.warning("해당 시간에 다른 예약이 있습니다. 예약은 생성되었습니다.");
        else toast.success("예약이 생성되었습니다.");
      }
      onClose();
    } catch {
      toast.error(isEdit ? "수정에 실패했습니다." : "예약 생성에 실패했습니다.");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(reservation!.id);
      toast.success("삭제되었습니다.");
      onClose();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEdit ? "예약 수정" : "회의실 예약"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* 유형 */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">유형</label>
            <div className="flex gap-2">
              {(["supervisor", "interview"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    type === t
                      ? t === "supervisor"
                        ? "bg-blue-100 text-blue-700 ring-2 ring-blue-400"
                        : "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-400"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {t === "supervisor" ? "감독관" : "면접교육"}
                </button>
              ))}
            </div>
          </div>

          {/* 회의실 / 시간 */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">회의실</label>
              <div className="rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {room?.name ?? effectiveRoomId}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">시작</label>
              <div className="rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {effectiveStart}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-500">종료</label>
              <div className="rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {effectiveEnd}
              </div>
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예약 제목"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>

          {/* 참조자 */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">참조자</label>
            <div className="rounded-lg border px-3 py-2">
              <div className="mb-1 flex flex-wrap gap-1">
                {ccMembers.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                  >
                    {name}
                    <button onClick={() => setCcMembers((prev) => prev.filter((n) => n !== name))} className="text-slate-400 hover:text-slate-600">
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={ccSearch}
                onChange={(e) => setCcSearch(e.target.value)}
                placeholder="직원 검색..."
                className="w-full border-none bg-transparent py-0.5 text-sm outline-none"
              />
              {ccSearch && filteredMembers.length > 0 && (
                <div className="mt-1 max-h-32 overflow-y-auto border-t pt-1">
                  {filteredMembers.slice(0, 8).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setCcMembers((prev) => [...prev, m.full_name]);
                        setCcSearch("");
                      }}
                      className="block w-full rounded px-2 py-1 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {m.full_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 내용 */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="예약 목적이나 메모를 입력하세요..."
              rows={3}
              className="w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </div>
        </div>

        {/* 버튼 */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            {isEdit && !showDeleteConfirm && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                삭제
              </button>
            )}
            {isEdit && showDeleteConfirm && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-500">정말 삭제?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700"
                >
                  확인
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-lg border px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
                >
                  취소
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "저장 중..."
                : isEdit
                  ? "수정"
                  : "예약"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크 + 커밋**

```
feat(ui): ReservationDialog — 예약 생성/수정/삭제 Dialog
```

---

### Task 7: 페이지 조합 — room-assignments/page.tsx 교체

**Files:**
- Modify: `apps/part-time-supervisor/app/(dashboard)/room-assignments/page.tsx`

- [ ] **Step 1: 페이지 교체**

기존 페이지를 백업(rename) 후 새 페이지 작성:

```typescript
"use client";

import { useState, useCallback } from "react";
import { formatDate } from "@repo/utils";
import { useRoomReservations } from "@/hooks/use-room-reservations-new";
import { useUpdateRoomReservation } from "@/hooks/use-room-reservation-new-mutations";
import { TimelineGrid } from "@/components/room-reservations/TimelineGrid";
import { ReservationDialog } from "@/components/room-reservations/ReservationDialog";
import { toast } from "@repo/ui/src/sonner";
import type { RoomReservation } from "@/hooks/use-room-reservations-new";

export default function RoomAssignmentsPage() {
  const today = formatDate(new Date(), "YYYY-MM-DD");
  const [date, setDate] = useState(today);
  const { data: reservations, isLoading } = useRoomReservations(date);
  const updateMutation = useUpdateRoomReservation();

  // Dialog 상태
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogProps, setDialogProps] = useState<{
    roomId?: string;
    startTime?: string;
    endTime?: string;
    reservation?: RoomReservation;
  }>({});

  const handleDateChange = (direction: -1 | 1) => {
    const d = new Date(date);
    d.setDate(d.getDate() + direction);
    setDate(formatDate(d, "YYYY-MM-DD"));
  };

  const handleCreateRequest = useCallback((roomId: string, startTime: string, endTime: string) => {
    setDialogProps({ roomId, startTime, endTime });
    setDialogOpen(true);
  }, []);

  const handleMoveReservation = useCallback(async (id: string, roomId: string) => {
    try {
      const res = await updateMutation.mutateAsync({ id, room_id: roomId });
      if (res.warning) toast.warning("이동한 시간에 다른 예약이 있습니다.");
    } catch {
      toast.error("이동에 실패했습니다.");
    }
  }, [updateMutation]);

  const handleResizeReservation = useCallback(async (id: string, startTime: string, endTime: string) => {
    try {
      const res = await updateMutation.mutateAsync({ id, start_time: startTime, end_time: endTime });
      if (res.warning) toast.warning("변경된 시간에 다른 예약이 있습니다.");
    } catch {
      toast.error("시간 변경에 실패했습니다.");
    }
  }, [updateMutation]);

  const handleClickReservation = useCallback((reservation: RoomReservation) => {
    setDialogProps({ reservation });
    setDialogOpen(true);
  }, []);

  // 날짜 표시 (요일 포함)
  const dateObj = new Date(date + "T00:00:00");
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const displayDate = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 (${dayNames[dateObj.getDay()]})`;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <div className="flex h-10 items-center gap-2 rounded-lg border bg-white px-3">
          <button onClick={() => handleDateChange(-1)} className="text-slate-400 hover:text-slate-600">&larr;</button>
          <span className="min-w-[180px] text-center font-medium text-slate-900">{displayDate}</span>
          <button onClick={() => handleDateChange(1)} className="text-slate-400 hover:text-slate-600">&rarr;</button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-200" /> 감독관
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-200" /> 면접교육
          </span>
        </div>
      </div>

      {/* 타임라인 */}
      {isLoading ? (
        <div className="flex h-60 items-center justify-center text-slate-400">불러오는 중...</div>
      ) : (
        <TimelineGrid
          reservations={reservations ?? []}
          onCreateRequest={handleCreateRequest}
          onMoveReservation={handleMoveReservation}
          onResizeReservation={handleResizeReservation}
          onClickReservation={handleClickReservation}
        />
      )}

      {/* 예약 Dialog */}
      <ReservationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        date={date}
        {...dialogProps}
      />
    </div>
  );
}
```

- [ ] **Step 2: 기존 room-assignments 관련 import 정리**

기존 페이지가 import하던 컴포넌트들은 삭제하지 않고 유지 (다른 곳에서 사용 가능). 새 페이지는 새 컴포넌트만 사용.

- [ ] **Step 3: 타입 체크**

Run: `pnpm --filter=part-time-supervisor check-types`

- [ ] **Step 4: 커밋**

```
feat(ui): 회의실 배정 페이지 타임라인 UI로 교체
```

---

### Task 8: 통합 테스트 + 마무리

- [ ] **Step 1: 개발 서버 실행 및 수동 검증**

Run: `pnpm dev:part-time-supervisor`

검증 항목:
1. `/room-assignments` 접속 → 타임라인 그리드 렌더링
2. 날짜 네비게이션 작동
3. 빈 영역 드래그 → Dialog 오픈 → 예약 생성
4. 예약 블록 클릭 → 수정/삭제
5. 예약 블록 다른 행으로 드래그 → 회의실 변경
6. 예약 블록 좌/우 가장자리 드래그 → 시간 변경
7. 참조자 검색 + 멀티셀렉트 동작

- [ ] **Step 2: 빌드 확인**

Run: `pnpm --filter=part-time-supervisor build 2>&1 | tail -10`
Expected: 빌드 성공

- [ ] **Step 3: 최종 커밋**

```
feat: 회의실 예약 타임라인 리디자인 완료
```
