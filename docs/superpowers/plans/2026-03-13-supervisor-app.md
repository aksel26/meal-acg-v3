# Supervisor App Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 감독관 아르바이트 관리 앱(`apps/part-time-supervisor/`)을 모노레포에 추가하여, 공고/지원자/배정/계약서 CRUD 기능을 제공한다.

**Architecture:** 기존 admin 앱 패턴을 그대로 따르는 Next.js 15 앱. 별도 `supervisor` DB 스키마를 사용하고, admin 앱의 SSO 세션 검증 API를 호출하여 인증한다. Service client로 RLS-enabled 테이블에 접근한다.

**Tech Stack:** Next.js 15, React 19, TypeScript 5, Tailwind CSS 4, TanStack React Query, Zustand, Supabase, @repo/ui, @repo/utils

**Spec:** `docs/superpowers/specs/2026-03-13-supervisor-app-design.md`

---

## Chunk 1: Database Migration & App Scaffold

### Task 1: Supabase Migration — supervisor 스키마 생성

**Files:**
- Create: `supabase/migrations/20260313_supervisor_schema.sql`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- Create supervisor schema
CREATE SCHEMA IF NOT EXISTS supervisor;

-- Enable pgcrypto for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- job_postings
CREATE TABLE supervisor.job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  location text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  work_start time,
  work_end time,
  pay_rate numeric(10, 2) NOT NULL,
  pay_type text NOT NULL DEFAULT 'hourly',
  headcount integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'open',
  description text,
  created_by uuid REFERENCES public.members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_postings_status ON supervisor.job_postings(status);
CREATE INDEX idx_job_postings_created_by ON supervisor.job_postings(created_by);

-- workers
CREATE TABLE supervisor.workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  birth_date date,
  bank_name text,
  account_number text,
  status text NOT NULL DEFAULT 'registered',
  note text,
  created_by uuid REFERENCES public.members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_workers_status ON supervisor.workers(status);
CREATE INDEX idx_workers_created_by ON supervisor.workers(created_by);

-- assignments
CREATE TABLE supervisor.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES supervisor.workers(id) ON DELETE CASCADE,
  job_posting_id uuid NOT NULL REFERENCES supervisor.job_postings(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'assigned',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(worker_id, job_posting_id)
);

CREATE INDEX idx_assignments_worker_id ON supervisor.assignments(worker_id);
CREATE INDEX idx_assignments_job_posting_id ON supervisor.assignments(job_posting_id);
CREATE INDEX idx_assignments_status ON supervisor.assignments(status);

