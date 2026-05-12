# project-management → user 앱 통합 설계 (Spec)

- 작성일: 2026-05-12
- 작성자: 김현민 (hmkim@acghr.co.kr) + AI 협업
- 상태: Draft (review 대기)

## 배경

현재 모노레포에는 두 개의 직원 대상 Next.js 앱이 운영 중이다.

- `apps/user` (port 3000) — ACG 식대 PWA. 식대·근태·휴가·복지포인트·회의실 예약 등 직원 일상 업무. 모든 직원이 매일 사용.
- `apps/project-management` (port 3013) — 프로젝트/업무 요청 관리. 비교적 신규. 별도 도메인/북마크로 접근.

두 앱은 같은 Supabase 인스턴스를 사용하지만 인증·레이아웃·네비게이션 패턴이 완전히 다르다.

## 목표

1. **단일 로그인/통합 UX**: 직원이 한 앱(user)에서 식대·근태·휴가·프로젝트·업무 요청을 모두 처리할 수 있게 한다.
2. **기능 노출 확대**: 매일 사용되는 user 앱 안에서 프로젝트/요청 기능에 자연스럽게 접근 가능하게 한다.

## 최종 상태

- `apps/project-management/` 폴더는 통합 완료 후 삭제한다.
- 모든 기능은 `apps/user/` 안에서 동작한다.
- DB는 두 스키마(`public`, `work`)로 분리 유지한다. 데이터 마이그레이션은 없다.

## 사용자 범위

전 직원이 프로젝트/요청 기능에 접근한다. `/settings`(마스터 데이터 관리) 같은 admin 전용 메뉴는 `SessionUser.role === 'admin'`일 때만 사이드바에 노출한다.

## 접근 방식: Minimum Invasive

project-management 코드를 거의 그대로 `apps/user/` 안으로 옮긴다. server component·`requireAuth()` 패턴은 유지하고, 인증 채널만 user 앱의 Zustand+localStorage 모델과 정합되도록 쿠키 세션을 추가한다.

대안으로 검토했던 "풀 리팩토링(모두 client + React Query)" 및 "Path Group 격리"는 작업량/일관성 측면에서 부적합하다고 판단했다.

## 아키텍처

### 물리적 배치

```
apps/user/
├── app/
│   ├── (content)/
│   │   ├── projects/              # 신규, Phase 1
│   │   ├── projects/[id]/         # 신규, Phase 1
│   │   ├── overview/              # 신규, Phase 1
│   │   ├── requests/              # 신규, Phase 2
│   │   ├── requests/[id]/         # 신규, Phase 2
│   │   ├── requests/mine/         # 신규, Phase 2
│   │   ├── requests/new/          # 신규, Phase 2
│   │   ├── queue/                 # 신규, Phase 2
│   │   ├── dashboard/             # 기존, Phase 1에서 위젯 통합
│   │   └── (기존 메뉴 그대로)
│   └── api/
│       ├── projects/              # 신규, Phase 1
│       ├── masters/               # 신규, Phase 1
│       ├── project-stats/         # 신규, Phase 1 (대시보드 위젯용)
│       ├── recent-activity/       # 신규, Phase 1 (대시보드 위젯용)
│       ├── requests/              # 신규, Phase 2
│       ├── settings/              # 신규, Phase 3 (admin)
│       └── (기존 API 그대로)
├── components/
│   ├── projects/                  # 이동
│   ├── overview/                  # 이동
│   ├── requests/                  # 이동 (Phase 2)
│   ├── project-dashboard/         # 이동 + rename (구 components/dashboard/)
│   └── (기존 컴포넌트 그대로)
├── hooks/
│   ├── use-project-stats.ts       # 신규, Phase 1
│   ├── use-recent-activity.ts     # 신규, Phase 1
│   ├── use-my-requests.ts         # 신규, Phase 1
│   └── (기존 훅 그대로)
├── lib/
│   ├── auth.ts                    # 신규: getSessionUser, requireAuth, sign/verify
│   ├── projects.ts                # 이동
│   ├── overview.ts                # 이동
│   ├── masters.ts                 # 이동
│   ├── requests.ts                # 이동 (Phase 2)
│   ├── storage.ts                 # 기존 merge (이미 멀티 버킷 지원)
│   └── supabase/
│       ├── client.ts              # 기존 (default: public)
│       └── client-work.ts         # 신규 (default: work)
├── middleware.ts                  # 신규: /projects, /overview, /requests, /queue 경로 가드
└── package.json                   # @xyflow/react 등 추가 의존성
```

