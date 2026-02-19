# Meal ACG v3

기업 식대 관리 애플리케이션 — 복지포인트 · 활동비 · 식대 정산을 하나로

## Overview

직원들의 식대 사용 내역을 관리하고, 복지포인트/활동비 정산을 자동화하는 시스템입니다.
Turborepo 기반 모노레포로 User/Admin 두 개의 Next.js 앱과 공유 패키지로 구성됩니다.

| App | Port | 설명 |
|-----|------|------|
| User | 3000 | 직원용 — 식사 기록, 영수증 스캔, 포인트 관리, 푸시 알림 |
| Admin | 3001 | 관리자용 — 대시보드, 예산 할당, 정산 관리, Slack 연동 |

## Tech Stack

| 영역 | 기술 |
|------|------|
| **프레임워크** | Next.js 15 (App Router, Turbopack), React 19 |
| **언어** | TypeScript 5 (strict mode) |
| **스타일링** | Tailwind CSS 4, Motion v12 (애니메이션), Radix UI |
| **상태 관리** | Zustand (클라이언트), TanStack React Query v5 (서버) |
| **백엔드** | Supabase (PostgreSQL, RLS, RPC) |
| **AI** | Google Gemini (영수증 스캔) |
| **외부 연동** | Google Sheets, Google Calendar, Slack |
| **빌드** | Turborepo, pnpm |
| **PWA** | @ducanh2912/next-pwa (서비스 워커 자동 생성) |
| **알림** | Web Push (VAPID) |

## Project Structure

```
meal-v3/
├── apps/
│   ├── user/                    # 직원용 Next.js 앱
│   │   ├── app/
│   │   │   ├── (auth)/          # 인증 관련 페이지
│   │   │   ├── (content)/       # 메인 콘텐츠 (dashboard, points, settings 등)
│   │   │   └── api/             # API Routes
│   │   ├── components/          # React 컴포넌트
│   │   ├── hooks/               # Custom hooks (use-meal-data, use-points-data 등)
│   │   ├── lib/                 # Supabase 클라이언트, 유틸리티
│   │   └── stores/              # Zustand stores (userStore, mealDrawerStore)
│   │
│   └── admin/                   # 관리자용 Next.js 앱
│       ├── app/
│       │   ├── (dashboard)/     # 대시보드 페이지들
│       │   └── api/             # API Routes (stats, members, budget, settlement 등)
│       ├── hooks/               # Custom hooks
│       └── lib/                 # Supabase 클라이언트, 인증, Excel 파서
│
└── packages/
    ├── ui/                      # 공유 UI 컴포넌트 (@repo/ui) — Radix 기반
    ├── utils/                   # 공유 유틸리티 (@repo/utils) — dayjs, KST 날짜 함수
    ├── eslint-config/           # 공유 ESLint 설정
    ├── typescript-config/       # 공유 TypeScript 설정
    └── tailwind-config/         # 공유 Tailwind 설정
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
# 의존성 설치
pnpm install

# 환경 변수 설정
# 각 앱의 .env.local 파일에 필요한 키 입력
```

### Development

```bash
pnpm dev          # 전체 앱 실행 (user:3000, admin:3001)
pnpm dev:user     # 사용자 앱만
pnpm dev:admin    # 어드민 앱만
```

### Build

```bash
pnpm build        # 전체 모노레포 빌드
pnpm build:user   # 사용자 앱만
pnpm build:admin  # 어드민 앱만
```

### Production

```bash
pnpm start:user   # 프로덕션 사용자 앱 시작 (빌드 후)
pnpm start:admin  # 프로덕션 어드민 앱 시작 (빌드 후)
```

### Code Quality

```bash
pnpm lint         # ESLint (경고 0 정책)
pnpm check-types  # TypeScript 타입 체크
pnpm format       # Prettier 포매팅
```

> **참고:** 빌드 시 TypeScript/ESLint 에러가 무시됩니다 (`ignoreBuildErrors`). 반드시 `pnpm check-types`와 `pnpm lint`를 수동 실행하세요.

## Features

### User App

| 기능 | 설명 |
|------|------|
| 식사 기록 | 조식/중식/석식 금액 및 가게 입력, 캘린더 기반 조회 |
| 영수증 스캔 | Gemini AI로 영수증 자동 인식 |
| 복지포인트 | 잔액 조회, 사용 내역 등록/수정, 전체 내역 조회 (무한 스크롤) |
| 활동비 | 팀장/본부장 전용 활동비 관리 및 팀별 현황 |
| 인기 음식점 | ACG 전체 인기 음식점 Top 10 랭킹 (누적 통계) |
| 대리결제 알림 | 대리결제 시 Web Push 알림 발송 |
| 점심조 | 주간 점심조 배정 및 조회 |
| PWA | 모바일 앱 설치 지원, 가로 스크롤 방지 |

### Admin App

