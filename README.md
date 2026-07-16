# Meal ACG v3

기업 내부 복지/운영 포털 모노레포입니다. 식대, 복지포인트, 근태, 휴가, 자산, 차량, 점심조, 프로젝트/요청 관리, 아르바이트 감독 업무를 앱별로 나누어 운영합니다.

최종 검토: 2026-05-28

## 앱 구성

| 앱                   | 패키지                      | 포트 | 용도                                                                                       |
| -------------------- | --------------------------- | ---- | ------------------------------------------------------------------------------------------ |
| User                 | `apps/user`                 | 3000 | 임직원용 포털. 식대/복지포인트/근태/휴가/자산/차량/프로젝트 요청을 처리합니다.             |
| Admin                | `apps/admin`                | 3001 | 관리자용 백오피스. 조직, 권한, 정산, 검토, 알림, 감사 로그, 각종 운영 마스터를 관리합니다. |
| Part-time Supervisor | `apps/part-time-supervisor` | 3002 | 단기 근무자 모집, 배정, 출근, 계약, 비용 정산을 관리합니다.                                |
| Project Management   | `apps/project-management`   | 3013 | 프로젝트와 요청 큐를 별도 업무 앱으로 관리합니다.                                          |

## 기술 스택

| 영역             | 기술                                                  |
| ---------------- | ----------------------------------------------------- |
| 모노레포         | Turborepo, pnpm workspace                             |
| 프레임워크       | Next.js 15 App Router, React 19                       |
| 언어             | TypeScript 5                                          |
| 스타일           | Tailwind CSS 4, Radix UI, Motion, lucide-react        |
| 상태/서버 상태   | Zustand, TanStack React Query v5                      |
| 백엔드           | Supabase PostgreSQL, RLS, RPC, Next.js Route Handlers |
| 외부 연동        | Google Sheets, Google Calendar, Slack, Web Push       |
| 문서/데이터 처리 | ExcelJS, xlsx, Tiptap, Sentry 일부 앱 적용            |

## 빠른 시작

### 요구 사항

- Node.js 18 이상
- pnpm 8.15.6
- 로컬 Supabase를 사용할 경우 Docker 또는 OrbStack

### 설치

```bash
pnpm install
```

### 개발 서버

```bash
pnpm dev                         # 전체 앱 실행
pnpm dev:user                    # User: http://localhost:3000
pnpm dev:admin                   # Admin: http://localhost:3001
pnpm dev:part-time-supervisor    # Supervisor: http://localhost:3002
pnpm dev:project-management      # Project Management: http://localhost:3013
```

### 빌드/실행

```bash
pnpm build
pnpm build:user
pnpm build:admin
pnpm build:part-time-supervisor
pnpm build:project-management

pnpm start:user
pnpm start:admin
pnpm start:part-time-supervisor
pnpm start:project-management
```

### 품질 확인

```bash
pnpm check-types
pnpm lint
pnpm format
```

앱별 확인이 필요하면 Turbo 필터를 직접 사용할 수 있습니다.

```bash
pnpm --filter admin check-types
pnpm --filter user build
pnpm --filter project-management lint
```

> 각 Next 앱의 `next.config.ts`는 빌드 중 TypeScript/ESLint 오류를 무시하도록 설정되어 있습니다. 배포 전에는 `check-types`와 `lint`를 별도로 실행해야 합니다.

## 프로젝트 구조

```text
meal-acg-v3/
├── apps/
│   ├── user/                    # 임직원 포털
│   ├── admin/                   # 관리자 백오피스
│   ├── part-time-supervisor/    # 단기 근무 감독/계약/출근 앱
│   └── project-management/      # 프로젝트/요청 관리 앱
├── packages/
│   ├── ui/                      # 공유 UI 컴포넌트
│   ├── utils/                   # 공유 유틸리티
│   ├── eslint-config/           # 공유 ESLint 설정
│   ├── typescript-config/       # 공유 TypeScript 설정
│   └── tailwind-config/         # 공유 Tailwind 설정
├── supabase/
│   ├── migrations/              # DB 마이그레이션
│   ├── schemas/                 # 보조 스키마 문서
│   └── seed.sql                 # 로컬 seed
└── docs/                        # IA, 보안, 기능 문서
```

## 주요 기능

### User

- 식대 기록, 월별 사용 가능액, 영수증 스캔
- 복지포인트/활동비 신청과 사용 내역 조회
- 근태, 휴가, 연장근무, 승인 요청
- 공지, 점심조, 회의실 예약
- 사내 자산, 사물함, 차량 사용 신청
- 다면평가, 프로젝트/요청 관리 진입점
- Web Push 알림

### Admin

