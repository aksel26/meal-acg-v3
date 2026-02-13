# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Meal ACG v3 - 기업용 식대 관리 애플리케이션 (Enterprise meal expense management application)

## Development Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev          # Start all dev servers (user:3000, admin:3001)
pnpm dev:user     # Start only user app (port 3000)
pnpm dev:admin    # Start only admin app (port 3001)

# Build
pnpm build        # Build entire monorepo
pnpm build:user   # Build only user app
pnpm build:admin  # Build only admin app

# Code Quality
pnpm lint         # ESLint (max warnings = 0)
pnpm check-types  # TypeScript type checking
pnpm format       # Prettier formatting
```

## Architecture

**Monorepo** using Turborepo + pnpm workspaces:

```
apps/
  user/              # User-facing Next.js 15 app (port 3000)
  admin/             # Admin dashboard Next.js 15 app (port 3001)

packages/
  ui/                # Shared Radix UI components (@repo/ui)
  utils/             # Shared utilities - dayjs, KST date functions (@repo/utils)
  eslint-config/     # Shared ESLint config
  typescript-config/ # Shared TypeScript config
  tailwind-config/   # Shared Tailwind config
```

## Tech Stack

- **Framework:** Next.js 15 (App Router, Turbopack), React 19
- **Language:** TypeScript 5 (strict mode)
- **Styling:** Tailwind CSS 4, Motion (animations), Radix UI
- **State:** Zustand (client), TanStack React Query (server)
- **Backend:**
  - user app: Supabase, Google APIs (Sheets, Calendar), Gemini AI (receipt scanning)
  - admin app: Supabase (SSR client with RLS, service client for admin ops)
- **Build:** Turborepo, pnpm

## Key Patterns

### Query Keys (Factory Pattern)
Centralized in each app's `lib/query-keys.ts`:
```typescript
// User app
queryKeys.meals.byUserAndMonth(userName, month, year)
queryKeys.points.activity.byPeriod(memberId, period)

// Admin app
queryKeys.stats.monthly(year, month)
queryKeys.memberStatuses.all
queryKeys.budgetAllocations.byPeriod(period)
queryKeys.usageRecords.byPeriod(period)
```

### Data Fetching Hooks
Custom hooks in `hooks/` wrap React Query with proper typing:
```typescript
// Pattern: use-{resource}.ts or use-{resource}-{action}.ts
useMealData(userName, month, year)
useMealSubmit()  // mutation hook
```

### Zustand Stores
Persist middleware for user session, located in `stores/`:
```typescript
useUserStore()    // Auth state with localStorage sync
useMealDrawerStore()  // UI state
```

### Shared Packages
- `@repo/ui`: Radix-based components (Button, Dialog, Drawer, etc.)
- `@repo/utils`: KST timezone date utilities (formatDate, getToday, etc.)

### Tailwind CSS 4
Uses CSS-first config (`@import "tailwindcss"` + `@import "@repo/tailwind-config"`). No `tailwind.config.ts` — custom theme in `packages/tailwind-config/shared-styles.css` using `@theme` directive.

### Supabase (Admin App)
- Browser client: `lib/supabase/client.ts` - createBrowserClient with typed Database
- Server client: `lib/supabase/server.ts` - createServerClient with cookies
- Service client: bypasses RLS for admin operations
- Types: `lib/supabase/types.ts` - auto-generated Database types

### Supabase (User App)
- Browser client only: `lib/supabase/client.ts` (no SSR server client)
- Types: `lib/supabase/types.ts`
- Meal utilities: `lib/supabase/meals.ts`

### Authentication
- **Admin app:** Cookie-based session (`admin-session`), middleware protection, `requireAdmin()` in API routes
- **User app:** Zustand store with localStorage persistence, no middleware protection

## Code Standards

- **ESLint:** Zero warnings policy (`--max-warnings 0`)
- **TypeScript:** Strict mode with `tsc --noEmit`
- **Commits:** Korean commit messages with prefix (feat/fix/refactor/style/docs)

## Environment Variables

### Admin App (`apps/admin/.env.local`)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # For admin operations bypassing RLS

# Google Calendar (holiday sync)
GOOGLE_CALENDAR_API_KEY=

# Slack (settlement notifications)
SLACK_BOT_TOKEN=

# Push Notifications (VAPID / Web Push)
VAPID_PUBLIC_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
```