### 충돌 회피 명세

- 기존 user 앱: `/api/auth/login`, `/api/auth/logout`, `/api/notifications`, `/api/settings` 존재 → project-management 측 동일 경로는 가져오지 않는다 (user 앱 것을 그대로 쓴다)
- `components/dashboard/`: user 앱에 동명 폴더 존재 → 이전 코드는 `components/project-dashboard/`로 rename
- `lib/requests.ts`: user 앱에 동명 파일 없음 (확인됨)
- `RequestForm`, `CalendarPanel` 등 단일 컴포넌트명: user 앱과 충돌 없음 확인 후 이동

### Supabase 스키마 분리

| 스키마 | 용도 | 클라이언트 헬퍼 |
|--------|------|----------------|
| `public` | members, holidays, meal_logs, attendance, dayoffs, points 등 user 앱 기존 도메인 | `createServiceClient()` (기존) |
| `work` | projects, project_requests, project_checklist_items, project_attachments, attachments(요청 첨부), comments, events, requests | `createWorkClient()` (신규) |

기존 `project_management` 스키마를 통합 과정에서 `work`로 rename 한다.

```sql
-- supabase/migrations/20260512130000_rename_project_management_to_work.sql
ALTER SCHEMA project_management RENAME TO work;
GRANT USAGE ON SCHEMA work TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA work TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA work TO service_role;
```

### Schema rename 코디네이션 (중요)

스키마 rename은 atomic 작업이라 코드와 DB 동기화가 필요하다.

권장 순서:

1. PR 단위: `apps/project-management`와 (신설되는) `apps/user`의 `createWorkClient` 둘 다 `"work"` 스키마를 참조하도록 코드 수정. PR은 머지하되 아직 배포 안 함.
2. 점검 시간(가능한 짧게 — 트래픽 적은 시간대)에:
   - `ALTER SCHEMA project_management RENAME TO work;` 실행
   - 직후 두 앱 모두 재배포
3. 검증: 두 앱 모두에서 프로젝트/요청 페이지가 정상 동작하는지 확인
4. 롤백 시: `ALTER SCHEMA work RENAME TO project_management;` 후 직전 배포로 revert

대안으로 schema 이름을 환경변수(`WORK_SCHEMA=work` 또는 `project_management`)로 빼서 단계적 전환도 가능하지만, 두 앱이 같은 인스턴스에 동시 접근하므로 atomic 전환이 더 단순하다.

## 인증 어댑테이션

user 앱은 Zustand+localStorage 기반이고 서버는 user 정보를 모른다. project-management의 server component는 `requireAuth()`로 서버에서 user 정보를 사용한다. 통합을 위해 **듀얼 세션** (쿠키 + Zustand 미러)을 도입한다.

### 로그인 흐름

```
POST /api/auth/login (수정)
  1. members 테이블 조회 + 비밀번호 확인 (기존)
  2. 응답 body로 member 반환 → 클라이언트 Zustand+localStorage 저장 (기존)
  3. Set-Cookie: acg_session=<base64({userId, role, exp})>
     - HttpOnly, SameSite=Lax, Secure(prod), maxAge=14일
     - HMAC-SHA256 서명, SESSION_SECRET 환경변수 사용
```

### 서버 사이드 사용

