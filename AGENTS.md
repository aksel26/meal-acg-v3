# Repository Guidelines

## Project Structure & Module Organization

This is a pnpm/Turborepo monorepo for several Next.js apps. Application code lives under `apps/`: `user` on port 3000, `admin` on 3001, `part-time-supervisor` on 3002, and `project-management` on 3013. Shared packages live under `packages/`, including `ui`, `utils`, `eslint-config`, `typescript-config`, and `tailwind-config`. Database migrations and seed data are in `supabase/`; product and architecture notes are in `docs/`. App assets are kept in each app's `public/` directory, with app-local components, hooks, stores, and server utilities beside each app's `app/` directory.

## Build, Test, and Development Commands

Use pnpm 8.15.6 with Node.js 18 or newer.

- `pnpm install` installs workspace dependencies.
- `pnpm dev` starts all apps through Turbo; use `pnpm dev:user`, `pnpm dev:admin`, `pnpm dev:part-time-supervisor`, or `pnpm dev:project-management` for one app.
- `pnpm build` builds all packages/apps; app-specific shortcuts include `pnpm build:user` and `pnpm build:admin`.
- `pnpm check-types` runs TypeScript checks across the workspace.
- `pnpm lint` runs configured ESLint tasks.
- `pnpm format` applies Prettier and the Tailwind class sorter to `ts`, `tsx`, and `md` files.

For narrower checks, prefer Turbo filters such as `pnpm --filter admin check-types` or `pnpm --filter user build`.

## Coding Style & Naming Conventions

Write TypeScript and React using the existing App Router patterns. Components use PascalCase, hooks use `useCamelCase`, and route folders follow Next.js conventions. Keep shared UI in `packages/ui`; avoid duplicating cross-app utilities outside `packages/utils`. Formatting is owned by Prettier, ESLint 9, shared repo configs, and `prettier-plugin-tailwindcss`.

## Testing Guidelines

There is no dedicated unit or E2E test framework configured in this snapshot. Treat `build`, `check-types`, and targeted manual verification as the current quality gates. When adding tests, place them next to the feature or in a local `tests/` directory, use `*.test.ts` or `*.test.tsx`, and add the matching package script.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit style with scopes, for example `feat(admin): ...`, `fix(admin): ...`, `refactor(user/meal): ...`, and `docs(readme): ...`. Keep commits small and intent-based. PRs should summarize behavior changes, list validation commands, mention Supabase migrations or environment variables, and include screenshots for visible UI changes.

## Security & Configuration Tips

Do not commit `.env*` files or generated build artifacts such as `.next/`, `.next-build/`, `.turbo/`, or `tsconfig.tsbuildinfo`. Store secrets in local env files and document new required variables in `README.md`.
