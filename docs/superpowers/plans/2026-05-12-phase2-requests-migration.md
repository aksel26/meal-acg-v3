# Phase 2: 요청 도메인 user 앱 통합 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** project-management의 요청(`/requests`, `/queue`, `/requests/mine`, `/requests/[id]`, `/requests/new`) 도메인을 user 앱으로 이전. 댓글/첨부/이력/완료메모 모두 포함. Cmd+K 검색 Dialog는 user 앱 헤더에 추가.

**Architecture:** Phase 1과 동일한 Minimum Invasive 패턴. 이미 user 앱에 도입한 `acg_session` 쿠키, `createWorkClient`, middleware를 그대로 활용.

**Tech Stack:** Phase 1과 동일.

**Spec 참조:** `docs/superpowers/specs/2026-05-12-project-management-to-user-migration-design.md` (Phase 2 섹션)

**Prereq:** Phase 1 완료 (코드 + DB 마이그레이션 적용 + SESSION_SECRET 설정).

**테스트 전략:** Phase 1과 동일 — 수동 시나리오 + `pnpm check-types`.

**커밋 규칙:** Korean prefix. Co-Authored-By 금지.

---

## File Structure Overview

### 신규 생성

```
apps/user/
├── app/
│   ├── (content)/
│   │   ├── requests/page.tsx                              # 전체 요청
│   │   ├── requests/[id]/page.tsx                         # 요청 상세
│   │   ├── requests/mine/page.tsx                         # 내가 작성한 요청
│   │   ├── requests/new/page.tsx                          # 신규 요청 작성
│   │   └── queue/page.tsx                                 # 처리할 요청 (assignee=나)
│   └── api/
│       └── requests/
│           ├── route.ts                                   # GET (이미 있음) + POST (신규)
│           ├── [id]/route.ts                              # GET/PATCH/DELETE
│           ├── [id]/comments/route.ts                     # GET/POST
│           ├── [id]/attachments/route.ts                  # POST
│           └── [id]/completion-memos/[memoId]/route.ts    # PATCH/DELETE
├── components/
│   ├── requests/
│   │   ├── CreateRequestDialog.tsx                        # 헤더 검색 결과에서 빠른 요청 작성
│   │   ├── RequestDetailClient.tsx                        # 요청 상세 클라이언트
│   │   ├── RequestForm.tsx                                # 신규/수정 폼
│   │   └── RequestList.tsx                                # 요청 목록
│   └── search/
│       └── RequestSearchDialog.tsx                        # Cmd+K 검색 (헤더용)
└── lib/
    └── requests.ts                                        # Phase 1에서 일부 이전된 것 확장
```

### 수정

```
apps/user/
├── lib/requests.ts                                        # 함수 추가 (CRUD, 댓글, 첨부, 이력)
├── middleware.ts                                          # matcher에 /requests, /queue 추가
├── components/Sidebar.tsx                                 # "업무 / 프로젝트" 그룹에 3개 메뉴 추가
└── components/Header.tsx (또는 layout 적당한 위치)         # Cmd+K 트리거 + Dialog 마운트
```

### 사이드 파일

- `apps/user/lib/requests.ts`: Phase 1에서 일부만 이전됨. 이번 Phase에 전체 함수 (`getRequestDetail`, `getRelatedRequests`, `listCommentsByRequest`, `listAttachmentsByRequest`, `listEventsByRequest`, `listCompletionMemos` 등) 추가

---

## 사전 정보

### Phase 1에서 이미 이전된 것

- `lib/requests.ts`: `RequestStatus`, `RequestPriority`, `RequestRecord` 타입, `listRequestsForUser`, `canUpdateRequest`, `getRequestById`, `recordEvent`
- `components/requests/RequestBadge.tsx`: 이전됨
- `app/api/requests/route.ts`: **GET만** (view=queue/mine)

### Phase 2에서 추가될 함수 (lib/requests.ts)

- `getRequestDetail(id, user)`: 요청 + 댓글 + 첨부 + 이력 + 완료메모 + 연결된 프로젝트 일괄 fetch
- `getRelatedRequests(currentRequest)`: 같은 고객사 다른 요청 (요청 상세 사이드바용)
- (대량 데이터는 함수 분리 가능)

---

## 사용자 메뉴 라벨 (사이드바)