-- contract_documents
CREATE TABLE supervisor.contract_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES supervisor.workers(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES supervisor.assignments(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  mime_type text,
  uploaded_by uuid REFERENCES public.members(id),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contract_documents_worker_id ON supervisor.contract_documents(worker_id);
CREATE INDEX idx_contract_documents_assignment_id ON supervisor.contract_documents(assignment_id);

-- RLS
ALTER TABLE supervisor.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor.contract_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON supervisor.job_postings
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON supervisor.workers
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON supervisor.assignments
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON supervisor.contract_documents
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Grant schema usage to service_role
GRANT USAGE ON SCHEMA supervisor TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA supervisor TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA supervisor TO service_role;

-- updated_at trigger function
CREATE OR REPLACE FUNCTION supervisor.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON supervisor.job_postings
  FOR EACH ROW EXECUTE FUNCTION supervisor.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON supervisor.workers
  FOR EACH ROW EXECUTE FUNCTION supervisor.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON supervisor.assignments
  FOR EACH ROW EXECUTE FUNCTION supervisor.update_updated_at();

-- Job posting status transition validation
CREATE OR REPLACE FUNCTION supervisor.validate_job_posting_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    IF NOT (
      (OLD.status = 'draft' AND NEW.status = 'open') OR
      (OLD.status = 'open' AND NEW.status = 'closed')
    ) THEN
      RAISE EXCEPTION 'Invalid status transition: % → %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_job_posting_status BEFORE UPDATE ON supervisor.job_postings
  FOR EACH ROW EXECUTE FUNCTION supervisor.validate_job_posting_status();

-- Storage bucket for contracts
-- 마이그레이션 실패 시 Supabase Studio(localhost:54323) > Storage > New Bucket > ID: 'contracts', Public: false 로 수동 생성
INSERT INTO storage.buckets (id, name, public) VALUES ('contracts', 'contracts', false)
  ON CONFLICT (id) DO NOTHING;

-- Worker status transition validation trigger
CREATE OR REPLACE FUNCTION supervisor.validate_worker_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    IF NOT (
      (OLD.status = 'registered' AND NEW.status = 'contracted') OR
      (OLD.status = 'contracted' AND NEW.status = 'working') OR
      (OLD.status = 'working' AND NEW.status = 'completed')
    ) THEN
      RAISE EXCEPTION 'Invalid worker status transition: % → %', OLD.status, NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_worker_status BEFORE UPDATE ON supervisor.workers
  FOR EACH ROW EXECUTE FUNCTION supervisor.validate_worker_status();
```

- [ ] **Step 2: 로컬 Supabase에 마이그레이션 적용**

Run: `supabase db reset`
Expected: 모든 마이그레이션 성공, supervisor 스키마 및 4개 테이블 생성 확인

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/20260313_supervisor_schema.sql
git commit -m "feat(supabase): supervisor 스키마 마이그레이션 추가"
```

---

### Task 2: Next.js 앱 스캐폴딩 — apps/supervisor

**Files:**
- Create: `apps/part-time-supervisor/package.json`
- Create: `apps/part-time-supervisor/tsconfig.json`
- Create: `apps/part-time-supervisor/next.config.ts`
- Create: `apps/part-time-supervisor/postcss.config.mjs`
- Create: `apps/part-time-supervisor/app/globals.css`
- Create: `apps/part-time-supervisor/app/layout.tsx`
- Create: `apps/part-time-supervisor/app/page.tsx`
- Create: `apps/part-time-supervisor/app/providers/QueryProvider.tsx`
- Create: `apps/part-time-supervisor/.env.local`
- Modify: `package.json` (루트 — 스크립트 추가)

- [ ] **Step 1: package.json 생성**

```json
{
  "name": "part-time-supervisor",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3002 --turbopack",
    "build": "next build",
    "start": "next start --port 3002",
    "lint": "next lint --max-warnings 0",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "@repo/ui": "workspace:*",
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.49.1",
    "@tanstack/react-query": "^5.84.1",
    "@tanstack/react-query-devtools": "^5.84.1",
    "dayjs": "^1.11.13",
    "lucide-react": "^0.533.0",
    "motion": "^12.23.12",
    "next": "15.4.10",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-hook-form": "^7.71.1",
    "sonner": "^2.0.6",
    "utils": "workspace:*",
    "zustand": "^5.0.8"
  },
  "devDependencies": {
    "@next/eslint-plugin-next": "^15.4.2",
    "@repo/eslint-config": "workspace:*",
    "@repo/tailwind-config": "workspace:*",
    "@repo/typescript-config": "workspace:*",
    "@tailwindcss/postcss": "^4.1.5",
    "@types/node": "^22.15.30",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.1",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.31.0",
    "postcss": "^8.5.3",
    "tailwindcss": "^4.1.5",
    "typescript": "5.8.2"
  }
}
```

- [ ] **Step 2: tsconfig.json 생성**

```json
{
  "extends": "@repo/typescript-config/nextjs.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/hooks/*": ["./hooks/*"],
      "@/lib/*": ["./lib/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", "next-env.d.ts", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: next.config.ts 생성**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
```

- [ ] **Step 4: postcss.config.mjs 생성**

admin 앱의 postcss.config.mjs를 그대로 복사. Tailwind CSS 4 플러그인 설정.

```javascript
export default {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 5: globals.css 생성**

```css
@import "tailwindcss";
@import "@repo/tailwind-config";
```

- [ ] **Step 6: app/layout.tsx 생성**

```tsx
import { Sonner } from "@repo/ui/src/sonner";
import "./globals.css";
import "@repo/ui/styles.css";
import type { Metadata, Viewport } from "next";
import QueryProvider from "./providers/QueryProvider";
import localFont from "next/font/local";
import dayjs from "dayjs";
import "dayjs/locale/ko";

dayjs.locale("ko");

const APP_NAME = "ACG 감독관";
const APP_DEFAULT_TITLE = "ACG 감독관 관리";
const APP_DESCRIPTION = "ACG 감독관 아르바이트 관리 시스템";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: "%s | 감독관",
  },
  description: APP_DESCRIPTION,
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

const myFont = localFont({
  src: "./fonts/NanumSquareNeo-Variable.ttf",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head />
      <body className={myFont.className}>
        <QueryProvider>{children}</QueryProvider>
        <Sonner />
      </body>
    </html>
  );
}
```

참고: `app/fonts/NanumSquareNeo-Variable.ttf` 파일은 admin 앱에서 복사하거나 심볼릭 링크.

- [ ] **Step 7: app/providers/QueryProvider.tsx 생성**

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 8: app/page.tsx — 임시 홈**

```tsx
export default function Home() {
  return (
    <div className="flex h-screen items-center justify-center">
      <h1 className="text-2xl font-bold">ACG 감독관 관리 시스템</h1>
    </div>
  );
}
```

- [ ] **Step 9: .env.local 생성**

```
# --- 🟢 로컬 (Local Docker) ---
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# SSO
ADMIN_APP_URL=http://localhost:3001

# 민감정보 암호화 (생성: openssl rand -hex 16, 절대 커밋 금지)
ENCRYPTION_KEY=<openssl rand -hex 16 으로 생성한 32자 hex>
```

- [ ] **Step 10: 루트 package.json에 스크립트 추가**

`package.json` (루트)에 추가:
```json
"dev:part-time-supervisor": "turbo run dev --filter=part-time-supervisor",
"build:part-time-supervisor": "turbo run build --filter=part-time-supervisor",
"start:part-time-supervisor": "turbo run start --filter=part-time-supervisor"
```

- [ ] **Step 11: pnpm install && 앱 실행 확인**

Run: `pnpm install && pnpm dev:part-time-supervisor`
Expected: `localhost:3002` 접근 시 "ACG 감독관 관리 시스템" 텍스트 표시

- [ ] **Step 12: 커밋**

```bash
git add apps/part-time-supervisor/ package.json pnpm-lock.yaml
git commit -m "feat(supervisor): Next.js 15 앱 스캐폴딩"
```

---

## Chunk 2: Auth & Core Infrastructure

### Task 3: Supabase 클라이언트 & 타입

**Files:**
- Create: `apps/part-time-supervisor/lib/supabase/client.ts`
- Create: `apps/part-time-supervisor/lib/supabase/server.ts`
- Create: `apps/part-time-supervisor/lib/supabase/types.ts`

- [ ] **Step 1: lib/supabase/types.ts — supervisor 스키마 타입 정의**

```typescript
export type JobPosting = {
  id: string;
  title: string;
  location: string | null;
  start_date: string;
  end_date: string;
  work_start: string | null;
  work_end: string | null;
  pay_rate: number;
  pay_type: "hourly" | "daily";
  headcount: number;
  status: "open" | "closed" | "draft";
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Worker = {
  id: string;
  name: string;
  phone: string | null;
  birth_date: string | null;
  bank_name: string | null;
  account_number: string | null;
  status: "registered" | "contracted" | "working" | "completed";
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Assignment = {
  id: string;
  worker_id: string;
  job_posting_id: string;
  status: "assigned" | "working" | "completed" | "cancelled";
  assigned_at: string;
  updated_at: string;
};

export type ContractDocument = {
  id: string;
  worker_id: string;
  assignment_id: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
};

// API response types
export type JobPostingWithAssignments = JobPosting & {
  assigned_count: number;
};

export type WorkerWithAssignments = Worker & {
  assignment_count: number;
};

export type AssignmentWithDetails = Assignment & {
  worker_name?: string;
  job_posting_title?: string;
};
```

- [ ] **Step 2: lib/supabase/client.ts — Browser client**

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 3: lib/supabase/server.ts — Server + Service client**

```typescript
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component context
          }
        },
      },
    }
  );
}

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

