# Phase 2 마이그레이션 — 진행 상태 (2026-05-12)

## 완료 작업 ✅

### Lib 확장 (Task 1)
- ✅ `apps/user/lib/requests.ts`에 추가
  - 타입: `RequestComment`, `RequestAttachment`, `RequestEvent`, `CompletionMemo`, `LinkedProjectSummary`, `RelatedRequestSummary`
  - 함수: `canReadRequest`, `getRequestDetailForUser`, `getLinkedProjectsForRequest`, `getRelatedRequests`

### 컴포넌트 이전 (Task 2)
- ✅ `apps/user/components/requests/CreateRequestDialog.tsx`
- ✅ `apps/user/components/requests/RequestForm.tsx`
- ✅ `apps/user/components/requests/RequestList.tsx`
- ✅ `apps/user/components/requests/RequestDetailClient.tsx`

### API 라우트 (Task 3)
- ✅ `apps/user/app/api/requests/route.ts` — GET + POST
- ✅ `apps/user/app/api/requests/[id]/route.ts` — GET/PATCH/DELETE
- ✅ `apps/user/app/api/requests/[id]/comments/route.ts`
- ✅ `apps/user/app/api/requests/[id]/attachments/route.ts`
- ✅ `apps/user/app/api/requests/[id]/completion-memos/[memoId]/route.ts`

### 페이지 (Task 4-7)
- ✅ `apps/user/app/(content)/requests/page.tsx` — 전체 요청
- ✅ `apps/user/app/(content)/requests/[id]/page.tsx` — 상세
- ✅ `apps/user/app/(content)/requests/mine/page.tsx` — 내 요청
- ✅ `apps/user/app/(content)/queue/page.tsx` — 처리할 요청
- ✅ `apps/user/app/(content)/requests/new/page.tsx` — /requests로 redirect

### Middleware (Task 8)
- ✅ `apps/user/middleware.ts` — `/requests/*`, `/queue/*` 추가

### Sidebar (Task 9)
- ✅ "업무 / 프로젝트" 그룹에 3개 메뉴 추가:
  - 업무 요청 (`/requests`, Inbox)
  - 내 업무 요청 (`/requests/mine`, Send)
  - 처리할 업무 요청 (`/queue`, CheckSquare)

### Cmd+K 검색 (Task 10-11)
- ✅ `apps/user/components/search/RequestSearchDialog.tsx` — 검색 Dialog (키워드 + 고객사 + 담당자 필터)
- ✅ `apps/user/components/search/SearchLauncher.tsx` — 헤더 트리거 + Cmd/Ctrl+K 글로벌 단축키
- ✅ `apps/user/app/components/Header.tsx` — SearchLauncher 마운트 (ApprovalBell 왼쪽)

---

## 검증 결과

- 새로 이전한 모든 파일 `pnpm check-types` 통과 (0 errors)

---

## 미완료 작업 ⏸

### Task 12: project-management 측 cutover
- 안내 배너 or redirect 적용 — 사용자 판단

### Task 13: 수동 회귀 테스트
- 로그인 후 사이드바 "업무 요청" 메뉴 표시 확인
- /requests, /requests/[id], /requests/mine, /queue 정상 동작
- 비로그인 → /requests, /queue 접근 시 /login 리다이렉트
- Cmd/Ctrl+K로 검색 Dialog 열림 + 검색 + 결과 클릭 시 이동
- 댓글/첨부/완료메모 작동
- 신규 요청 생성 → 상세 페이지로 이동
- project-management 앱도 정상 (이중 운영)

---

## Phase 2 사용자 다음 단계

1. **로컬 검증**:
   ```bash
   pnpm dev:user
   # 브라우저: /requests, /queue, Cmd+K 등 시나리오 테스트
   ```

2. **이슈 발견 시** 알려주시면 즉시 수정.

3. **Phase 3 진행 가능**: 관리/설정(`/settings`) + project-management 폴더 삭제
