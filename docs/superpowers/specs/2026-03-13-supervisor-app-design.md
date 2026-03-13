# 감독관 아르바이트 관리 앱 설계

## 개요

기존 Meal ACG v3 모노레포에 `apps/part-time-supervisor/` 앱을 추가하여, 감독관(관리자)이 아르바이트 공고와 지원자를 관리하는 사이트를 구축한다.

### 핵심 요구사항

- 관리자 전용 사이트 (지원자는 직접 접근하지 않음)
- admin 앱과 SSO (검증 API 호출 방식) 연동
- 공고 CRUD, 지원자 CRUD, 배정 관리, 계약서 이미지 관리
- 별도 `supervisor` DB 스키마, 기존 `public.members` FK 참조

---

## 데이터베이스 스키마

### 스키마: `supervisor`

기존 `public` 스키마와 분리하여 독립적으로 관리한다. `public.members`를 FK로 참조하여 관리자 정보를 연동한다.

모든 테이블에 RLS를 활성화하고, service client를 통해서만 접근한다. Browser client의 직접 접근은 차단한다.

#### `supervisor.job_postings` — 공고

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid PK | `gen_random_uuid()` |
| `title` | text NOT NULL | 공고 제목 |
| `location` | text | 근무 장소 |
| `start_date` | date NOT NULL | 근무 시작일 |
| `end_date` | date NOT NULL | 근무 종료일 |
| `work_start` | time | 근무 시작 시간 (예: 09:00) |
| `work_end` | time | 근무 종료 시간 (예: 18:00) |
| `pay_rate` | numeric(10, 2) NOT NULL | 시급/일급 (원) |
| `pay_type` | text DEFAULT 'hourly' | 'hourly' \| 'daily' |
| `headcount` | integer DEFAULT 1 | 모집 인원 |
| `status` | text DEFAULT 'open' | 'open' \| 'closed' \| 'draft' |
| `description` | text | 상세 설명/요구사항 |
| `created_by` | uuid FK → public.members(id) | 작성 관리자 |
| `created_at` | timestamptz | `now()` |
| `updated_at` | timestamptz | `now()` |

인덱스: `(status)`, `(created_by)`

삭제 정책: 활성 배정(`assigned` 또는 `working`)이 있는 공고는 삭제 불가. `status = 'closed'`로 전환 후에만 삭제 가능.

상태 전이 규칙:
- `draft` → `open`: 공개 전환 (역방향 불가)
- `open` → `closed`: 마감 (수동 전환 또는 `end_date` 경과 시)
- DB trigger로 유효하지 않은 전이 차단

#### `supervisor.workers` — 지원자

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid PK | `gen_random_uuid()` |
| `name` | text NOT NULL | 이름 |
| `phone` | text | 연락처 (암호화 저장) |
| `birth_date` | date | 생년월일 |
| `bank_name` | text | 은행명 |
| `account_number` | text | 계좌번호 (암호화 저장) |
| `status` | text DEFAULT 'registered' | 'registered' \| 'contracted' \| 'working' \| 'completed' |
| `note` | text | 메모/비고 |
| `created_by` | uuid FK → public.members(id) | 등록한 관리자 |
| `created_at` | timestamptz | `now()` |
| `updated_at` | timestamptz | `now()` |

인덱스: `(status)`, `(created_by)`

민감 정보 처리: `phone`, `account_number`는 `pgcrypto` 확장의 `pgp_sym_encrypt` / `pgp_sym_decrypt`로 암호화/복호화한다. 암호화 키는 환경변수 `ENCRYPTION_KEY`로 관리.

상태 전이 규칙:
- `registered` → `contracted`: 계약서 업로드 시
- `contracted` → `working`: 배정 상태가 `working`으로 변경 시
- `working` → `completed`: 모든 배정이 `completed` 또는 `cancelled` 시
- 역방향 전이 불가

