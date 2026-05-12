# Phase 1: 프로젝트 도메인 user 앱 통합 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `apps/project-management`의 프로젝트(`/projects`, `/projects/[id]`) 및 한눈에 보기(`/overview`) 도메인을 `apps/user` 안으로 이전하고, user 앱 대시보드에 위젯 형태로 통합한다. project-management 앱은 그대로 유지(이중 운영) — Phase 3에서 최종 삭제.

**Architecture:** Minimum Invasive 접근. project-management의 server component / `requireAuth()` 패턴을 그대로 유지하고, user 앱에 쿠키 세션(`acg_session`, HMAC 서명)을 도입해 server 코드가 user 정보를 읽을 수 있게 한다. Supabase는 `public`(user 도메인) + `work`(이전된 도메인) 두 스키마로 분리.

**Tech Stack:** Next.js 15 App Router (Turbopack), React 19, TypeScript 5, Supabase, @xyflow/react, Tailwind v4, `@repo/ui`, Zustand, lucide-react.

**Spec 참조:** `docs/superpowers/specs/2026-05-12-project-management-to-user-migration-design.md`

**테스트 전략:** 모노레포에 테스트 프레임워크 없음 (CLAUDE.md 명시). 각 단계 끝에 `pnpm check-types`, `pnpm lint` 통과 + 수동 브라우저 시나리오 검증.

