ALTER TABLE public.parking_registrations
  ADD COLUMN ticket_code text NOT NULL DEFAULT 'two_hours'
    CHECK (
      ticket_code IN (
        'two_hours',
        'extra_30_minutes',
        'extra_1_hour',
        'extra_2_hours',
        'extra_3_hours',
        'extra_4_hours',
        'extra_5_hours',
        'extra_6_hours',
        'extra_7_hours',
        'extra_8_hours',
        'extra_12_hours',
        'extra_24_hours'
      )
    ),
  ADD COLUMN usage_type text NOT NULL DEFAULT 'business'
    CHECK (usage_type IN ('business', 'personal'));

COMMENT ON COLUMN public.parking_registrations.requested_start_date
  IS '주차 이용일. 신규 등록과 수정은 requested_end_date에도 같은 일자를 저장한다.';
COMMENT ON COLUMN public.parking_registrations.ticket_code
  IS '2시간 기본권 또는 공지에 정의된 추가 시간권 코드';
COMMENT ON COLUMN public.parking_registrations.usage_type
  IS '업무 관련 주차(business) 또는 개인 주차(personal)';
