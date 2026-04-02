# 출퇴근 관리 페이지 설계서

## 개요

User 앱에 출퇴근 관리 전용 페이지(`/attendance`)를 추가한다. 모바일에서는 캘린더 + 카드 뷰, PC에서는 테이블 뷰를 제공하며, 사용자가 근태 유형 수정을 요청하면 P&C팀의 더블체크 승인(미승인 → 가승인 → 최종승인)을 거친다.

---

## 1. DB 스키마 변경

### 1-1. `attendance_records` 테이블 변경

- **새 컬럼**: `attendance_type` (text, default `'근무'`)
- 허용 값: `근무`, `휴가`, `재택`, `외근`

### 1-2. `attendance_modification_requests` 신규 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid (PK) | |
| `attendance_record_id` | uuid (FK → attendance_records) | 수정 대상 |
| `requester_id` | uuid (FK → members) | 요청자 |
| `original_type` | text | 변경 전 근태 유형 |
| `requested_type` | text | 변경 요청 근태 유형 |
| `reason` | text | 사유 |
| `approval_status` | text | `미승인` / `가승인` / `최종승인` / `반려` |
| `first_approver_id` | uuid (FK → members, nullable) | 1차 확인자 (P&C) |
| `first_approved_at` | timestamptz | |
| `final_approver_id` | uuid (FK → members, nullable) | 2차 확인자 (P&C) |
| `final_approved_at` | timestamptz | |
| `reject_reason` | text | 반려 사유 |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

- 1차/2차 모두 P&C팀(admin)이 처리 (더블체크 개념)
- 최종승인 시 `attendance_records.attendance_type`이 실제로 변경됨

---

## 2. API 엔드포인트

### 2-1. 새로 추가

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/attendance/monthly` | GET | 월간 출퇴근 내역 조회 (`memberId`, `year`, `month`) |
| `/api/attendance/modify` | POST | 근태 수정 요청 생성 |
| `/api/attendance/modify` | GET | 내 수정 요청 목록 조회 |

### 2-2. 기존 유지

- `/api/attendance` (GET/POST) — 단일 날짜 조회 / 출퇴근 기록
- `/api/attendance/check-in` / `check-out` — 출퇴근 체크인/아웃
- `/api/attendance/today` — 오늘 출퇴근 상태

### 2-3. 월간 조회 응답 형태

```typescript
interface AttendanceMonthlyResponse {
  records: {
    id: string;
    date: string;
    check_in_at: string | null;
    check_out_at: string | null;
    attendance_type: string;        // 근무/휴가/재택/외근
    status: string;                 // normal/late/early_leave
    overtime_minutes: number;
    is_weekend: boolean;
    work_minutes: number;           // 계산된 근무시간(분)
    modification_status?: string;   // 수정 요청 있을 경우 승인 상태
  }[];
  summary: {
    total_work_days: number;
    total_work_minutes: number;
    total_overtime_minutes: number;
    late_count: number;
    early_leave_count: number;
  };
}
```

### 2-4. React Query 훅

```typescript
// hooks/use-attendance-monthly.ts
useAttendanceMonthly(memberId, year, month)

// hooks/use-attendance-modify.ts
useAttendanceModifyRequest()    // mutation
useMyModifyRequests(memberId)   // query
```

---

## 3. 페이지 컴포넌트 구조

### 3-1. 파일 구조

```
apps/user/app/(content)/attendance/
  page.tsx                          # 데이터 훅 + 모바일/PC 분기

apps/user/components/attendance/
  AttendanceMobileView.tsx          # 모바일: 캘린더 + 카드
  AttendanceDesktopView.tsx         # PC: 테이블 뷰
  AttendanceCalendar.tsx            # 주간/월간 토글 캘린더
  AttendanceCard.tsx                # 선택 날짜 출퇴근 카드
  AttendanceTable.tsx               # PC 테이블 컴포넌트
  AttendanceFilter.tsx              # 근태 유형 필터 (PC)
  AttendanceModifyDrawer.tsx        # 근태 수정 요청 Drawer
  MonthSelector.tsx                 # 월 선택기 (공용)
```

### 3-2. 페이지 레벨 (`page.tsx`)

- A+B 하이브리드 방식: 단일 라우트에서 데이터 훅 공유, 렌더링은 컴포넌트 분리
- CSS 분기: `max-md:hidden` / `md:hidden` 패턴 사용
- 데이터: `useAttendanceMonthly` 훅으로 월간 데이터 fetch

---

## 4. UI 상세 디자인

### 4-1. 모바일 - AttendanceCalendar

- **기본 상태**: 주간 뷰 (현재 주의 7일만 표시)
- **펼치기**: 캘린더 하단의 화살표 버튼 → motion 애니메이션으로 월간 뷰 전환
- 날짜 셀에 근태 유형별 컬러 도트:
  - 근무: `oklch(0.55 0.18 250)` (파랑)
  - 휴가: `oklch(0.65 0.20 150)` (초록)
  - 재택: `oklch(0.65 0.15 60)` (주황)
  - 외근: `oklch(0.60 0.18 310)` (보라)
- 지각/조퇴 시 도트에 빨간 테두리 추가

### 4-2. 모바일 - AttendanceCard

기존 `card-premium rounded-2xl` 스타일:

```
+-------------------------------+
|  4월 3일 (목)          [근무]  |  <- 날짜 + 근태 유형 뱃지
|------------------------------ |
|  출근  09:02    퇴근  18:15   |
|------------------------------ |
|  출근현황  정상                |
|  근무시간  9시간 13분          |
|  초과시간  -                   |
|------------------------------ |
|       [ 수정 요청 ]           |
+-------------------------------+
```

- 데이터 없는 날짜: "출퇴근 기록이 없습니다" 빈 상태 표시

### 4-3. PC - AttendanceDesktopView

- **상단**: MonthSelector + AttendanceFilter (근태 유형별 필터)
- **테이블 컬럼**: 날짜, 요일, 출근시간, 퇴근시간, 근태 유형, 출근 현황, 근무시간, 초과시간
- 주말/공휴일 행: 배경색 구분 (`oklch(0.97 0.01 250)`)
- 수정 요청 중인 행: 좌측에 주황 도트 표시
- 행 클릭 → `AttendanceModifyDrawer` 오픈

### 4-4. AttendanceModifyDrawer

기존 Drawer 패턴 활용:
1. 현재 근태 유형 표시
2. 변경할 근태 유형 선택 (근무/휴가/재택/외근)
3. 사유 입력 (textarea)
4. 제출 → 미승인 상태로 생성

---

## 5. 스코프

### 이번 구현 범위 (User 앱)
- 출퇴근 관리 페이지 (모바일 캘린더 + PC 테이블)
- 월간 출퇴근 내역 조회
- 근태 유형 수정 요청 생성
- 내 수정 요청 상태 확인

### 이번 스코프 제외 (Admin 앱)
- 수정 요청 승인/반려 처리 (가승인 → 최종승인)
- 전체 직원 출퇴근 현황 대시보드
