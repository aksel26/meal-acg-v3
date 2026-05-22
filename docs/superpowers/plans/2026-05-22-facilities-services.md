# Facilities Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three facilities workflows: personal locker assignment requests, parking registration link access, and admin company vehicle usage management.

**Architecture:** Keep the three features independently shippable while sharing existing admin/user app patterns. Locker requests get user and admin surfaces plus API-backed approval handling; parking registration is a user-side external link; company vehicle management is an admin CRUD/status table using dense internal-tool UI similar to existing work application and asset register pages.

**Tech Stack:** Next.js App Router, React client components, Supabase Postgres, TypeScript, TanStack Query, Tailwind, existing `@repo/ui` controls, lucide-react icons.

---

## Scope Check

This spec contains three independent subsystems. Implement in the order below so each task produces working software on its own:

1. Parking registration link: smallest, user-only navigation change.
2. Locker management: user request + admin processing workflow.
3. Company vehicle management: admin-only record management table.

Do not couple vehicle management to locker requests. Do not make parking registration a database feature unless a future requirement asks to store parking registrations inside this app.

## File Structure

- Create `supabase/migrations/20260522100000_facilities_services.sql`
  - Owns `lockers`, `locker_assignments`, `locker_requests`, and `company_vehicle_usages`.
- Create `apps/user/lib/facilities.ts`
  - Owns user-side locker types, validation, and query helpers.
- Create `apps/admin/lib/facilities.ts`
  - Owns admin-side locker and vehicle query helpers.
- Create `apps/user/app/api/lockers/route.ts`
  - Lists lockers and the current user's locker state.
- Create `apps/user/app/api/lockers/requests/route.ts`
  - Creates locker assignment or move requests.
- Create `apps/admin/app/api/lockers/route.ts`
  - Lists every locker with assignment and pending request counts.
- Create `apps/admin/app/api/lockers/[id]/route.ts`
  - Updates locker metadata and availability.
- Create `apps/admin/app/api/lockers/requests/route.ts`
  - Lists locker requests for admin processing.
- Create `apps/admin/app/api/lockers/requests/[id]/route.ts`
  - Approves or rejects locker requests.
- Create `apps/admin/app/api/company-vehicles/route.ts`
  - Lists and creates vehicle usage rows.
- Create `apps/admin/app/api/company-vehicles/[id]/route.ts`
  - Updates, approves, rejects, and edits vehicle usage rows.
- Create `apps/user/app/(content)/lockers/page.tsx`
  - User locker location map/list and request entry.
- Create `apps/user/components/facilities/UserLockerClient.tsx`
  - User-side locker filters, current assignment card, and request dialog.
- Create `apps/admin/app/(dashboard)/lockers/page.tsx`
  - Admin locker assignment/request management page.
- Create `apps/admin/components/facilities/AdminLockerClient.tsx`
  - Admin locker table, request processing, and locker edit dialog.
- Create `apps/admin/app/(dashboard)/company-vehicles/page.tsx`
  - Admin vehicle usage management page.
- Create `apps/admin/components/facilities/CompanyVehicleClient.tsx`
  - Admin vehicle filters, table, create/edit dialog, approve/reject controls.
- Modify `apps/user/components/Sidebar.tsx`
  - Adds `개인 사물함` and external `주차등록 요청` under `기타`.
- Modify `apps/user/app/components/Header.tsx`
  - Adds `/lockers` title.
- Modify `apps/admin/components/Sidebar.tsx`
  - Adds `개인 사물함 관리` and `사내 차량관리` under `기타`.
- Modify `apps/admin/components/Header.tsx`
  - Adds `/lockers` and `/company-vehicles` titles.
- Modify `docs/ia/user-sidebar-menu.md`, `docs/ia/user-app-ia.md`, `docs/ia/admin-sidebar-menu.md`, `docs/ia/admin-app-ia.md`
  - Records the new navigation entries and API ownership.

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260522100000_facilities_services.sql`

- [ ] **Step 1: Add the migration**

Create `supabase/migrations/20260522100000_facilities_services.sql` with:

```sql
CREATE TABLE IF NOT EXISTS public.lockers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  location_zone text NOT NULL,
  location_detail text NOT NULL,
  floor text,
  row_label text,
  column_label text,
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'assigned', 'disabled')),
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.lockers IS '사내 개인 사물함 위치 및 상태';
COMMENT ON COLUMN public.lockers.code IS '사물함 표시 번호 또는 코드';
COMMENT ON COLUMN public.lockers.location_zone IS '사물함 구역명';
COMMENT ON COLUMN public.lockers.location_detail IS '구체적인 위치 설명';

CREATE INDEX IF NOT EXISTS idx_lockers_location
  ON public.lockers (location_zone, floor, row_label, column_label);
CREATE INDEX IF NOT EXISTS idx_lockers_status
  ON public.lockers (status);