```
업무 / 프로젝트 (Phase 1 시점에 그룹 만들어진 상태)
  - 프로젝트                     /projects             [Phase 1]
  - 한눈에 보기                  /overview             [Phase 1]
  - 업무 요청                    /requests             [Phase 2 추가]
  - 내 업무 요청                 /requests/mine        [Phase 2 추가]
  - 처리할 업무 요청              /queue                [Phase 2 추가]
```

---

### Task 1: lib/requests.ts 확장 (Phase 1 잔여 함수)

**Files:**
- Modify: `apps/user/lib/requests.ts`

- [ ] **Step 1: 함수 추가**

project-management/lib/requests.ts에서 다음 함수들을 복사하고 import 경로 교정:
- `getRequestDetail(id: string, user: SessionUser)` — 요청 + 관련 데이터 일괄
- `getRelatedRequests(current: RequestRecord)` — 같은 고객사 다른 요청
- `RequestComment`, `RequestAttachment`, `RequestEvent`, `CompletionMemo`, `LinkedProjectSummary` 타입
- `RequestDetail` 타입 (`{request, comments, attachments, events, completionMemos, linkedProjects, relatedRequests}`)

기존 `createServiceClient` → `createWorkClient`.

- [ ] **Step 2: 타입 체크**

```bash
cd /Users/acg/Documents/meal-acg-v3/apps/user && pnpm check-types
```

- [ ] **Step 3: 커밋**

```bash
git add apps/user/lib/requests.ts
git commit -m "feat(user): expand requests lib (detail/related/comments/attachments/events)"
```

---

### Task 2: 컴포넌트 이전 (CreateRequestDialog, RequestForm, RequestList, RequestDetailClient)

**Files:**
- Copy + adapt: `apps/project-management/components/requests/*.tsx` → `apps/user/components/requests/*.tsx`

- [ ] **Step 1: 파일 복사**

```bash
cp apps/project-management/components/requests/CreateRequestDialog.tsx apps/user/components/requests/
cp apps/project-management/components/requests/RequestForm.tsx apps/user/components/requests/
cp apps/project-management/components/requests/RequestList.tsx apps/user/components/requests/
cp apps/project-management/components/requests/RequestDetailClient.tsx apps/user/components/requests/
```

- [ ] **Step 2: import 경로 확인 및 교정**

- `@/lib/requests` ✓ (Task 1 후 full version)
- `@/lib/projects` ✓
- `@/lib/auth` ✓
- `@/components/projects/ProjectBadge` ✓
- `@/components/requests/RequestBadge` ✓ (Phase 1에서 이전됨)
- 기타 `@repo/ui/src/*` 등은 그대로

- [ ] **Step 3: 타입 체크**

```bash
pnpm check-types
```

남는 에러가 있다면 case-by-case 수정.

- [ ] **Step 4: 커밋**

```bash
git add apps/user/components/requests
git commit -m "feat(user): port request components (List, Form, Detail, CreateDialog)"
```

---

### Task 3: API 라우트 이전 (POST/PATCH/DELETE 및 nested)

**Files:**
- Modify: `apps/user/app/api/requests/route.ts` — POST 추가
- Create: `apps/user/app/api/requests/[id]/route.ts`
- Create: `apps/user/app/api/requests/[id]/comments/route.ts`
- Create: `apps/user/app/api/requests/[id]/attachments/route.ts`
- Create: `apps/user/app/api/requests/[id]/completion-memos/[memoId]/route.ts`

- [ ] **Step 1: 폴더 트리 복사 (route.ts 제외하고 — Phase 1에 부분 작성됨)**

```bash
mkdir -p apps/user/app/api/requests/\[id\]/comments
mkdir -p apps/user/app/api/requests/\[id\]/attachments
mkdir -p apps/user/app/api/requests/\[id\]/completion-memos/\[memoId\]

cp apps/project-management/app/api/requests/\[id\]/route.ts apps/user/app/api/requests/\[id\]/
cp apps/project-management/app/api/requests/\[id\]/comments/route.ts apps/user/app/api/requests/\[id\]/comments/
cp apps/project-management/app/api/requests/\[id\]/attachments/route.ts apps/user/app/api/requests/\[id\]/attachments/
cp apps/project-management/app/api/requests/\[id\]/completion-memos/\[memoId\]/route.ts apps/user/app/api/requests/\[id\]/completion-memos/\[memoId\]/
```

