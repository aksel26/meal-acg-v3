# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Meal ACG v3 - 기업용 식대 관리 애플리케이션 (Enterprise meal expense management application)

## Development Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev          # Start all dev servers
pnpm dev:user     # Start only user app (port 3000)

# Build
pnpm build        # Build entire monorepo
pnpm build:user   # Build only user app

# Code Quality
pnpm lint         # ESLint (max warnings = 0)
pnpm check-types  # TypeScript type checking
pnpm format       # Prettier formatting
```

## Architecture

**Monorepo** using Turborepo + pnpm workspaces:

```
apps/
  user/              # Main Next.js 15 application (App Router)
    app/             # Pages and API routes
      (content)/     # Route groups: lunch, dashboard, monthly, points
      api/           # API routes (Firebase, Google APIs, Gemini AI)
    components/      # React components
    hooks/           # Custom hooks (22+ data fetching hooks)
    lib/             # Utilities (date, excel, firebase, query-keys)
    stores/          # Zustand stores

packages/
  ui/                # Shared Radix UI components (@repo/ui)
  utils/             # Shared utilities - dayjs, date functions (@repo/utils)
  eslint-config/     # Shared ESLint config
  typescript-config/ # Shared TypeScript config
  tailwind-config/   # Shared Tailwind config
```

## Tech Stack

- **Framework:** Next.js 15 (App Router, Turbopack), React 19
- **Language:** TypeScript 5 (strict mode)
- **Styling:** Tailwind CSS 4, Motion (animations), Radix UI
- **State:** Zustand (client), TanStack React Query (server)
- **Backend:** Firebase Admin SDK, Google APIs (Sheets, Calendar, Drive), Gemini AI
- **Build:** Turborepo, pnpm

## Key Patterns

- **Query keys:** Centralized in `lib/query-keys.ts`
- **Data fetching:** Custom hooks in `hooks/` using React Query
- **Shared UI:** Import from `@repo/ui` (Radix-based components)
- **Date utilities:** Import from `@repo/utils` (dayjs-based)

## API Routes

Main endpoints in `apps/user/app/api/`:
- `meals/` - Meal expense CRUD
- `users/` - User management
- `scan-receipt/` - Gemini AI receipt scanning
- `google-sheets/` - Google Sheets integration
- `activity-points/`, `welfare-points/`, `points/` - Points system
- `lunch-group/` - Lunch group management
- `calendar/`, `holidays/` - Calendar data

## Code Standards

- **ESLint:** Zero warnings policy (`--max-warnings 0`)
- **TypeScript:** Strict mode with `tsc --noEmit`
- **Commits:** Korean commit messages with prefix (feat/fix/refactor/style/docs)