```typescript
// apps/user/lib/auth.ts
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookie = (await cookies()).get("acg_session")?.value;
  if (!cookie) return null;
  const payload = verifySession(cookie);
  if (!payload) return null;
  if (payload.exp < Date.now()) return null;
  // DB에서 최신 member 조회
  const member = await fetchMemberById(payload.userId);
  return member ? toSessionUser(member) : null;
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
```

### 로그아웃 흐름

```
POST /api/auth/logout (수정)
  1. Zustand clear (기존, 클라이언트)
  2. Set-Cookie: acg_session=; Max-Age=0
```

### Middleware

```typescript
// apps/user/middleware.ts (신규)
export const config = {
  matcher: [
    "/projects/:path*",
    "/overview/:path*",
    "/requests/:path*",
    "/queue/:path*",
  ],
};

export function middleware(request: NextRequest) {
  const cookie = request.cookies.get("acg_session")?.value;
  if (!cookie || !verifySession(cookie)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
```

기존 user 앱의 라우트(meal, attendance 등)는 matcher에 포함하지 않아 영향 없다.

### 보안 수준 명시

- 현재 user 앱은 비밀번호 평문 비교 + 클라이언트 신뢰 모델을 사용한다. `acg_session` 쿠키도 같은 수준의 신뢰 모델로, signed 토큰일 뿐 더 강한 보안 보강은 이 spec의 범위가 아니다.
- `SESSION_SECRET` 환경변수는 `apps/user/.env.local` 및 Vercel 환경변수에 사용자가 직접 설정한다 (32바이트 랜덤).

### 기존 로그인 사용자 처리

기존 로그인된 사용자는 다음 로그인 시점부터 `acg_session` 쿠키를 받는다. Phase 1 배포 직후 기존 세션에는 쿠키가 없으므로 `/projects` 진입 시 `/login`으로 리다이렉트되어 재로그인을 유도한다.

## 데이터 흐름

### Server Component

```
[/projects 접근]
   ↓
middleware.ts: acg_session 쿠키 검증, 없으면 /login redirect
   ↓
app/(content)/projects/page.tsx (server component)
   ↓
requireAuth() → getSessionUser() → cookies()
   ↓
listProjectsForUser(user)
   ↓
createWorkClient()
   ↓
.from("projects").select(...)
   ↓
ProjectList client component로 props 전달
```

### Client Component (대시보드 위젯 등)

```
[user 앱 /dashboard 페이지 (기존, "use client")]
   ↓
<ProjectSummaryCards />, <RecentActivityWidget />, <MyCalendarPanel /> 신규 위젯
   ↓
useProjectStats() / useRecentActivity() / useMyRequests() React Query 훅
   ↓
GET /api/project-stats, /api/recent-activity, /api/requests?view=queue
   ↓
서버에서 requireAuth() + createWorkClient() 사용
   ↓
JSON 응답
```

## Phase 정의

### Phase 1 — 프로젝트 도메인

기간 추정: ≈ 1주

**이전 대상**
- 페이지: `/projects`, `/projects/[id]`, `/overview`
- API: `/api/projects/*` (체크리스트/첨부 포함), `/api/masters`, `/api/project-stats`, `/api/recent-activity`
- 컴포넌트: `components/projects/*`, `components/overview/*`, 구 `components/dashboard/*` → `components/project-dashboard/*`
- lib: `lib/projects.ts`, `lib/overview.ts`, `lib/masters.ts`, `lib/storage.ts` 통합
- 의존성: `@xyflow/react` 추가
- DB 마이그레이션:
  - `20260512120000_project_attachments.sql` (이미 작성됨)
  - `20260512130000_rename_project_management_to_work.sql` (신규)

**신규 작업**
- `lib/auth.ts` (쿠키 세션 + `getSessionUser`/`requireAuth`)
- `middleware.ts` matcher: `["/projects/:path*", "/overview/:path*"]`
- 사이드바에 "업무 / 프로젝트" 그룹 추가
- `lib/supabase/client-work.ts` (work 스키마용 service client)
- `apps/user/app/(content)/dashboard/page.tsx`에 위젯 3개 추가