**커밋 규칙:** Korean prefix (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`). Co-Authored-By 금지 (사용자 메모리 따름).

---

## File Structure Overview

신규/수정 대상 파일 (Phase 1 범위)

```
apps/user/
├── app/
│   ├── (content)/
│   │   ├── dashboard/page.tsx                     # 수정: 위젯 3개 추가
│   │   ├── overview/page.tsx                      # 신규
│   │   └── projects/
│   │       ├── page.tsx                           # 신규
│   │       └── [id]/page.tsx                      # 신규
│   └── api/
│       ├── auth/login/route.ts                    # 수정: 쿠키 set 추가
│       ├── auth/logout/route.ts                   # 수정: 쿠키 clear 추가
│       ├── masters/route.ts                       # 신규
│       ├── project-stats/route.ts                 # 신규
│       ├── recent-activity/route.ts               # 신규
│       └── projects/
│           ├── route.ts                           # 신규
│           ├── [id]/
│           │   ├── route.ts                       # 신규
│           │   ├── checklist/route.ts             # 신규
│           │   ├── checklist/[itemId]/route.ts    # 신규
│           │   ├── attachments/route.ts           # 신규
│           │   ├── attachments/[attachmentId]/route.ts # 신규
│           │   └── requests/route.ts              # 신규 (조회용)
├── components/
│   ├── projects/                                  # 신규: 8개 파일 복사
│   ├── overview/OverviewFlow.tsx                  # 신규
│   ├── project-dashboard/                         # 신규: CalendarPanel, DayRequestList, DashboardClient 이동 + rename
│   └── dashboard/ProjectSummaryCards.tsx          # 신규 (위젯)
│   └── dashboard/RecentActivityWidget.tsx        # 신규 (위젯)
│   └── dashboard/MyCalendarPanel.tsx             # 신규 (위젯)
├── hooks/
│   ├── use-project-stats.ts                       # 신규
│   ├── use-recent-activity.ts                     # 신규
│   └── use-my-requests.ts                         # 신규
├── lib/
│   ├── auth.ts                                    # 신규: 쿠키 세션 + getSessionUser/requireAuth
│   ├── projects.ts                                # 신규 (이전)
│   ├── overview.ts                                # 신규 (이전)
│   ├── masters.ts                                 # 신규 (이전)
│   ├── storage.ts                                 # 신규 (이전, 멀티 버킷)
│   └── supabase/
│       └── client-work.ts                         # 신규
├── middleware.ts                                  # 신규
├── package.json                                   # 수정: @xyflow/react 추가
└── .env.local                                     # 수정: SESSION_SECRET 추가 (사용자 직접)

apps/project-management/
└── lib/supabase/server.ts                         # 수정: schema literal "project_management" → "work" (rename 마이그레이션과 동기화)

supabase/migrations/
└── 20260512130000_rename_project_management_to_work.sql  # 신규

apps/user/package.json                             # 수정: deps 추가
```

---

## Pre-flight Notes

작업 시작 전 한 번:
- `apps/user/.env.local`에 사용자가 직접 `SESSION_SECRET=<32바이트 랜덤>` 추가 필요 (구현 단계 중 Task 3에서 안내)
- 작업은 새 branch에서 진행: `git checkout -b feat/phase1-projects-migration`

---

### Task 1: SESSION_SECRET 환경변수 안내 및 검증

**Files:**
- Modify (manual): `apps/user/.env.local`
- Modify (manual): Vercel 환경변수 (production용 — 사용자가 별도 설정)

- [ ] **Step 1: 무작위 시크릿 생성**

로컬 터미널에서:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

- [ ] **Step 2: `.env.local` 추가 (사용자 작업)**

`apps/user/.env.local` 끝에 추가:
```
SESSION_SECRET=<생성된_32바이트_base64_문자열>
```

- [ ] **Step 3: 동작 확인용 더미 import 추가**

작업 디렉토리에서:
```bash
cd /Users/acg/Documents/meal-acg-v3/apps/user
node -e "require('dotenv').config({ path: '.env.local' }); console.log(process.env.SESSION_SECRET ? 'OK' : 'MISSING')"
```
Expected: `OK`

- [ ] **Step 4: 커밋 없음**

`.env.local`은 git ignore 대상이므로 커밋하지 않는다.

---

### Task 2: Schema rename 마이그레이션 파일 작성

**Files:**
- Create: `supabase/migrations/20260512130000_rename_project_management_to_work.sql`

이 시점에는 마이그레이션을 적용하지 않는다 (Task 30의 cutover 시점에 일괄 적용).

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- Rename project_management schema to work as part of the unification effort.
-- Coordinate with code deploy: both apps must reference "work" schema before applying.

DO $$
BEGIN
  IF to_regnamespace('work') IS NULL
     AND to_regnamespace('project_management') IS NOT NULL THEN
    ALTER SCHEMA project_management RENAME TO work;
  END IF;
END $$;

GRANT USAGE ON SCHEMA work TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA work TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA work TO service_role;
```

- [ ] **Step 2: 커밋**

```bash
git add supabase/migrations/20260512130000_rename_project_management_to_work.sql
git commit -m "chore(migration): add project_management → work schema rename"
```

---

### Task 3: `lib/auth.ts` — 쿠키 서명/검증 + SessionUser

**Files:**
- Create: `apps/user/lib/auth.ts`

- [ ] **Step 1: 파일 작성**

```ts
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/client";

const COOKIE_NAME = "acg_session";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

export type SessionUser = {
  id: string;
  fullName: string;
  role: string | null;
};

type SessionPayload = {
  userId: string;
  role: string | null;
  exp: number; // epoch ms
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured");
  }
  return secret;
}

function sign(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

function verify(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(body)
    .digest("base64url");
  if (sig !== expected) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (typeof parsed.userId !== "string") return null;
    if (typeof parsed.exp !== "number") return null;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildSessionCookie(userId: string, role: string | null) {
  const exp = Date.now() + COOKIE_MAX_AGE_SECONDS * 1000;
  return {
    name: COOKIE_NAME,
    value: sign({ userId, role, exp }),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  };
}

export function buildLogoutCookie() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  };
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  return verify(token);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const payload = verifySessionToken(token);
  if (!payload) return null;

  const supabase = createServiceClient();
  if (!supabase) return null;

  const { data: member, error } = await supabase
    .from("members")
    .select("id, full_name, role")
    .eq("id", payload.userId)
    .single();

  if (error || !member) return null;

  return {
    id: member.id,
    fullName: member.full_name,
    role: member.role ?? null,
  };
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
```

- [ ] **Step 2: 타입 체크**

```bash
cd /Users/acg/Documents/meal-acg-v3/apps/user && pnpm check-types
```
Expected: no errors

- [ ] **Step 3: 커밋**

```bash
git add apps/user/lib/auth.ts
git commit -m "feat(user): add cookie session util (sign/verify + getSessionUser/requireAuth)"
```

---

### Task 4: `/api/auth/login`에 쿠키 set 추가

**Files:**
- Modify: `apps/user/app/api/auth/login/route.ts`

- [ ] **Step 1: 응답 시 쿠키 함께 설정**

기존 `NextResponse.json(...)` 호출 직전/직후에 쿠키를 추가한다. 응답 직전 부분을 다음과 같이 수정:

```ts
import { buildSessionCookie } from "@/lib/auth";

// ... 기존 member 조회 + 비밀번호 확인 ...

const response = NextResponse.json({
  success: true,
  user: {
    id: member.id,
    fullName: member.full_name,
    role: member.role,
  },
});

const cookie = buildSessionCookie(member.id, member.role ?? null);
response.cookies.set(cookie);

return response;
```

(파일 전체를 작성하지 말고 기존 응답 구성 부분을 위 형태로 교체할 것. 기존 응답 body의 구조는 user 앱 프론트엔드 코드와 호환되도록 유지.)

- [ ] **Step 2: 동작 확인 (수동)**

dev 서버 실행 후 로그인 → DevTools > Application > Cookies > `acg_session` 항목이 있고 HttpOnly + SameSite=Lax 확인.

```bash
pnpm dev:user
# 브라우저에서 /login 진입 후 로그인 → 쿠키 확인
```

- [ ] **Step 3: 커밋**

```bash
git add apps/user/app/api/auth/login/route.ts
git commit -m "feat(user): set acg_session cookie on successful login"
```

---

### Task 5: `/api/auth/logout`에 쿠키 clear 추가

**Files:**
- Modify: `apps/user/app/api/auth/logout/route.ts`

- [ ] **Step 1: 로그아웃 시 쿠키 클리어**

기존 로그아웃 응답에 다음 추가:
```ts
import { buildLogoutCookie } from "@/lib/auth";

const response = NextResponse.json({ success: true });
response.cookies.set(buildLogoutCookie());
return response;
```

- [ ] **Step 2: 타입 체크**

```bash
pnpm check-types
```

- [ ] **Step 3: 커밋**

```bash
git add apps/user/app/api/auth/logout/route.ts
git commit -m "feat(user): clear acg_session cookie on logout"
```

---

### Task 6: middleware.ts 생성 (가드)

**Files:**
- Create: `apps/user/middleware.ts`

- [ ] **Step 1: 파일 작성**

```ts
import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/projects", "/overview"];
const COOKIE_NAME = "acg_session";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/projects/:path*", "/overview/:path*"],
};
```

쿠키 시그니처 검증은 서버 컴포넌트의 `requireAuth()`에서 수행. middleware는 토큰 유무만 빠르게 확인 (edge runtime 호환을 위해 crypto 검증 생략).

- [ ] **Step 2: 타입 체크**

```bash
pnpm check-types
```

- [ ] **Step 3: 커밋**

```bash
git add apps/user/middleware.ts
git commit -m "feat(user): add middleware to gate /projects and /overview routes"
```

---

### Task 7: `lib/supabase/client-work.ts` 생성

**Files:**
- Create: `apps/user/lib/supabase/client-work.ts`

- [ ] **Step 1: 파일 작성**

```ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types"; // 기존 user 앱 types — work 스키마 타입은 별도

export function createWorkClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase env not configured");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    db: { schema: "work" },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createPublicWorkClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase env not configured");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
```

`Database` 제네릭이 `work` 스키마 타입을 모르면 일단 `any`-스러운 형태로 가도 동작 OK. Phase 1 동안은 타입 시그니처에서 `as unknown as ...` 캐스팅 허용. (project-management 코드도 거의 `as` 캐스팅 사용)

- [ ] **Step 2: 타입 체크**

```bash
pnpm check-types
```

- [ ] **Step 3: 커밋**

```bash
git add apps/user/lib/supabase/client-work.ts
git commit -m "feat(user): add createWorkClient/createPublicWorkClient (work schema)"
```

---

### Task 8: `@xyflow/react` 의존성 추가

**Files:**
- Modify: `apps/user/package.json`

- [ ] **Step 1: 의존성 추가**

```bash
cd /Users/acg/Documents/meal-acg-v3/apps/user
pnpm add @xyflow/react@^12.10.2
```

- [ ] **Step 2: lock 파일까지 커밋**

```bash
cd /Users/acg/Documents/meal-acg-v3
git add apps/user/package.json pnpm-lock.yaml
git commit -m "chore(user): add @xyflow/react for overview flow chart"
```

---

### Task 9: `lib/storage.ts` 이전 (멀티 버킷 헬퍼)

**Files:**
- Copy: `apps/project-management/lib/storage.ts` → `apps/user/lib/storage.ts`

- [ ] **Step 1: 파일 복사 (그대로)**

```bash
cp apps/project-management/lib/storage.ts apps/user/lib/storage.ts
```

이 파일은 이미 multi-bucket 지원하므로 그대로 사용. `createServiceClient` import 경로만 `@/lib/supabase/client`로 확인.

- [ ] **Step 2: import 경로 확인 및 수정**

`apps/user/lib/storage.ts` 상단:
```ts
import { createServiceClient } from "@/lib/supabase/client";
```

user 앱의 `createServiceClient`는 `public` 스키마인데 storage는 schema와 무관 (supabase.storage 사용). 그대로 OK. 단, 함수 반환이 `null`일 수 있으므로 null 가드 추가:

```ts
// 각 함수 시작 부분에:
const supabase = createServiceClient();
if (!supabase) {
  return { path: "", error: "Supabase env not configured" };
  // 또는 return null/false (함수에 따라)
}
```

- [ ] **Step 3: 타입 체크**

```bash
pnpm check-types
```

- [ ] **Step 4: 커밋**

```bash
git add apps/user/lib/storage.ts
git commit -m "feat(user): port multi-bucket storage helpers (project + request attachments)"
```

---

### Task 10: `lib/projects.ts` 이전 (work 스키마 + user 앱 auth)

**Files:**
- Copy + adapt: `apps/project-management/lib/projects.ts` → `apps/user/lib/projects.ts`

- [ ] **Step 1: 파일 복사**

```bash
cp apps/project-management/lib/projects.ts apps/user/lib/projects.ts
```

- [ ] **Step 2: 경로 및 client adapter 수정**

`apps/user/lib/projects.ts` 상단:
```ts
import type { SessionUser } from "@/lib/auth";
import { createWorkClient } from "@/lib/supabase/client-work";
```

본문 내 `createServiceClient()` 호출을 모두 `createWorkClient()`로 치환 (project_management/work 스키마 대상).

- [ ] **Step 3: project_attachments 안전망 fallback 유지**

이미 작성된 graceful fallback (PGRST205 / 42P01 처리) 그대로 유지.

- [ ] **Step 4: 타입 체크**

```bash
pnpm check-types
```

- [ ] **Step 5: 커밋**

```bash
git add apps/user/lib/projects.ts
git commit -m "feat(user): port projects lib (uses work schema + cookie auth)"
```

---

### Task 11: `lib/overview.ts` 이전

**Files:**
- Copy + adapt: `apps/project-management/lib/overview.ts` → `apps/user/lib/overview.ts`

- [ ] **Step 1: 파일 복사 + adapter**

```bash
cp apps/project-management/lib/overview.ts apps/user/lib/overview.ts
```

`apps/user/lib/overview.ts`:
```ts
import type { SessionUser } from "@/lib/auth";
import { createWorkClient } from "@/lib/supabase/client-work";
import { listProjectsForUser, type ProjectSummary } from "@/lib/projects";
// createServiceClient → createWorkClient 치환
```

- [ ] **Step 2: 타입 체크**

```bash
pnpm check-types
```

- [ ] **Step 3: 커밋**

```bash
git add apps/user/lib/overview.ts
git commit -m "feat(user): port overview lib"
```

---

### Task 12: `lib/masters.ts` 이전

**Files:**
- Copy + adapt: `apps/project-management/lib/masters.ts` → `apps/user/lib/masters.ts`

- [ ] **Step 1: 파일 복사 + adapter**

```bash
cp apps/project-management/lib/masters.ts apps/user/lib/masters.ts
```

import을 user 앱 패턴에 맞게 수정. masters는 `public` 스키마(members, teams)와 `supervisor` 스키마(clients) 모두 참조하므로 `createServiceClient` (public) + `createPublicWorkClient` 또는 명시적 `.schema()` 호출 사용.

- [ ] **Step 2: 타입 체크**

```bash
pnpm check-types
```

- [ ] **Step 3: 커밋**

```bash
git add apps/user/lib/masters.ts
git commit -m "feat(user): port masters lib"
```

---

### Task 13: `lib/requests.ts` 이전 — Phase 1 한정 사용분

**Files:**
- Copy partial: `apps/project-management/lib/requests.ts`의 type 정의 + 대시보드 위젯 함수만 → `apps/user/lib/requests.ts`

Phase 1에서는 `/requests` 페이지를 이전하지 않지만, **대시보드 위젯**의 "최근 요청 / 캘린더 데이터" 표시를 위해 type 정의와 일부 조회 함수가 필요하다.

- [ ] **Step 1: 타입과 조회 함수만 추출**

`apps/project-management/lib/requests.ts`에서 다음만 복사:
- `REQUEST_STATUSES`, `REQUEST_PRIORITIES` 상수
- `RequestStatus`, `RequestPriority`, `RequestRecord` 타입
- `listRequestsForUser` 함수 (dashboard에서 사용)

`apps/user/lib/requests.ts`에 작성. `createServiceClient` → `createWorkClient`.

- [ ] **Step 2: 타입 체크**

```bash
pnpm check-types
```

- [ ] **Step 3: 커밋**

```bash
git add apps/user/lib/requests.ts
git commit -m "feat(user): port request types + listRequestsForUser for dashboard widgets"
```

---

### Task 14: `components/projects/*` 복사

**Files:**
- Copy folder: `apps/project-management/components/projects/` → `apps/user/components/projects/`

대상 파일:
- ProjectList.tsx
- CreateProjectDialog.tsx
- EditProjectDialog.tsx (있다면)
- ProjectDetailClient.tsx
- ProjectBadge.tsx

- [ ] **Step 1: 폴더 복사**

```bash
mkdir -p apps/user/components/projects
cp apps/project-management/components/projects/*.tsx apps/user/components/projects/
```

- [ ] **Step 2: import 경로 확인**

각 파일이 `@/lib/projects`, `@/lib/requests`, `@/lib/auth`, `@/components/requests/RequestBadge` 등을 참조. user 앱에서:
- `@/lib/projects` ✓ (Task 10)
- `@/lib/requests` ✓ (Task 13 부분)
- `@/lib/auth` ✓ (Task 3)
- `@/components/requests/RequestBadge` — Phase 1에는 없음 → Phase 1 한정 위해 RequestBadge만 임시 복사

```bash
mkdir -p apps/user/components/requests
cp apps/project-management/components/requests/RequestBadge.tsx apps/user/components/requests/
```

- [ ] **Step 3: 타입 체크**

```bash
pnpm check-types
```

남는 에러는 보통 누락된 import. 하나씩 해결.

- [ ] **Step 4: 커밋**

```bash
git add apps/user/components/projects apps/user/components/requests/RequestBadge.tsx
git commit -m "feat(user): port project components (ProjectList, dialogs, badges)"
```

---

### Task 15: `components/overview/OverviewFlow.tsx` 복사

**Files:**
- Copy: `apps/project-management/components/overview/OverviewFlow.tsx` → `apps/user/components/overview/OverviewFlow.tsx`

- [ ] **Step 1: 폴더 복사**

```bash
mkdir -p apps/user/components/overview
cp apps/project-management/components/overview/OverviewFlow.tsx apps/user/components/overview/
```

import 경로는 `@/lib/overview` (user 앱 alias). 그대로 OK.

- [ ] **Step 2: 타입 체크**

```bash
pnpm check-types
```

- [ ] **Step 3: 커밋**

```bash
git add apps/user/components/overview/OverviewFlow.tsx
git commit -m "feat(user): port overview flow chart component"
```

---

### Task 16: `components/dashboard/*` → `components/project-dashboard/*` 이전

**Files:**
- Copy + rename: `apps/project-management/components/dashboard/*` → `apps/user/components/project-dashboard/*`
- 이유: user 앱에 이미 `components/dashboard/`가 존재해 충돌 회피

대상 파일:
- DashboardClient.tsx
- CalendarPanel.tsx
- DayRequestList.tsx

- [ ] **Step 1: 폴더 복사**

```bash
mkdir -p apps/user/components/project-dashboard
cp apps/project-management/components/dashboard/*.tsx apps/user/components/project-dashboard/
```

- [ ] **Step 2: 파일 내 import 경로 확인**

만약 파일 내부에 `@/components/dashboard/...` 형태 self-reference가 있으면 `@/components/project-dashboard/...`로 치환.

```bash
grep -l "components/dashboard" apps/user/components/project-dashboard/
# 매칭되는 파일에서 components/dashboard → components/project-dashboard 치환
```

- [ ] **Step 3: 타입 체크**

```bash
pnpm check-types
```

- [ ] **Step 4: 커밋**

```bash
git add apps/user/components/project-dashboard
git commit -m "feat(user): port dashboard components as project-dashboard (avoid conflict)"
```

---

### Task 17: `/api/masters` route 이전

**Files:**
- Copy: `apps/project-management/app/api/masters/route.ts` → `apps/user/app/api/masters/route.ts`

- [ ] **Step 1: 파일 복사**

```bash
mkdir -p apps/user/app/api/masters
cp apps/project-management/app/api/masters/route.ts apps/user/app/api/masters/route.ts
```

- [ ] **Step 2: imports 교정**

```ts
import { requireAuth } from "@/lib/auth";              // user 앱 신규 auth
import { REQUEST_TYPES } from "@/lib/masters";
import { createServiceClient } from "@/lib/supabase/client";  // public 스키마
// supervisor schema는 명시적 .schema("supervisor") 호출
```

`createPublicServiceClient`는 user 앱에 없음 — `createServiceClient`로 일원화 후 `.schema()` 메서드 체이닝 사용.

- [ ] **Step 3: 타입 체크**

```bash
pnpm check-types
```

- [ ] **Step 4: 커밋**

```bash
git add apps/user/app/api/masters
git commit -m "feat(user): port /api/masters route"
```

---

### Task 18: `/api/projects/*` 라우트 이전 (목록/생성/상세/수정/삭제)

**Files:**
- Copy folder tree: `apps/project-management/app/api/projects/` → `apps/user/app/api/projects/`

- [ ] **Step 1: 폴더 트리 복사**

```bash
cp -r apps/project-management/app/api/projects apps/user/app/api/
```

- [ ] **Step 2: 모든 route 파일에서 import 경로 일괄 교정**

```bash
# requireAuth → user 앱 lib
# createServiceClient → createWorkClient (work 스키마)
# 그 외 공통 import는 그대로
```

`apps/user/app/api/projects/` 하위 모든 `.ts` 파일에 대해:
- `import { requireAuth } from "@/lib/auth"` (변경 없음, 위치만 user 앱)
- `import { createServiceClient } from "@/lib/supabase/server"` → `import { createWorkClient } from "@/lib/supabase/client-work"`
- 본문 `createServiceClient()` → `createWorkClient()`

- [ ] **Step 3: storage 헬퍼 경로 확인**

`/api/projects/[id]/attachments/route.ts`, `.../[attachmentId]/route.ts`에서 `uploadProjectAttachment` / `getProjectAttachmentSignedUrl` / `deleteProjectAttachment` import 경로:
```ts
import { uploadProjectAttachment, ... } from "@/lib/storage";
```

- [ ] **Step 4: 타입 체크**

```bash
pnpm check-types
```

- [ ] **Step 5: 커밋**

```bash
git add apps/user/app/api/projects
git commit -m "feat(user): port /api/projects/* routes (CRUD + checklist + attachments)"
```

---

### Task 19: `/api/project-stats` 신규 라우트

대시보드 위젯용. 기존 server component `getDashboardStats` 로직을 API로 추출.

**Files:**
- Create: `apps/user/app/api/project-stats/route.ts`

- [ ] **Step 1: 라우트 작성**

```ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listProjectsForUser } from "@/lib/projects";
import { listRequestsForUser } from "@/lib/requests";
import { createWorkClient } from "@/lib/supabase/client-work";

export async function GET() {
  try {
    const user = await requireAuth();
    const [requests, projects] = await Promise.all([
      listRequestsForUser(user, "queue"),
      listProjectsForUser(user),
    ]);

    const now = new Date();
    const today = toDateKey(now);
    const soon = toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const yearKey = String(now.getFullYear());

    const activeAssigned = requests.filter(
      (r) => r.status !== "완료" && r.status !== "거절",
    );
    const completed = requests.filter((r) => r.status === "완료");
    const urgentCount = activeAssigned.filter(
      (r) => r.due_date && r.due_date >= today && r.due_date <= soon,
    ).length;

    const contacts = await getContactStats(yearKey);

    return NextResponse.json({
      activeProjects: projects.filter((p) => p.status !== "완료").length,
      urgentProjects: projects.filter(
        (p) =>
          p.status !== "완료" &&
          p.due_date &&
          p.due_date >= today &&
          p.due_date <= soon,
      ).length,
      completedThisMonth: completed.filter((r) =>
        (r.completed_at ?? "").startsWith(monthKey),
      ).length,
      completedThisYear: completed.filter((r) =>
        (r.completed_at ?? "").startsWith(yearKey),
      ).length,
      openAssigned: activeAssigned.length,
      urgentCount,
      topRequester: contacts.topRequester,
      topTeam: contacts.topTeam,
      topCustomer: contacts.topCustomer,
    });
  } catch (error) {
    console.error("GET /api/project-stats error:", error);
    return NextResponse.json(
      { error: "프로젝트 통계를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

async function getContactStats(yearKey: string) {
  const supabase = createWorkClient();
  const { data, error } = await supabase
    .from("requests")
    .select("requester_name, team_name, team_names, customer_names, created_at")
    .gte("created_at", `${yearKey}-01-01T00:00:00.000Z`);

  if (error) throw error;

  const rows = data ?? [];
  return {
    topRequester: topByName(rows.map((row: { requester_name: string | null }) => row.requester_name)),
    topTeam: topByName(
      rows.flatMap((row: { team_names?: string[] | null; team_name?: string | null }) => {
        if (Array.isArray(row.team_names) && row.team_names.length > 0) return row.team_names;
        return row.team_name ? [row.team_name] : [];
      }),
    ),
    topCustomer: topByName(
      rows.flatMap((row: { customer_names?: string[] | null }) =>
        Array.isArray(row.customer_names) ? row.customer_names : [],
      ),
    ),
  };
}

function topByName(names: (string | null | undefined)[]) {
  const counts = new Map<string, number>();
  for (const name of names) {
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? { name: top[0], count: top[1] } : null;
}
```

- [ ] **Step 2: 타입 체크**

```bash
pnpm check-types
```

- [ ] **Step 3: 커밋**

```bash
git add apps/user/app/api/project-stats
git commit -m "feat(user): add /api/project-stats route for dashboard widget"
```

---

### Task 20: `/api/recent-activity` 신규 라우트

**Files:**
- Create: `apps/user/app/api/recent-activity/route.ts`

- [ ] **Step 1: 라우트 작성**

```ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createWorkClient } from "@/lib/supabase/client-work";

export async function GET() {
  try {
    await requireAuth();
    const supabase = createWorkClient();

    const [
      { data: commentRows, error: commentsError },
      { data: requestRows, error: requestsError },
      { data: projectRows, error: projectsError },
    ] = await Promise.all([
      supabase
        .from("comments")
        .select("id, request_id, author_name, body, created_at")
        .eq("is_system", false)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("requests")
        .select("id, title, requester_name, status, created_at")
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("projects")
        .select("id, title, owner_name, status, created_at")
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

    if (commentsError) throw commentsError;
    if (requestsError) throw requestsError;
    if (projectsError) throw projectsError;

    type CommentRow = { id: string; request_id: string; author_name: string; body: string; created_at: string };
    const comments = (commentRows ?? []) as CommentRow[];
    const requestIds = [...new Set(comments.map((c) => c.request_id))];
    const requestTitles = new Map<string, string>();

    if (requestIds.length > 0) {
      const { data, error } = await supabase
        .from("requests")
        .select("id, title")
        .in("id", requestIds);
      if (error) throw error;
      for (const r of (data ?? []) as { id: string; title: string }[]) {
        requestTitles.set(r.id, r.title);
      }
    }

    return NextResponse.json({
      comments: comments.map((c) => ({
        id: c.id,
        requestId: c.request_id,
        requestTitle: requestTitles.get(c.request_id) ?? "삭제된 요청",
        authorName: c.author_name,
        body: c.body,
        createdAt: c.created_at,
      })),
      requests: (requestRows ?? []).map((r: { id: string; title: string; requester_name: string; status: string; created_at: string }) => ({
        id: r.id,
        title: r.title,
        requesterName: r.requester_name,
        status: r.status,
        createdAt: r.created_at,
      })),
      projects: (projectRows ?? []).map((p: { id: string; title: string; owner_name: string | null; status: string; created_at: string }) => ({
        id: p.id,
        title: p.title,
        ownerName: p.owner_name,
        status: p.status,
        createdAt: p.created_at,
      })),
    });
  } catch (error) {
    console.error("GET /api/recent-activity error:", error);
    return NextResponse.json({ error: "최근 활동을 불러오지 못했습니다." }, { status: 500 });
  }
}
```

- [ ] **Step 2: 타입 체크**

```bash
pnpm check-types
```

- [ ] **Step 3: 커밋**

```bash
git add apps/user/app/api/recent-activity
git commit -m "feat(user): add /api/recent-activity route for dashboard widget"
```

---

### Task 21: `/projects` 페이지

**Files:**
- Create: `apps/user/app/(content)/projects/page.tsx`

- [ ] **Step 1: 페이지 작성 (project-management 원본 그대로 이전)**

```ts
import { ProjectList } from "@/components/projects/ProjectList";
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog";
import { requireAuth } from "@/lib/auth";
import { listProjectsForUser } from "@/lib/projects";

export default async function ProjectsPage() {
  const user = await requireAuth();
  const projects = await listProjectsForUser(user);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#111111]">프로젝트</h1>
          <p className="mt-1 text-sm text-slate-500">
            전체 프로젝트 {projects.length.toLocaleString("ko-KR")}건
          </p>
        </div>
        <CreateProjectDialog />
      </div>
      <ProjectList projects={projects} />
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크 + dev 실행 확인**

```bash
pnpm check-types
# 별도 터미널에서:
pnpm dev:user
# 브라우저: localhost:3000/projects (로그인 상태에서)
```

- [ ] **Step 3: 커밋**

```bash
git add apps/user/app/\(content\)/projects/page.tsx
git commit -m "feat(user): add /projects page"
```

---

### Task 22: `/projects/[id]` 상세 페이지

**Files:**
- Create: `apps/user/app/(content)/projects/[id]/page.tsx`

- [ ] **Step 1: 페이지 작성**

`apps/project-management/app/(dashboard)/projects/[id]/page.tsx`를 거의 그대로 복사:
```ts
import { notFound } from "next/navigation";
import { ProjectDetailClient } from "@/components/projects/ProjectDetailClient";
import { requireAuth } from "@/lib/auth";
import {
  canDeleteProject,
  canUpdateProject,
  getProjectDetailForUser,
} from "@/lib/projects";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: PageProps) {
  const user = await requireAuth();
  const { id } = await params;
  const detail = await getProjectDetailForUser(id, user);
  if (!detail) notFound();
  return (
    <ProjectDetailClient
      {...detail}
      canEdit={canUpdateProject(user, detail.project)}
      canDelete={canDeleteProject(user, detail.project)}
    />
  );
}
```

- [ ] **Step 2: 타입 체크 + 동작 확인**

```bash
pnpm check-types
# 브라우저: /projects/[적당한 id]
```

- [ ] **Step 3: 커밋**

```bash
git add apps/user/app/\(content\)/projects/\[id\]/page.tsx
git commit -m "feat(user): add /projects/[id] detail page"
```

---

### Task 23: `/overview` 페이지

**Files:**
- Create: `apps/user/app/(content)/overview/page.tsx`

- [ ] **Step 1: 페이지 작성**

```ts
import { OverviewFlow } from "@/components/overview/OverviewFlow";
import { requireAuth } from "@/lib/auth";
import { getOverviewProjects } from "@/lib/overview";

