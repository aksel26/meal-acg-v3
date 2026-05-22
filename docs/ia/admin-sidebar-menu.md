# Admin App Sidebar Menu

> 기준 코드: `apps/admin/components/Sidebar.tsx`
> 확인일: 2026-05-21

## 대시보드

- 대시보드: `/`

## 비용 관리

### 식대 관리

- 사용현황 (인원별): `/meal-status`
- 식대 입력: `/calendar`
- 식대 기본금 설정: `/settings`
- 엑셀 가져오기: `/import`
- 엑셀 내보내기: `/export`

### 포인트 관리

- 예산 할당: `/budget`
- 사용내역 검토: `/review`
- 사용 내역 조회: `/points-overview`

### 기타

- 개인 사물함 관리: `/lockers`
- 물품관리대장: `/assets`

## 조직 관리

- 조직 구성: `/organization`
- 직급/직책 관리: `/job-titles`
- 다면평가: `/evaluations`
- 점심조 관리: `/lunch-groups`
- Monthly 음료: `/monthly`

## 근태 관리

- 출퇴근 관리: `/attendance`
- 근무 신청 관리: `/work-applications`
- 연차 관리: `/dayoffs`
- 승인 관리: `/approvals`

## 경영관리

- 고객사 관리: `/finance/clients`
- 프로젝트/계약 관리: `/finance/projects`
- 견적서 관리: `/finance/quotes`
- 매출 관리: `/finance/revenue`
- 비용 정산: `/finance/expenses`
- 정산 리포트: `/finance/reports`

## 알림 관리

- 알림 관리: `/notifications`

## 외부 앱

- 아르바이트 관리: `NEXT_PUBLIC_SUPERVISOR_APP_URL` 또는 `http://localhost:3002`
- 프로젝트 관리: `NEXT_PUBLIC_PROJECT_MANAGEMENT_APP_URL` 또는 `NEXT_PUBLIC_REQUEST_MANAGEMENT_APP_URL` 또는 `http://localhost:3013`

## 설정

- 공휴일 관리: `/holidays`
- 휴가 유형 관리: `/leave-types`
