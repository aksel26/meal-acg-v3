# User App IA

> 기준 코드: `apps/user`
> 확인일: 2026-05-21

## 목적

사용자 앱은 구성원이 식대, 복지포인트, 근태, 휴가, 프로젝트/업무 요청, 회의실, 다면평가 등 사내 업무를 직접 처리하는 인트라넷이다. 데스크톱은 좌측 사이드바 중심, 모바일은 일부 핵심 기능을 하단 내비게이션으로 빠르게 접근하는 구조다.

## 전역 구조

- 로그인 진입: `/`
- 콘텐츠 셸: `apps/user/app/(content)/layout.tsx`
- 데스크톱/모바일 사이드바: `apps/user/components/Sidebar.tsx`
- 모바일 하단 내비게이션: `apps/user/components/BottomNavigation.tsx`
- 공통 헤더/알림: `apps/user/app/components/Header.tsx`

## 권한/RBAC

사용자 앱은 관리자 앱처럼 중앙 `permission` 테이블로 메뉴를 숨기는 구조가 아니다. 기본 세션은 `apps/user/lib/auth.ts`와 `apps/user/stores/userStore.ts`의 `role`, `member_role`, `memberId`를 사용하고, 기능별 API/유틸에서 필요한 범위만 별도로 제한한다.

### 주요 권한 필드

| 필드 | 위치 | 의미 |
| --- | --- | --- |
| `role` | `members.role`, user session | 앱 차원의 기본 역할. 주로 `user`, `admin`, 일부 업무 로직에서 `team_lead`를 확인 |
| `member_role` | `members.member_role` | 조직 직군/직책성 역할. `대표`, `본부장`, `팀장`, `팀원`, `인턴` 흐름에 사용 |
| `user_authority` | `members.user_authority` | 사용자 측 관리 범위 보정. `팀장`, `팀장/본부장` 등 |
| `memberId` | user store/API query | 본인 데이터 범위와 요청 생성 주체 식별 |

### 기능별 접근 규칙

| 기능 | 접근/관리 기준 | 기준 코드 |
| --- | --- | --- |
| 프로젝트 목록 | `admin`, `team_lead`는 전체성 조회. 일반 사용자는 생성자, 오너, 매니저, 이해관계자 프로젝트만 조회 | `apps/user/lib/projects.ts` |
| 프로젝트 수정 | `admin`, `team_lead`, 생성자, 오너, 매니저, 이해관계자 | `apps/user/lib/projects.ts` |
| 프로젝트 삭제 | `admin` 또는 생성자 | `apps/user/lib/projects.ts` |
| 요청과 연결된 프로젝트 조회 | `admin`, `team_lead`는 넓은 범위. 일반 사용자는 생성자, 오너, 매니저 프로젝트만 조회 | `apps/user/lib/requests.ts` |
| 시간외/주말근무 팀원 관리 | `user_authority`가 `팀장`/`팀장/본부장`이거나 `member_role`이 `대표`/`본부장`/`팀장`이면 관리 범위 조회 가능 | `apps/user/app/api/work-applications/route.ts` |
| 시간외/근태 결재자 선택 | 결재자는 `대표`, `본부장`, `팀장`, `파트장`만 허용 | `apps/user/app/api/work-applications/route.ts`, `apps/user/app/api/attendance/modify/route.ts` |
| 근태 수정 요청 | 요청자는 본인 기록 기준, 결재자는 팀장 이상 검증 | `apps/user/app/api/attendance/modify/route.ts` |
| 활동비 현황 | `member_role = 팀원`이면 조직 전체 활동비 대시보드 접근 제한 | `apps/user/app/api/points/activity/route.ts` |

### IA에 반영되는 지점

