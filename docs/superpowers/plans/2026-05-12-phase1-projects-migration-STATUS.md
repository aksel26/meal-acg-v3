# Phase 1 마이그레이션 — 진행 상태 (2026-05-12 업데이트)

## 완료 작업 ✅

### 기반 (Foundation)
- ✅ Task 2: `supabase/migrations/20260512130000_rename_project_management_to_work.sql`
- ✅ Task 3: `apps/user/lib/auth.ts` — 쿠키 세션 (HMAC 서명), `getSessionUser`, `requireAuth`
- ✅ Task 4: `apps/user/app/api/auth/login/route.ts` — `acg_session` 쿠키 set
- ✅ Task 5: `apps/user/app/api/auth/logout/route.ts` — 쿠키 clear
- ✅ Task 6: `apps/user/middleware.ts` — `/projects`, `/overview` 경로 가드
- ✅ Task 7: `apps/user/lib/supabase/client-work.ts`
- ✅ Task 8: `@xyflow/react@^12.10.2` 추가

### Lib 이전
- ✅ Task 9: `apps/user/lib/storage.ts`
- ✅ Task 10: `apps/user/lib/projects.ts`
- ✅ Task 11: `apps/user/lib/overview.ts`
- ✅ Task 12: `apps/user/lib/masters.ts`
- ✅ Task 13: `apps/user/lib/requests.ts`

### 컴포넌트 이전
- ✅ Task 14-16: `apps/user/components/projects/`, `overview/`, `project-dashboard/`, `requests/RequestBadge.tsx`

### API 라우트 이전
- ✅ Task 17: `/api/masters`
- ✅ Task 18: `/api/projects/*` 전체 트리
- ✅ Task 19: `/api/project-stats`
- ✅ Task 20: `/api/recent-activity`
- ✅ Task 25b: `/api/requests` (GET only)

### 페이지
- ✅ Task 21: `/projects`
- ✅ Task 22: `/projects/[id]`
- ✅ Task 23: `/overview`

### 네비게이션
- ✅ Task 24: Sidebar.tsx — "업무 / 프로젝트" 그룹

### 대시보드 위젯
- ✅ Task 25: 훅 3종 (`use-project-stats`, `use-recent-activity`, `use-my-requests`)
- ✅ Task 26: 컴포넌트 3종 (`ProjectSummaryCards`, `RecentActivityWidget`, `MyCalendarPanel`)
- ✅ Task 27: 대시보드 페이지 통합 (motion section 추가)

### project-management 측 호환
- ✅ Task 29: `apps/project-management/lib/supabase/server.ts` schema 리터럴 `project_management` → `work`
- ✅ 부가: `supabase/config.toml` exposed schemas: `project_management` → `work`

---

## 미완료 작업 ⏸

### Task 28: 수동 회귀 테스트 (사용자)
- DB 마이그레이션 적용 후 Phase 1 체크리스트 실행

### Task 30: Cutover (사용자 직접)

**A. 로컬 DB 적용** (orbstack supabase):
1. supabase 서비스 확인 — 현재 `supabase_db_meal-v3 container is not ready: unhealthy` 상태로 보임. orbstack에서 supabase 재시작 필요.
2. 마이그레이션 적용:
   ```bash
   cd /Users/acg/Documents/meal-acg-v3
   supabase db reset      # 모든 마이그레이션 재실행 (개발용)
   # 또는
   supabase migration up  # 미적용 마이그레이션만 적용
   ```
3. 적용될 마이그레이션:
   - `20260512120000_project_attachments.sql` (이전 작업)
   - `20260512130000_rename_project_management_to_work.sql` (이번)

**B. 환경 변수 추가**:
- `apps/user/.env.local`에 `SESSION_SECRET` 추가:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  # 출력값을 .env.local에 SESSION_SECRET=... 형태로
  ```

**C. 검증**:
- `pnpm dev:user` — 로그인 후 `/projects`, `/overview`, `/dashboard` 접근
- `pnpm dev:project-management` — schema rename 후에도 정상 동작

**D. 운영 배포** (별도 시점):
- Vercel/호스팅 환경변수에 `SESSION_SECRET` 추가
- 원격 Supabase에 같은 마이그레이션 적용
- 두 앱 모두 재배포

---

## 검증 결과

- 새로 이전한 모든 파일 `pnpm check-types` 통과 (0 errors)
- 기존 user 앱 코드의 사전 type errors는 영향 없음 (`ignoreBuildErrors: true`)

---

## Phase 2/3 (후속)

- Phase 2: 요청 도메인 (`/requests`, `/queue`, Cmd+K 검색)
- Phase 3: 관리/설정 (`/settings`) + project-management 폴더 삭제

각 Phase는 별도 plan으로 작성 예정 (`docs/superpowers/plans/2026-XX-XX-phase2-...md`).
