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
  - user app: Firebase Admin SDK, Google APIs (Sheets, Calendar, Drive), Gemini AI
  - admin app: Supabase (SSR client with RLS, service client for admin ops)
- **Build:** Turborepo, pnpm

## Key Patterns

### Query Keys (Factory Pattern)
Centralized in each app's `lib/query-keys.ts`:
```typescript
queryKeys.meals.byUserAndMonth(userName, month, year)
queryKeys.activityPoints.usage(employeeId, month)
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

### Supabase (Admin App)
- Browser client: `lib/supabase/client.ts` - createBrowserClient with typed Database
- Server client: `lib/supabase/server.ts` - createServerClient with cookies
- Service client: bypasses RLS for admin operations

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
- `/api/stats/*` - 통계 조회 (monthly, summary, trends, settlement)
- `/api/members/*` - 멤버 CRUD
- `/api/meal-logs/*` - 식사 기록 CRUD, bulk 작업
- `/api/export/*` - Excel 내보내기 (member, members-bulk)
- `/api/import/*` - Excel 가져오기
- `/api/slack/*` - Slack 정산 요청 알림

### Supabase RPC
월별 통계는 `get_monthly_user_stats` RPC 함수로 집계 (DB 레벨 계산)

## Gotchas

### 누락 체크 로직 (`/api/stats/incomplete-users`)
입력 누락 판별 시 **제외되는 조건**:
- 개별식사, 연차, 휴무, 휴가, 반차, 재택
- 근태가 '근무' 또는 '출근'이면 식사 입력 없어도 완료 처리

### 시간대
모든 날짜는 KST 기준. `@repo/utils`의 dayjs 유틸리티 사용 필수