#### `supervisor.assignments` — 배정

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid PK | `gen_random_uuid()` |
| `worker_id` | uuid FK → supervisor.workers(id) ON DELETE CASCADE | 지원자 |
| `job_posting_id` | uuid FK → supervisor.job_postings(id) ON DELETE CASCADE | 공고 |
| `status` | text DEFAULT 'assigned' | 'assigned' \| 'working' \| 'completed' \| 'cancelled' |
| `assigned_at` | timestamptz | `now()` |
| `updated_at` | timestamptz | `now()` |
| UNIQUE | (worker_id, job_posting_id) | 중복 배정 방지 |

인덱스: `(worker_id)`, `(job_posting_id)`, `(status)`

#### `supervisor.contract_documents` — 계약서 파일

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid PK | `gen_random_uuid()` |
| `worker_id` | uuid FK → supervisor.workers(id) ON DELETE CASCADE | 지원자 |
| `assignment_id` | uuid FK → supervisor.assignments(id) ON DELETE SET NULL, NULLABLE | 관련 배정 (선택) |
| `file_name` | text NOT NULL | 원본 파일명 |
| `file_path` | text NOT NULL | Storage 경로 |
| `file_size` | integer | 파일 크기 (bytes) |
| `mime_type` | text | image/jpeg, image/png 등 |
| `uploaded_by` | uuid FK → public.members(id) | 업로드한 관리자 |
| `uploaded_at` | timestamptz | `now()` |

인덱스: `(worker_id)`, `(assignment_id)`

### RLS 정책

```sql
-- 모든 supervisor 테이블
ALTER TABLE supervisor.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor.contract_documents ENABLE ROW LEVEL SECURITY;

-- Service role만 접근 허용 (API 라우트에서 service client 사용)
CREATE POLICY "service_role_all" ON supervisor.job_postings
  FOR ALL USING (auth.role() = 'service_role');
-- workers, assignments, contract_documents 동일 패턴
```

### Storage 버킷

```
contracts/                -- Private 버킷
  └── {worker_id}/
      └── {uuid}.{ext}
```

- **Private 버킷**으로 설정. 직접 URL 접근 불가.
- 다운로드 API (`/api/contracts/[id]`)에서 `createSignedUrl(path, 3600)` 패턴으로 시간제한 URL 발급.
- Supabase Storage를 기본으로 사용하며, 추후 외부 스토리지(S3 등) 전환이 가능하도록 `lib/storage.ts`에서 추상화한다.

---

## 앱 아키텍처

### 위치

```
apps/part-time-supervisor/    # 포트 3002
```

### 기술 스택

- Next.js 15 (App Router, Turbopack), React 19, TypeScript 5
- Tailwind CSS 4, `@repo/ui`, `@repo/utils` 공유 패키지 재사용
- TanStack React Query (서버 상태), Zustand (클라이언트 상태)
- Supabase (Browser + Server client, Storage)

### 디렉토리 구조

