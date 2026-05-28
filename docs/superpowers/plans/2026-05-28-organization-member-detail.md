# Organization Member Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build an admin `/organization/members/[id]` page that shows basic member details, current operational summaries, and RBAC-gated sensitive information.

**Architecture:** Reuse `GET /api/members/[id]` for non-sensitive member data, add a focused `GET /api/members/[id]/overview` API for current summaries, and keep sensitive data behind the existing `POST /api/members/[id]/sensitive` audit-logged endpoint. The page is a client component under the admin dashboard route and `/organization` links to it from member names while preserving explicit edit actions.

**Tech Stack:** Next.js App Router, TypeScript, React Query, Supabase service client, existing admin RBAC helpers, `@repo/ui` components, Tailwind CSS.

---

## File Structure

- Create `apps/admin/app/api/members/[id]/overview/route.ts`
  - Server-only overview aggregation for status, leave, attendance, and points summaries.
- Create `apps/admin/app/(dashboard)/organization/members/[id]/page.tsx`
  - Client route page that fetches member detail, overview, session, and sensitive fields on demand.
- Modify `apps/admin/components/MemberStatusView.tsx`
  - Change member-name click from edit dialog to detail navigation.
  - Add an explicit edit icon button in the row.
- Modify `apps/admin/lib/query-keys.ts`
  - Add `members.overview(id)` and `members.sensitive(id)` query keys.
- Modify `apps/admin/components/Header.tsx`
  - Add dynamic title matching for `/organization/members/*`.
- Optional test helper: use manual API/page smoke because this repo currently has typecheck but no colocated admin test suite.

## Task 1: Add Query Keys And Overview API

**Files:**
- Modify: `apps/admin/lib/query-keys.ts`
- Create: `apps/admin/app/api/members/[id]/overview/route.ts`

- [x] **Step 1: Add member overview query keys**

In `apps/admin/lib/query-keys.ts`, extend `members`:

```ts
members: {
  all: ["members"] as const,
  active: ["members", { excludeStatus: true }] as const,
  detail: (id: string) => ["members", id] as const,
  overview: (id: string) => ["members", id, "overview"] as const,
  sensitive: (id: string) => ["members", id, "sensitive"] as const,
},
```

- [x] **Step 2: Create overview API route**

Create `apps/admin/app/api/members/[id]/overview/route.ts` with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { hasEffectiveAdminPermission } from "@/lib/rbac-server";
import { createServiceClient } from "@/lib/supabase/server";

function currentPeriod(now = new Date()) {
  const year = now.getFullYear();
  const half = now.getMonth() + 1 <= 6 ? "H1" : "H2";
  return `${year}-${half}`;
}