- 사이드바 자체는 역할별 메뉴 필터링보다 전체 메뉴 노출에 가깝다. 실제 권한 차이는 화면 내부 데이터 범위, 버튼 활성화, API 응답 범위에서 발생한다.
- `/overtime`은 현재 사용자 직군을 표시하며, 관리 가능한 사용자는 팀원 관리 탭/범위가 열린다.
- 프로젝트/요청 IA는 “내가 관여한 항목”과 “관리자/팀리드 전체성 조회”가 같은 화면 안에서 권한별로 갈라지는 구조다.
- 결재/승인 흐름은 중앙 RBAC보다 조직 역할(`member_role`, `user_authority`)을 더 많이 사용한다.

## 1depth IA

| 영역 | 대표 경로 | 역할 |
| --- | --- | --- |
| 로그인 | `/` | 사용자 로그인 및 PWA 설치 안내 |
| 홈 | `/dashboard` | 개인 식대/근태/포인트/프로젝트 요약 |
| 근태 | `/attendance`, `/overtime` | 출퇴근 기록, 근태 수정 요청, 시간외/주말근무 신청 |
| 복지 | `/meal`, `/points` | 식대 입력/조회, 복지포인트/활동비 사용 등록 |
| 기타 업무 | `/profile`, `/notices`, `/room-booking`, `/assets`, `/evaluations` | 내 정보, 공지/일정, 회의실 예약, 물품관리대장, 다면평가 |
| 업무 / 프로젝트 | `/project-dashboard`, `/projects`, `/requests` | 프로젝트 현황, 프로젝트 상세, 업무 요청 생성/처리 |
| ACG 라이프 | `/acg-life`, `/lunch`, `/monthly` | 점심조, 음료 취합 등 생활 편의 기능 |
| 외부 서비스 | `/part-time-supervisor`, WorkDNA | 감독관/면접교육 운영, 유형검사 외부 이동 |

## 내비게이션 구조

### 데스크톱/모바일 사이드바

- 근태
  - `/attendance`: 근태 관리
  - `/overtime`: 시간외 근무 관리
- 복지
  - `/meal`: 식대
  - `/points`: 복지포인트/활동비
- 기타
  - `/profile`: 내 정보
  - `/notices`: 공지/일정
  - `/room-booking`: 회의실 예약
  - `/assets`: 물품관리대장
  - `/sms`: SMS 전송 메뉴 항목이 있으나 현재 대응 라우트는 확인되지 않음
  - `/evaluations`: 다면평가
- 업무 / 프로젝트
  - `/project-dashboard`: 업무/프로젝트 대시보드
  - `/projects`: 프로젝트
  - `/requests`: 업무 요청
- 단독 링크
  - `/acg-life`: ACG 라이프
  - `/part-time-supervisor`: 감독관/면접교육 운영 외부 링크

### 모바일 하단 내비게이션

- `/dashboard`: 홈
- `/points`: 복지포인트
- `/lunch`: 점심조
- `/monthly`: 음료취합
- `https://workdna.netlify.app/`: 유형검사 외부 링크

## 상세 사이트맵

### 인증/홈

- `/`: 로그인
- `/dashboard`: 개인 대시보드
  - 주요 위젯: 식대, 잔액, 근태 확인, 공지, 인기 음식점, 프로젝트/요청 요약, 최근 활동
  - 관련 API: `/api/dashboard/calendar`, `/api/recent-activity`, `/api/project-stats`

### 식대/복지

- `/meal`: 식대 입력 및 사용 기록
  - 입력 단계: 식사 유형, 참석자, 결제자, 금액, 매장, 영수증
  - 관련 API: `/api/meals/*`, `/api/scan-receipt`, `/api/restaurants`
- `/points`: 복지포인트/활동비 등록 및 내역 조회
  - 관련 API: `/api/points/*`
- `/points-dashboard`: 조직 전체 포인트 현황
  - 실제 라우트는 존재하지만 사이드바 주 메뉴에는 직접 노출되지 않는다.

### 근태/휴가

