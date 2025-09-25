# 🍽️ Meal ACG v3

> 스마트한 식비 관리를 위한 기업용 식대 관리 애플리케이션

## 📋 프로젝트 개요

**Meal ACG v3**는 기업 구성원들의 식비를 체계적으로 관리하고 추적할 수 있는 모던 웹 애플리케이션입니다. PWA 지원으로 모바일에서도 네이티브 앱과 같은 경험을 제공합니다.

### 🎯 주요 기능

- 📱 **PWA 지원** - 모바일 설치 및 오프라인 사용 가능
- 🔐 **인증 시스템** - 안전한 로그인 및 사용자 관리
- 📊 **대시보드** - 식비 현황 및 통계 시각화
- 🍴 **식비 기록** - 일별/월별 식비 입력 및 관리
- 👥 **점심조 관리** - 팀원들과 함께하는 점심 시간 관리
- ☕ **음료 관리** - Monthly Meeting 음료비 추적
- 📈 **포인트 시스템** - 식비 사용 내역 포인트화

## 🛠️ 기술 스택

### Frontend

- **Next.js 15** - React 프레임워크 (App Router)
- **React 19** - UI 라이브러리
- **TypeScript** - 정적 타입 검사
- **Tailwind CSS 4** - 유틸리티 기반 CSS 프레임워크
- **Motion** - 애니메이션 라이브러리

### State Management & Data Fetching

- **Zustand** - 경량 상태 관리
- **TanStack React Query** - 서버 상태 관리 및 캐싱

### Backend Integration

- **Firebase Admin SDK** - 백엔드 서비스
- **Google APIs** - Drive, Sheets, Calendar 연동

### Development Tools

- **Turborepo** - 모노레포 관리
- **pnpm** - 패키지 매니저
- **ESLint** - 코드 품질 관리
- **Prettier** - 코드 포매팅

## 🏗️ 프로젝트 구조

```
meal-acg-v3/
├── apps/
│   └── user/                 # 메인 Next.js 애플리케이션
│       ├── app/             # App Router 페이지
│       ├── components/      # React 컴포넌트
│       ├── hooks/          # 커스텀 React 훅
│       ├── lib/            # 유틸리티 라이브러리
│       └── stores/         # Zustand 스토어
├── packages/
│   ├── ui/                  # 공유 React 컴포넌트 라이브러리
│   ├── utils/              # 공유 유틸리티 함수
│   ├── eslint-config/      # ESLint 설정
│   ├── typescript-config/  # TypeScript 설정
│   └── tailwind-config/    # Tailwind CSS 설정
└── docs/                   # 문서화
```

## 🚀 시작하기

### 요구사항

- Node.js >= 18
- pnpm (필수)

### 설치 및 실행

```bash
# 의존성 설치
pnpm install

# 개발 서버 시작
pnpm dev

# 특정 앱만 실행
pnpm dev:user

# 빌드
pnpm build

# 타입 체크
pnpm check-types

# 린트
pnpm lint
```

### 환경 변수 설정

다음 환경 변수들을 설정해야 합니다:

```env
# Firebase
FIREBASE_SERVICE_ACCOUNT_KEY=
NEXT_PUBLIC_FIREBASE_*=

# Google APIs
GOOGLE_PRIVATE_KEY=
GOOGLE_CLIENT_EMAIL=
GOOGLE_SHEET_ID=
GOOGLE_CALENDAR_API_KEY=

# Authentication
NEXT_PUBLIC_AUTH_URL=
```

## 🎨 주요 특징

### 1. 모던한 UI/UX

- **반응형 디자인** - 모바일 퍼스트 접근
- **애니메이션** - Motion 라이브러리를 활용한 부드러운 인터랙션
- **컴포넌트 기반** - 재사용 가능한 UI 컴포넌트 라이브러리

### 2. 성능 최적화

- **Turbopack** - 빠른 개발 빌드
- **React Query** - 효율적인 데이터 캐싱
- **PWA** - 오프라인 지원 및 앱 설치

### 3. 개발자 경험

- **모노레포** - Turborepo로 효율적인 워크스페이스 관리
- **타입 안정성** - TypeScript 적용
- **코드 품질** - ESLint + Prettier 자동화

## 📱 주요 페이지

- **로그인** (`/`) - 사용자 인증 및 온보딩
- **대시보드** (`/dashboard`) - 식비 현황 및 통계
- **점심조** (`/lunch`) - 팀별 점심 관리
- **월별 현황** (`/monthly`) - 월간 식비 분석
- **포인트** (`/points`) - 적립 포인트 관리

## 🔧 개발 가이드라인

### 코드 스타일

- **0 Warning Policy** - ESLint 경고 0개 유지
- **Strict TypeScript** - 엄격한 타입 체크
- **Component Driven** - 재사용 가능한 컴포넌트 설계

### 커밋 컨벤션

- feat: 새로운 기능 추가
- fix: 버그 수정
- refactor: 코드 리팩토링
- style: 스타일 변경
- docs: 문서 수정

---

_Built with ❤️ using Next.js, TypeScript, and Tailwind CSS_
