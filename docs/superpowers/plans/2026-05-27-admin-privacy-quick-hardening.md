# Admin Privacy Quick Hardening Implementation Plan

> **For Claude:** Use `${SUPERPOWERS_SKILLS_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** Reduce accidental exposure of employee sensitive data in the admin app by narrowing API responses, adding audit logging for risky actions, and applying finer permissions to sensitive reads/downloads.

**Architecture:** Keep the existing `admin-session`, `requireAdmin()`, `requireAdminPermission()`, and service-role Supabase API route pattern. Add small shared privacy/audit helpers, then update the highest-risk admin API routes so list endpoints return only explicit fields and sensitive/download actions leave an audit trail.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Postgres migrations, existing admin RBAC in `apps/admin/lib/rbac.ts`, existing admin API routes under `apps/admin/app/api`.

---

## Source Documents

- Design spec: `docs/superpowers/specs/2026-05-27-admin-privacy-quick-hardening-design.md`
- Auth/RBAC: `apps/admin/lib/auth.ts`, `apps/admin/lib/rbac.ts`
- Supabase service client: `apps/admin/lib/supabase/server.ts`
- Current high-risk routes:
  - `apps/admin/app/api/members/route.ts`
  - `apps/admin/app/api/members/[id]/route.ts`
  - `apps/admin/app/api/organizations/[id]/tree/route.ts`
  - `apps/admin/app/api/export/member/route.ts`
  - `apps/admin/app/api/export/members-bulk/route.ts`
  - `apps/admin/app/api/export/excel/route.ts`
  - `apps/admin/app/api/export/usage-records/route.ts`

## Implementation Notes

- Do not add new dependencies.
- Do not touch unrelated dirty files in the worktree.
- Prefer explicit `select(...)` lists over `select("*")`.
- Do not log raw sensitive values in audit logs.
- Use Korean commit messages with Conventional Commit prefixes.
- Verification in this repo should prioritize:

```bash
pnpm --filter admin check-types
pnpm --filter admin build
git diff --check
```

If `pnpm --filter admin build` fails because of pre-existing unrelated issues, capture the first relevant error and confirm whether it references files changed by this plan.

---

## Task 1: Add Shared Privacy Field Helpers

**Files:**
- Create: `apps/admin/lib/privacy.ts`

**Step 1: Create a helper file before changing routes**

Create `apps/admin/lib/privacy.ts`:

```ts
export const MEMBER_LIST_SELECT = [
  "id",
  "login_id",
  "full_name",
  "role",
  "admin_role",
  "user_authority",
  "member_role",
  "team_id",
  "division_id",
  "organization_id",
  "position_id",
  "title_id",
  "intern_months",
  "teams(name)",
].join(", ");

export const MEMBER_DETAIL_SELECT = [
  "id",
  "login_id",
  "full_name",
  "role",
  "admin_role",
  "user_authority",
  "member_role",
  "email",
  "team_id",
  "division_id",
  "organization_id",
  "position_id",
  "title_id",
  "intern_months",
  "team:teams(name)",
  "position:positions(name)",
  "division:divisions(name)",
].join(", ");

export const MEMBER_SENSITIVE_SELECT = [
  "id",
  "full_name",
  "birth_date",
  "phone",
  "passport_number",
].join(", ");

export const ORGANIZATION_MEMBER_SELECT =
  "id, full_name, member_role, team_id, division_id, intern_months, position:positions(id, name), title:titles(id, name)";

export function maskEmail(value: string | null | undefined) {
  if (!value) return null;
  const [name, domain] = value.split("@");
  if (!name || !domain) return value;
  return `${name.slice(0, 2)}***@${domain}`;
}

export function maskPhone(value: string | null | undefined) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7) return "***";
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