```
apps/part-time-supervisor/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  -- 대시보드 홈
│   │   ├── job-postings/page.tsx     -- 공고 관리
│   │   ├── workers/page.tsx          -- 지원자 관리
│   │   └── assignments/page.tsx      -- 배정 관리
│   └── api/
│       ├── auth/session/route.ts     -- SSO 세션 검증
│       ├── job-postings/
│       │   ├── route.ts              -- GET, POST
│       │   └── [id]/route.ts         -- GET, PUT, DELETE
│       ├── workers/
│       │   ├── route.ts              -- GET, POST
│       │   └── [id]/route.ts         -- GET, PUT, DELETE
│       ├── assignments/
│       │   ├── route.ts              -- GET, POST
│       │   └── [id]/route.ts         -- PUT, DELETE
│       └── contracts/
│           ├── route.ts              -- GET, POST (업로드)
│           └── [id]/route.ts         -- GET (Signed URL 발급), DELETE
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 -- Browser client
│   │   ├── server.ts                 -- Server client (SSO 검증용) + createServiceClient()
│   │   └── types.ts                  -- supervisor 스키마 타입
│   ├── auth.ts                       -- requireAuth() — x-session 헤더에서 세션 추출
│   ├── query-keys.ts                 -- React Query 키 팩토리
│   └── storage.ts                    -- 파일 업로드/다운로드 추상화 (Signed URL)
├── hooks/
│   ├── use-job-postings.ts
│   ├── use-job-posting-mutations.ts
│   ├── use-workers.ts
│   ├── use-worker-mutations.ts
│   ├── use-assignments.ts
│   ├── use-assignment-mutations.ts
│   └── use-contracts.ts
├── stores/
│   └── useAuthStore.ts
├── components/
│   ├── layout/                       -- Sidebar, Header
│   ├── job-postings/                 -- 공고 관련 컴포넌트
│   ├── workers/                      -- 지원자 관련 컴포넌트
│   └── assignments/                  -- 배정 관련 컴포넌트
├── middleware.ts                      -- SSO 세션 검증
├── next.config.ts
├── package.json
└── tsconfig.json
```

### Supabase Service Client

```typescript
// lib/supabase/server.ts
import { createClient } from "@supabase/supabase-js";

// Service client — RLS 우회, API 라우트 전용
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// 모든 supervisor 테이블 CRUD는 service client를 통해 수행
```

### 환경변수 (`apps/part-time-supervisor/.env.local`)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<로컬 anon key>
SUPABASE_SERVICE_ROLE_KEY=<로컬 service_role key>

# SSO
ADMIN_APP_URL=http://localhost:3001

# 민감정보 암호화 (32자 랜덤 hex, 예: openssl rand -hex 16)
ENCRYPTION_KEY=<pgcrypto 대칭키>
```

---

## 인증 (SSO)

### 방식: 검증 API 호출

localhost 환경에서 포트 간 쿠키 공유의 브라우저별 불일치 문제를 해결하기 위해, 쿠키를 직접 파싱하지 않고 admin 앱의 세션 검증 API를 호출하는 방식을 사용한다.

### 흐름

```
1. 관리자가 admin 앱 (localhost:3001)에서 로그인
2. admin-session 쿠키 설정
3. supervisor 앱 (localhost:3002) 접근
4. middleware.ts에서 요청의 cookie 헤더를 포함하여
   admin 앱의 GET /api/auth/session 엔드포인트를 server-side fetch 호출
5. admin 앱이 쿠키를 검증하고 세션 정보 반환
6. 유효 → 통과 (세션 정보를 헤더로 전달), 무효 → admin 로그인 페이지로 리다이렉트
```

### 세션 API 응답 계약

```typescript
// GET /api/auth/session 응답

// 성공 (200)
{ authenticated: true, user: { id: string, fullName: string, role: string } }