- [ ] **Step 2: 모든 route 파일에서 import 경로 일괄 교정**

```bash
find apps/user/app/api/requests -name "route.ts" -exec sed -i '' \
  -e 's|from "@/lib/supabase/server"|from "@/lib/supabase/client-work"|g' \
  -e 's|createServiceClient|createWorkClient|g' \
  -e 's|createPublicServiceClient|createPublicWorkClient|g' \
  {} +
```

- [ ] **Step 3: requests/route.ts에 POST 핸들러 추가**

기존 GET-only 파일에 project-management의 POST 핸들러 로직 추가. createServiceClient 모두 createWorkClient로.

- [ ] **Step 4: 타입 체크**

```bash
pnpm check-types
```

- [ ] **Step 5: 커밋**

```bash
git add apps/user/app/api/requests
git commit -m "feat(user): port /api/requests/* (CRUD + comments + attachments + completion memos)"
```

---

### Task 4: 페이지 이전 — `/requests`

**Files:**
- Create: `apps/user/app/(content)/requests/page.tsx`

- [ ] **Step 1: 페이지 작성**

project-management/app/(dashboard)/requests/page.tsx와 동일 패턴. `requireAuth() + listRequestsForUser(user, "all") + RequestList` 조합. 페이지 wrapper에 `p-4 md:p-6` 추가.

- [ ] **Step 2: 타입 체크 + 동작 확인**

```bash
pnpm check-types
# /requests 진입 (dev 서버)
```

- [ ] **Step 3: 커밋**

```bash
git add apps/user/app/\(content\)/requests/page.tsx
git commit -m "feat(user): add /requests page"
```

---

### Task 5: 페이지 이전 — `/requests/[id]`

**Files:**
- Create: `apps/user/app/(content)/requests/[id]/page.tsx`

- [ ] **Step 1: 페이지 작성**

```ts
import { notFound } from "next/navigation";
import { RequestDetailClient } from "@/components/requests/RequestDetailClient";
import { requireAuth } from "@/lib/auth";
import { getRequestDetail } from "@/lib/requests";

type PageProps = { params: Promise<{ id: string }> };

export default async function RequestDetailPage({ params }: PageProps) {
  const user = await requireAuth();
  const { id } = await params;
  const detail = await getRequestDetail(id, user);
  if (!detail) notFound();
  return (
    <div className="p-4 md:p-6">
      <RequestDetailClient {...detail} currentUser={user} />
    </div>
  );
}
```

- [ ] **Step 2: 동작 확인**

`/requests/[id]` 진입, 댓글/첨부/이력/완료메모 모두 표시되는지.

- [ ] **Step 3: 커밋**

```bash
git add apps/user/app/\(content\)/requests/\[id\]/page.tsx
git commit -m "feat(user): add /requests/[id] detail page"
```

---

### Task 6: 페이지 이전 — `/requests/mine`, `/queue`

**Files:**
- Create: `apps/user/app/(content)/requests/mine/page.tsx`
- Create: `apps/user/app/(content)/queue/page.tsx`

- [ ] **Step 1: 두 페이지 작성**

각 페이지는 `listRequestsForUser(user, "mine"|"queue")` + RequestList 조합. 페이지 타이틀만 다름.

- [ ] **Step 2: 동작 확인**

- [ ] **Step 3: 커밋**

```bash
git add apps/user/app/\(content\)/requests/mine/page.tsx apps/user/app/\(content\)/queue/page.tsx
git commit -m "feat(user): add /requests/mine and /queue pages"
```

---

### Task 7: 페이지 이전 — `/requests/new`

**Files:**
- Create: `apps/user/app/(content)/requests/new/page.tsx`

- [ ] **Step 1: 페이지 작성**

신규 요청 작성 폼. RequestForm 컴포넌트를 client wrapper로 감싸 사용.

```ts
import { requireAuth } from "@/lib/auth";
import { RequestForm } from "@/components/requests/RequestForm";

export default async function NewRequestPage() {
  await requireAuth();
  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-4 text-xl font-semibold text-[#111111]">신규 업무 요청</h1>
      <RequestForm />
    </div>
  );
}
```

- [ ] **Step 2: 동작 확인 — 신규 요청 생성 → /requests/[id]로 이동되는지**

