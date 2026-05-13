# 인트라넷 확장 설계 스펙

## 개요

기존 비용관리(식대/복지포인트) + 조직관리 시스템을 인트라넷 규모로 확장한다.
직급/직책 체계 도입, 연차 관리, 출퇴근 관리, 승인 워크플로를 추가한다.

## 1. 직급/직책 체계

### 1.1 현황

- `member_role` ENUM: 본부장, 팀장, 팀원, 인턴 (직급과 직책이 혼용)

### 1.2 변경

직급(grade)과 직책(title)을 별도 테이블로 분리한다.

**직급 (`positions` 테이블):**

| sort_order | name | annual_leave_days | leave_accrual_rule |
|-----------|------|-------------------|-------------------|
| 1 | 인턴 | 0 | none |
| 2 | 사원 | 15 | fixed |
| 3 | 선임 | 16 | +1 per 3yr |
| 4 | 책임 | 16 | +1 per 3yr |
| 5 | 수석 | 16 | +1 per 3yr |
| 6 | 대표 | 16 | +1 per 3yr |

- 관리자가 CRUD 가능
- `sort_order`로 서열 관리
- `annual_leave_days`: 기본 연차일수
- `leave_accrual_rule`: none(부여없음), fixed(고정), +1 per 3yr(입사일 기준 3년마다 +1)

**직책 (`titles` 테이블):**

| sort_order | name |
|-----------|------|
| 1 | 파트장 |
| 2 | 팀장 |
| 3 | 본부장 |

- 관리자가 CRUD 가능
- 직책이 없는 직원은 `title_id = NULL`

**`members` 테이블 변경:**
- `position_id` FK 추가 (필수)
- `title_id` FK 추가 (nullable)
- 기존 `member_role` ENUM → 마이그레이션으로 데이터 이전 후 단계적 폐기

### 1.3 마이그레이션 전략

1. `positions`, `titles` 테이블 생성 + 초기 데이터 삽입
2. `members`에 `position_id`, `title_id` 컬럼 추가
3. 기존 `member_role` 값 매핑:
   - 인턴 → position: 인턴
   - 팀원 → position: 사원 (기본값)
   - 팀장 → position: (수동 확인 필요), title: 팀장
   - 본부장 → position: (수동 확인 필요), title: 본부장
4. 코드에서 `member_role` 참조를 `position_id`/`title_id`로 전환
5. `member_role` 컬럼 제거 (최종 단계)

## 2. 연차 관리

### 2.1 연차 부여 규칙

**입사 첫해 (입사일 ~ 12월 31일):**
- 월차: 입사 다음 월부터 12월까지 매월 1일씩 부여
- 예: 5월 1일 입사 → 6~12월 = 7일

**입사 다음해 1월 1일:**
- 비례연차 = 15 x (전년도 재직일수 / 365)
- 예: 5월 1일 입사 → 15 x (245/365) ≈ 10일

**입사 2년차 이후 매년 1월 1일:**
- 직급별 기본 연차 부여 (positions.annual_leave_days)
- 선임 이상: 입사일 기준 3년마다 +1일 가산

**관리자 직접 수정:**
- 개별 직원의 연차를 관리자가 수동으로 조정 가능 (특별 부여/차감)

### 2.2 연차 차감 유형

| 휴가 유형 | 차감량 | 연차 차감 |
|----------|--------|----------|
| 반반차 오전 | 0.25일 | O |
| 반반차 오후 | 0.25일 | O |
| 반차 오전 | 0.5일 | O |
| 반차 오후 | 0.5일 | O |
| 연차 | 1일 | O |
| 하계휴가 | 1일 | X (별도 할당, 연 3일) |
| 조퇴 | - | X |
| 공제 | - | X |
| 훈련 | - | X |
| 대체휴무 | - | X |
| 특별휴가 | - | X |
| 경조휴무 | - | X |
| 무급휴가 | - | X |

### 2.3 휴가 유형 관리

**고정 유형 (수정 불가):**
- 반반차 오전/오후, 반차 오전/오후, 연차, 조퇴

**커스텀 유형 (관리자 CRUD):**
- 공제, 훈련, 하계휴가, 대체휴무, 특별휴가, 경조휴무, 무급휴가
- 관리자가 새 유형 추가/수정/삭제 가능

### 2.4 DB 스키마

**`leave_types` 테이블 변경:**
- 기존 16개 유형을 위 목록으로 재구성
- `is_system` boolean: true면 삭제/수정 불가 (고정 유형)
- `deducts_annual` boolean: 연차 차감 여부
- `deduction_amount` decimal: 차감량 (0.25, 0.5, 1 등)
- `has_separate_quota` boolean: 별도 할당 여부 (하계휴가 등)
- `default_quota` integer: 별도 할당 시 기본 일수

**`leave_balances` 테이블 (신규):**

```
id uuid PK
member_id uuid FK → members
year integer
type text ('monthly' | 'annual' | 'summer' | 'custom')
granted decimal  -- 부여일수
used decimal     -- 사용일수
adjusted decimal -- 관리자 조정 (+/-)
remaining decimal GENERATED (granted + adjusted - used)
note text        -- 조정 사유
created_at timestamptz
updated_at timestamptz
UNIQUE(member_id, year, type)
```

**`leave_adjustments` 테이블 (신규) — 관리자 수동 조정 이력:**

```
id uuid PK
balance_id uuid FK → leave_balances
adjusted_by uuid FK → members
amount decimal      -- +/- 조정량
reason text
created_at timestamptz
```