// 실패 (401)
{ authenticated: false }
```

### middleware.ts 구현 개요

```typescript
// supervisor middleware.ts
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃

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

  // 세션 정보를 request 헤더로 downstream API 라우트에 전달
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-session-user-id", session.user.id);
  requestHeaders.set("x-session-user-name", session.user.fullName);
  requestHeaders.set("x-session-user-role", session.user.role);

  return NextResponse.next({ request: { headers: requestHeaders } });
} catch (error) {
  // 네트워크 오류 또는 타임아웃 → admin 로그인으로 리다이렉트
  return NextResponse.redirect(`${ADMIN_APP_URL}/login`);
}
```

- 보호 경로: `/(dashboard)/*` 전체
- API 라우트에서 세션 접근: `request.headers.get("x-session-user-id")` 등
- 프로덕션: 같은 도메인(서브도메인) 배포 시 쿠키 직접 공유로 전환 가능

---

## 페이지별 기능 상세

### 1. 대시보드 (`/`)

| 카드 | 데이터 |
|------|--------|
| 활성 공고 수 | `job_postings WHERE status = 'open'` COUNT |
| 전체 지원자 수 | `workers` COUNT |
| 현재 근무중 인원 | `workers WHERE status = 'working'` COUNT |
| 모집 대비 배정 현황 | 공고별 `headcount` 대비 `assignments` COUNT |
| 최근 공고 | 최근 생성 공고 5건 |

### 2. 공고 관리 (`/job-postings`)

| 기능 | UI | 설명 |
|------|-----|------|
| 목록 | 테이블 | 제목, 장소, 기간, 시급, 모집/배정 인원, 상태 + 필터/검색 |
| 생성 | 모달 | 전체 필드 폼 |
| 수정 | 모달 | 기존 값 프리필 |
| 삭제 | 확인 다이얼로그 | 활성 배정 있으면 삭제 차단, closed 상태에서만 삭제 가능 |
| 상태 변경 | 인라인 | draft → open → closed |

### 3. 지원자 관리 (`/workers`)

| 기능 | UI | 설명 |
|------|-----|------|
| 목록 | 테이블 | 이름, 연락처, 상태, 배정 공고 수 + 필터/검색 |
| 생성 | 모달 | 인적사항 + 계좌정보 |
| 상세 | 드로어 | 인적사항, 배정 이력, 계약서 파일 목록 |
| 수정 | 드로어/모달 | 인라인 편집 |
| 삭제 | 확인 다이얼로그 | CASCADE (배정, 계약서 포함) |
| 계약서 | 드로어 내 | 이미지 업로드, 미리보기(Signed URL), 삭제 |

### 4. 배정 관리 (`/assignments`)

| 기능 | UI | 설명 |
|------|-----|------|
| 목록 | 테이블 | 공고별/지원자별 보기 전환 |
| 배정 | 모달 | 공고 선택 → 지원자 선택 |
| 상태 변경 | 인라인 | assigned → working → completed / cancelled |
| 해제 | 확인 다이얼로그 | 배정 삭제 |

---

## Query Invalidation 패턴

```typescript
// query-keys.ts
export const queryKeys = {
  dashboard: { all: ["dashboard"] },
  jobPostings: {
    all: ["jobPostings"],
    detail: (id: string) => ["jobPostings", id],
  },
  workers: {
    all: ["workers"],
    detail: (id: string) => ["workers", id],
  },
  assignments: {
    all: ["assignments"],
    detail: (id: string) => ["assignments", id],
    byJobPosting: (id: string) => ["assignments", "jobPosting", id],
    byWorker: (id: string) => ["assignments", "worker", id],
  },
  contracts: {
    byWorker: (workerId: string) => ["contracts", workerId],
  },
};

// 공고 CRUD → jobPostings.all + dashboard.all
// 지원자 CRUD → workers.all + dashboard.all
// 배정 CRUD → assignments.all + workers.detail(workerId) + jobPostings.detail(jobPostingId) + dashboard.all
// 배정 상태 변경 → 위 + workers.all (workers.status 연동)
// 계약서 업로드/삭제 → contracts.byWorker(workerId) + workers.detail(workerId) + dashboard.all
```

---

## 모노레포 통합

### package.json

앱 패키지 이름: `"name": "part-time-supervisor"` (기존 `admin`, `user`와 동일 패턴)

루트 추가 스크립트:

```json
{
  "dev:part-time-supervisor": "turbo dev --filter=part-time-supervisor",
  "build:part-time-supervisor": "turbo build --filter=part-time-supervisor",
  "start:part-time-supervisor": "turbo start --filter=part-time-supervisor"
}
```

### Turborepo

기존 `turbo.json` 파이프라인에 자동 포함 (apps/* 패턴).

---

## 범위 외 (향후 고려)

- 지원자 직접 접근 (공개 지원 페이지)
- 급여 정산/지급 관리
- 알림 (Slack, Push)
- 엑셀 내보내기/가져오기
- 외부 스토리지(S3) 전환
