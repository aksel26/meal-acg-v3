# Meal ACG v3

기업용 식대 관리 애플리케이션

## Overview

직원들의 식대 사용 내역을 관리하고, 월별 정산을 자동화하는 시스템입니다. Turborepo 기반 모노레포로 User/Admin 두 개의 Next.js 앱과 공유 패키지로 구성됩니다.

| App | Port | 설명 |
|-----|------|------|
| User | 3000 | 직원용 - 식사 기록, 영수증 스캔, 점심조 관리 |
| Admin | 3001 | 관리자용 - 대시보드, 정산 관리, Excel 가져오기/내보내기 |

## Tech Stack

### Core
- **Framework**: Next.js 15 (App Router, Turbopack)
- **React**: 19
- **Language**: TypeScript 5 (strict mode)

### Styling
- **CSS**: Tailwind CSS 4
- **Components**: Radix UI (Headless)
- **Animation**: Motion

### State Management
- **Client**: Zustand (persist middleware)
- **Server**: TanStack React Query v5

### Backend Services

| Service | User App | Admin App |
|---------|----------|-----------|
| Database | - | Supabase (PostgreSQL + RLS) |
| Auth | Firebase Admin SDK | Supabase Auth |
| Storage | Firebase Storage | Supabase Storage |
| External APIs | Google Sheets, Calendar, Drive | Google Calendar (공휴일) |
| AI | Gemini (영수증 스캔) | - |
| Notifications | - | Slack Bot |

### Build Tools
- **Monorepo**: Turborepo
- **Package Manager**: pnpm 8.15+
- **Linting**: ESLint (zero warnings policy)
- **Formatting**: Prettier

## Project Structure

```
meal-v3/
├── apps/
│   ├── user/                    # 직원용 Next.js 앱
│   │   ├── app/                 # App Router pages
│   │   │   ├── (auth)/          # 인증 관련 페이지
│   │   │   ├── (content)/       # 메인 콘텐츠 페이지
│   │   │   └── api/             # API Routes
│   │   ├── components/          # React 컴포넌트
│   │   ├── hooks/               # Custom hooks (use-meal-data, use-meal-submit 등)
│   │   ├── lib/                 # 유틸리티, Supabase/Firebase 클라이언트
│   │   └── stores/              # Zustand stores
│   │
│   └── admin/                   # 관리자용 Next.js 앱
│       ├── app/
│       │   ├── (dashboard)/     # 대시보드 페이지들
│       │   │   ├── page.tsx     # 메인 대시보드
│       │   │   ├── users/       # 사용자 현황
│       │   │   ├── calendar/    # 캘린더 뷰
│       │   │   ├── import/      # Excel 가져오기
│       │   │   └── lunch-groups/# 점심조 관리
│       │   └── api/             # API Routes
│       │       ├── stats/       # 통계 API (monthly, summary, trends)
│       │       ├── members/     # 멤버 CRUD
│       │       ├── meal-logs/   # 식사 기록 CRUD
│       │       ├── export/      # Excel 내보내기
│       │       ├── import/      # Excel 가져오기
│       │       ├── settlement/  # 정산 처리
│       │       └── slack/       # Slack 알림
│       ├── hooks/               # Custom hooks
│       └── lib/                 # Supabase 클라이언트, 인증, Excel 파서
│
└── packages/
    ├── ui/                      # 공유 UI 컴포넌트 (@repo/ui)
    │   └── src/                 # Button, Dialog, Drawer, Input 등
    ├── utils/                   # 공유 유틸리티 (@repo/utils)
    │   └── src/                 # dayjs, KST 날짜 함수
    ├── eslint-config/           # 공유 ESLint 설정
    ├── typescript-config/       # 공유 TypeScript 설정
    └── tailwind-config/         # 공유 Tailwind 설정
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8.15+

### Installation

```bash
# 의존성 설치
pnpm install
```

### Environment Setup

**Admin App** (`apps/admin/.env.local`):
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx          # RLS 우회용 (관리자 작업)

# Google Calendar API (공휴일 동기화)
GOOGLE_CALENDAR_API_KEY=xxx

# Slack Bot (정산 요청 알림)
SLACK_BOT_TOKEN=xoxb-xxx
```

