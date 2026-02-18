# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 레포지토리에서 작업할 때 참고하는 프로젝트 컨텍스트입니다.

## 프로젝트 개요

Meal ACG v3 - 기업용 식대 관리 애플리케이션

## 개발 명령어

```bash
# 의존성 설치
pnpm install

# 개발 서버
pnpm dev          # 전체 dev 서버 실행 (user:3000, admin:3001)
pnpm dev:user     # user 앱만 실행 (port 3000)
pnpm dev:admin    # admin 앱만 실행 (port 3001)

# 빌드
pnpm build        # 모노레포 전체 빌드
pnpm build:user   # user 앱만 빌드
pnpm build:admin  # admin 앱만 빌드

# 코드 품질
pnpm lint         # ESLint (max warnings = 0)
pnpm check-types  # TypeScript 타입 체크
pnpm format       # Prettier 포매팅
```

## 아키텍처

Turborepo + pnpm workspaces **모노레포**:

```
apps/
  user/              # 사용자용 Next.js 15 앱 (port 3000)
  admin/             # 관리자 대시보드 Next.js 15 앱 (port 3001)

packages/
  ui/                # 공유 Radix UI 컴포넌트 (@repo/ui)
  utils/             # 공유 유틸리티 - dayjs, KST 날짜 함수 (@repo/utils)
  eslint-config/     # 공유 ESLint 설정
  typescript-config/ # 공유 TypeScript 설정
  tailwind-config/   # 공유 Tailwind 설정
```

## 기술 스택

- **프레임워크:** Next.js 15 (App Router, Turbopack), React 19
- **언어:** TypeScript 5 (strict mode)
- **스타일링:** Tailwind CSS 4, Motion (애니메이션), Radix UI
- **상태 관리:** Zustand (클라이언트), TanStack React Query (서버)
- **백엔드:**
  - user 앱: Supabase, Google APIs (Sheets, Calendar), Gemini AI (영수증 스캔)
  - admin 앱: Supabase (SSR client + RLS, service client로 관리자 작업)
- **빌드:** Turborepo, pnpm

## 주요 패턴

### Query Keys (Factory 패턴)
각 앱의 `lib/query-keys.ts`에 중앙화:
```typescript
// User 앱
queryKeys.meals.byUserAndMonth(userName, month, year)
queryKeys.points.activity.byPeriod(memberId, period)

// Admin 앱
queryKeys.stats.monthly(year, month)
queryKeys.memberStatuses.all
queryKeys.budgetAllocations.byPeriod(period)
queryKeys.usageRecords.byPeriod(period)
```

### 데이터 페칭 Hooks
`hooks/` 디렉토리에서 React Query를 래핑한 커스텀 훅:
```typescript
// 패턴: use-{resource}.ts 또는 use-{resource}-{action}.ts
useMealData(userName, month, year)
useMealSubmit()  // mutation 훅
```

### Zustand Stores
각 앱의 `stores/` 디렉토리:
```typescript
// User 앱
useUserStore()        // 인증 상태 (localStorage 영속화)
useMealDrawerStore()  // UI 상태

// Admin 앱
useAuthStore()        // 관리자 세션 상태
```

### 공유 패키지
- `@repo/ui`: Radix 기반 컴포넌트 (Button, Dialog, Drawer 등)
- `@repo/utils`: KST 타임존 날짜 유틸리티 (formatDate, getToday 등)

### Tailwind CSS 4
CSS-first 설정 사용 (`@import "tailwindcss"` + `@import "@repo/tailwind-config"`). `tailwind.config.ts` 없음 — `packages/tailwind-config/shared-styles.css`에서 `@theme` 디렉티브로 커스텀 테마 정의.

### Supabase (Admin 앱)
- 브라우저 클라이언트: `lib/supabase/client.ts` - typed Database로 createBrowserClient
- 서버 클라이언트: `lib/supabase/server.ts` - 쿠키 기반 createServerClient
- 서비스 클라이언트: RLS 우회하여 관리자 작업 수행
- 타입: `lib/supabase/types.ts` - 자동 생성된 Database 타입