export default async function OverviewPage() {
  const user = await requireAuth();
  const projects = await getOverviewProjects(user);
  const requestCount = projects.reduce(
    (total, project) => total + project.requests.length,
    0,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#111111]">한눈에 보기</h1>
          <p className="mt-1 text-sm text-slate-500">
            그룹, 계열사, 프로젝트, 요청을 계층 구조로 확인합니다.
          </p>
        </div>
        <div className="flex gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[#f3f3f3]">
            프로젝트 {projects.length.toLocaleString("ko-KR")}건
          </span>
          <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-[#f3f3f3]">
            요청 {requestCount.toLocaleString("ko-KR")}건
          </span>
        </div>
      </div>
      <OverviewFlow projects={projects} />
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크 + 동작 확인**

```bash
pnpm check-types
```

- [ ] **Step 3: 커밋**

```bash
git add apps/user/app/\(content\)/overview/page.tsx
git commit -m "feat(user): add /overview page"
```

---

### Task 24: 사이드바에 "업무 / 프로젝트" 그룹 추가

**Files:**
- Modify: `apps/user/components/Sidebar.tsx`

- [ ] **Step 1: menuGroups 배열에 그룹 추가**

`apps/user/components/Sidebar.tsx`에서 lucide-react import에 `FolderKanban`, `Network` 추가:
```ts
import { ..., FolderKanban, Network } from "lucide-react";
```

`menuGroups` 배열에 신규 그룹 삽입 (위치는 기존 "식대/복지" 다음, "기타" 이전):
```ts
{
  label: "업무 / 프로젝트",
  items: [
    { id: "projects", label: "프로젝트", href: "/projects", icon: FolderKanban },
    { id: "overview", label: "한눈에 보기", href: "/overview", icon: Network },
  ],
},
```

- [ ] **Step 2: 타입 체크 + 동작 확인**

```bash
pnpm check-types
# 브라우저: 사이드바 열어서 새 그룹 보이는지
```

- [ ] **Step 3: 커밋**

```bash
git add apps/user/components/Sidebar.tsx
git commit -m "feat(user): add '업무 / 프로젝트' group to sidebar"
```

---

### Task 25: 대시보드 위젯 — React Query 훅 3종

**Files:**
- Create: `apps/user/hooks/use-project-stats.ts`
- Create: `apps/user/hooks/use-recent-activity.ts`
- Create: `apps/user/hooks/use-my-requests.ts`

- [ ] **Step 1: `use-project-stats.ts`**

```ts
"use client";
import { useQuery } from "@tanstack/react-query";

export type ProjectStats = {
  activeProjects: number;
  urgentProjects: number;
  completedThisMonth: number;
  completedThisYear: number;
  openAssigned: number;
  urgentCount: number;
  topRequester: { name: string; count: number } | null;
  topTeam: { name: string; count: number } | null;
  topCustomer: { name: string; count: number } | null;
};

export function useProjectStats() {
  return useQuery<ProjectStats>({
    queryKey: ["project-stats"],
    queryFn: async () => {
      const res = await fetch("/api/project-stats");
      if (!res.ok) throw new Error("Failed to fetch project stats");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}
```

- [ ] **Step 2: `use-recent-activity.ts`**

```ts
"use client";
import { useQuery } from "@tanstack/react-query";

type RecentActivity = {
  comments: { id: string; requestId: string; requestTitle: string; authorName: string; body: string; createdAt: string }[];
  requests: { id: string; title: string; requesterName: string; status: string; createdAt: string }[];
  projects: { id: string; title: string; ownerName: string | null; status: string; createdAt: string }[];
};

export function useRecentActivity() {
  return useQuery<RecentActivity>({
    queryKey: ["recent-activity"],
    queryFn: async () => {
      const res = await fetch("/api/recent-activity");
      if (!res.ok) throw new Error("Failed to fetch recent activity");
      return res.json();
    },
    staleTime: 1000 * 60 * 3,
  });
}
```

- [ ] **Step 3: `use-my-requests.ts`**

```ts
"use client";
import { useQuery } from "@tanstack/react-query";
import type { RequestRecord } from "@/lib/requests";

export function useMyRequests() {
  return useQuery<RequestRecord[]>({
    queryKey: ["requests", "queue"],
    queryFn: async () => {
      const res = await fetch("/api/requests?view=queue");
      if (!res.ok) throw new Error("Failed to fetch my requests");
      return res.json();
    },
    staleTime: 1000 * 60 * 3,
  });
}
```

위 훅이 호출하는 `/api/requests?view=queue`는 Phase 2 작업이지만, **위젯에서 캘린더용 데이터를 표시하려면 필요**. Phase 2 전이라도 GET 라우트만 임시 구현하거나 위젯에서 빈 상태 표시.

> 결정: Phase 1에서는 `/api/requests`의 GET (view=queue) 부분만 같이 이전한다. POST/PATCH/DELETE는 Phase 2 작업. 아래 Task 25b로 추가.

- [ ] **Step 4: 타입 체크**

```bash
pnpm check-types
```

- [ ] **Step 5: 커밋**

```bash
git add apps/user/hooks/use-project-stats.ts apps/user/hooks/use-recent-activity.ts apps/user/hooks/use-my-requests.ts
git commit -m "feat(user): add dashboard widget data hooks"
```

---

### Task 25b: `/api/requests` GET (view=queue 한정) 이전

**Files:**
- Create: `apps/user/app/api/requests/route.ts` (GET만)

- [ ] **Step 1: 라우트 작성**

```ts
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createWorkClient } from "@/lib/supabase/client-work";

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const supabase = createWorkClient();
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view");

    let query = supabase
      .from("requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (view === "mine") {
      query = query.eq("requester_id", session.id);
    } else if (view === "queue") {
      query = query.or(`assignee_id.eq.${session.id},assignee_ids.cs.{${session.id}}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/requests error:", error);
    return NextResponse.json({ error: "요청 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}
```

POST/PATCH/DELETE는 Phase 2 작업이므로 이번 라우트에는 포함 X.

- [ ] **Step 2: 타입 체크**

```bash
pnpm check-types
```

- [ ] **Step 3: 커밋**

```bash
git add apps/user/app/api/requests/route.ts
git commit -m "feat(user): add /api/requests GET (queue/mine view) for dashboard widgets"
```

---

### Task 26: 대시보드 위젯 컴포넌트 3종

**Files:**
- Create: `apps/user/components/dashboard/ProjectSummaryCards.tsx`
- Create: `apps/user/components/dashboard/RecentActivityWidget.tsx`
- Create: `apps/user/components/dashboard/MyCalendarPanel.tsx`

- [ ] **Step 1: `ProjectSummaryCards.tsx`**

`apps/project-management/app/(dashboard)/page.tsx`의 4개 카드 (`ProjectSummaryCard`, `CompletionSummaryCard`, `PendingSummaryCard`, `ContactSummaryCard`) 로직을 가져와 단일 client component로 묶음. `useProjectStats` 훅에서 데이터 받음. (코드는 project-management/page.tsx에서 카드 부분을 그대로 복사하고 server 호출 부분만 hook으로 대체)

- [ ] **Step 2: `RecentActivityWidget.tsx`**

`apps/project-management/app/(dashboard)/page.tsx`의 `LatestActivityPanel` 컴포넌트 가져옴. `useRecentActivity` 훅 사용.

- [ ] **Step 3: `MyCalendarPanel.tsx`**

`apps/user/components/project-dashboard/DashboardClient.tsx`를 그대로 사용 (이미 client + 마감일 캘린더). `useMyRequests` 훅으로 데이터 fetch. 좌측 캘린더 + 우측 슬롯이 그대로 동작.

- [ ] **Step 4: 타입 체크**

```bash
pnpm check-types
```

- [ ] **Step 5: 커밋**

```bash
git add apps/user/components/dashboard/ProjectSummaryCards.tsx apps/user/components/dashboard/RecentActivityWidget.tsx apps/user/components/dashboard/MyCalendarPanel.tsx
git commit -m "feat(user): add dashboard widgets (summary/recent activity/my calendar)"
```

---

### Task 27: 대시보드 페이지에 위젯 통합

**Files:**
- Modify: `apps/user/app/(content)/dashboard/page.tsx`

- [ ] **Step 1: import 추가 및 위젯 배치**

페이지 상단:
```ts
import { ProjectSummaryCards } from "@/components/dashboard/ProjectSummaryCards";
import { RecentActivityWidget } from "@/components/dashboard/RecentActivityWidget";
import { MyCalendarPanel } from "@/components/dashboard/MyCalendarPanel";
```

기존 식대/근태 위젯 아래에 다음 섹션 추가:
```tsx
<section className="space-y-4">
  <h2 className="text-base font-semibold text-slate-900">업무 / 프로젝트</h2>
  <ProjectSummaryCards />
  <div className="grid gap-4 lg:grid-cols-[6fr_4fr]">
    <MyCalendarPanel />
    <RecentActivityWidget />
  </div>
</section>
```

배치 위치는 사용자 디자인 감각에 맞게 조정. 단순히 페이지 하단에 새 섹션 추가.

- [ ] **Step 2: 타입 체크 + 브라우저 확인**

```bash
pnpm check-types
# /dashboard에서 위젯 보이는지
```

- [ ] **Step 3: 커밋**

```bash
git add apps/user/app/\(content\)/dashboard/page.tsx
git commit -m "feat(user): integrate project widgets into dashboard"
```

---

### Task 28: 수동 회귀 테스트 (Phase 1 체크리스트)

dev 서버에서 다음 시나리오를 모두 수행:

- [ ] 로그인 후 사이드바 "업무 / 프로젝트" 그룹 표시 확인
- [ ] `/projects` 진입 가능 (로그인 시)
- [ ] 비로그인 상태에서 `/projects` 접근 시 `/login?next=/projects` 리다이렉트
- [ ] 프로젝트 생성 (CreateProjectDialog) 정상
- [ ] 프로젝트 상세 진입 (`/projects/[id]`) 정상
- [ ] 프로젝트 수정 (EditProjectDialog) 정상
- [ ] 프로젝트 삭제 정상
- [ ] 체크리스트 추가/완료/수정/삭제 정상 (등록일/수정일 노출 확인)
- [ ] 첨부파일 업로드/다운로드/삭제 정상
- [ ] `/overview` ReactFlow 렌더 + 노드 클릭 시 상세 이동
- [ ] `/dashboard` 위젯 3종 모두 데이터 표시
- [ ] 모바일 PWA에서 BottomNavigation 정상 (영향 없음)
- [ ] 로그아웃 → DevTools에서 `acg_session` 쿠키 삭제 확인
- [ ] project-management 앱(`pnpm dev:project-management`)도 정상 동작 (이중 운영 검증)

- [ ] **Step 1: 모든 시나리오 통과 확인**

문제 있으면 직전 task로 돌아가 수정. 모두 OK면 다음 단계.

---

### Task 29: project-management 앱의 schema 리터럴 코드 수정 (rename 사전준비)

**Files:**
- Modify: `apps/project-management/lib/supabase/server.ts`

- [ ] **Step 1: schema option `"project_management"` → `"work"` 수정**

```ts
// apps/project-management/lib/supabase/server.ts
db: { schema: "work" },
```

이 변경은 **DB rename 마이그레이션 적용 후에 빌드/배포되어야 한다** (Task 30과 동기화). 이번 task에서는 코드만 변경하고 커밋. 머지 시점이 cutover 시점.

- [ ] **Step 2: 타입 체크**

```bash
pnpm check-types
```

(project-management 앱 기준)

- [ ] **Step 3: 커밋**

```bash
git add apps/project-management/lib/supabase/server.ts
git commit -m "chore(project-management): switch schema literal to 'work' (sync with migration)"
```

---

### Task 30: Cutover — schema rename + 배포 (사용자 협조 필요)

**Files:**
- 변경 없음, 운영 작업

- [ ] **Step 1: 코드 머지 + 배포 시점 사전 조율**

- 이 시점까지 작성된 모든 PR(branch `feat/phase1-projects-migration`)을 main에 머지
- Vercel 배포 큐 정지 또는 트래픽이 적은 시간대 선택

- [ ] **Step 2: SESSION_SECRET 환경변수 production 적용**

- Vercel user 앱 프로젝트 환경변수에 `SESSION_SECRET` 추가

- [ ] **Step 3: DB 마이그레이션 적용 (사용자 직접)**

Supabase Dashboard SQL Editor에서:

```sql
-- Task 2의 마이그레이션과 동일
DO $$
BEGIN
  IF to_regnamespace('work') IS NULL
     AND to_regnamespace('project_management') IS NOT NULL THEN
    ALTER SCHEMA project_management RENAME TO work;
  END IF;
END $$;

GRANT USAGE ON SCHEMA work TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA work TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA work TO service_role;
```

`project_attachments` 마이그레이션이 미적용 상태라면 함께 적용:
```sql
-- 20260512120000_project_attachments.sql 내용
```

- [ ] **Step 4: 두 앱 모두 재배포**

- user 앱 배포 (신규 기능 + 쿠키 + work 스키마)
- project-management 앱 배포 (work 스키마)
- 두 앱 모두 동일 시점에 배포 (Vercel 동시 트리거)

- [ ] **Step 5: 운영 환경 검증**

- 두 앱 모두 `/projects`, `/projects/[id]`, `/overview` 동작 확인
- 데이터가 동일한지 (같은 DB 보고 있는지)
- 신규 첨부파일 업로드 → 두 앱 모두에서 보이는지

- [ ] **Step 6: 안내 배너 (선택)**

project-management 앱에 다음 배너 노출:
> "프로젝트 메뉴가 ACG 식대 앱으로 이전되었습니다. 클릭하여 이동 →"

배너는 1-2주 후 redirect로 대체.

- [ ] **Step 7: 1주일 모니터링**

- Vercel Analytics에서 `/projects`, `/overview` 트래픽 증가 확인
- 사용자 피드백 수집
- 문제 없으면 Phase 2 진입 준비

---

## Self-Review

**Spec coverage check** — `docs/superpowers/specs/2026-05-12-project-management-to-user-migration-design.md` Phase 1 섹션과 비교:
- 페이지 `/projects`, `/projects/[id]`, `/overview`: Task 21/22/23 ✓
- API `/api/projects/*`, `/api/masters`, `/api/project-stats`, `/api/recent-activity`: Task 17/18/19/20 ✓
- 컴포넌트 projects/overview/project-dashboard: Task 14/15/16 ✓
- lib (projects/overview/masters/storage/auth): Task 9/10/11/12/3 ✓
- 의존성 `@xyflow/react`: Task 8 ✓
- DB 마이그레이션 (project_attachments는 기 작성, rename은 Task 2): ✓
- middleware: Task 6 ✓
- 사이드바 그룹: Task 24 ✓
- 대시보드 위젯: Task 25/26/27 ✓
- `acg_session` 쿠키: Task 3/4/5 ✓
- Cutover: Task 30 ✓

**Placeholder scan** — TBD/TODO 없음 확인. 단 Task 26 위젯 컴포넌트는 "project-management/page.tsx에서 카드 부분을 그대로 복사"라고 안내했는데, 실제 구현 시 복사할 코드는 spec/원본 파일을 참조해야 한다. 이는 plan을 따르는 엔지니어에게 명시적으로 원본 위치를 제공했으므로 placeholder가 아니라 정당한 참조.

**Type consistency** — `SessionUser`(Task 3 정의) → `requireAuth`/`getSessionUser` 반환 (모든 task에서 동일 시그니처 사용). `createWorkClient`(Task 7) → 모든 work 스키마 접근에서 동일 이름 사용. `acg_session` 쿠키명 통일.

수정 사항 없음.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-12-phase1-projects-migration.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - 각 Task를 fresh subagent에 dispatch + 리뷰

**2. Inline Execution** - 현 세션에서 batch 실행

**어떤 방식으로 진행할까요?**