### User App (`apps/user/.env.local`)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Google Sheets
GOOGLE_PRIVATE_KEY=
GOOGLE_CLIENT_EMAIL=
GOOGLE_SHEET_ID=                    # Monthly drinks
GOOGLE_SHEET_ID_WELFARE_POINTS=     # Activity/welfare points

# Gemini AI (receipt scanning)
GEMINI_API_KEY=

# Push Notifications (VAPID / Web Push)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
```

## Attendance Types (근태 값)

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

## API Patterns

### Admin App
- `/api/auth/*` - 관리자 인증 (login, logout, session)
- `/api/seed/*` - 데이터 시딩 유틸리티
- `/api/stats/*` - 통계 조회 (monthly, summary, trends, settlement, member-spending)
- `/api/members/*` - 멤버 CRUD
- `/api/member-statuses/*` - 멤버 상태 관리 (재직/퇴사 등)
- `/api/meal-logs/*` - 식사 기록 CRUD, bulk 작업
- `/api/export/*` - Excel 내보내기 (member, members-bulk, excel, usage-records)
- `/api/import/*` - Excel 가져오기
- `/api/budget-allocations/*` - 예산 배정 CRUD, 계산
- `/api/budget-summary/*` - 예산 요약 조회
- `/api/usage-records/*` - 사용 내역 관리 (review, audit-logs)
- `/api/points-overview/*` - 포인트 현황 조회
- `/api/organizations/*` - 조직 관리
- `/api/divisions/*` - 본부 관리
- `/api/teams/*` - 팀 관리
- `/api/notifications/*` - 푸시 알림 (subscriptions, send, logs)
- `/api/settings/*` - 설정 관리
- `/api/holidays/*` - 공휴일 관리
- `/api/monthly/*` - 월간 음료
- `/api/lunch-groups/*` - 점심조 관리
- `/api/slack/*` - Slack 정산 요청 알림

### User App
- `/api/auth/*` - 사용자 인증
- `/api/users/*` - 사용자 정보 조회
- `/api/meals/*` - 식사 데이터 조회/입력
- `/api/points/*` - 포인트 관리 (welfare, activity, dashboard, members, me, lookup)
- `/api/restaurants/*` - 식당 목록
- `/api/scan-receipt/*` - 영수증 스캔 (Gemini AI)
- `/api/notifications/*` - 푸시 알림
- `/api/settings/*` - 사용자 설정
- `/api/monthly/*` - 월간 음료 신청
- `/api/lunch-group/*` - 점심조
- `/api/holidays/*` - 공휴일 조회
- `/api/google-sheets/*` - Google Sheets 연동
- `/api/calendar/*` - 캘린더 연동

### Supabase RPC
월별 통계는 `get_user_monthly_stats` RPC 함수로 집계 (DB 레벨 계산)

## Gotchas

### Excel 라이브러리
- **Import/parsing:** `xlsx` package (`lib/excel-parser.ts`)
- **Export/generation:** `exceljs` package

### Motion (Animations)
Package is `motion` (v12), NOT `framer-motion`. Import: `import { motion, AnimatePresence } from "motion/react"`

### Additional Animation/UI Libraries
- **User app:** `gsap` (scroll animations), `canvas-confetti` (celebration effects), `react-snowfall`
- **Admin app:** `@dnd-kit/core` + `@dnd-kit/sortable` (drag & drop), `es-hangul` (Korean text utils), `sonner` (toast)

### 누락 체크 로직 (`/api/stats/incomplete-users`)
입력 누락 판별 시 **제외되는 조건**:
- 개별식사, 연차, 휴무, 휴가, 반차, 재택
- 근태가 '근무' 또는 '출근'이면 식사 입력 없어도 완료 처리

### 시간대
모든 날짜는 KST 기준. `@repo/utils`의 dayjs 유틸리티 사용 필수

### Build 설정
Both apps set `ignoreBuildErrors: true` (TS) and `ignoreDuringBuilds: true` (ESLint) in next.config. **Always run `pnpm check-types` and `pnpm lint` manually** — build won't catch errors.

### Testing
No test framework configured. No unit/integration tests exist.

### PWA (User App)
User app is a PWA via `@ducanh2912/next-pwa`. Service worker auto-generated on build.

### Push Notifications
Both apps implement Web Push using VAPID keys. Utilities in `lib/web-push.ts` (admin) and `lib/push-notifications.ts` (user).