**User App** (`apps/user/.env.local`):
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# Google Service Account (Sheets/Drive 연동)
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CLIENT_EMAIL=xxx@xxx.iam.gserviceaccount.com

# Google Sheets
GOOGLE_SHEET_ID=xxx                     # 월간 음료 시트
GOOGLE_SHEET_ID_WELFARE_POINTS=xxx      # 복지포인트 시트

# Gemini AI (영수증 OCR)
GEMINI_API_KEY=xxx
```

### Development

```bash
# 전체 앱 실행 (user:3000, admin:3001)
pnpm dev

# 개별 앱 실행
pnpm dev:user     # http://localhost:3000
pnpm dev:admin    # http://localhost:3001
```

### Build & Production

```bash
# 전체 빌드
pnpm build

# 개별 빌드
pnpm build:user
pnpm build:admin

# 프로덕션 실행
pnpm start:user
pnpm start:admin
```

## Features

### User App

| 기능 | 설명 |
|------|------|
| 식사 기록 | 조식/중식/석식 금액 및 가게 입력 |
| 영수증 스캔 | Gemini AI로 영수증 자동 인식 |
| 캘린더 뷰 | 월별 식사 기록 조회 |
| 점심조 | 주간 점심조 배정 및 조회 |
| 월간 음료 | Monthly Meeting 음료 선택 |
| 포인트 | 활동포인트/복지포인트 조회 |
| PWA | 모바일 앱 설치 지원 |

### Admin App

| 기능 | 설명 |
|------|------|
| 대시보드 | 월별 통계, 사용 트렌드, 인기 가게 |
| 사용자 현황 | 전체 사용자 식대 현황 테이블 |
| 캘린더 관리 | 사용자별 식사 기록 수정 |
| 누락 체크 | 미입력 날짜 일괄 확인 |
| Excel Import | Excel 파일에서 식사 기록 가져오기 |
| Excel Export | 개인별/전체 정산 Excel 내보내기 |
| 정산 처리 | 월별 정산 완료 처리 |
| Slack 알림 | 미정산자에게 정산 요청 발송 |
| 점심조 설정 | 고정 점심조 및 주간 배정 관리 |

## Key Patterns

### Query Keys (Factory Pattern)
```typescript
// apps/admin/lib/query-keys.ts
queryKeys.stats.monthly(year, month)
queryKeys.mealLogs.byUserAndMonth(userId, year, month)
queryKeys.dashboard.summary(year, month)
```

### Custom Hooks
```typescript
// 패턴: use-{resource}.ts 또는 use-{resource}-{action}.ts
useMealData(userName, month, year)  // 데이터 조회
useMealSubmit()                     // mutation hook
```

### Supabase Clients (Admin App)
```typescript
// Browser Client - RLS 적용
import { createBrowserClient } from '@/lib/supabase/client'

// Server Client - 쿠키 기반 인증
import { createServerClient } from '@/lib/supabase/server'

// Service Client - RLS 우회 (관리자 작업용)
import { createServiceClient } from '@/lib/supabase/server'
```

## Attendance Types (근태 값)

`meal_logs.attendance` 컬럼에 저장되는 값:

| 값 | 식대 포함 |
|----|----------|
| `근무` | O |
| `근무(개별식사 / 식사안함)` | X |
| `재택근무` | X |
| `연차/휴무` | X |
| `오전 반차/휴무` | X |
| `오후 반차/휴무` | X |

**사용가능액 계산**: `일일단가 × (근무일 - 휴일 - 재택 - 개별 + 주말근무)`

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | 개발 서버 실행 |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm lint` | ESLint 검사 (max warnings = 0) |
| `pnpm check-types` | TypeScript 타입 검사 |
| `pnpm format` | Prettier 포맷팅 |

## Code Standards

- **ESLint**: Zero warnings policy (`--max-warnings 0`)
- **TypeScript**: Strict mode (`tsc --noEmit`)
- **Commits**: Korean commit messages with prefix
  - `feat`: 새로운 기능
  - `fix`: 버그 수정
  - `refactor`: 리팩토링
  - `style`: 스타일 변경
  - `docs`: 문서 수정