**Definition of Done**
- 모든 Phase 1 페이지가 user 앱에서 정상 동작
- project-management 앱에도 그대로 살아 있음 (이중 운영)
- 수동 시나리오 체크리스트 통과 (아래 참고)

### Phase 2 — 요청 도메인

기간 추정: ≈ 1.5주

**이전 대상**
- 페이지: `/requests`, `/requests/mine`, `/requests/[id]`, `/requests/new`, `/queue`
- API: `/api/requests/*` (댓글/첨부/이력/완료메모 모두)
- 컴포넌트: `components/requests/*`
- lib: `lib/requests.ts`
- Cmd+K 검색 Dialog: user 앱 헤더 또는 사이드바 상단 위치에 통합

**주의**
- user 앱의 기존 `/api/my-requests`는 휴가 신청용. 라우트 충돌은 없지만 사용자 메뉴 라벨링에서 "업무 요청 / 휴가 요청"을 명확히 구분한다.
- middleware matcher에 `/requests`, `/queue` 추가

**Definition of Done**
- 모든 Phase 2 페이지가 user 앱에서 정상 동작
- Cmd+K 검색이 user 앱에서 동작
- 수동 시나리오 체크리스트 통과

### Phase 3 — 관리/설정 + 정리

기간 추정: ≈ 1주

**이전 대상**
- 페이지: `/settings` (마스터 데이터 관리)
- 권한 분기: admin 전용 (`SessionUser.role === 'admin'`)
- 관련 API

**정리 작업**
- `apps/project-management/` 폴더 삭제
- `turbo.json`, `pnpm-workspace.yaml`에서 project-management 제거
- 루트 `package.json` scripts (`dev:project-management` 등) 제거
- CI/CD 빌드 잡 제거
- Vercel 등 호스팅에서 도메인 라우팅 정리

**Definition of Done**
- 모든 도메인 사용자가 user 앱만으로 업무 수행
- project-management 앱은 완전히 사라짐
- DB 데이터는 그대로 유지 (스키마/테이블/스토리지 그대로)

## 네비게이션 통합

### 사이드바 (`apps/user/components/Sidebar.tsx`)

기존 menuGroups에 신규 그룹 추가:

```
근태 (기존)
식대/복지 (기존)
업무 / 프로젝트 (신규, Phase 1 그룹 추가)
  - 프로젝트                  /projects             Phase 1
  - 한눈에 보기                /overview             Phase 1
  - 업무 요청                  /requests             Phase 2
  - 내 업무 요청               /requests/mine        Phase 2
  - 처리할 업무 요청            /queue                Phase 2
기타 (기존)
관리 (admin 전용, Phase 3)
  - 마스터 데이터 관리           /settings             Phase 3
```

### BottomNavigation

PWA 슬롯 제약상 신규 메뉴는 BottomNavigation에 추가하지 않는다. 사용 빈도 측정 후 결정.

### 라벨 규칙

신규 메뉴는 "업무" 접두어로 통일한다. user 앱의 기존 "휴가 신청 / 결재"와 명확히 구분된다.

### 아이콘 매핑 (lucide-react)

- 프로젝트 → `FolderKanban`
- 한눈에 보기 → `Network`
- 업무 요청 → `Inbox`
- 내 업무 요청 → `Send`
- 처리할 업무 요청 → `CheckSquare`
- 마스터 데이터 관리 → `Settings`

### Cmd+K 검색

Phase 2와 함께 도입한다. 모바일/태블릿/데스크탑 모두 동작. 위치는 user 앱 헤더 표준에 맞춰 Phase 2 구현 시점에 결정한다.

## Cutover & 롤백

### 기본 원칙

- DB는 공유 — 데이터 일관성 유지, 이중 운영 가능
- 스키마 변경은 backward-compatible (Phase 동안 둘 다 동작해야 함)
- 신규 컬럼은 nullable + default. 컬럼 제거/rename은 모든 Phase 완료 전엔 하지 않음

