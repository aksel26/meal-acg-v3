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
