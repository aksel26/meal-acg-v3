# Admin App IA

> 기준 코드: `apps/admin`
> 확인일: 2026-05-21

## 목적

관리자 앱은 식대/복지포인트, 조직, 근태, 경영관리 데이터를 운영자가 관리하는 백오피스다. 기본 구조는 로그인 후 대시보드 셸 안에서 좌측 사이드바로 업무 영역을 이동하는 형태이며, 메뉴 노출은 `apps/admin/components/Sidebar.tsx`의 권한 값에 따라 달라진다.

## 전역 구조

- 인증 진입: `/login`
- 관리자 셸: `apps/admin/app/(dashboard)/layout.tsx`
- 공통 사이드바: `apps/admin/components/Sidebar.tsx`
- 공통 헤더/페이지 타이틀: `apps/admin/components/Header.tsx`
- 메인 콘텐츠 프레임: `apps/admin/components/DashboardContentFrame.tsx`

## RBAC

관리자 앱 RBAC의 기준 파일은 `apps/admin/lib/rbac.ts`다. 세션은 `apps/admin/lib/auth.ts`에서 `admin-session` 쿠키를 읽고, `requireAdmin()`이 `members.role = "admin"` 여부를 확인한 뒤 DB의 `admin_role`을 최신 값으로 다시 정규화한다.

### 역할

| 역할 | 설명 | 권한 범위 |
| --- | --- | --- |
| `대표` | 최고 관리자 | `ADMIN_PERMISSIONS` 전체 |
| `P&C 팀장` | P&C 관리자 리더 | 전체 권한 중 `rbac:manage` 제외 |
| `P&C 일반` | P&C 운영 담당자 | 일반 운영/조회 중심 권한 |

`normalizeAdminRole()`은 알 수 없는 값을 `대표`로 보정한다. 이 동작은 안전 기본값 관점에서는 강한 권한으로 fallback되는 구조이므로, 실제 운영 정책 변경 시 우선 확인해야 한다.

### 권한 목록

| 도메인 | 권한 |
| --- | --- |
| 대시보드 | `dashboard:read` |
| 식대 | `meal:read`, `meal:write`, `meal:import`, `meal:export` |
| 포인트/활동비 | `points:read`, `points:write`, `points:review` |
| 조직/멤버 | `organization:read`, `organization:write`, `members:write`, `rbac:manage` |
| 다면평가 | `evaluation:read`, `evaluation:write`, `evaluation:deploy` |
| 근태/휴가 | `attendance:read`, `attendance:write`, `leave:read`, `leave:write`, `leave:approve` |
| 알림 | `notifications:read`, `notifications:send` |
| 경영관리 | `finance:read`, `finance:write`, `finance:approve`, `finance:report` |
| 설정 | `settings:read`, `settings:write` |

### 역할별 차이

| 기능 | 대표 | P&C 팀장 | P&C 일반 |
| --- | --- | --- | --- |
| RBAC 관리 | 가능 | 불가 | 불가 |
| 포인트 예산 할당 | 가능 | 가능 | 불가 |
| 조직/직급/점심조 쓰기 | 가능 | 가능 | 불가 |
| 다면평가 쓰기/배포 | 가능 | 가능 | 불가 |
| 승인 관리 | 가능 | 가능 | 불가 |
| 알림 발송 | 가능 | 가능 | 불가 |
| 경영 승인/리포트 | 가능 | 가능 | 불가 |
| 식대 입력/가져오기/내보내기 | 가능 | 가능 | 가능 |
| 사용내역 검토/조회 | 가능 | 가능 | 가능 |
| 근태 조회/쓰기 | 가능 | 가능 | 가능 |
| 연차 조회/쓰기 | 가능 | 가능 | 조회/쓰기 가능, 승인 불가 |

### IA에 반영되는 지점

- 사이드바 메뉴 노출은 `apps/admin/components/Sidebar.tsx`의 `permission` 값과 `hasAdminPermission()`으로 결정된다.
- API 단에서는 일부 route가 `requireAdminPermission()`으로 서버 권한을 다시 확인한다. 예: `/api/finance/*`, `/api/work-applications/*`, `/api/import/*`, `/api/export/*`, `/api/members/*`, `/api/stats/*`.
- 모든 화면이 같은 수준의 서버 권한 검사를 갖는 것은 아니다. IA/권한 문서를 운영 기준으로 확장하려면 메뉴 gating과 API gating을 함께 점검해야 한다.

## 1depth IA

| 영역 | 대표 경로 | 역할 |
| --- | --- | --- |
| 대시보드 | `/` | 식대, 승인 대기, 근태, 평가, 휴가, 공고 등 운영 현황 요약 |
| 비용 관리 | `/meal-status`, `/calendar`, `/settings`, `/import`, `/export`, `/budget`, `/review`, `/points-overview`, `/assets` | 식대 입력/정산, 포인트 예산/사용 검토, 물품관리대장 |
| 조직 관리 | `/organization`, `/job-titles`, `/evaluations`, `/lunch-groups`, `/monthly` | 조직 구성, 직급/직책, 다면평가, 점심조, 월별 음료 취합 |
| 근태 관리 | `/attendance`, `/work-applications`, `/dayoffs`, `/approvals` | 출퇴근 기록, 시간외/주말근무 신청, 연차, 승인 처리 |
| 경영관리 | `/finance/*` | 고객사, 프로젝트/계약, 견적, 매출, 비용 정산, 리포트 |
| 알림 관리 | `/notifications` | 푸시 알림 발송, 구독 현황, 발송 로그 |
| 외부 운영 앱 | supervisor/project-management URL | 아르바이트 관리, 프로젝트 관리 앱으로 외부 이동 |
| 설정 | `/holidays`, `/leave-types` | 공휴일, 휴가 유형 설정 |

