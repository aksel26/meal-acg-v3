# Admin Permission Policy Management Implementation Plan

> **For Claude:** Use `${SUPERPOWERS_SKILLS_ROOT}/skills/collaboration/executing-plans/SKILL.md` to implement this plan task-by-task.

**Goal:** Add a representative-only admin permission management page that stores role policies and member overrides in DB and applies them to real admin API authorization.

**Architecture:** Keep `대표` as an immutable super-admin in code. Store editable policies for `팀장` and `일반` plus per-member `allow`/`deny` overrides in Supabase. Update server authorization to read DB policies with a short in-process cache and fallback to the current hardcoded permissions if policy tables are unavailable.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Postgres migrations, existing admin session cookie auth, existing shadcn/ui components, TanStack Query.

---

## Source Documents

- Design spec: `docs/superpowers/specs/2026-05-28-admin-permission-policy-management-design.md`
- Current RBAC: `apps/admin/lib/rbac.ts`
- Current auth gate: `apps/admin/lib/auth.ts`
- Service client: `apps/admin/lib/supabase/server.ts`
- Audit helper: `apps/admin/lib/admin-audit.ts`
- Sidebar: `apps/admin/components/Sidebar.tsx`
- Similar settings page: `apps/admin/app/(dashboard)/settings/page.tsx`
- Current members API patterns: `apps/admin/app/api/members/route.ts`, `apps/admin/app/api/members/[id]/route.ts`

## Task 1: Add DB Schema For Permission Policies

**Files:**
- Create: `supabase/migrations/20260528100000_admin_permission_policies.sql`

**Steps:**

1. Create `admin_role_permission_policies` with unique `(admin_role, permission)`.
2. Create `admin_member_permission_overrides` with unique `(member_id, permission)`.
3. Add `CHECK` constraints for role/effect values.
4. Enable RLS and create idempotent `service_role_all` policies.
5. Seed role policy rows for every current permission and role using the current hardcoded defaults.
6. Notify PostgREST schema reload.
7. Commit with `feat(db): 관리자 권한 정책 테이블 추가`.

**Verification:**

```bash
git diff --check
```

## Task 2: Add Dynamic RBAC Helpers

**Files:**
- Modify: `apps/admin/lib/rbac.ts`
- Modify: `apps/admin/lib/auth.ts`

**Steps:**

1. Add permission metadata with labels, groups, and high-risk flags.
2. Export `isAdminPermission(value)` and `getFallbackAdminPermissions(adminRole)`.
3. Add an async `getEffectiveAdminPermissions(member)` helper using Supabase service client.
4. Keep `대표` as always `ADMIN_PERMISSIONS`.
5. Apply role policy rows plus member overrides for non-representatives.
6. Add a 30-second in-process cache keyed by `memberId:adminRole`.
7. Export `invalidateAdminPermissionCache()`.
8. Update `requireAdminPermission()` to call the async helper.
9. Commit with `feat(admin): DB 기반 관리자 권한 계산 추가`.

**Verification:**

```bash
pnpm --filter admin check-types
git diff --check
```

## Task 3: Add Representative-Only Permission Policy API

**Files:**
- Create: `apps/admin/app/api/permission-policies/route.ts`
- Create: `apps/admin/app/api/permission-policies/roles/route.ts`
- Create: `apps/admin/app/api/permission-policies/members/[id]/route.ts`

**Steps:**

1. Add a local `requireRepresentative()` helper inside the route files or a small shared server helper.
2. `GET /api/permission-policies` returns permission metadata, role policies, member overrides joined with member names, admin members, and recent permission audit logs.
3. `PUT /api/permission-policies/roles` accepts only `팀장` or `일반`, upserts all permission rows with `enabled` true/false, invalidates cache, logs `permission.role_policy_update`.
4. `PUT /api/permission-policies/members/[id]` rejects representative targets, replaces overrides, invalidates cache, logs `permission.member_override_update`.
5. Commit with `feat(admin): 권한 정책 API 추가`.

**Verification:**

```bash
pnpm --filter admin check-types
git diff --check
```

## Task 4: Add Permission Management Page

**Files:**
- Create: `apps/admin/app/(dashboard)/permission-policies/page.tsx`
- Modify: `apps/admin/components/Sidebar.tsx`
- Modify: `apps/admin/components/Header.tsx`

**Steps:**

1. Add `권한 관리` to the settings area of the sidebar and show it only for representative users.
2. Add a header title mapping for `/permission-policies`.
3. Build the page with tabs for `대표`, `팀장`, `일반`.
4. Render representative permissions as checked and disabled.
5. Render editable checkboxes for `팀장` and `일반`, grouped by permission metadata.
6. Add member search/selection and override controls with `allow`, `deny`, and inherited state.
7. Add a save summary area and explicit save buttons.
8. Add a recent change history table.
9. Commit with `feat(admin): 대표 전용 권한 관리 화면 추가`.

**Verification:**

```bash
pnpm --filter admin check-types
pnpm --filter admin build
git diff --check
```

## Task 5: Apply Local DB Migration And Final Verification

**Files:**
- No source changes unless verification reveals a bug.

**Steps:**

1. Copy and apply `20260528100000_admin_permission_policies.sql` to `supabase_db_meal-v3`.
2. Verify both new tables exist.
3. Verify seeded row counts for `팀장` and `일반`.
4. Run final admin typecheck and build.
5. Report remaining unrelated dirty files separately.

**Verification:**

```bash
docker cp supabase/migrations/20260528100000_admin_permission_policies.sql supabase_db_meal-v3:/tmp/20260528100000_admin_permission_policies.sql
docker exec supabase_db_meal-v3 psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /tmp/20260528100000_admin_permission_policies.sql
docker exec supabase_db_meal-v3 psql -U postgres -d postgres -c "select admin_role, count(*) from public.admin_role_permission_policies group by 1 order by 1;"
pnpm --filter admin check-types
pnpm --filter admin build
git diff --check
```
