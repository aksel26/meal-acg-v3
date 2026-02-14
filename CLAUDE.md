# CLAUDE.md (English)

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Meal ACG v3 - Enterprise meal expense management application

## Development Commands

```bash
# Install dependencies
pnpm install

# Dev servers
pnpm dev          # Start all dev servers (user:3000, admin:3001)
pnpm dev:user     # Start only user app (port 3000)
pnpm dev:admin    # Start only admin app (port 3001)

# Build
pnpm build        # Build entire monorepo
pnpm build:user   # Build only user app
pnpm build:admin  # Build only admin app

# Code quality
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
  - admin app: Supabase (SSR client + RLS, service client for admin ops)
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
Custom hooks in `hooks/` wrapping React Query with proper typing:
```typescript
// Pattern: use-{resource}.ts or use-{resource}-{action}.ts
useMealData(userName, month, year)
useMealSubmit()  // mutation hook
```

### Zustand Stores
Located in each app's `stores/`:
```typescript
// User app
useUserStore()        // Auth state with localStorage persistence
useMealDrawerStore()  // UI state

// Admin app
useAuthStore()        // Admin session state
```

### Shared Packages
- `@repo/ui`: Radix-based components (Button, Dialog, Drawer, etc.)
- `@repo/utils`: KST timezone date utilities (formatDate, getToday, etc.)

### Tailwind CSS 4
Uses CSS-first config (`@import "tailwindcss"` + `@import "@repo/tailwind-config"`). No `tailwind.config.ts` — custom theme in `packages/tailwind-config/shared-styles.css` using `@theme` directive.

**Override gotcha:** `@theme { --font-weight-medium: 400; }` does NOT override Tailwind's built-in utility classes. To override utilities like `font-medium`, use direct unlayered CSS in `globals.css` (e.g., `.font-medium { font-weight: 400; }`). Unlayered CSS beats Tailwind v4's `@layer utilities`.

### Supabase (Admin App)
- Browser client: `lib/supabase/client.ts` - createBrowserClient with typed Database
- Server client: `lib/supabase/server.ts` - cookie-based createServerClient
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

Each app's `.env.local` contains required keys:

- Admin: `apps/admin/.env.local` — Supabase, Google Calendar API, Slack bot token, VAPID keys
- User: `apps/user/.env.local` — Supabase, Google Sheets credentials, Gemini API, VAPID public key

## Attendance Types

Values stored in `meal_logs.attendance` column:

| Value | Description | Meal Calculation |
|-------|-------------|-----------------|
| `근무` | Regular work | Included |
| `근무(개별식사 / 식사안함)` | Individual meal | **Excluded** |
| `재택근무` | Remote work | **Excluded** |
| `연차/휴무` | Annual leave | **Excluded** |
| `오전 반차/휴무` | Morning half-day | **Excluded** |
| `오후 반차/휴무` | Afternoon half-day | **Excluded** |

**Available amount formula:** `daily rate × (work days - holidays - remote - individual + weekend work)`

## API Patterns

API routes follow REST conventions in `app/api/` for each app:

- **Admin**: auth, members, member-statuses, meal-logs, stats, export/import (Excel), budget-allocations, budget-summary, usage-records, points-overview, organizations/divisions/teams, notifications, settings, holidays, monthly, lunch-groups, settlement, slack
- **User**: auth, users, meals, points (welfare/activity/dashboard/lookup), restaurants, scan-receipt (Gemini AI), notifications, settings, monthly, lunch-group, holidays, google-sheets, calendar

### Supabase RPC
Monthly statistics are aggregated via `get_user_monthly_stats` RPC function (DB-level calculation)

## Gotchas

### Excel Libraries
- **Import/parsing:** `xlsx` package (`lib/excel-parser.ts`)
- **Export/generation:** `exceljs` package

### Motion (Animations)
Package is `motion` (v12), NOT `framer-motion`. Import: `import { motion, AnimatePresence } from "motion/react"`

**User app layout:** Uses `AnimatePresence mode="wait" key={pathname}` for page transitions, causing full mount/unmount on navigation. Combined with `reactStrictMode: true`, components may mount multiple times. Use module-level variables (not React state) to deduplicate one-time effects like notification dialogs.

### Additional Animation/UI Libraries
- **User app:** `gsap` (scroll animations), `canvas-confetti` (celebration effects), `react-snowfall`
- **Admin app:** `@dnd-kit/core` + `@dnd-kit/sortable` (drag & drop), `es-hangul` (Korean text utils), `sonner` (toast)

### Incomplete Entry Check (`/api/stats/incomplete-users`)
Conditions **excluded** from missing entry detection:
- Individual meal, annual leave, day off, vacation, half-day, remote work
- If attendance is '근무' or '출근', treated as complete even without meal entry

### Timezone
All dates are KST-based. Must use `@repo/utils` dayjs utilities.

### Build Config
Both apps set `ignoreBuildErrors: true` (TS) and `ignoreDuringBuilds: true` (ESLint) in next.config. **Always run `pnpm check-types` and `pnpm lint` manually** — build won't catch errors.

### Testing
No test framework configured. No unit/integration tests exist.

### PWA (User App)
User app is a PWA via `@ducanh2912/next-pwa`. Service worker auto-generated on build.

### Push Notifications
Both apps implement Web Push using VAPID keys. Utilities in `lib/web-push.ts` (admin) and `lib/push-notifications.ts` (user).