| 기능 | 설명 |
|------|------|
| 대시보드 | 월별 통계, 사용 트렌드, 인기 가게 |
| 예산 관리 | 복지포인트/활동비 예산 할당 및 조회 |
| 사용 내역 검토 | 전체 내역 조회, 검토 상태 관리, 일괄 삭제, Audit log |
| Excel Import | 복지포인트 Excel 가져오기 (중복 자동 제거, 기존 데이터 덮어쓰기) |
| Excel Export | 개인별/전체 정산 Excel 내보내기 |
| 정산 처리 | 월별 정산 완료 처리 |
| Slack 알림 | 미정산자에게 정산 요청 발송 |
| 점심조 설정 | 고정 점심조 및 주간 배정 관리 |
| 푸시 알림 | 전체/개인 공지 Web Push 발송 |

## Environment Variables

### User App (`apps/user/.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=         # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase 공개 키
SUPABASE_SERVICE_ROLE_KEY=        # Supabase 서비스 역할 키

GOOGLE_PRIVATE_KEY=               # Google 서비스 계정 키
GOOGLE_CLIENT_EMAIL=              # Google 서비스 계정 이메일
GOOGLE_SHEET_ID=                  # 월간 음료 시트 ID
GOOGLE_SHEET_ID_WELFARE_POINTS=   # 복지포인트 시트 ID

GEMINI_API_KEY=                   # Gemini AI API 키
NEXT_PUBLIC_VAPID_PUBLIC_KEY=     # Web Push VAPID 공개 키
```

### Admin App (`apps/admin/.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=         # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase 공개 키
SUPABASE_SERVICE_ROLE_KEY=        # Supabase 서비스 역할 키

GOOGLE_CALENDAR_API_KEY=          # Google Calendar API 키
SLACK_BOT_TOKEN=                  # Slack 봇 토큰

VAPID_PUBLIC_KEY=                 # Web Push VAPID 공개 키
VAPID_PRIVATE_KEY=                # Web Push VAPID 비공개 키
```

## Key Patterns

### Data Flow

```
사용자 입력 → React Query Mutation → API Route → Supabase → Cache Invalidation → UI 갱신
```

### Query Keys (Factory Pattern)

```typescript
// lib/query-keys.ts
queryKeys.meals.byUserAndMonth(userName, month, year)
queryKeys.points.welfare.byPeriod(memberId, period)
queryKeys.points.activity.byPeriod(memberId, period)
```

### Custom Hooks

```typescript
// 패턴: use-{resource}.ts 또는 use-{resource}-{action}.ts
useMealData(userName, month, year)   // 데이터 조회
useMealSubmit()                      // mutation hook
usePointsWelfare(memberId, period)   // 복지포인트 조회
usePointsActivity(memberId, period)  // 활동비 조회
```

### Authentication

- **User 앱:** Zustand + localStorage 기반 세션 (이름으로 식별)
- **Admin 앱:** 쿠키 기반 세션 + 미들웨어 보호 + `requireAdmin()` 가드

## Database

### Supabase RPC Functions

DB 레벨에서 복잡한 집계/쿼리를 처리하는 RPC 함수:

| 함수명 | 설명 |
|--------|------|
| `get_user_monthly_stats` | 월별 식사 통계 집계 |
| `get_popular_restaurants` | 전체 meal_logs 기준 인기 음식점 Top 10 |

### Migrations

마이그레이션 파일은 `supabase/migrations/` 디렉토리에 저장:
- 네이밍: `YYYYMMDD_description.sql`
- 예시: `20260219_add_no_to_usage_records.sql`

**로컬 개발 워크플로우** (Supabase CLI):
```bash
supabase start                    # 로컬 Supabase 인스턴스 시작
supabase db reset                 # DB 초기화 및 모든 migration 적용
supabase migration new <name>     # 새 migration 파일 생성
supabase db push                  # 원격에 migration 적용
```

**타입 생성:**
```bash
supabase gen types typescript --project-id <id> > apps/admin/lib/supabase/types.ts
```

## Attendance Types

`meal_logs.attendance` 컬럼에 저장되는 값:

| 값 | 식대 포함 |
|----|----------|
| `근무` | O |
| `근무(개별식사 / 식사안함)` | X |
| `재택근무` | X |
| `연차/휴무` | X |
| `오전 반차/휴무` | X |
| `오후 반차/휴무` | X |

**사용가능액 계산:** `일일단가 × (근무일 - 휴일 - 재택 - 개별 + 주말근무)`

## Code Standards

- **ESLint:** Zero warnings policy (`--max-warnings 0`)
- **TypeScript:** Strict mode (`tsc --noEmit`)
- **Commits:** Korean commit messages with prefix
  - `feat` — 새로운 기능
  - `fix` — 버그 수정
  - `refactor` — 리팩토링
  - `style` — 스타일 변경
  - `docs` — 문서 수정