- [ ] **Step 3: 커밋**

```bash
git add apps/user/app/\(content\)/requests/new/page.tsx
git commit -m "feat(user): add /requests/new page"
```

---

### Task 8: middleware matcher 확장

**Files:**
- Modify: `apps/user/middleware.ts`

- [ ] **Step 1: matcher 추가**

```ts
export const config = {
  matcher: [
    "/projects/:path*",
    "/overview/:path*",
    "/requests/:path*",  // 신규
    "/queue/:path*",      // 신규
  ],
};
```

`PROTECTED_PREFIXES`에도 `/requests`, `/queue` 추가.

- [ ] **Step 2: 동작 확인 (비로그인 → /requests 진입 시 /login 리다이렉트)**

- [ ] **Step 3: 커밋**

```bash
git add apps/user/middleware.ts
git commit -m "feat(user): protect /requests and /queue routes via middleware"
```

---

### Task 9: 사이드바에 3개 메뉴 추가

**Files:**
- Modify: `apps/user/components/Sidebar.tsx`

- [ ] **Step 1: "업무 / 프로젝트" 그룹에 항목 추가**

```ts
{
  label: "업무 / 프로젝트",
  items: [
    { id: "projects", label: "프로젝트", href: "/projects", icon: FolderKanban },
    { id: "overview", label: "한눈에 보기", href: "/overview", icon: Network },
    { id: "requests", label: "업무 요청", href: "/requests", icon: Inbox },             // 신규
    { id: "requests-mine", label: "내 업무 요청", href: "/requests/mine", icon: Send }, // 신규
    { id: "queue", label: "처리할 업무 요청", href: "/queue", icon: CheckSquare },        // 신규
  ],
},
```

lucide import에 `Inbox, Send, CheckSquare` 추가.

- [ ] **Step 2: 동작 확인 — 사이드바 표시 + 라우팅**

- [ ] **Step 3: 커밋**

```bash
git add apps/user/components/Sidebar.tsx
git commit -m "feat(user): add request menu entries to sidebar"
```

---

### Task 10: Cmd+K 검색 Dialog — `RequestSearchDialog` 컴포넌트

**Files:**
- Create: `apps/user/components/search/RequestSearchDialog.tsx`

project-management의 Header 안에 정의된 `RequestSearchDialog` 로직을 가져와 독립 컴포넌트로 추출.

- [ ] **Step 1: 컴포넌트 작성**

원본은 `apps/project-management/components/layout/Header.tsx` 내부의 `RequestSearchDialog` 함수. 그대로 추출하고 import 경로 교정:
- `@/lib/requests` ✓
- `@/lib/auth` 불필요 (client component)
- `useRouter`, `useState`, `useEffect` 등 그대로

위젯 데이터는 `/api/requests` GET (이미 있음) + `/api/masters` (Phase 1에서 이전됨) 호출.

- [ ] **Step 2: 타입 체크**

- [ ] **Step 3: 커밋**

```bash
git add apps/user/components/search/RequestSearchDialog.tsx
git commit -m "feat(user): extract RequestSearchDialog (Cmd+K request search)"
```

---

### Task 11: Cmd+K 트리거를 user 앱 헤더/레이아웃에 통합

**Files:**
- Modify: `apps/user/app/components/Header.tsx` 또는 적당한 client wrapper (위치는 사용자와 확인)
- 또는 신규 client component: `apps/user/components/search/SearchLauncher.tsx`

- [ ] **Step 1: 트리거 컴포넌트 작성**

```ts
"use client";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { RequestSearchDialog } from "@/components/search/RequestSearchDialog";

export function SearchLauncher() {
  const [open, setOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(navigator.platform));
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const isShortcut = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (!isShortcut) return;
      e.preventDefault();
      setOpen((current) => !current);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-[#e5e7eb] bg-white px-2.5 text-slate-600 transition-colors hover:bg-[#f9f9fa]"
        title={`업무 요청 검색 (${isMac ? "⌘" : "Ctrl"}+K)`}
      >
        <Search size={16} strokeWidth={1.5} />
        <kbd className="inline-flex items-center gap-0.5 rounded border border-[#e5e7eb] bg-[#f9f9fa] px-1 py-0.5 text-[10px] font-medium text-slate-500">
          {isMac ? "⌘" : "Ctrl"}<span>K</span>
        </kbd>
      </button>
      <RequestSearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
```