export function assertNoSensitiveMemberFields(row: Record<string, unknown>) {
  const forbidden = ["password", "passport_number", "birth_date", "phone"];
  const leaked = forbidden.filter((field) => field in row);
  if (leaked.length > 0) {
    throw new Error(`Sensitive member fields leaked: ${leaked.join(", ")}`);
  }
}
```

**Step 2: Run type check**

Run:

```bash
pnpm --filter admin check-types
```

Expected: either success, or no new errors mentioning `apps/admin/lib/privacy.ts`.

**Step 3: Commit**

```bash
git add apps/admin/lib/privacy.ts
git commit -m "feat(admin): 개인정보 필드 헬퍼 추가"
```

---

## Task 2: Narrow Member And Organization API Responses

**Files:**
- Modify: `apps/admin/app/api/members/route.ts`
- Modify: `apps/admin/app/api/members/[id]/route.ts`
- Modify: `apps/admin/app/api/organizations/[id]/tree/route.ts`

**Step 1: Update `GET /api/members` to remove `members.*`**

In `apps/admin/app/api/members/route.ts`, add:

```ts
import { MEMBER_LIST_SELECT, assertNoSensitiveMemberFields } from "@/lib/privacy";
```

Replace:

```ts
let query = supabase.from("members").select("*, teams(name)");
```

with:

```ts
let query = supabase.from("members").select(MEMBER_LIST_SELECT);
```

After the `result` map, add a defensive check before returning:

```ts
result.forEach(assertNoSensitiveMemberFields);
```

**Step 2: Update `GET /api/members/[id]` to use explicit detail select**

In `apps/admin/app/api/members/[id]/route.ts`, add:

```ts
import { MEMBER_DETAIL_SELECT, assertNoSensitiveMemberFields } from "@/lib/privacy";
```

Replace:

```ts
.select("*, team:teams(name), position:positions(name), division:divisions(name)")
```

with:

```ts
.select(MEMBER_DETAIL_SELECT)
```

Before `return NextResponse.json(data);`, add:

```ts
assertNoSensitiveMemberFields(data as Record<string, unknown>);
```

**Step 3: Keep member create/update behavior intact**

Do not remove request body handling for `birthDate`, `phone`, or `passportNumber` in `POST /api/members`. This task only narrows default read responses.

**Step 4: Update organization tree member selects**

In `apps/admin/app/api/organizations/[id]/tree/route.ts`, add:

```ts
import { ORGANIZATION_MEMBER_SELECT } from "@/lib/privacy";
```

Replace both nested member selections:

```ts
members!members_team_id_fkey (id, full_name, member_role, email, birth_date, team_id, division_id, intern_months, position:positions(id, name), title:titles(id, name))
```

with:

```ts
members!members_team_id_fkey (${ORGANIZATION_MEMBER_SELECT})
```

Because Supabase select strings are plain strings, build the full select with a template literal:

```ts
.select(`
  *,
  divisions (
    *,
    teams (
      *,
      members!members_team_id_fkey (${ORGANIZATION_MEMBER_SELECT})
    )
  ),
  teams!teams_organization_id_fkey (
    *,
    members!members_team_id_fkey (${ORGANIZATION_MEMBER_SELECT})
  )
`)
```

Also replace the unassigned member select with:

```ts
.select(ORGANIZATION_MEMBER_SELECT)
```

**Step 5: Run verification**

```bash
pnpm --filter admin check-types
git diff --check
```

Expected: typecheck passes, or failures do not mention the modified files. `git diff --check` must pass.

**Step 6: Commit**

```bash
git add apps/admin/app/api/members/route.ts apps/admin/app/api/members/[id]/route.ts apps/admin/app/api/organizations/[id]/tree/route.ts apps/admin/lib/privacy.ts
git commit -m "fix(admin): 직원 기본 조회 민감정보 노출 축소"
```

---

## Task 3: Add Admin Audit Log Migration And Helper

**Files:**
- Create: `supabase/migrations/20260527110000_admin_audit_logs.sql`
- Modify: `apps/admin/lib/rbac.ts`
- Create: `apps/admin/lib/admin-audit.ts`

**Step 1: Add audit log migration**

Create `supabase/migrations/20260527110000_admin_audit_logs.sql`:

```sql
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.members(id) on delete set null,
  actor_name text,
  action text not null,
  target_type text not null,
  target_id text,
  target_label text,
  risk_level text not null default 'medium'
    check (risk_level in ('low', 'medium', 'high')),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  request_path text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_actor_created
  on public.admin_audit_logs(actor_id, created_at desc);