### Supabase (User 앱)
- 브라우저 클라이언트만 사용: `lib/supabase/client.ts` (SSR 서버 클라이언트 없음)
- 타입: `lib/supabase/types.ts`
- 식사 유틸리티: `lib/supabase/meals.ts`

### 인증
- **Admin 앱:** 쿠키 기반 세션 (`admin-session`), 미들웨어 보호, API 라우트에서 `requireAdmin()` 사용
- **User 앱:** Zustand 스토어 + localStorage 영속화, 미들웨어 보호 없음

## 코드 규칙

- **ESLint:** 경고 0개 정책 (`--max-warnings 0`)
- **TypeScript:** strict 모드, `tsc --noEmit`
- **커밋:** 한글 커밋 메시지 + 접두사 (feat/fix/refactor/style/docs)

## 환경 변수

각 앱의 `.env.local`에 필수 키 포함:

- Admin: `apps/admin/.env.local` — Supabase, Google Calendar API, Slack bot token, VAPID keys
- User: `apps/user/.env.local` — Supabase, Google Sheets 인증, Gemini API, VAPID public key

## 근태 값

`meal_logs.attendance` 컬럼에 저장되는 값들:

| 값 | 설명 | 식대 계산 |
|----|------|----------|
| `근무` | 일반 출근 | 포함 |
| `근무(개별식사 / 식사안함)` | 개별 식사 | **제외** |
| `재택근무` | 재택 | **제외** |
| `연차/휴무` | 연차/휴무 | **제외** |
| `오전 반차/휴무` | 오전 반차 | **제외** |
| `오후 반차/휴무` | 오후 반차 | **제외** |

**사용가능액 공식:** `일일단가 × (근무일 - 휴일 - 재택 - 개별 + 주말근무)`

## API 패턴

각 앱의 `app/api/`에서 REST 컨벤션을 따르는 API 라우트:

- **Admin**: auth, members, member-statuses, meal-logs, stats, export/import (Excel), budget-allocations, budget-summary, usage-records, points-overview, organizations/divisions/teams, notifications, settings, holidays, monthly, lunch-groups, settlement, slack
- **User**: auth, users, meals, points (welfare/activity/dashboard/lookup), restaurants, scan-receipt (Gemini AI), notifications, settings, monthly, lunch-group, holidays, google-sheets, calendar

### Supabase RPC
월별 통계는 `get_user_monthly_stats` RPC 함수로 집계 (DB 레벨 계산)

## 주의사항

### Excel 라이브러리
- **Import/파싱:** `xlsx` 패키지 (`lib/excel-parser.ts`)
- **Export/생성:** `exceljs` 패키지

### Motion (애니메이션)
패키지명은 `motion` (v12), `framer-motion`이 **아님**. Import: `import { motion, AnimatePresence } from "motion/react"`

### 추가 애니메이션/UI 라이브러리
- **User 앱:** `gsap` (스크롤 애니메이션), `canvas-confetti` (축하 효과), `react-snowfall`
- **Admin 앱:** `@dnd-kit/core` + `@dnd-kit/sortable` (드래그 앤 드롭), `es-hangul` (한글 유틸), `sonner` (토스트)

### 누락 체크 로직 (`/api/stats/incomplete-users`)
입력 누락 판별 시 **제외되는 조건**:
- 개별식사, 연차, 휴무, 휴가, 반차, 재택
- 근태가 '근무' 또는 '출근'이면 식사 입력 없어도 완료 처리

### 시간대
모든 날짜는 KST 기준. `@repo/utils`의 dayjs 유틸리티 사용 필수

### 빌드 설정
양쪽 앱 모두 next.config에서 `ignoreBuildErrors: true` (TS), `ignoreDuringBuilds: true` (ESLint) 설정됨. **반드시 `pnpm check-types`와 `pnpm lint`를 수동 실행할 것** — 빌드에서 에러를 잡지 못함.

### 테스트
테스트 프레임워크 미설정. 유닛/통합 테스트 없음.

### PWA (User 앱)
User 앱은 `@ducanh2912/next-pwa`를 통한 PWA. 빌드 시 서비스 워커 자동 생성.

### 푸시 알림
양쪽 앱 모두 VAPID 키를 사용한 Web Push 구현. 유틸리티: `lib/web-push.ts` (admin), `lib/push-notifications.ts` (user).
