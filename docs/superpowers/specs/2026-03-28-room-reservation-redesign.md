# 회의실 배정 UI/UX 리디자인

## 개요

감독관/면접교육 통합 회의실 현황을 한눈에 볼 수 있는 타임라인 기반 회의실 예약 시스템.

## 핵심 요구사항

- 감독관 + 면접교육이 동시에 진행될 수 있으므로 통합 현황 필요
- 30분 단위 타임슬롯
- 드래그로 시간 범위 선택 후 Dialog로 예약 생성
- 기존 예약 블록을 다른 회의실로 드래그앤드롭 이동
- 기존 예약 블록의 좌/우 가장자리를 드래그하여 시간 변경(리사이즈)

## 레이아웃

**가로 시간축 타임라인** (Google Calendar 리소스 뷰 스타일)

- 세로축: 7개 회의실 (C1, C2, R, G, 406-1, 406-2, 16층) + 수용 인원 표시
- 가로축: 시간대 (09:00~21:00, 30분 단위 그리드)
- 상단: 날짜 네비게이션 (← 2026년 3월 28일 (토) →) + 범례 (감독관: 파란색, 면접교육: 인디고)

## 예약 블록

- 감독관: 파란색 계열 (`#dbeafe`, 좌측 `#3b82f6` 보더)
- 면접교육: 인디고 계열 (`#e0e7ff`, 좌측 `#6366f1` 보더)
- 블록에 표시: 유형 + 제목 (예: "감독관 - 서울시청 민원안내")
- 클릭 시 상세/수정/삭제 가능

## 인터랙션

### 1. 빈 슬롯 드래그 → 새 예약 생성

- 빈 영역에서 가로로 마우스 드래그
- 30분 단위로 스냅
- 드래그 중 선택 영역 하이라이트 (파란 점선 테두리)
- 마우스 놓으면 예약 Dialog 오픈 (회의실/시작/종료 자동 입력)

### 2. 블록 드래그앤드롭 → 회의실 이동

- 기존 예약 블록을 마우스로 잡아 다른 회의실 행으로 이동
- 시간은 유지, 회의실만 변경
- 30분 단위 스냅 적용
- 이동 시 충돌 경고 (겹치면 경고 표시, 저장은 허용)

### 3. 블록 리사이즈 → 시간 변경

- 블록 좌측 가장자리 드래그: 시작 시간 변경
- 블록 우측 가장자리 드래그: 종료 시간 변경
- 30분 단위 스냅
- 최소 30분 (1슬롯) 유지

### 4. 블록 클릭 → 상세/수정/삭제

- 클릭 시 Popover 또는 Dialog로 상세 표시
- 수정/삭제 버튼

## 충돌 처리

- 같은 회의실/같은 시간대에 겹치는 예약이 있으면 경고 UI 표시
- 저장은 허용 (같은 회의실을 분리 사용하는 경우 대비)

## 예약 Dialog

드래그 완료 후 표시되는 Dialog:

| 필드 | 유형 | 설명 |
|------|------|------|
| 유형 | 토글 버튼 | 감독관 / 면접교육 |
| 신청자 | 읽기전용 | 로그인 사용자 자동 입력 |
| 회의실 | 읽기전용 | 드래그에서 자동 결정 |
| 시작 시간 | 읽기전용 | 드래그에서 자동 결정 |
| 종료 시간 | 읽기전용 | 드래그에서 자동 결정 |
| 참조자 | 멀티셀렉트 | 직원 목록에서 검색+선택, 태그 형태로 표시 |
| 내용 | TextArea | 예약 목적/메모 |

## DB 스키마

### 새 테이블: `supervisor.room_reservations`

```sql
CREATE TABLE supervisor.room_reservations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     text NOT NULL,
  date        date NOT NULL,
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  type        text NOT NULL CHECK (type IN ('supervisor', 'interview')),
  title       text,
  content     text,
  reserved_by text NOT NULL,
  cc_members  text[] DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_room_reservations_date ON supervisor.room_reservations(date);
CREATE INDEX idx_room_reservations_room_date ON supervisor.room_reservations(room_id, date);

-- RLS + Grant
ALTER TABLE supervisor.room_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON supervisor.room_reservations
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
GRANT ALL ON supervisor.room_reservations TO service_role;

-- updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON supervisor.room_reservations
  FOR EACH ROW EXECUTE FUNCTION supervisor.update_updated_at();
```

### 30분 단위 제약

- `start_time`, `end_time`의 분은 00 또는 30만 허용 (API 레벨 검증)
- `end_time > start_time` (API 레벨 검증)
- 최소 30분 간격

## API 라우트

### `GET /api/room-reservations?date=2026-03-28`

해당 날짜의 모든 예약 반환.

### `POST /api/room-reservations`

새 예약 생성. Body: `{ room_id, date, start_time, end_time, type, title, content, cc_members }`.
충돌 체크 후 겹치면 응답에 `warning: true` 포함, 저장은 수행.

### `PATCH /api/room-reservations/[id]`

예약 수정 (시간 변경, 회의실 이동, 내용 수정 등).

### `DELETE /api/room-reservations/[id]`

예약 삭제.

## 참조자(CC) 직원 목록

`/api/clients` 대신 기존 `public.members` 테이블에서 조회.
`GET /api/members` — 전체 직원 목록 (id, full_name).

## 회의실 상수

기존 `lib/room-constants.ts` 재사용:
- C1 (30명), C2 (25명), R (20명), G (15명), 406-1 (20명), 406-2 (20명), 16층 (40명)

## 기존 시스템과의 관계

- 기존 `assignments.room_slots` 기반 감독관 회의실 배정은 별도 유지
- 새 `room_reservations`는 독립적인 회의실 예약 시스템
- 추후 필요 시 기존 데이터 마이그레이션 검토

## 프론트엔드 구조

### 신규 파일

- `app/(dashboard)/room-assignments/page.tsx` — 기존 페이지 교체
- `components/room-reservations/TimelineGrid.tsx` — 타임라인 그리드 (메인)
- `components/room-reservations/ReservationBlock.tsx` — 예약 블록 (드래그/리사이즈)
- `components/room-reservations/ReservationDialog.tsx` — 예약 생성/수정 Dialog
- `components/room-reservations/ReservationDetail.tsx` — 예약 상세 Popover
- `hooks/use-room-reservations.ts` — 예약 조회 hook
- `hooks/use-room-reservation-mutations.ts` — 예약 CRUD mutations
- `hooks/use-members.ts` — 직원 목록 hook (참조자용)

### 드래그/리사이즈 구현

- 순수 마우스 이벤트 (`mousedown`, `mousemove`, `mouseup`) 사용
- `@dnd-kit` 없이 직접 구현 (타임라인 특화 로직 필요)
- 30분 단위 스냅 계산: `Math.round(offsetX / slotWidth) * 30`