CREATE TABLE IF NOT EXISTS public.locker_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locker_id uuid NOT NULL REFERENCES public.lockers(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  assigned_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_locker_assignments_active_locker
  ON public.locker_assignments (locker_id)
  WHERE released_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_locker_assignments_active_member
  ON public.locker_assignments (member_id)
  WHERE released_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_locker_assignments_member
  ON public.locker_assignments (member_id, assigned_at DESC);

CREATE TABLE IF NOT EXISTS public.locker_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('assign', 'move')),
  preferred_locker_id uuid REFERENCES public.lockers(id) ON DELETE SET NULL,
  current_locker_id uuid REFERENCES public.lockers(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  processed_by uuid REFERENCES public.members(id) ON DELETE SET NULL,
  processed_at timestamptz,
  reject_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locker_requests_requester
  ON public.locker_requests (requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_locker_requests_status
  ON public.locker_requests (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.company_vehicle_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_at date NOT NULL DEFAULT current_date,
  requester_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  requester_name text NOT NULL,
  organization_name text,
  purpose text NOT NULL,
  passengers text,
  use_start_at timestamptz NOT NULL,
  use_end_at timestamptz NOT NULL,
  vehicle_type text NOT NULL,
  vehicle_name text NOT NULL,
  vehicle_capacity integer,
  has_hipass boolean NOT NULL DEFAULT false,
  approver_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  approver_name text NOT NULL DEFAULT '윤이나',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reject_reason text,
  departure_place text NOT NULL,
  arrival_place text NOT NULL,
  daily_distance_km numeric(8, 1),
  total_distance_km numeric(8, 1),
  edited_at timestamptz,
  reference_member_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_vehicle_usage_period_check CHECK (use_end_at > use_start_at)
);

COMMENT ON TABLE public.company_vehicle_usages IS '사내 차량 신청 내용 및 사용 내역';

CREATE INDEX IF NOT EXISTS idx_company_vehicle_usages_status
  ON public.company_vehicle_usages (status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_vehicle_usages_requester
  ON public.company_vehicle_usages (requester_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_vehicle_usages_period
  ON public.company_vehicle_usages (use_start_at, use_end_at);

CREATE OR REPLACE TRIGGER set_lockers_updated_at
  BEFORE UPDATE ON public.lockers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_locker_assignments_updated_at
  BEFORE UPDATE ON public.locker_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_locker_requests_updated_at
  BEFORE UPDATE ON public.locker_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_company_vehicle_usages_updated_at
  BEFORE UPDATE ON public.company_vehicle_usages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

- [ ] **Step 2: Apply migration locally**

Run:

```bash
pnpm supabase migration up
```

Expected: command exits `0` and the four new tables exist.

- [ ] **Step 3: Verify tables**

Run:

```bash
docker exec supabase_db_meal-v3 psql -U postgres -d postgres -c "\dt public.lockers" -c "\dt public.locker_assignments" -c "\dt public.locker_requests" -c "\dt public.company_vehicle_usages"
```

Expected output includes:

```text
public | lockers
public | locker_assignments
public | locker_requests
public | company_vehicle_usages
```

- [ ] **Step 4: Commit migration**

Run:

```bash
git add supabase/migrations/20260522100000_facilities_services.sql
git commit -m "feat: add facilities service schema"
```

## Task 2: User Parking Registration Link

**Files:**
- Modify: `apps/user/components/Sidebar.tsx`
- Modify: `docs/ia/user-sidebar-menu.md`
- Modify: `docs/ia/user-app-ia.md`

- [ ] **Step 1: Add an external parking menu item**

In `apps/user/components/Sidebar.tsx`, add `CarFront` to the `lucide-react` import and add this item under the existing `기타` group, immediately after `회의실 예약`:

```tsx
{
  id: "parking-registration",
  label: "주차등록 요청",
  href: process.env.NEXT_PUBLIC_PARKING_REGISTRATION_URL || "https://parking.acg.kr",
  icon: CarFront,
  external: true,
},
```

- [ ] **Step 2: Verify external link rendering path**

Run:

```bash
pnpm --filter user check-types
```

Expected: no new TypeScript errors mentioning `Sidebar.tsx`.

- [ ] **Step 3: Update IA docs**

In `docs/ia/user-sidebar-menu.md`, under `## 기타`, add:

```markdown
- 주차등록 요청: external `NEXT_PUBLIC_PARKING_REGISTRATION_URL`, fallback `https://parking.acg.kr`
```

In `docs/ia/user-app-ia.md`, update the 기타 업무 route list to include:

```markdown
- `주차등록 요청`: 외부 주차등록 요청 사이트로 이동. 앱 내부 데이터 저장 없음.
```

- [ ] **Step 4: Commit parking link**

Run:

```bash
git add apps/user/components/Sidebar.tsx docs/ia/user-sidebar-menu.md docs/ia/user-app-ia.md
git commit -m "feat(user): add parking registration link"
```

## Task 3: User Locker API And Page

**Files:**
- Create: `apps/user/lib/facilities.ts`
- Create: `apps/user/app/api/lockers/route.ts`
- Create: `apps/user/app/api/lockers/requests/route.ts`
- Create: `apps/user/app/(content)/lockers/page.tsx`
- Create: `apps/user/components/facilities/UserLockerClient.tsx`
- Modify: `apps/user/components/Sidebar.tsx`
- Modify: `apps/user/app/components/Header.tsx`

- [ ] **Step 1: Add user facilities library**

Create `apps/user/lib/facilities.ts` with:

```ts
import { createServiceClient } from "@/lib/supabase/client";
import type { AuthSession } from "@/lib/auth";

export type LockerStatus = "available" | "assigned" | "disabled";
export type LockerRequestType = "assign" | "move";
export type LockerRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LockerSummary {
  id: string;
  code: string;
  location_zone: string;
  location_detail: string;
  floor: string | null;
  row_label: string | null;
  column_label: string | null;
  status: LockerStatus;
  assigned_member_name: string | null;
  is_assigned_to_me: boolean;
}

export interface MyLockerState {
  lockers: LockerSummary[];
  myAssignment: LockerSummary | null;
  myPendingRequest: {
    id: string;
    request_type: LockerRequestType;
    preferred_locker_id: string | null;
    status: LockerRequestStatus;
    reason: string;
    created_at: string;
  } | null;
}

export function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function assertLockerRequestPayload(body: unknown) {
  const record = body as Record<string, unknown>;
  const requestType = normalizeText(record.requestType);
  const preferredLockerId = normalizeText(record.preferredLockerId) || null;
  const reason = normalizeText(record.reason);

  if (requestType !== "assign" && requestType !== "move") {
    throw new Error("요청 유형을 확인해주세요.");
  }
  if (!reason) {
    throw new Error("요청 사유를 입력해주세요.");
  }

  return { requestType, preferredLockerId, reason };
}

export async function listLockersForUser(session: AuthSession): Promise<MyLockerState> {
  const supabase = createServiceClient();
  if (!supabase) throw new Error("데이터베이스 연결 오류");

  const { data: lockers, error: lockerError } = await supabase
    .from("lockers")
    .select(`
      id,
      code,
      location_zone,
      location_detail,
      floor,
      row_label,
      column_label,
      status,
      assignment:locker_assignments!locker_assignments_locker_id_fkey(
        member_id,
        released_at,
        member:members!locker_assignments_member_id_fkey(full_name)
      )
    `)
    .order("location_zone", { ascending: true })
    .order("code", { ascending: true });

  if (lockerError) throw new Error("사물함 목록을 불러오지 못했습니다.");

  const summaries = (lockers || []).map((locker) => {
    const activeAssignment = Array.isArray(locker.assignment)
      ? locker.assignment.find((item) => item.released_at === null)
      : null;

    return {
      id: locker.id,
      code: locker.code,
      location_zone: locker.location_zone,
      location_detail: locker.location_detail,
      floor: locker.floor,
      row_label: locker.row_label,
      column_label: locker.column_label,
      status: locker.status,
      assigned_member_name: activeAssignment?.member?.full_name || null,
      is_assigned_to_me: activeAssignment?.member_id === session.memberId,
    } satisfies LockerSummary;
  });

  const myAssignment = summaries.find((locker) => locker.is_assigned_to_me) || null;

  const { data: pendingRequest } = await supabase
    .from("locker_requests")
    .select("id, request_type, preferred_locker_id, status, reason, created_at")
    .eq("requester_id", session.memberId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    lockers: summaries,
    myAssignment,
    myPendingRequest: pendingRequest || null,
  };
}
```

- [ ] **Step 2: Add locker list API**

Create `apps/user/app/api/lockers/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listLockersForUser } from "@/lib/facilities";

export async function GET() {
  try {
    const session = await requireAuth();
    const data = await listLockersForUser(session);
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/lockers error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "사물함 정보를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: Add locker request API**

Create `apps/user/app/api/lockers/requests/route.ts` with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/client";
import { assertLockerRequestPayload } from "@/lib/facilities";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "데이터베이스 연결 오류" }, { status: 500 });
    }

    const payload = assertLockerRequestPayload(await request.json());

    const { data: existingPending } = await supabase
      .from("locker_requests")
      .select("id")
      .eq("requester_id", session.memberId)
      .eq("status", "pending")
      .maybeSingle();

    if (existingPending) {
      return NextResponse.json({ error: "이미 처리 대기 중인 사물함 요청이 있습니다." }, { status: 409 });
    }

    const { data: currentAssignment } = await supabase
      .from("locker_assignments")
      .select("locker_id")
      .eq("member_id", session.memberId)
      .is("released_at", null)
      .maybeSingle();

    if (payload.requestType === "move" && !currentAssignment) {
      return NextResponse.json({ error: "이동 요청은 현재 배정된 사물함이 있을 때만 가능합니다." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("locker_requests")
      .insert({
        requester_id: session.memberId,
        request_type: payload.requestType,
        preferred_locker_id: payload.preferredLockerId,
        current_locker_id: currentAssignment?.locker_id || null,
        reason: payload.reason,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("Locker request create error:", error);
      return NextResponse.json({ error: "사물함 요청 등록 실패" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/lockers/requests error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "사물함 요청 중 오류가 발생했습니다." },
      { status: 400 },
    );
  }
}
```

- [ ] **Step 4: Add user page and client**

Create `apps/user/app/(content)/lockers/page.tsx` with:

```tsx
import { UserLockerClient } from "@/components/facilities/UserLockerClient";
import { requireAuth } from "@/lib/auth";
import { listLockersForUser } from "@/lib/facilities";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LockersPage() {
  const session = await requireAuth();
  const data = await listLockersForUser(session);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-[#111111]">개인 사물함</h1>
      </div>
      <UserLockerClient initialData={data} />
    </div>
  );
}
```

Create `apps/user/components/facilities/UserLockerClient.tsx` with a compact grid/list UI. The component must:

```tsx
"use client";

import { useMemo, useState } from "react";
import { DoorClosed, MoveRight, Search } from "lucide-react";
import { Button } from "@repo/ui/src/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/src/dialog";
import { Input } from "@repo/ui/src/input";
import { Textarea } from "@repo/ui/src/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/src/select";
import { toast } from "@repo/ui/src/sonner";
import type { LockerRequestType, MyLockerState } from "@/lib/facilities";

export function UserLockerClient({ initialData }: { initialData: MyLockerState }) {
  const [data, setData] = useState(initialData);
  const [keyword, setKeyword] = useState("");
  const [zone, setZone] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [requestType, setRequestType] = useState<LockerRequestType>(data.myAssignment ? "move" : "assign");
  const [preferredLockerId, setPreferredLockerId] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const zones = useMemo(
    () => Array.from(new Set(data.lockers.map((locker) => locker.location_zone))).sort((a, b) => a.localeCompare(b, "ko")),
    [data.lockers],
  );

  const filteredLockers = useMemo(() => {
    return data.lockers.filter((locker) => {
      if (zone !== "all" && locker.location_zone !== zone) return false;
      if (!keyword.trim()) return true;
      return [locker.code, locker.location_zone, locker.location_detail, locker.assigned_member_name]
        .filter(Boolean)
        .some((value) => value!.includes(keyword.trim()));
    });
  }, [data.lockers, keyword, zone]);

  async function refresh() {
    const response = await fetch(`/api/lockers?ts=${Date.now()}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "사물함 정보를 불러오지 못했습니다.");
    setData(payload);
  }

  async function submitRequest() {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/lockers/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType,
          preferredLockerId: preferredLockerId || null,
          reason,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "사물함 요청 등록 실패");
      toast.success("사물함 요청을 등록했습니다.");
      setDialogOpen(false);
      setReason("");
      setPreferredLockerId("");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "사물함 요청 등록 실패");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-slate-500">현재 배정</p>
            <p className="text-lg font-semibold text-slate-950">
              {data.myAssignment ? `${data.myAssignment.code} · ${data.myAssignment.location_detail}` : "배정된 사물함 없음"}
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} disabled={Boolean(data.myPendingRequest)}>
            {data.myPendingRequest ? "처리 대기 중" : data.myAssignment ? "이동 요청" : "배정 요청"}
          </Button>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4">
        <div className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)]">
          <Select value={zone} onValueChange={setZone}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 위치</SelectItem>
              {zones.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="번호, 위치, 사용자 검색" />
          </div>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {filteredLockers.map((locker) => (
            <button
              key={locker.id}
              type="button"
              onClick={() => setPreferredLockerId(locker.id)}
              className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:bg-white"
            >
              <DoorClosed className="mt-0.5 h-5 w-5 text-slate-500" />
              <span className="min-w-0">
                <span className="block font-semibold text-slate-950">{locker.code}</span>
                <span className="block text-sm text-slate-500">{locker.location_zone} · {locker.location_detail}</span>
                <span className="mt-1 block text-xs text-slate-400">{locker.assigned_member_name || "사용 가능"}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{requestType === "move" ? "사물함 이동 요청" : "사물함 배정 요청"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={requestType} onValueChange={(value) => setRequestType(value as LockerRequestType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="assign">배정 요청</SelectItem>
                <SelectItem value="move">이동 요청</SelectItem>
              </SelectContent>
            </Select>
            <Select value={preferredLockerId || "none"} onValueChange={(value) => setPreferredLockerId(value === "none" ? "" : value)}>
              <SelectTrigger><SelectValue placeholder="희망 사물함 선택" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">희망 사물함 없음</SelectItem>
                {data.lockers.map((locker) => <SelectItem key={locker.id} value={locker.id}>{locker.code} · {locker.location_detail}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="요청 사유" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button onClick={submitRequest} disabled={isSubmitting || !reason.trim()}>
              <MoveRight className="mr-2 h-4 w-4" />
              요청 등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 5: Add user navigation and header title**

In `apps/user/components/Sidebar.tsx`, add `DoorClosed` to the lucide import and add this item under `기타`, before `물품관리대장`:

```tsx
{
  id: "lockers",
  label: "개인 사물함",
  href: "/lockers",
  icon: DoorClosed,
},
```

In `apps/user/app/components/Header.tsx`, add:

```ts
"/lockers": "개인 사물함",
```

- [ ] **Step 6: Verify user feature**

Run:

```bash
pnpm --filter user check-types
```

Expected: no new TypeScript errors mentioning `facilities.ts`, `/api/lockers`, `UserLockerClient.tsx`, `Sidebar.tsx`, or `Header.tsx`.

- [ ] **Step 7: Commit user locker feature**

Run:

```bash
git add apps/user/lib/facilities.ts apps/user/app/api/lockers apps/user/app/'(content)'/lockers apps/user/components/facilities apps/user/components/Sidebar.tsx apps/user/app/components/Header.tsx
git commit -m "feat(user): add locker assignment requests"
```

## Task 4: Admin Locker Management

**Files:**
- Create: `apps/admin/lib/facilities.ts`
- Create: `apps/admin/app/api/lockers/route.ts`
- Create: `apps/admin/app/api/lockers/[id]/route.ts`
- Create: `apps/admin/app/api/lockers/requests/route.ts`
- Create: `apps/admin/app/api/lockers/requests/[id]/route.ts`
- Create: `apps/admin/app/(dashboard)/lockers/page.tsx`
- Create: `apps/admin/components/facilities/AdminLockerClient.tsx`
- Modify: `apps/admin/components/Sidebar.tsx`
- Modify: `apps/admin/components/Header.tsx`

- [ ] **Step 1: Add admin facilities query helpers**

Create `apps/admin/lib/facilities.ts` with exported functions:

```ts
import { createServiceClient } from "@/lib/supabase/server";

export type LockerRequestAction = "approved" | "rejected";

export async function listLockerAdminOverview() {
  const supabase = createServiceClient();
  const [{ data: lockers, error: lockersError }, { data: requests, error: requestsError }] = await Promise.all([
    supabase
      .from("lockers")
      .select(`
        *,
        assignment:locker_assignments!locker_assignments_locker_id_fkey(
          id,
          member_id,
          released_at,
          member:members!locker_assignments_member_id_fkey(id, full_name, team:teams!members_team_id_fkey(name))
        )
      `)
      .order("location_zone", { ascending: true })
      .order("code", { ascending: true }),
    supabase
      .from("locker_requests")
      .select(`
        *,
        requester:members!locker_requests_requester_id_fkey(id, full_name, team:teams!members_team_id_fkey(name)),
        preferred_locker:lockers!locker_requests_preferred_locker_id_fkey(id, code, location_detail),
        current_locker:lockers!locker_requests_current_locker_id_fkey(id, code, location_detail)
      `)
      .order("created_at", { ascending: false }),
  ]);

  if (lockersError) throw new Error("사물함 목록을 불러오지 못했습니다.");
  if (requestsError) throw new Error("사물함 요청 목록을 불러오지 못했습니다.");

  return { lockers: lockers || [], requests: requests || [] };
}
```

- [ ] **Step 2: Add admin list APIs**

Create `apps/admin/app/api/lockers/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { listLockerAdminOverview } from "@/lib/facilities";

export async function GET() {
  try {
    await requireAdminPermission("meal:read");
    return NextResponse.json(await listLockerAdminOverview());
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    console.error("GET /api/lockers error:", error);
    return NextResponse.json({ error: "사물함 관리 정보를 불러오지 못했습니다." }, { status: 500 });
  }
}
```

Create `apps/admin/app/api/lockers/requests/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { listLockerAdminOverview } from "@/lib/facilities";

export async function GET() {
  try {
    await requireAdminPermission("meal:read");
    const overview = await listLockerAdminOverview();
    return NextResponse.json(overview.requests);
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    console.error("GET /api/lockers/requests error:", error);
    return NextResponse.json({ error: "사물함 요청 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 3: Add admin request processing API**

Create `apps/admin/app/api/lockers/requests/[id]/route.ts` with a `PUT` handler that approves or rejects. On approval, release the requester's current active assignment, create a new active assignment for the chosen locker, mark the locker `assigned`, and mark the request `approved`. On rejection, update `status='rejected'` and require `rejectReason`.

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminPermission("meal:write");
    const { id } = await params;
    const body = await request.json();
    const status = normalizeText(body.status);
    const lockerId = normalizeText(body.lockerId);
    const rejectReason = normalizeText(body.rejectReason);
    const processorId = normalizeText(body.processorId) || null;
    const supabase = createServiceClient();

    const { data: lockerRequest, error: requestError } = await supabase
      .from("locker_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (requestError || !lockerRequest) {
      return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
    }
    if (lockerRequest.status !== "pending") {
      return NextResponse.json({ error: "이미 처리된 요청입니다." }, { status: 409 });
    }

    if (status === "rejected") {
      if (!rejectReason) {
        return NextResponse.json({ error: "반려 사유를 입력해주세요." }, { status: 400 });
      }
      const { error } = await supabase
        .from("locker_requests")
        .update({ status: "rejected", reject_reason: rejectReason, processed_by: processorId, processed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (status !== "approved") {
      return NextResponse.json({ error: "처리 상태를 확인해주세요." }, { status: 400 });
    }

    const targetLockerId = lockerId || lockerRequest.preferred_locker_id;
    if (!targetLockerId) {
      return NextResponse.json({ error: "배정할 사물함을 선택해주세요." }, { status: 400 });
    }

    const { data: occupied } = await supabase
      .from("locker_assignments")
      .select("id")
      .eq("locker_id", targetLockerId)
      .is("released_at", null)
      .maybeSingle();
    if (occupied) {
      return NextResponse.json({ error: "이미 배정된 사물함입니다." }, { status: 409 });
    }

    const now = new Date().toISOString();
    await supabase
      .from("locker_assignments")
      .update({ released_at: now })
      .eq("member_id", lockerRequest.requester_id)
      .is("released_at", null);

    const { error: assignmentError } = await supabase.from("locker_assignments").insert({
      locker_id: targetLockerId,
      member_id: lockerRequest.requester_id,
      assigned_by: processorId,
      memo: lockerRequest.reason,
    });
    if (assignmentError) throw assignmentError;

    await supabase.from("lockers").update({ status: "assigned" }).eq("id", targetLockerId);
    if (lockerRequest.current_locker_id) {
      await supabase.from("lockers").update({ status: "available" }).eq("id", lockerRequest.current_locker_id);
    }

    const { error: updateError } = await supabase
      .from("locker_requests")
      .update({ status: "approved", processed_by: processorId, processed_at: now })
      .eq("id", id);
    if (updateError) throw updateError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    console.error("PUT /api/lockers/requests/[id] error:", error);
    return NextResponse.json({ error: "사물함 요청 처리에 실패했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 4: Add admin page and client**

Create `apps/admin/app/(dashboard)/lockers/page.tsx`:

```tsx
import { AdminLockerClient } from "@/components/facilities/AdminLockerClient";
import { listLockerAdminOverview } from "@/lib/facilities";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLockersPage() {
  const overview = await listLockerAdminOverview();
  return <AdminLockerClient initialData={overview} />;
}
```

Create `apps/admin/components/facilities/AdminLockerClient.tsx` using the existing dense table pattern from `apps/admin/app/(dashboard)/work-applications/page.tsx`. The table columns must be:

```text
상태 / 사물함 번호 / 위치 / 현재 사용자 / 요청 유형 / 요청자 / 요청일 / 관리
```

The request processing buttons must call:

```ts
await fetch(`/api/lockers/requests/${request.id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: "approved", lockerId: selectedLockerId }),
});
```

and:

```ts
await fetch(`/api/lockers/requests/${request.id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: "rejected", rejectReason }),
});
```

- [ ] **Step 5: Add admin navigation and header title**

In `apps/admin/components/Sidebar.tsx`, add `DoorClosed` and `CarFront` to the lucide import. Under the existing `기타` label in the `비용 관리` group, add:

```tsx
{ name: "개인 사물함 관리", href: "/lockers", icon: DoorClosed, permission: "meal:read" },
{ name: "사내 차량관리", href: "/company-vehicles", icon: CarFront, permission: "meal:read" },
```

In `apps/admin/components/Header.tsx`, add:

```ts
"/lockers": {
  title: "개인 사물함 관리",
  subtitle: "사물함 위치, 배정 현황, 사용자 요청을 처리합니다.",
},
"/company-vehicles": {
  title: "사내 차량관리",
  subtitle: "사내 차량 신청 내용과 사용 내역을 관리합니다.",
},
```

- [ ] **Step 6: Verify admin locker feature**

Run:

```bash
pnpm --filter admin check-types
```

Expected: no new TypeScript errors mentioning `facilities.ts`, `/api/lockers`, `AdminLockerClient.tsx`, `Sidebar.tsx`, or `Header.tsx`.

- [ ] **Step 7: Commit admin locker feature**

Run:

```bash
git add apps/admin/lib/facilities.ts apps/admin/app/api/lockers apps/admin/app/'(dashboard)'/lockers apps/admin/components/facilities/AdminLockerClient.tsx apps/admin/components/Sidebar.tsx apps/admin/components/Header.tsx
git commit -m "feat(admin): manage locker assignments"
```

## Task 5: Admin Company Vehicle Management

**Files:**
- Create: `apps/admin/app/api/company-vehicles/route.ts`
- Create: `apps/admin/app/api/company-vehicles/[id]/route.ts`
- Create: `apps/admin/app/(dashboard)/company-vehicles/page.tsx`
- Create: `apps/admin/components/facilities/CompanyVehicleClient.tsx`
- Modify: `apps/admin/lib/facilities.ts`

- [ ] **Step 1: Add vehicle helper functions**

Append to `apps/admin/lib/facilities.ts`:

```ts
export type CompanyVehicleStatus = "pending" | "approved" | "rejected";

export interface CompanyVehiclePayload {
  requestedAt: string;
  requesterId: string | null;
  requesterName: string;
  organizationName: string;
  purpose: string;
  passengers: string;
  useStartAt: string;
  useEndAt: string;
  vehicleType: string;
  vehicleName: string;
  vehicleCapacity: number | null;
  hasHipass: boolean;
  approverId: string | null;
  approverName: string;
  status: CompanyVehicleStatus;
  rejectReason: string;
  departurePlace: string;
  arrivalPlace: string;
  dailyDistanceKm: number | null;
  totalDistanceKm: number | null;
  referenceMemberIds: string[];
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("숫자 입력값을 확인해주세요.");
  return parsed;
}

export function parseCompanyVehiclePayload(body: unknown): CompanyVehiclePayload {
  const record = body as Record<string, unknown>;
  const status = text(record.status) || "pending";
  if (status !== "pending" && status !== "approved" && status !== "rejected") {
    throw new Error("상태값을 확인해주세요.");
  }

  const payload: CompanyVehiclePayload = {
    requestedAt: text(record.requestedAt) || new Date().toISOString().slice(0, 10),
    requesterId: text(record.requesterId) || null,
    requesterName: text(record.requesterName),
    organizationName: text(record.organizationName),
    purpose: text(record.purpose),
    passengers: text(record.passengers),
    useStartAt: text(record.useStartAt),
    useEndAt: text(record.useEndAt),
    vehicleType: text(record.vehicleType),
    vehicleName: text(record.vehicleName),
    vehicleCapacity: nullableNumber(record.vehicleCapacity),
    hasHipass: Boolean(record.hasHipass),
    approverId: text(record.approverId) || null,
    approverName: text(record.approverName) || "윤이나",
    status,
    rejectReason: text(record.rejectReason),
    departurePlace: text(record.departurePlace),
    arrivalPlace: text(record.arrivalPlace),
    dailyDistanceKm: nullableNumber(record.dailyDistanceKm),
    totalDistanceKm: nullableNumber(record.totalDistanceKm),
    referenceMemberIds: Array.isArray(record.referenceMemberIds)
      ? record.referenceMemberIds.map(String).filter(Boolean)
      : [],
  };

  if (!payload.requesterName || !payload.purpose || !payload.useStartAt || !payload.useEndAt) {
    throw new Error("신청자, 사용목적, 사용 기간을 입력해주세요.");
  }
  if (!payload.vehicleType || !payload.vehicleName) {
    throw new Error("차량종류와 차량이름을 입력해주세요.");
  }
  if (!payload.departurePlace || !payload.arrivalPlace) {
    throw new Error("출발지와 도착지를 입력해주세요.");
  }
  if (payload.status === "rejected" && !payload.rejectReason) {
    throw new Error("반려 상태에는 반려사유가 필요합니다.");
  }

  return payload;
}

export async function listCompanyVehicleUsages() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("company_vehicle_usages")
    .select("*")
    .order("requested_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error("차량 사용 내역을 불러오지 못했습니다.");
  return data || [];
}
```

- [ ] **Step 2: Add vehicle APIs**

Create `apps/admin/app/api/company-vehicles/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { listCompanyVehicleUsages, parseCompanyVehiclePayload } from "@/lib/facilities";

export async function GET() {
  try {
    await requireAdminPermission("meal:read");
    return NextResponse.json(await listCompanyVehicleUsages());
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    console.error("GET /api/company-vehicles error:", error);
    return NextResponse.json({ error: "차량 사용 내역을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminPermission("meal:write");
    const payload = parseCompanyVehiclePayload(await request.json());
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("company_vehicle_usages")
      .insert({
        requested_at: payload.requestedAt,
        requester_id: payload.requesterId,
        requester_name: payload.requesterName,
        organization_name: payload.organizationName,
        purpose: payload.purpose,
        passengers: payload.passengers,
        use_start_at: payload.useStartAt,
        use_end_at: payload.useEndAt,
        vehicle_type: payload.vehicleType,
        vehicle_name: payload.vehicleName,
        vehicle_capacity: payload.vehicleCapacity,
        has_hipass: payload.hasHipass,
        approver_id: payload.approverId,
        approver_name: payload.approverName,
        status: payload.status,
        reject_reason: payload.rejectReason || null,
        departure_place: payload.departurePlace,
        arrival_place: payload.arrivalPlace,
        daily_distance_km: payload.dailyDistanceKm,
        total_distance_km: payload.totalDistanceKm,
        reference_member_ids: payload.referenceMemberIds,
      })
      .select()
      .single();
    if (error || !data) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    console.error("POST /api/company-vehicles error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "차량 사용 내역 등록 실패" },
      { status: 400 },
    );
  }
}
```

Create `apps/admin/app/api/company-vehicles/[id]/route.ts` with `PUT` using the same mapping as `POST` plus `edited_at: new Date().toISOString()`, and `DELETE` is not included in this release.

- [ ] **Step 3: Add vehicle page**

Create `apps/admin/app/(dashboard)/company-vehicles/page.tsx`:

```tsx
import { CompanyVehicleClient } from "@/components/facilities/CompanyVehicleClient";
import { listCompanyVehicleUsages } from "@/lib/facilities";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CompanyVehiclesPage() {
  const usages = await listCompanyVehicleUsages();
  return <CompanyVehicleClient initialUsages={usages} />;
}
```

- [ ] **Step 4: Add vehicle client**

Create `apps/admin/components/facilities/CompanyVehicleClient.tsx`. The desktop table must have these exact column headers:

```text
신청일 / 소속 / 신청자 / 사용목적 / 동승자 / 사용 기간 / 차량종류 / 차량이름(인승) / 하이패스 여부 / 승인자 / 상태 / 반려사유 / 출발-도착지 / 당일 주행거리 / 총 주행거리 / 편집일 / 참조자(공유) / 관리
```

The filter controls must include:

```text
상태 전체/대기/승인/반려
차량종류
신청자/소속/사용목적/차량이름 검색
```

The form submit must send:

```ts
await fetch(mode === "create" ? "/api/company-vehicles" : `/api/company-vehicles/${editingId}`, {
  method: mode === "create" ? "POST" : "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(form),
});
```

The default form state must use:

```ts
const defaultForm = {
  requestedAt: new Date().toISOString().slice(0, 10),
  requesterId: null,
  requesterName: "",
  organizationName: "",
  purpose: "",
  passengers: "",
  useStartAt: "",
  useEndAt: "",
  vehicleType: "회사차량",
  vehicleName: "",
  vehicleCapacity: "",
  hasHipass: false,
  approverId: null,
  approverName: "윤이나",
  status: "pending",
  rejectReason: "",
  departurePlace: "",
  arrivalPlace: "",
  dailyDistanceKm: "",
  totalDistanceKm: "",
  referenceMemberIds: [],
};
```

- [ ] **Step 5: Verify vehicle feature**

Run:

```bash
pnpm --filter admin check-types
```

Expected: no new TypeScript errors mentioning `company-vehicles`, `CompanyVehicleClient.tsx`, or `facilities.ts`.

- [ ] **Step 6: Commit vehicle management**

Run:

```bash
git add apps/admin/lib/facilities.ts apps/admin/app/api/company-vehicles apps/admin/app/'(dashboard)'/company-vehicles apps/admin/components/facilities/CompanyVehicleClient.tsx apps/admin/components/Sidebar.tsx apps/admin/components/Header.tsx
git commit -m "feat(admin): add company vehicle management"
```

## Task 6: IA Docs And Final Verification

**Files:**
- Modify: `docs/ia/admin-sidebar-menu.md`
- Modify: `docs/ia/admin-app-ia.md`
- Modify: `docs/ia/user-sidebar-menu.md`
- Modify: `docs/ia/user-app-ia.md`

- [ ] **Step 1: Update admin IA docs**

In `docs/ia/admin-sidebar-menu.md`, under `### 기타`, add:

```markdown
- 개인 사물함 관리: `/lockers`
- 사내 차량관리: `/company-vehicles`
```

In `docs/ia/admin-app-ia.md`, add a facilities section:

```markdown
### 시설/총무

- `/lockers`: 사물함 위치, 배정 현황, 사용자 배정/이동 요청 처리
- `/company-vehicles`: 사내 차량 신청 내용 및 사용 내역 관리
- 관련 API: `/api/lockers/*`, `/api/company-vehicles/*`
```

- [ ] **Step 2: Update user IA docs**

In `docs/ia/user-sidebar-menu.md`, under `## 기타`, ensure these rows exist:

```markdown
- 개인 사물함: `/lockers`
- 주차등록 요청: external `NEXT_PUBLIC_PARKING_REGISTRATION_URL`, fallback `https://parking.acg.kr`
```

In `docs/ia/user-app-ia.md`, add:

```markdown
- `/lockers`: 개인 사물함 위치 확인, 배정 요청, 이동 요청
- `주차등록 요청`: 외부 주차등록 요청 사이트로 이동
- 관련 API: `/api/lockers/*`
```

- [ ] **Step 3: Run final checks**

Run:

```bash
pnpm --filter user check-types
pnpm --filter admin check-types
git diff --check
```

Expected:

```text
No feature-local TypeScript errors.
git diff --check exits 0.
```

If global typecheck fails from known unrelated baseline issues, record the exact files in the final report and confirm no new errors reference the facilities files.

- [ ] **Step 4: Commit docs**

Run:

```bash
git add docs/ia/admin-sidebar-menu.md docs/ia/admin-app-ia.md docs/ia/user-sidebar-menu.md docs/ia/user-app-ia.md
git commit -m "docs: document facilities service navigation"
```

## Self-Review

- Spec coverage:
  - 개인 사물함 위치 표시: Task 3 user grid/list and Task 4 admin table.
  - 개인 사물함 이동/배정 요청: Task 3 request API and dialog.
  - 어드민 사물함 배정 정보 관리 및 요청 처리: Task 4 admin processing API/page.
  - 주차등록 요청 사이트 링크 이동: Task 2 external user sidebar item.
  - 사내 차량관리 전체 신청 내용 및 사용 내역 관리: Task 5 admin CRUD/status table.
  - Vehicle table columns: Task 5 lists every requested column and adds 관리 column for edit actions.
- Placeholder scan:
  - Every task names concrete files, commands, expected outcomes, and implementation content.
- Type consistency:
  - Locker request statuses are consistently `pending`, `approved`, `rejected`, `cancelled`.
  - Company vehicle statuses are consistently `pending`, `approved`, `rejected`.
  - Parking link env var is consistently `NEXT_PUBLIC_PARKING_REGISTRATION_URL`.