- `/attendance`: 월별 근태 현황, 출근/퇴근, 근태 수정 요청
- `/overtime`: 시간외·주말근무 신청 및 팀원 신청 내역 관리
- `/leave-request`: 휴가 신청
- 관련 API: `/api/attendance/*`, `/api/work-applications/*`, `/api/dayoffs`, `/api/leave-*`

### 업무 / 프로젝트

- `/project-dashboard`: 업무 요청과 프로젝트 현황 대시보드
- `/projects`: 프로젝트 목록, 검색, 상태/일정 확인, 신규 프로젝트 생성
- `/projects/[id]`: 프로젝트 상세
  - 프로젝트 피드, 체크리스트, 첨부파일, 연결 요청 관리
- `/requests`: 업무 요청 목록, 필터, 검색
- `/requests/new`: 업무 요청 생성
- `/requests/[id]`: 요청 상세
  - 담당자 배정, 완료 메모, 댓글, 첨부파일, 변경 이력, 연결 프로젝트, 고객사 관련 요청
- 관련 API: `/api/projects/*`, `/api/requests/*`, `/api/my-requests`, `/api/users/ids`

### 공지/회의실/자산

- `/notices`: 공지/일정 목록
- `/notices/[id]`: 공지 상세
- `/room-booking`: 회의실 예약/수정
- `/lockers`: 개인 사물함 위치 확인, 배정 요청, 이동 요청
- `/assets`: 물품관리대장
- 관련 API: `/api/room-reservations/*`, `/api/lockers/*`, `/api/assets/*`, `/api/supervisor/calendar`

### 조직/평가/라이프

- `/evaluations`: 활성 다면평가 회차 목록
- `/evaluations/[roundId]`: 다면평가 응답/제출
- `/lunch`: 점심조 배정, 뽑기/확정 스케줄
- `/monthly`: Monthly 음료 신청
- `/acg-life`: 사내 생활 기능 허브
- 관련 API: `/api/evaluations/*`, `/api/lunch-group/*`, `/api/monthly/*`

### 개인 설정/승인

- `/profile`: 내 정보 및 비밀번호 변경
- `/approvals`: 받은 요청/보낸 요청/참조 요청 확인
- 관련 API: `/api/profile/*`, `/api/approvals/*`, `/api/notifications/*`

## 주요 API 묶음

| 도메인 | API Prefix |
| --- | --- |
| 인증/프로필 | `/api/auth/*`, `/api/profile/*` |
| 식대 | `/api/meals/*`, `/api/calendar/meals`, `/api/restaurants/*`, `/api/scan-receipt` |
| 포인트 | `/api/points/*` |
| 근태/휴가 | `/api/attendance/*`, `/api/work-applications/*`, `/api/dayoffs`, `/api/leave-*` |
| 프로젝트/요청 | `/api/projects/*`, `/api/requests/*`, `/api/my-requests`, `/api/project-stats`, `/api/recent-activity` |
| 회의실/자산 | `/api/room-reservations/*`, `/api/lockers/*`, `/api/assets/*` |
| 평가/라이프 | `/api/evaluations/*`, `/api/lunch-group/*`, `/api/monthly/*` |
| 알림/승인 | `/api/notifications/*`, `/api/approvals/*` |

## IA 메모

- 사용자 앱의 `/`는 로그인이고, 로그인 성공 후 `/dashboard`로 이동한다.
- 모바일 하단 내비게이션은 전체 IA가 아니라 핵심 빠른 이동만 제공한다. 데스크톱 사이드바가 더 넓은 메뉴 기준이다.
- `/sms`는 사이드바 메뉴에 있으나 현재 `apps/user/app/(content)/sms/page.tsx`는 확인되지 않는다.
- `/leave-request`, `/points-dashboard`, `/approvals`는 실제 라우트가 있지만 현재 사이드바의 1depth 메뉴에는 직접 노출되지 않는 보조 진입 화면이다.
- 프로젝트/업무 요청은 사용자 앱 내부에 통합되어 있으며, 관리자 앱의 “프로젝트 관리” 외부 링크와는 별도 진입이다.