- [ ] **Step 4: 커밋**

```bash
git add apps/part-time-supervisor/lib/supabase/
git commit -m "feat(supervisor): Supabase 클라이언트 및 타입 정의"
```

---

### Task 4: SSO 인증 — middleware & auth 유틸

**Files:**
- Create: `apps/part-time-supervisor/middleware.ts`
- Create: `apps/part-time-supervisor/lib/auth.ts`
- Create: `apps/part-time-supervisor/app/api/auth/session/route.ts`

- [ ] **Step 1: middleware.ts — SSO 세션 검증**

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_APP_URL = process.env.ADMIN_APP_URL || "http://localhost:3001";

const PUBLIC_PATHS = ["/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${ADMIN_APP_URL}/api/auth/session`, {
      headers: { cookie: request.headers.get("cookie") || "" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.redirect(`${ADMIN_APP_URL}/login`);
    }

    const session = await response.json();

    if (!session.authenticated || !session.user) {
      return NextResponse.redirect(`${ADMIN_APP_URL}/login`);
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-session-user-id", session.user.id);
    requestHeaders.set("x-session-user-name", session.user.fullName);
    requestHeaders.set("x-session-user-role", session.user.role);

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    clearTimeout(timeout);
    return NextResponse.redirect(`${ADMIN_APP_URL}/login`);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
```

- [ ] **Step 2: lib/auth.ts — 세션 헤더 추출 유틸**

```typescript
import { headers } from "next/headers";

export type SessionUser = {
  id: string;
  fullName: string;
  role: string;
};

export async function getSessionUser(): Promise<SessionUser> {
  const headerStore = await headers();
  const id = headerStore.get("x-session-user-id");
  const fullName = headerStore.get("x-session-user-name");
  const role = headerStore.get("x-session-user-role");

  if (!id || !fullName || !role) {
    throw new Error("Unauthorized");
  }

  return { id, fullName, role };
}

export async function requireAuth(): Promise<SessionUser> {
  return getSessionUser();
}
```

- [ ] **Step 3: app/api/auth/session/route.ts — 세션 확인 엔드포인트**

supervisor 앱 내부에서 클라이언트가 세션 상태를 확인할 수 있도록 프록시 엔드포인트 제공.

```typescript
import { NextResponse } from "next/server";

const ADMIN_APP_URL = process.env.ADMIN_APP_URL || "http://localhost:3001";

export async function GET(request: Request) {
  try {
    const response = await fetch(`${ADMIN_APP_URL}/api/auth/session`, {
      headers: { cookie: request.headers.get("cookie") || "" },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
```

- [ ] **Step 4: 실행 확인**

Run: `pnpm dev:part-time-supervisor`
1. admin 앱 미로그인 상태로 `localhost:3002` 접근 → admin 로그인 페이지로 리다이렉트 확인
2. admin 앱 로그인 후 `localhost:3002` 접근 → 정상 페이지 표시 확인

- [ ] **Step 5: 커밋**

```bash
git add apps/part-time-supervisor/middleware.ts apps/part-time-supervisor/lib/auth.ts apps/part-time-supervisor/app/api/auth/
git commit -m "feat(supervisor): SSO 인증 미들웨어 및 세션 유틸 구현"
```

---

### Task 5: Query Keys & Storage 유틸

**Files:**
- Create: `apps/part-time-supervisor/lib/query-keys.ts`
- Create: `apps/part-time-supervisor/lib/storage.ts`

- [ ] **Step 1: lib/query-keys.ts**

```typescript
export const queryKeys = {
  dashboard: {
    all: ["dashboard"] as const,
  },

  jobPostings: {
    all: ["jobPostings"] as const,
    detail: (id: string) => ["jobPostings", id] as const,
  },

  workers: {
    all: ["workers"] as const,
    detail: (id: string) => ["workers", id] as const,
  },

  assignments: {
    all: ["assignments"] as const,
    detail: (id: string) => ["assignments", id] as const,
    byJobPosting: (id: string) => ["assignments", "jobPosting", id] as const,
    byWorker: (id: string) => ["assignments", "worker", id] as const,
  },

  contracts: {
    byWorker: (workerId: string) => ["contracts", workerId] as const,
  },
};
```

- [ ] **Step 2: lib/storage.ts — 파일 업로드/다운로드 추상화**

```typescript
import { createServiceClient } from "./supabase/server";

const BUCKET = "contracts";

export async function uploadFile(
  workerId: string,
  file: File
): Promise<{ path: string; error: string | null }> {
  const supabase = createServiceClient();
  const ext = file.name.split(".").pop();
  const path = `${workerId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });

  if (error) {
    return { path: "", error: error.message };
  }

  return { path, error: null };
}

export async function getSignedUrl(path: string): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600); // 1시간

  if (error) return null;
  return data.signedUrl;
}

export async function deleteFile(path: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([path]);

  return !error;
}
```

- [ ] **Step 3: 커밋**

```bash
git add apps/part-time-supervisor/lib/query-keys.ts apps/part-time-supervisor/lib/storage.ts
git commit -m "feat(supervisor): query keys 팩토리 및 storage 추상화 추가"
```

---

## Chunk 3: Layout & Dashboard

### Task 6: 대시보드 레이아웃 — Sidebar, Header

**Files:**
- Create: `apps/part-time-supervisor/components/layout/Sidebar.tsx`
- Create: `apps/part-time-supervisor/components/layout/Header.tsx`
- Create: `apps/part-time-supervisor/app/(dashboard)/layout.tsx`
- Modify: `apps/part-time-supervisor/app/page.tsx` — 대시보드로 리다이렉트

- [ ] **Step 1: components/layout/Sidebar.tsx**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Users, ClipboardList, LayoutDashboard } from "lucide-react";

const navItems = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/job-postings", label: "공고 관리", icon: Briefcase },
  { href: "/workers", label: "지원자 관리", icon: Users },
  { href: "/assignments", label: "배정 관리", icon: ClipboardList },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col rounded-2xl bg-slate-900 p-4 text-white">
      <div className="mb-8 px-2 py-4">
        <h1 className="text-lg font-bold">ACG 감독관</h1>
        <p className="text-sm text-slate-400">아르바이트 관리</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-white/10 font-medium text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: components/layout/Header.tsx**

```tsx
"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/": "대시보드",
  "/job-postings": "공고 관리",
  "/workers": "지원자 관리",
  "/assignments": "배정 관리",
};

export default function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || "감독관";

  return (
    <header className="flex h-14 items-center border-b px-6">
      <h2 className="text-lg font-semibold">{title}</h2>
    </header>
  );
}
```

- [ ] **Step 3: app/(dashboard)/layout.tsx**

```tsx
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden p-3 gap-3">
      <Sidebar />
      <main className="relative flex h-full flex-1 flex-col overflow-hidden rounded-2xl bg-white">
        <Header />
        <div className="flex-1 overflow-y-auto scroll-smooth px-6 py-4">
          <div className="md:px-2">{children}</div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: app/page.tsx — 대시보드로 리다이렉트**

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/");
}
```

참고: `app/(dashboard)/page.tsx`가 `/` 경로의 실제 대시보드 페이지가 됨. `app/page.tsx`는 삭제하거나 `(dashboard)` 그룹이 `/`를 처리하므로 제거.

실제로는 `app/page.tsx`를 삭제하고 `app/(dashboard)/page.tsx`가 `/` 경로를 담당하도록 구성.

- [ ] **Step 5: 실행 확인**

Run: `pnpm dev:part-time-supervisor`
Expected: `localhost:3002` — 사이드바 + 헤더 레이아웃 표시

- [ ] **Step 6: 커밋**

```bash
git add apps/part-time-supervisor/components/layout/ apps/part-time-supervisor/app/
git commit -m "feat(supervisor): 대시보드 레이아웃 (Sidebar, Header) 구현"
```

---

### Task 7: 대시보드 페이지 — 통계 카드

**Files:**
- Create: `apps/part-time-supervisor/app/(dashboard)/page.tsx`
- Create: `apps/part-time-supervisor/app/api/dashboard/route.ts`
- Create: `apps/part-time-supervisor/hooks/use-dashboard.ts`

- [ ] **Step 1: app/api/dashboard/route.ts — 대시보드 통계 API**

```typescript
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth();
    const supabase = createServiceClient();

    const [
      { count: openJobCount },
      { count: totalWorkerCount },
      { count: workingWorkerCount },
      { data: recentJobs },
      { data: assignmentSummary },
    ] = await Promise.all([
      supabase.from("job_postings").select("*", { count: "exact", head: true }).eq("status", "open").schema("supervisor"),
      supabase.from("workers").select("*", { count: "exact", head: true }).schema("supervisor"),
      supabase.from("workers").select("*", { count: "exact", head: true }).eq("status", "working").schema("supervisor"),
      supabase.from("job_postings").select("id, title, status, headcount, created_at").order("created_at", { ascending: false }).limit(5).schema("supervisor"),
      supabase.rpc("get_assignment_summary").schema("supervisor"),
    ]);

    return NextResponse.json({
      openJobCount: openJobCount || 0,
      totalWorkerCount: totalWorkerCount || 0,
      workingWorkerCount: workingWorkerCount || 0,
      recentJobs: recentJobs || [],
      assignmentSummary: assignmentSummary || [],
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
```

참고: `get_assignment_summary` RPC가 없으면 초기에는 생략하고, 공고별 배정 수를 별도 쿼리로 대체. RPC는 이후 성능 최적화 시 추가.

- [ ] **Step 2: hooks/use-dashboard.ts**

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export type DashboardData = {
  openJobCount: number;
  totalWorkerCount: number;
  workingWorkerCount: number;
  recentJobs: Array<{
    id: string;
    title: string;
    status: string;
    headcount: number;
    created_at: string;
  }>;
};

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: queryKeys.dashboard.all,
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
  });
}
```

- [ ] **Step 3: app/(dashboard)/page.tsx — 대시보드 UI**

```tsx
"use client";

import { useDashboard } from "@/hooks/use-dashboard";
import { Briefcase, Users, HardHat } from "lucide-react";

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-slate-400">로딩 중...</div>;
  }

  const cards = [
    { label: "활성 공고", value: data?.openJobCount ?? 0, icon: Briefcase, color: "bg-blue-50 text-blue-600" },
    { label: "전체 지원자", value: data?.totalWorkerCount ?? 0, icon: Users, color: "bg-green-50 text-green-600" },
    { label: "근무중 인원", value: data?.workingWorkerCount ?? 0, icon: HardHat, color: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border p-5">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${card.color}`}>
                <card.icon size={20} />
              </div>
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border p-5">
        <h3 className="mb-4 font-semibold">최근 공고</h3>
        {data?.recentJobs?.length ? (
          <div className="space-y-2">
            {data.recentJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <span className="font-medium">{job.title}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  job.status === "open" ? "bg-green-100 text-green-700" :
                  job.status === "draft" ? "bg-slate-100 text-slate-600" :
                  "bg-red-100 text-red-700"
                }`}>
                  {job.status === "open" ? "모집중" : job.status === "draft" ? "임시" : "마감"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">등록된 공고가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 실행 확인**

Run: `pnpm dev:part-time-supervisor`
Expected: 대시보드에 3개 통계 카드 + 최근 공고 섹션 표시 (데이터 0건)

- [ ] **Step 5: 커밋**

```bash
git add apps/part-time-supervisor/app/api/dashboard/ apps/part-time-supervisor/hooks/use-dashboard.ts apps/part-time-supervisor/app/\(dashboard\)/page.tsx
git commit -m "feat(supervisor): 대시보드 페이지 및 통계 API 구현"
```

---

## Chunk 4: Job Postings CRUD

### Task 8: 공고 API — CRUD 엔드포인트

**Files:**
- Create: `apps/part-time-supervisor/app/api/job-postings/route.ts`
- Create: `apps/part-time-supervisor/app/api/job-postings/[id]/route.ts`

- [ ] **Step 1: app/api/job-postings/route.ts — GET (목록), POST (생성)**

```typescript
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireAuth();
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // 배정 수 포함 조회 (assigned/working 상태만 카운트)
    let query = supabase
      .schema("supervisor")
      .from("job_postings")
      .select("*, assignments(count)")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/job-postings error:", error);
    return NextResponse.json({ error: "Failed to fetch job postings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const supabase = createServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .schema("supervisor")
      .from("job_postings")
      .insert({
        ...body,
        created_by: session.id,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("POST /api/job-postings error:", error);
    return NextResponse.json({ error: "Failed to create job posting" }, { status: 500 });
  }
}
```

- [ ] **Step 2: app/api/job-postings/[id]/route.ts — GET, PUT, DELETE**

```typescript
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .schema("supervisor")
      .from("job_postings")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/job-postings/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch job posting" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();
    const body = await request.json();

    const { data, error } = await supabase
      .schema("supervisor")
      .from("job_postings")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("PUT /api/job-postings/[id] error:", error);
    return NextResponse.json({ error: "Failed to update job posting" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;
    const supabase = createServiceClient();

    // 활성 배정 확인
    const { count } = await supabase
      .schema("supervisor")
      .from("assignments")
      .select("*", { count: "exact", head: true })
      .eq("job_posting_id", id)
      .in("status", ["assigned", "working"]);

    if (count && count > 0) {
      return NextResponse.json(
        { error: "활성 배정이 있는 공고는 삭제할 수 없습니다. 먼저 마감 처리해주세요." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .schema("supervisor")
      .from("job_postings")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/job-postings/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete job posting" }, { status: 500 });
  }
}
```

- [ ] **Step 3: 커밋**

```bash
git add apps/part-time-supervisor/app/api/job-postings/
git commit -m "feat(supervisor): 공고 CRUD API 엔드포인트 구현"
```

---

### Task 9: 공고 Hooks & 페이지 UI

**Files:**
- Create: `apps/part-time-supervisor/hooks/use-job-postings.ts`
- Create: `apps/part-time-supervisor/hooks/use-job-posting-mutations.ts`
- Create: `apps/part-time-supervisor/components/job-postings/JobPostingTable.tsx`
- Create: `apps/part-time-supervisor/components/job-postings/JobPostingModal.tsx`
- Create: `apps/part-time-supervisor/app/(dashboard)/job-postings/page.tsx`

- [ ] **Step 1: hooks/use-job-postings.ts**

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { JobPosting } from "@/lib/supabase/types";

export function useJobPostings(status?: string) {
  return useQuery<JobPosting[]>({
    queryKey: [...queryKeys.jobPostings.all, status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : "";
      const res = await fetch(`/api/job-postings${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
}
```

- [ ] **Step 2: hooks/use-job-posting-mutations.ts**

```typescript
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import type { JobPosting } from "@/lib/supabase/types";

export function useCreateJobPosting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<JobPosting>) => {
      const res = await fetch("/api/job-postings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobPostings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useUpdateJobPosting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<JobPosting> & { id: string }) => {
      const res = await fetch(`/api/job-postings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobPostings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useDeleteJobPosting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/job-postings/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobPostings.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
```

- [ ] **Step 3: components/job-postings/JobPostingModal.tsx — 생성/수정 모달**

react-hook-form을 사용한 공고 폼 모달. 필드: title, location, start_date, end_date, work_start, work_end, pay_rate, pay_type, headcount, status, description. `@repo/ui`의 Dialog 컴포넌트 활용.

- [ ] **Step 4: components/job-postings/JobPostingTable.tsx — 목록 테이블**

공고 목록을 테이블로 표시. 컬럼: 제목, 장소, 기간, 시급, 모집인원, 상태. 각 행에 수정/삭제 버튼. 상태 필터 드롭다운. 검색 입력.

- [ ] **Step 5: app/(dashboard)/job-postings/page.tsx**

```tsx
"use client";

import { useState } from "react";
import { useJobPostings } from "@/hooks/use-job-postings";
import JobPostingTable from "@/components/job-postings/JobPostingTable";
import JobPostingModal from "@/components/job-postings/JobPostingModal";

export default function JobPostingsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { data: jobPostings, isLoading } = useJobPostings();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">공고 목록</h3>
        <button
          onClick={() => { setEditingId(null); setIsModalOpen(true); }}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          공고 등록
        </button>
      </div>

      <JobPostingTable
        data={jobPostings || []}
        isLoading={isLoading}
        onEdit={(id) => { setEditingId(id); setIsModalOpen(true); }}
      />

      <JobPostingModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingId={editingId}
      />
    </div>
  );
}
```

- [ ] **Step 6: 실행 확인**

Run: `pnpm dev:part-time-supervisor`
Expected: `/job-postings` — 공고 목록 테이블 표시, 등록 버튼 클릭 시 모달, CRUD 동작 확인

- [ ] **Step 7: 커밋**

```bash
git add apps/part-time-supervisor/hooks/use-job-posting* apps/part-time-supervisor/components/job-postings/ apps/part-time-supervisor/app/\(dashboard\)/job-postings/
git commit -m "feat(supervisor): 공고 관리 페이지 (목록, 생성, 수정, 삭제) 구현"
```

---

## Chunk 5: Workers CRUD & Contract Upload

### Task 10: 지원자 API — CRUD 엔드포인트

**Files:**
- Create: `apps/part-time-supervisor/app/api/workers/route.ts`
- Create: `apps/part-time-supervisor/app/api/workers/[id]/route.ts`

동일 패턴으로 workers CRUD 구현. `phone`, `account_number`는 pgcrypto 암호화 적용. 암호화: insert/update 시 `pgp_sym_encrypt(value, key)`, 조회 시 `pgp_sym_decrypt(column::bytea, key)`.

참고: Supabase JS client에서 pgcrypto 함수를 직접 사용하기 어려우므로, RPC 함수로 래핑하거나 raw SQL을 사용. 초기에는 평문 저장 후 암호화는 별도 태스크로 분리 가능.

- [ ] **Step 1: app/api/workers/route.ts — GET, POST**

GET: 전체 목록 + 배정 수 포함 (assignments count를 별도 쿼리 또는 LEFT JOIN)
POST: 지원자 생성

- [ ] **Step 2: app/api/workers/[id]/route.ts — GET, PUT, DELETE**

GET: 상세 정보 + 배정 이력 + 계약서 목록
PUT: 정보 수정
DELETE: 삭제 (CASCADE)

- [ ] **Step 3: 커밋**

```bash
git add apps/part-time-supervisor/app/api/workers/
git commit -m "feat(supervisor): 지원자 CRUD API 엔드포인트 구현"
```

---

### Task 11: 계약서 API — 업로드/조회/삭제

**Files:**
- Create: `apps/part-time-supervisor/app/api/contracts/route.ts`
- Create: `apps/part-time-supervisor/app/api/contracts/[id]/route.ts`

- [ ] **Step 1: app/api/contracts/route.ts — GET (목록), POST (업로드)**

POST: multipart/form-data로 파일 수신 → `lib/storage.ts`의 `uploadFile()` 호출 → `contract_documents` 레코드 생성.

- [ ] **Step 2: app/api/contracts/[id]/route.ts — GET (Signed URL), DELETE**

GET: `contract_documents`에서 `file_path` 조회 → `getSignedUrl()` 호출 → URL 반환.
DELETE: Storage 파일 삭제 + DB 레코드 삭제.

- [ ] **Step 3: 커밋**

```bash
git add apps/part-time-supervisor/app/api/contracts/
git commit -m "feat(supervisor): 계약서 업로드/조회/삭제 API 구현"
```

---

### Task 12: 지원자 Hooks & 페이지 UI

**Files:**
- Create: `apps/part-time-supervisor/hooks/use-workers.ts`
- Create: `apps/part-time-supervisor/hooks/use-worker-mutations.ts`
- Create: `apps/part-time-supervisor/hooks/use-contracts.ts`
- Create: `apps/part-time-supervisor/components/workers/WorkerTable.tsx`
- Create: `apps/part-time-supervisor/components/workers/WorkerModal.tsx`
- Create: `apps/part-time-supervisor/components/workers/WorkerDrawer.tsx`
- Create: `apps/part-time-supervisor/components/workers/ContractUpload.tsx`
- Create: `apps/part-time-supervisor/app/(dashboard)/workers/page.tsx`

- [ ] **Step 1: hooks — use-workers.ts, use-worker-mutations.ts, use-contracts.ts**

admin 앱의 hook 패턴과 동일. `use-contracts.ts`는 파일 업로드 mutation + 목록 조회 query 포함.

- [ ] **Step 2: components/workers/WorkerTable.tsx — 지원자 목록**

테이블: 이름, 연락처, 상태, 배정 공고 수. 검색 + 상태 필터. 행 클릭 시 드로어 열기.

- [ ] **Step 3: components/workers/WorkerModal.tsx — 생성/수정 모달**

react-hook-form: name, phone, birth_date, bank_name, account_number, note.

- [ ] **Step 4: components/workers/WorkerDrawer.tsx — 상세 드로어**

`@repo/ui`의 Drawer 컴포넌트 활용. 인적사항, 배정 이력 목록, 계약서 파일 목록 + ContractUpload 컴포넌트.

- [ ] **Step 5: components/workers/ContractUpload.tsx — 계약서 업로드/미리보기**

파일 드롭존 (이미지만), 업로드된 계약서 썸네일 목록, Signed URL로 미리보기, 삭제 버튼.

- [ ] **Step 6: app/(dashboard)/workers/page.tsx — 페이지 조합**

- [ ] **Step 7: 실행 확인**

Run: `pnpm dev:part-time-supervisor`
Expected: `/workers` — 목록, 등록, 상세 드로어, 계약서 업로드/미리보기 동작 확인

- [ ] **Step 8: 커밋**

```bash
git add apps/part-time-supervisor/hooks/use-worker* apps/part-time-supervisor/hooks/use-contracts.ts apps/part-time-supervisor/components/workers/ apps/part-time-supervisor/app/\(dashboard\)/workers/
git commit -m "feat(supervisor): 지원자 관리 페이지 (목록, 생성, 상세 드로어, 계약서 업로드) 구현"
```

---

## Chunk 6: Assignments CRUD

### Task 13: 배정 API — CRUD 엔드포인트

**Files:**
- Create: `apps/part-time-supervisor/app/api/assignments/route.ts`
- Create: `apps/part-time-supervisor/app/api/assignments/[id]/route.ts`

- [ ] **Step 1: app/api/assignments/route.ts — GET, POST**

GET: 필터 지원 (`?job_posting_id=`, `?worker_id=`). JOIN으로 worker_name, job_posting_title 포함.
POST: 배정 생성. UNIQUE 제약 위반 시 409 반환.

- [ ] **Step 2: app/api/assignments/[id]/route.ts — PUT, DELETE**

PUT: 상태 변경 (status). 배정 상태 변경 시 workers.status도 연동 업데이트.
DELETE: 배정 해제.

- [ ] **Step 3: 커밋**

```bash
git add apps/part-time-supervisor/app/api/assignments/
git commit -m "feat(supervisor): 배정 CRUD API 엔드포인트 구현"
```

---

### Task 14: 배정 Hooks & 페이지 UI

**Files:**
- Create: `apps/part-time-supervisor/hooks/use-assignments.ts`
- Create: `apps/part-time-supervisor/hooks/use-assignment-mutations.ts`
- Create: `apps/part-time-supervisor/components/assignments/AssignmentTable.tsx`
- Create: `apps/part-time-supervisor/components/assignments/AssignmentModal.tsx`
- Create: `apps/part-time-supervisor/app/(dashboard)/assignments/page.tsx`

- [ ] **Step 1: hooks — use-assignments.ts, use-assignment-mutations.ts**

배정 목록 조회 (공고별/지원자별 필터), 배정 생성/상태변경/삭제 mutation. Invalidation: `assignments.all + workers.detail + jobPostings.detail + dashboard.all`.

- [ ] **Step 2: components/assignments/AssignmentTable.tsx**

보기 전환 탭 (공고별 / 지원자별). 각 배정의 상태 변경 인라인 셀렉트.

- [ ] **Step 3: components/assignments/AssignmentModal.tsx — 배정 생성**

공고 드롭다운 (open 상태만) → 지원자 드롭다운 (이미 배정된 지원자 제외) → 배정 생성.

- [ ] **Step 4: app/(dashboard)/assignments/page.tsx**

- [ ] **Step 5: 실행 확인**

Run: `pnpm dev:part-time-supervisor`
Expected: `/assignments` — 배정 목록, 배정 생성, 상태 변경, 해제 동작 확인

- [ ] **Step 6: 커밋**

```bash
git add apps/part-time-supervisor/hooks/use-assignment* apps/part-time-supervisor/components/assignments/ apps/part-time-supervisor/app/\(dashboard\)/assignments/
git commit -m "feat(supervisor): 배정 관리 페이지 (목록, 생성, 상태변경, 해제) 구현"
```

---

## Chunk 7: Integration & Polish

### Task 15: Zustand Auth Store

**Files:**
- Create: `apps/part-time-supervisor/stores/useAuthStore.ts`

- [ ] **Step 1: stores/useAuthStore.ts**

```typescript
"use client";

import { create } from "zustand";

type AuthState = {
  user: { id: string; fullName: string; role: string } | null;
  setUser: (user: AuthState["user"]) => void;
  clearUser: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
```

- [ ] **Step 2: 커밋**

```bash
git add apps/part-time-supervisor/stores/
git commit -m "feat(supervisor): Zustand auth store 추가"
```

---

### Task 16: 전체 통합 확인 & CLAUDE.md 업데이트

**Files:**
- Modify: `CLAUDE.md` — supervisor 앱 관련 정보 추가

- [ ] **Step 1: 전체 빌드 확인**

Run: `pnpm build:part-time-supervisor`
Expected: 빌드 성공

- [ ] **Step 2: 타입 체크**

Run: `cd apps/supervisor && pnpm check-types`
Expected: 에러 없음 (또는 기존 패턴 수준의 경고만)

- [ ] **Step 3: CLAUDE.md 업데이트**

supervisor 앱 관련 섹션 추가:
- 포트: 3002
- 인증: admin 앱 SSO
- DB: supervisor 스키마
- 환경변수 목록
- 개발 명령어

- [ ] **Step 4: 최종 커밋**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md에 supervisor 앱 정보 추가"
```

---

## Task Dependency Summary

```
Task 1 (DB Migration)
  └→ Task 2 (App Scaffold)
       └→ Task 3 (Supabase Clients)
            └→ Task 4 (SSO Auth)
                 └→ Task 5 (Query Keys & Storage)
                      ├→ Task 6 (Layout)
                      │    └→ Task 7 (Dashboard)
                      ├→ Task 8 (Job API)
                      │    └→ Task 9 (Job UI)
                      ├→ Task 10 (Worker API)
                      │    ├→ Task 11 (Contract API)
                      │    └→ Task 12 (Worker UI)
                      └→ Task 13 (Assignment API)
                           └→ Task 14 (Assignment UI)

Task 15 (Auth Store) — 독립
Task 16 (Integration) — 모든 태스크 완료 후
```

**병렬 가능:** Task 5 이후 Task 6~14는 API/UI 쌍으로 병렬 진행 가능 (Job, Worker, Assignment 독립).