- 운영 대시보드와 월별 통계
- 조직도, 직책/직무, 대표 권한, 권한 정책 관리
- 예산, 정산, 회계, Excel Import/Export
- 사용 내역 검토, 승인, 휴가/근태 관리
- 자산, 사물함, 차량, 점심조, 월간 음료 관리
- 다면평가 문항/라운드/리포트 관리
- Slack/Web Push 알림, 휴일 동기화
- 감사 로그와 관리자 세션 보호

### Part-time Supervisor

- 단기 근무 공고와 근무자 관리
- 방 배정, 출근 QR/서명, 계약서 작성
- 비용 관리와 감독자 전용 대시보드
- Admin 앱 인증 세션 연동

### Project Management

- 프로젝트 목록과 상세 관리
- 요청 큐, 담당자 배정, 진행 상태 관리
- User/Admin/Supervisor 앱과의 이동 링크

## 환경 변수

실제 비밀값은 커밋하지 않습니다. 로컬에서는 각 앱의 `.env.local` 또는 루트 `.env.local`에 설정합니다.

### 공통 Supabase

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### User

```bash
SESSION_SECRET=
GOOGLE_PRIVATE_KEY=
GOOGLE_CLIENT_EMAIL=
GOOGLE_SHEET_ID=
GOOGLE_SHEET_ID_WELFARE_POINTS=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
SUPERVISOR_APP_URL=
```

### Admin

```bash
ADMIN_SESSION_SECRET=
SUPERVISOR_APP_URL=
GOOGLE_CALENDAR_API_KEY=
SLACK_BOT_TOKEN=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
NEXT_PUBLIC_SUPERVISOR_APP_URL=
NEXT_PUBLIC_PROJECT_MANAGEMENT_APP_URL=
NEXT_PUBLIC_REQUEST_MANAGEMENT_APP_URL=
NEXT_DIST_DIR=
```

`ADMIN_SESSION_SECRET`은 운영 환경에서 별도로 생성한 긴 랜덤 문자열을 사용합니다.

```bash
openssl rand -base64 32
```

### Part-time Supervisor

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPERVISOR_SESSION_SECRET=
SUPERVISOR_EDITOR_TEAM_ID=
HR_ENCRYPTION_KEY=
```

`SUPERVISOR_SESSION_SECRET`은 운영 환경에서 로컬 로그인 세션을 서명하는 긴 랜덤 문자열입니다.
`SUPERVISOR_EDITOR_TEAM_ID`는 편집 권한을 가진 운영팀의 고정 UUID이며, `HR_ENCRYPTION_KEY`는 Base64로 인코딩한 32바이트 AES 키입니다.

### Project Management

```bash
ADMIN_APP_URL=
NEXT_PUBLIC_USER_APP_URL=
NEXT_PUBLIC_SUPERVISOR_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_DIST_DIR=
```

## 인증과 권한

- User 앱은 사용자 세션 쿠키와 Supabase 기반 데이터 접근을 함께 사용합니다.
- Admin 앱은 `admin-session` 쿠키, 미들웨어, 서버 가드를 통해 보호합니다.
- Admin 세션 쿠키는 HMAC 서명으로 위변조를 검증합니다.
- 관리자 권한은 `admin_role`, `user_authority`, 권한 정책 테이블과 서버 API의 `requireAdminPermission(...)` 가드로 관리합니다.
- Supervisor와 Project Management 앱은 Admin 앱으로 로그인 흐름을 위임하는 구간이 있습니다.

## Supabase 작업

마이그레이션은 `supabase/migrations/`에 둡니다.

```bash
supabase start
supabase db reset
supabase migration new <name>
supabase db push
```

타입 생성이 필요하면 대상 앱의 타입 파일로 출력합니다.

```bash
supabase gen types typescript --project-id <project-id> > apps/admin/lib/supabase/types.ts
```

로컬 DB 적용 여부가 중요할 때는 마이그레이션 파일 존재만 보지 말고 실제 DB에 적용됐는지 확인합니다.

## 개발 규칙

- 새 기능은 기존 앱/패키지 패턴을 먼저 따릅니다.
- 공유 로직은 `packages/utils`, 공유 UI는 `packages/ui`를 우선 검토합니다.
- Route Handler에서 민감한 DB 작업을 할 때는 서버 권한 가드를 먼저 확인합니다.
- 환경변수 예시에는 이름만 남기고 실제 값은 넣지 않습니다.
- 큰 기능은 앱별 타입 체크와 변경 파일 중심 검증을 우선 실행합니다.

## 커밋 메시지

이 레포의 AGENTS.md는 Lore Commit Protocol을 사용합니다. 커밋을 만들 때는 의도 중심 제목과 필요한 trailer를 포함합니다.

```text
관리자 세션 위변조를 서버에서 차단한다

Constraint: 운영 환경에서는 별도 세션 시크릿이 필요함
Confidence: high
Scope-risk: narrow
Tested: pnpm --filter admin check-types
```