## 3. 출퇴근 관리

### 3.1 근무시간 규칙

- **유연출근**: 08:00 ~ 10:00 (초 단위 기록)
- **지각**: 10:00:00 초과 시 자동 판정
- **퇴근 가능**: 출근시간 + 9시간 (점심 1.5시간 포함, 실근무 7.5시간)
- **점심시간**: 12:00 ~ 13:30
- **초과근무**: 퇴근 가능 시간 + 2시간 이후부터 인정
- **주말근무**: 별도 집계

**예시: 08:30:15 출근**
- 퇴근 가능: 17:30:15
- 초과근무 인정: 19:30:15 이후

### 3.2 입력 방식

- **User 앱**: 직원이 직접 체크인/체크아웃 버튼 클릭
- **Admin 앱**: 관리자가 조회/수정/일괄 입력

### 3.3 DB 스키마

**`attendance_records` 테이블 (신규):**

```
id uuid PK
member_id uuid FK → members
date date NOT NULL
check_in_at timestamptz       -- 출근 시각 (초 단위)
check_out_at timestamptz      -- 퇴근 시각
expected_out_at timestamptz   -- 퇴근 가능 시각 (check_in + 9h, 자동 계산)
status text ('normal' | 'late' | 'early_leave' | 'absent')
overtime_minutes integer DEFAULT 0
is_weekend boolean DEFAULT false
note text
created_at timestamptz
updated_at timestamptz
UNIQUE(member_id, date)
```

**자동 계산 로직 (API 레벨):**
- `check_in_at > 해당일 10:00:00` → status = 'late'
- `expected_out_at = check_in_at + 9h`
- `check_out_at - expected_out_at > 2h` → overtime_minutes 산출
- 주말 체크인 → `is_weekend = true`, 별도 집계

### 3.4 월간 리포트

- 일별: 출근/퇴근/근무시간/초과근무/상태
- 월별 집계: 총 근무일, 지각 횟수, 조퇴 횟수, 총 초과근무 시간, 주말근무 일수

## 4. 승인 워크플로

### 4.1 승인 라인

직책 기반 자동 결정:
- 팀원/파트장 → **팀장** 승인
- 팀장 → **본부장** 승인
- 본부장 → **대표** 승인
- 본부장 부재 시 → **대표**에게 직접

### 4.2 참조자

- 신청 시 참조자 선택 가능 (멤버 목록에서 복수 선택)
- 이메일 발송은 추후 개발 (현재는 참조자 정보 저장만)

### 4.3 워크플로 상태

```
pending → approved
pending → rejected
```

### 4.4 DB 스키마

**`approval_requests` 테이블 (신규):**

```
id uuid PK
type text ('leave' | 'overtime')  -- 확장 가능
requester_id uuid FK → members
approver_id uuid FK → members     -- 자동 결정
status text ('pending' | 'approved' | 'rejected')
cc_member_ids uuid[]               -- 참조자
related_table text                  -- 'dayoffs', 'attendance_records' 등
related_id uuid                     -- 해당 레코드 ID
reject_reason text
requested_at timestamptz
resolved_at timestamptz
resolved_by uuid FK → members
```

**`dayoffs` 테이블 변경:**
- `approval_status` 컬럼 추가: 'draft' | 'pending' | 'approved' | 'rejected'
- 기존 `approver_id`, `approved_at`은 유지 (하위 호환)

## 5. 조직도 시각화

### 5.1 구현

- 기존 `/organization` 페이지 확장
- 트리뷰 형태: 대표 → 본부(본부장) → 팀(팀장) → 팀원
- 각 노드에 직급/직책 표시
- 기존 `organizations → divisions → teams → members` 관계 활용

## 6. Admin 사이드바 재구성

```
대시보드
비용 관리
  ├ 사용현황 (인원별)
  ├ 식대 입력
  ├ 식대 기본금 설정
  ├ 엑셀 가져오기
  ├ 엑셀 내보내기
  ├ 예산 할당
  ├ 사용내역 검토
  └ 사용 내역 조회
조직 관리
  ├ 조직도
  ├ 조직원 현황
  ├ 직급/직책 관리  ← 신규
  ├ 점심조 관리
  └ Monthly 음료
근태 관리
  ├ 출퇴근 현황      ← 신규
  ├ 휴가 관리        ← 기존 dayoffs 확장
  ├ 연차 현황        ← 신규
  └ 승인 관리        ← 신규
알림 관리
아르바이트 관리 (외부링크)
설정
  └ 공휴일 관리
```

## 7. User 앱 추가 기능

- **출퇴근 위젯**: 대시보드에 체크인/체크아웃 버튼 + 오늘 근무현황 카드
- **내 연차 현황**: 부여/사용/잔여 요약 카드
- **휴가 신청**: 유형 선택 → 날짜 → 참조자 → 승인라인 자동 → 제출
- **승인함**: 팀장/본부장/대표 역할에게 노출 — 대기 중 요청 목록 + 승인/반려

## 8. 구현 순서 (권장)

1. **Phase 1**: 직급/직책 테이블 + 마이그레이션 + 관리 UI
2. **Phase 2**: 연차 관리 (leave_balances + 부여 로직 + 현황 UI)
3. **Phase 3**: 출퇴근 관리 (attendance_records + User 체크인/아웃 + Admin 현황)
4. **Phase 4**: 승인 워크플로 (approval_requests + 휴가 신청 플로우)
5. **Phase 5**: 조직도 시각화
6. **Phase 6**: 휴가 유형 커스텀 관리 UI