- [ ] **Step 2: user 앱 헤더/레이아웃에 마운트**

원본 user 앱은 모바일 PWA라 별도 헤더가 없을 수 있음. 사이드바 상단 또는 BottomNavigation 사이드 옵션. 가장 깔끔한 위치를 결정.

대안: `apps/user/app/(content)/layout.tsx`에서 fixed 위치에 마운트 (사용자 의견 필요).

- [ ] **Step 3: 동작 확인 — Cmd+K로 Dialog 열림, 검색 결과 클릭 시 페이지 이동**

- [ ] **Step 4: 커밋**

```bash
git add apps/user/components/search/SearchLauncher.tsx apps/user/app/...
git commit -m "feat(user): integrate Cmd+K request search launcher into header"
```

---

### Task 12: project-management 측 cutover

**Files:**
- Modify: `apps/project-management/next.config.ts` (redirects 추가) 또는 그대로 유지

- [ ] **Step 1: 안내 배너 (선택)**

project-management 페이지 상단에 "이 페이지는 ACG 식대 앱으로 이전되었습니다" 배너 추가. 점진적 사용자 안내.

- [ ] **Step 2: 또는 redirects (강제 이전)**

```ts
// apps/project-management/next.config.ts
async redirects() {
  return [
    { source: "/requests/:path*", destination: "https://meal-app-url/requests/:path*", permanent: false },
    { source: "/queue", destination: "https://meal-app-url/queue", permanent: false },
  ];
}
```

운영 배포 후 7-14일 dogfooding 끝나면 적용 권장. Phase 2 작업 시점에는 코드만 준비, 적용은 사용자 판단.

- [ ] **Step 3: 커밋**

```bash
git add apps/project-management/next.config.ts
git commit -m "chore(project-management): prepare redirect to user app for request routes"
```

---

### Task 13: 수동 회귀 테스트 (Phase 2 체크리스트)

- [ ] 로그인 후 사이드바 "업무 / 프로젝트" 그룹에 5개 메뉴 표시
- [ ] /requests 접근 가능 (필터/검색 동작)
- [ ] 비로그인 → /requests, /queue 접근 시 /login 리다이렉트
- [ ] /requests/[id] 진입 시 댓글/첨부/이력/완료메모 모두 표시
- [ ] 신규 요청 생성 (`/requests/new`) 정상 → 상세 페이지 이동
- [ ] 요청 수정/삭제 동작 (권한 있는 경우)
- [ ] 댓글 추가/삭제 동작
- [ ] 첨부파일 업로드 동작
- [ ] 완료메모 작성/수정/삭제 동작
- [ ] Cmd+K 열림 + 키워드 검색 + 결과 클릭 시 이동
- [ ] 모바일 PWA에서 동작 확인
- [ ] project-management 앱에서도 이중 운영 정상 (선택)

---

## Self-Review

**Spec coverage:**
- 페이지: Task 4/5/6/7 ✓ (5개 페이지 모두)
- API: Task 3 ✓ (CRUD + 댓글 + 첨부 + 완료메모)
- 컴포넌트: Task 2 ✓ (RequestList, Form, Detail, CreateDialog)
- lib 확장: Task 1 ✓
- middleware: Task 8 ✓
- 사이드바: Task 9 ✓
- Cmd+K 검색: Task 10/11 ✓
- Cutover: Task 12 ✓
- 검증: Task 13 ✓

**Placeholder/모호함:**
- Task 11의 SearchLauncher 마운트 위치 — user 앱에 어디에 둘지 명시 미정. 실제 작업 시 사용자와 확인 필요 (사이드바 상단 vs 별도 fixed 헤더 vs 레이아웃 oneoff).
- Task 12의 cutover 방식 — 배너 vs redirect, 시기 미정. 적용은 운영팀 판단.

이 둘은 "사용자 협의 후 결정" 항목으로 의도된 미결.

---

## Execution Handoff

이 plan을 실행하려면:
- **Subagent-Driven (추천)**: 각 Task를 fresh subagent에 dispatch
- **Inline**: 현 세션에서 순차 실행

Phase 1 패턴과 동일하게 small/foundation 부터 순차 진행.