## 상세 사이트맵

### 인증

- `/login`: 관리자 로그인
- `/api/auth/login`: 로그인
- `/api/auth/logout`: 로그아웃
- `/api/auth/session`: 현재 세션 확인
- `/api/auth/change-password`: 비밀번호 변경

### 대시보드

- `/`: 운영 현황 홈
  - 주요 카드: 승인 대기, 출근 미확인, 진행 중 평가
  - 보조 영역: 휴가 현황, 특이사항, 감독관 공고, 교육운영 공고
  - 관련 API: `/api/stats/*`, `/api/supervisor/calendar`

### 비용 관리

- `/meal-status`: 구성원별 식대 사용현황 및 정산 요청
- `/calendar`: 일별 식대 기록 입력/수정
- `/settings`: 일일 식대 단가, 월별 지원금, 연간 현황 설정
- `/import`: 식대/포인트 엑셀 가져오기
- `/export`: 식대/포인트 엑셀 내보내기
- `/budget`: 복지포인트/활동비 예산 할당
- `/review`: 포인트 사용내역 검토
- `/points-overview`: 포인트 사용 내역 조회
- `/lockers`: 개인 사물함 위치, 배정 현황, 사용자 배정/이동 요청 처리
- `/assets`: 물품관리대장

### 조직 관리

- `/organization`: 조직원 현황 확인 및 편집 모드에서 조직도/팀 구성 관리
- `/job-titles`: 직급/직책 관리
- `/evaluations`: 다면평가 회차 관리 및 문항 SET 관리
- `/evaluations/[id]`: 회차별 평가 대상/배정/진행 관리
- `/evaluations/[id]/stats`: 평가 통계
- `/evaluations/question-sets/new`: 문항 SET 생성
- `/evaluations/question-sets/[id]`: 문항 SET 편집
- `/evaluation-reports/[id]/[subjectId]`: 개인별 평가 리포트
- `/lunch-groups`: 점심조 구성, 고정 스케줄, 제외 인원, 뽑기 요청
- `/monthly`: Monthly 음료 취합 건 생성/활성화/신청 현황/옵션 설정

### 근태 관리

- `/attendance`: 조직원 출퇴근 기록 조회/관리
- `/work-applications`: 시간외/주말근무 신청 관리
- `/dayoffs`: 연차 등록, 승인, 통계 관리
- `/dayoffs/[id]`: 구성원별 휴가 현황 상세
- `/approvals`: 휴가/근태 관련 승인 대기 처리
- `/leave-balances`: 잔여 휴가 현황 조회

### 경영관리

- `/finance/clients`: 고객사 기본 정보와 거래 상태 관리
- `/finance/projects`: 고객사별 프로젝트/계약 정보 관리
- `/finance/quotes`: 견적서 품목, 금액, 승인 상태 관리
- `/finance/revenue`: 매출 예정, 세금계산서, 입금 상태 관리
- `/finance/expenses`: 프로젝트 비용 정산, 승인/지급 상태 관리
- `/finance/reports`: 매출, 비용, 마진, 미수/미지급 리포트

### 알림/설정

- `/notifications`: 푸시 발송, 구독 해제, 발송 로그 조회
- `/holidays`: 공휴일/휴무일 설정
- `/leave-types`: 휴가 유형 설정

## 주요 API 묶음

| 도메인 | API Prefix |
| --- | --- |
| 식대 | `/api/meal-logs`, `/api/settings`, `/api/import/meal-logs`, `/api/export/*` |
| 포인트/활동비 | `/api/budget-*`, `/api/usage-records`, `/api/points-overview`, `/api/import/points-usage` |
| 조직 | `/api/organizations`, `/api/divisions`, `/api/teams`, `/api/members`, `/api/positions`, `/api/titles` |
| 다면평가 | `/api/evaluations/*` |
| 점심조/Monthly | `/api/lunch-groups/*`, `/api/monthly/*` |
| 근태/휴가 | `/api/attendance`, `/api/work-applications`, `/api/dayoffs`, `/api/leave-*`, `/api/approvals` |
| 경영관리 | `/api/finance/*` |
| 시설/총무 | `/api/lockers/*` |
| 알림 | `/api/notifications/*`, `/api/slack/notify` |

## IA 메모

- `/leave-balances`는 실제 라우트와 헤더 타이틀이 있으나 현재 사이드바 주 메뉴에는 직접 노출되지 않는다.
- `/finance/page.tsx`도 존재하지만 사이드바는 각 하위 경영관리 메뉴로 직접 이동한다.
- 사이드바의 `permission` 필드는 기능 권한 모델의 기준이다. IA 변경 시 메뉴명, 경로, 권한 값을 함께 확인해야 한다.
- 외부 앱 이동은 환경변수 `NEXT_PUBLIC_SUPERVISOR_APP_URL`, `NEXT_PUBLIC_PROJECT_MANAGEMENT_APP_URL`, `NEXT_PUBLIC_REQUEST_MANAGEMENT_APP_URL`에 의존한다.