function monthRange(year: number, month: number) {
  const padded = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${year}-${padded}-01`,
    end: `${year}-${padded}-${String(lastDay).padStart(2, "0")}`,
  };
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdminPermission("members:read");
    const supabase = createServiceClient();
    const { id } = await params;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const range = monthRange(year, month);
    const period = currentPeriod(now);

    const [canLeave, canAttendance, canPoints, canMeal] = await Promise.all([
      hasEffectiveAdminPermission(session, "leave:read"),
      hasEffectiveAdminPermission(session, "attendance:read"),
      hasEffectiveAdminPermission(session, "points:read"),
      hasEffectiveAdminPermission(session, "meal:read"),
    ]);

    const { data: statusRow, error: statusError } = await supabase
      .from("member_current_status")
      .select("current_status,status_start_date,status_end_date,status_note")
      .eq("member_id", id)
      .single();

    if (statusError && statusError.code !== "PGRST116") {
      return NextResponse.json({ error: "Failed to fetch current status" }, { status: 500 });
    }

    const [leaveResult, attendanceResult, pointsResult] = await Promise.all([
      canLeave
        ? supabase
            .from("dayoffs")
            .select("id, approver_id, approved_at, leave_type:leave_types(deduction_amount)")
            .eq("target_id", id)
            .eq("is_deleted", false)
            .gte("leave_date", `${year}-01-01`)
            .lte("leave_date", `${year}-12-31`)
        : Promise.resolve({ data: null, error: null }),
      canAttendance
        ? supabase
            .from("attendance_records")
            .select("id, status, check_in_at")
            .eq("member_id", id)
            .gte("date", range.start)
            .lte("date", range.end)
        : Promise.resolve({ data: null, error: null }),
      canPoints || canMeal
        ? supabase
            .from("budget_summary")
            .select("type,total_amount,used_amount,remaining_amount")
            .eq("member_id", id)
            .eq("period", period)
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (leaveResult.error || attendanceResult.error || pointsResult.error) {
      return NextResponse.json({ error: "Failed to fetch member overview" }, { status: 500 });
    }

    const leaveRows = leaveResult.data || [];
    const attendanceRows = attendanceResult.data || [];
    const pointRows = pointsResult.data || [];
    const activity = pointRows.find((row: any) => row.type === "활동비");
    const welfare = pointRows.find((row: any) => row.type !== "활동비");

    return NextResponse.json({
      currentStatus: {
        status: statusRow?.current_status ?? null,
        startDate: statusRow?.status_start_date ?? null,
        endDate: statusRow?.status_end_date ?? null,
        note: statusRow?.status_note ?? null,
      },
      leave: canLeave
        ? {
            year,
            usedDays: leaveRows.reduce(
              (sum: number, row: any) =>
                sum + toNumber(Array.isArray(row.leave_type) ? row.leave_type[0]?.deduction_amount : row.leave_type?.deduction_amount || 1),
              0,
            ),
            approvedCount: leaveRows.filter((row: any) => row.approver_id || row.approved_at).length,
            pendingCount: leaveRows.filter((row: any) => !row.approver_id && !row.approved_at).length,
          }
        : null,
      attendance: canAttendance
        ? {
            year,
            month,
            checkedInDays: attendanceRows.filter((row: any) => row.check_in_at).length,
            lateCount: attendanceRows.filter((row: any) => row.status === "late").length,
            absentCount: attendanceRows.filter((row: any) => row.status === "absent").length,
          }
        : null,
      points: canPoints || canMeal
        ? {
            period,
            mealUsed: canMeal ? toNumber(activity?.used_amount) : 0,
            welfareUsed: canPoints ? toNumber(welfare?.used_amount) : 0,
            mealBudget: canMeal ? toNumber(activity?.total_amount) : 0,
            welfareBudget: canPoints ? toNumber(welfare?.total_amount) : 0,
          }
        : null,
      permissions: {
        leave: canLeave,
        attendance: canAttendance,
        points: canPoints,
        meal: canMeal,
      },
    });
  } catch (error) {
    console.error("Member overview API error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "Unauthorized" }, { status: authStatus });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [x] **Step 3: Verify typecheck for the new API**

Run: `pnpm --filter admin check-types`

Expected: TypeScript accepts the new route or reports only actionable issues introduced by this task.

## Task 2: Build Member Detail Page

**Files:**
- Create: `apps/admin/app/(dashboard)/organization/members/[id]/page.tsx`

- [x] **Step 1: Create client detail page**

Create `apps/admin/app/(dashboard)/organization/members/[id]/page.tsx`. It must:

- read `id` from `useParams`
- fetch `/api/members/${id}`
- fetch `/api/members/${id}/overview`
- fetch `/api/auth/session`
- render basic info and overview cards
- show sensitive fields only after `POST /api/members/${id}/sensitive`

- [x] **Step 2: Implement sensitive information dialog**

Use existing `Dialog`, `Textarea`, `Button`, and `Badge` components. Require a non-empty reason before calling the sensitive endpoint. Keep returned sensitive fields in local React state only.

- [x] **Step 3: Add section states**

For each overview section, render one of:

- actual values when data exists
- `권한 없음` when `permissions.<section>` is false
- `등록된 데이터가 없습니다` when allowed but data is empty
- `요약 정보를 불러오지 못했습니다` when the overview request fails

- [x] **Step 4: Verify page compiles**

Run: `pnpm --filter admin check-types`

Expected: no new TypeScript errors from the page.

## Task 3: Wire `/organization` Table Navigation

**Files:**
- Modify: `apps/admin/components/MemberStatusView.tsx`

- [x] **Step 1: Import `Link` and `ExternalLink` or `Pencil` icon usage**

Add a Next.js `Link` import. Keep existing `Pencil` edit affordance.

- [x] **Step 2: Change name click behavior**

Replace the current name button:

```tsx
<button onClick={() => handleEditMemberOpen(row)} ...>
  {row.full_name}
</button>
```

with a `Link`:

```tsx
<Link
  href={`/organization/members/${row.member_id}`}
  className="text-slate-800 hover:text-slate-900 hover:underline"
  title="인원 상세 보기"
>
  {row.full_name}
</Link>
```

Guard missing `row.member_id` by rendering plain text.

- [x] **Step 3: Add explicit edit action**

In the trailing action cell, always render a pencil button for rows with `member_id`. Keep the existing delete button for `퇴사` rows next to it.

- [x] **Step 4: Verify navigation compile**

Run: `pnpm --filter admin check-types`

Expected: no new TypeScript errors.

## Task 4: Add Dynamic Header Title

**Files:**
- Modify: `apps/admin/components/Header.tsx`

- [x] **Step 1: Add dynamic path fallback**

After `const pathname = usePathname()`, resolve the title for member detail routes:

```ts
const currentPage =
  pathname.startsWith("/organization/members/")
    ? {
        title: "조직원 상세",
        subtitle: "조직원의 기본 정보와 현재 운영 요약을 확인합니다",
      }
    : pageTitles[pathname] || pageTitles["/"];
```

Keep the rest of the header unchanged.

- [x] **Step 2: Verify header compile**

Run: `pnpm --filter admin check-types`

Expected: no new TypeScript errors.

## Task 5: Final Verification And Commit

**Files:**
- Verify all changed files.

- [x] **Step 1: Run typecheck**

Run: `pnpm --filter admin check-types`

Expected: pass.

- [x] **Step 2: Run diff whitespace check**

Run: `git diff --check`

Expected: no output.

- [x] **Step 3: Review sensitive field boundary**

Run:

```bash
rg -n "birth_date|phone|passport_number" apps/admin/app/api/members apps/admin/app/'(dashboard)'/organization/members
```

Expected: sensitive fields appear only in the existing sensitive API and the client state that renders data after `POST /api/members/[id]/sensitive`; they do not appear in the overview API response.

- [x] **Step 4: Commit only this feature**

Stage only:

```bash
git add \
  apps/admin/app/api/members/[id]/overview/route.ts \
  apps/admin/app/(dashboard)/organization/members/[id]/page.tsx \
  apps/admin/components/MemberStatusView.tsx \
  apps/admin/components/Header.tsx \
  apps/admin/lib/query-keys.ts \
  docs/superpowers/plans/2026-05-28-organization-member-detail.md
```

Commit:

```bash
git commit -m "feat(organization): 인원 상세 페이지를 추가한다"
```