create index if not exists idx_admin_audit_logs_action_created
  on public.admin_audit_logs(action, created_at desc);

create index if not exists idx_admin_audit_logs_target
  on public.admin_audit_logs(target_type, target_id, created_at desc);

alter table public.admin_audit_logs enable row level security;

create policy "service_role_all" on public.admin_audit_logs
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

grant all on public.admin_audit_logs to service_role;

notify pgrst, 'reload schema';
```

**Step 2: Add audit read permission**

In `apps/admin/lib/rbac.ts`, append `"audit:read"` to `ADMIN_PERMISSIONS`.

Keep `REPRESENTATIVE_PERMISSIONS = ADMIN_PERMISSIONS`.

Leave `PNC_LEADER_PERMISSIONS` as the current filter so P&C team leaders receive `audit:read`.

Do not add `audit:read` to `PNC_MEMBER_PERMISSIONS`.

**Step 3: Add audit helper**

Create `apps/admin/lib/admin-audit.ts`:

```ts
import type { NextRequest } from "next/server";
import type { AuthSession } from "@/lib/supabase/types";
import { createServiceClient } from "@/lib/supabase/server";

export type AdminAuditRiskLevel = "low" | "medium" | "high";

type WriteAdminAuditLogInput = {
  session: AuthSession;
  request?: NextRequest;
  action: string;
  targetType: string;
  targetId?: string | null;
  targetLabel?: string | null;
  riskLevel?: AdminAuditRiskLevel;
  reason?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAdminAuditLog({
  session,
  request,
  action,
  targetType,
  targetId,
  targetLabel,
  riskLevel = "medium",
  reason,
  metadata = {},
}: WriteAdminAuditLogInput) {
  const supabase = createServiceClient();
  const forwardedFor = request?.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || request?.headers.get("x-real-ip");
  const userAgent = request?.headers.get("user-agent");

  const { error } = await supabase.from("admin_audit_logs").insert({
    actor_id: session.userId,
    actor_name: session.fullName,
    action,
    target_type: targetType,
    target_id: targetId || null,
    target_label: targetLabel || null,
    risk_level: riskLevel,
    reason: reason || null,
    metadata,
    request_path: request?.nextUrl.pathname || null,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
  });

  if (error) {
    console.error("Admin audit log write failed:", error);
    throw new Error("감사 로그 기록에 실패했습니다.");
  }
}
```

**Step 4: Run type check**

```bash
pnpm --filter admin check-types
git diff --check
```

Expected: no new type errors in `rbac.ts` or `admin-audit.ts`.

**Step 5: Commit**

```bash
git add supabase/migrations/20260527110000_admin_audit_logs.sql apps/admin/lib/rbac.ts apps/admin/lib/admin-audit.ts
git commit -m "feat(admin): 민감 접근 감사 로그 기반 추가"
```

---

## Task 4: Add Sensitive Member Read Endpoint

**Files:**
- Modify: `apps/admin/lib/rbac.ts`
- Create: `apps/admin/app/api/members/[id]/sensitive/route.ts`

**Step 1: Add sensitive member permissions**

In `apps/admin/lib/rbac.ts`, append to `ADMIN_PERMISSIONS`:

```ts
"members:sensitive:read",
"members:sensitive:write",
```

Do not add either permission to `PNC_MEMBER_PERMISSIONS`.

**Step 2: Create sensitive read API**

Create `apps/admin/app/api/members/[id]/sensitive/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { MEMBER_SENSITIVE_SELECT } from "@/lib/privacy";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdminPermission("members:sensitive:read");
    const supabase = createServiceClient();
    const { id } = await params;
    const reason = request.nextUrl.searchParams.get("reason")?.trim();

    if (!reason) {
      return NextResponse.json({ error: "사유를 입력해주세요." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("members")
      .select(MEMBER_SENSITIVE_SELECT)
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "직원을 찾을 수 없습니다." }, { status: 404 });
    }

    await writeAdminAuditLog({
      session,
      request,
      action: "member.sensitive_view",
      targetType: "member",
      targetId: id,
      targetLabel: data.full_name,
      riskLevel: "high",
      reason,
      metadata: {
        fields: ["birth_date", "phone", "passport_number"],
      },
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Member sensitive API error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: authStatus });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 3: Run verification**

```bash
pnpm --filter admin check-types
git diff --check
```

Expected: typecheck passes, or no new errors mention `members/[id]/sensitive/route.ts`, `rbac.ts`, `privacy.ts`, or `admin-audit.ts`.

**Step 4: Commit**

```bash
git add apps/admin/lib/rbac.ts apps/admin/app/api/members/[id]/sensitive/route.ts
git commit -m "feat(admin): 직원 민감정보 조회 감사 로그 추가"
```

---

## Task 5: Audit High-Risk Export APIs

**Files:**
- Modify: `apps/admin/lib/rbac.ts`
- Modify: `apps/admin/app/api/export/member/route.ts`
- Modify: `apps/admin/app/api/export/members-bulk/route.ts`
- Modify: `apps/admin/app/api/export/excel/route.ts`
- Modify: `apps/admin/app/api/export/usage-records/route.ts`

**Step 1: Add bulk export permission**

In `apps/admin/lib/rbac.ts`, append:

```ts
"export:bulk",
```

Do not add it to `PNC_MEMBER_PERMISSIONS`.

**Step 2: Require reason for bulk exports**

In `apps/admin/app/api/export/members-bulk/route.ts`, change the auth line to:

```ts
const session = await requireAdminPermission("export:bulk");
```

Read reason near the existing search params:

```ts
const reason = request.nextUrl.searchParams.get("reason")?.trim();
if (!reason) {
  return NextResponse.json({ error: "사유를 입력해주세요." }, { status: 400 });
}
```

After members are fetched and before generating the ZIP, call:

```ts
await writeAdminAuditLog({
  session,
  request,
  action: "export.members_bulk",
  targetType: "member",
  targetId: memberIds || "all",
  targetLabel: members.length === 1 ? members[0]?.full_name : `${members.length}명`,
  riskLevel: "high",
  reason,
  metadata: { year, half, memberCount: members.length },
});
```

Add the import:

```ts
import { writeAdminAuditLog } from "@/lib/admin-audit";
```

**Step 3: Log single member export**

In `apps/admin/app/api/export/member/route.ts`, change:

```ts
await requireAdminPermission("meal:export");
```

to:

```ts
const session = await requireAdminPermission("meal:export");
```

Read an optional reason:

```ts
const reason = searchParams.get("reason")?.trim() || "단일 직원 식대 내역 다운로드";
```

After the member is loaded and before workbook generation, call:

```ts
await writeAdminAuditLog({
  session,
  request,
  action: "export.member",
  targetType: "member",
  targetId: memberId,
  targetLabel: member.full_name,
  riskLevel: "medium",
  reason,
  metadata: { year, half },
});
```

**Step 4: Log generic Excel and usage-record exports**

In both `apps/admin/app/api/export/excel/route.ts` and `apps/admin/app/api/export/usage-records/route.ts`:

- Capture the admin session instead of discarding it.
- Add `writeAdminAuditLog`.
- Use action names `export.excel` and `export.usage_records`.
- Use `riskLevel: "high"` when the export contains multiple members or usage records.
- If the route already has date/year/month/period filters, include them in `metadata`.

Example pattern:

```ts
const session = await requireAdminPermission("meal:export");
const reason = request.nextUrl.searchParams.get("reason")?.trim() || "관리자 엑셀 다운로드";

await writeAdminAuditLog({
  session,
  request,
  action: "export.usage_records",
  targetType: "usage_records",
  targetLabel: "사용 내역",
  riskLevel: "high",
  reason,
  metadata: Object.fromEntries(request.nextUrl.searchParams.entries()),
});
```

If a route currently uses `requireAdmin()` and not `requireAdminPermission("meal:export")`, switch it to `requireAdminPermission("meal:export")`.

**Step 5: Run verification**

```bash
pnpm --filter admin check-types
git diff --check
```

Expected: no type errors in modified export routes.

**Step 6: Commit**

```bash
git add apps/admin/lib/rbac.ts apps/admin/app/api/export/member/route.ts apps/admin/app/api/export/members-bulk/route.ts apps/admin/app/api/export/excel/route.ts apps/admin/app/api/export/usage-records/route.ts
git commit -m "feat(admin): 엑셀 다운로드 감사 로그 추가"
```

---

## Task 6: Add Audit Log Read API

**Files:**
- Create: `apps/admin/app/api/admin-audit-logs/route.ts`

**Step 1: Create read-only audit log endpoint**

Create `apps/admin/app/api/admin-audit-logs/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthErrorStatus, requireAdminPermission } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export async function GET(request: NextRequest) {
  try {
    await requireAdminPermission("audit:read");
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(
      Number(searchParams.get("limit") || DEFAULT_LIMIT),
      MAX_LIMIT,
    );
    const action = searchParams.get("action");
    const targetType = searchParams.get("target_type");

    let query = supabase
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Number.isFinite(limit) ? limit : DEFAULT_LIMIT);

    if (action) query = query.eq("action", action);
    if (targetType) query = query.eq("target_type", targetType);

    const { data, error } = await query;

    if (error) {
      console.error("Admin audit logs API error:", error);
      return NextResponse.json({ error: "감사 로그 조회 실패" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Admin audit logs API error:", error);
    const authStatus = getAuthErrorStatus(error);
    if (authStatus) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: authStatus });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Run verification**

```bash
pnpm --filter admin check-types
git diff --check
```

Expected: no type errors in `admin-audit-logs/route.ts`.

**Step 3: Commit**

```bash
git add apps/admin/app/api/admin-audit-logs/route.ts
git commit -m "feat(admin): 관리자 감사 로그 조회 API 추가"
```

---

## Task 7: Final Verification And Risk Review

**Files:**
- Review all files changed by Tasks 1-6.

**Step 1: Inspect staged and unstaged changes**

```bash
git status --short
git diff --stat
```

Expected: only files from this plan should be changed by the active work. Existing unrelated dirty files may remain but must not be staged or committed.

**Step 2: Run full admin verification**

```bash
pnpm --filter admin check-types
pnpm --filter admin build
git diff --check
```

Expected:

- `check-types` passes, or failures are confirmed unrelated to changed files.
- `build` passes, or failures are confirmed unrelated to changed files.
- `git diff --check` passes.

**Step 3: Manual route review**

Confirm these exact claims before final reporting:

- `apps/admin/app/api/members/route.ts` no longer uses `select("*")`.
- `apps/admin/app/api/members/[id]/route.ts` does not return `password`, `passport_number`, `birth_date`, or `phone` in the default detail endpoint.
- `apps/admin/app/api/organizations/[id]/tree/route.ts` no longer selects `birth_date` by default.
- `apps/admin/app/api/members/[id]/sensitive/route.ts` requires both `members:sensitive:read` and `reason`.
- Bulk member export requires `export:bulk` and `reason`.
- Audit logs do not store raw sensitive field values.

**Step 4: Final commit if verification-only fixes were needed**

If verification required small fixes after Task 6, commit them:

```bash
git add apps/admin/lib/privacy.ts apps/admin/lib/admin-audit.ts apps/admin/lib/rbac.ts
git add apps/admin/app/api/members apps/admin/app/api/organizations apps/admin/app/api/export apps/admin/app/api/admin-audit-logs
git commit -m "fix(admin): 개인정보 보안 강화 검증 보완"
```

Only stage the files actually changed by the verification fix. If a listed path was not touched, leave it out of `git add`.

If no fixes were needed, do not create an empty commit.

---

## Out Of Scope For This Plan

- Encrypting existing DB columns.
- Changing admin authentication to Supabase Auth or SSO.
- Building a full audit log UI page.
- Creating a development data masking pipeline.
- Removing all service-role usage from admin API routes.

## Final Report Checklist

Include:

- Changed files by task.
- Verification commands and outcomes.
- Whether any existing unrelated dirty files were left untouched.
- Remaining risks:
  - DB direct access still bypasses app-level protections.
  - Existing plain-text sensitive fields may still exist in the DB.
  - Development/staging data masking remains a follow-up.