### Phase별 Cutover 순서

각 Phase 공통:

```
1. 코드 머지 (user 앱에 신규 라우트 추가)
2. 환경변수 추가 (Phase 1 시점에 SESSION_SECRET 한 번만)
3. DB 마이그레이션 적용 (필요한 경우, 사용자 직접)
4. user 앱 배포 → 내부 dogfooding 2-3일
5. project-management 앱에 안내 배너 노출
6. project-management의 해당 페이지를 user 앱으로 301 redirect (next.config)
7. 1주 후 안정성 확인 시 project-management 측 해당 페이지 코드 삭제 가능
```

Phase 3 마지막: project-management 앱 전체 삭제.

### 롤백 시나리오

| 상황 | 절차 |
|------|------|
| user 앱 배포 후 신규 기능 깨짐 | Vercel 이전 배포로 즉시 revert. project-management는 살아 있어 사용자 영향 최소 |
| Cutover 후 redirect 문제 | next.config redirects 제거하여 project-management 다시 접근 가능하게 복구 |
| 쿠키 세션 동작 안 함 | `getSessionUser()` 친절한 에러/안내. 필요시 Zustand 값으로 fallback 검토 |
| 권한 모델 우려 | Phase 3에서 admin 분기 강화 (큰 보강은 별도 sprint) |

### 모니터링

- Vercel Analytics (이미 user 앱 도입됨) — 신규 라우트 트래픽 확인
- Phase별 cutover 후 1주간 user 피드백 수집

## 테스팅 전략

테스트 프레임워크가 없으므로 (CLAUDE.md 명시) 수동 시나리오 체크리스트로 검증한다.

### Phase 1 체크리스트

- [ ] 로그인 → `/projects` 접근 가능
- [ ] 비로그인 → `/projects` 접근 시 `/login` 리다이렉트
- [ ] 프로젝트 생성/수정/삭제 정상
- [ ] 체크리스트 항목 추가/수정/삭제/완료 토글
- [ ] 첨부파일 업로드/다운로드/삭제
- [ ] 한눈에 보기 (overview) ReactFlow 렌더
- [ ] 사이드바 "업무 / 프로젝트" 그룹 표시
- [ ] 대시보드 위젯 (요약/최근 활동/캘린더) 동작
- [ ] 모바일 PWA에서 동작 확인 (BottomNav 영향 없음 확인)
- [ ] 로그아웃 시 쿠키 클리어 확인
- [ ] project-management 앱에서도 정상 동작 (이중 운영 검증)
- [ ] schema rename 후 project-management 앱이 work 스키마로 정상 쿼리

### Phase 2 체크리스트 (Phase 2 작업 시 작성)
### Phase 3 체크리스트 (Phase 3 작업 시 작성)

### Phase 3 완료 후 체크리스트

- [ ] project-management 앱 전부 redirect
- [ ] 모든 도메인 사용자가 user 앱만으로 업무 수행 가능
- [ ] CI/CD에서 project-management 빌드 잡 제거
- [ ] turbo.json/workspace에서 제거
- [ ] DB는 데이터 그대로 (스키마/테이블/스토리지 그대로)

## 영향받는 외부 시스템

- **Vercel/호스팅**: project-management용 별도 프로젝트(있다면)는 Phase 3 종료 시점에 삭제 또는 user 앱 도메인으로 redirect
- **Supabase**: 스키마 rename (`project_management` → `work`)만 적용. 데이터 마이그레이션 없음
- **사용자 북마크**: project-management URL 북마크는 Phase별 cutover 시점부터 user 앱으로 redirect

## 미결정 / Follow-up

- Phase 2에서 Cmd+K 검색의 정확한 위치 (헤더 vs 사이드바)
- BottomNavigation에 신규 메뉴 추가 여부 (사용 빈도 측정 후 결정)
- 보안 보강 (비밀번호 해싱 등)은 이번 통합 범위 밖, 별도 sprint
