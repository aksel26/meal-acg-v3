-- 등록 내역을 수정할 때 기본 시간권 외에 추가 시간권을 더 붙일 수 있게 한다.
-- 주차 요금은 기본 시간권 요금 + 추가 시간권 요금의 합으로 계산한다.

ALTER TABLE public.parking_registrations
  ADD COLUMN extra_ticket_codes text[] NOT NULL DEFAULT '{}'
    CHECK (
      extra_ticket_codes <@ ARRAY[
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
      ]::text[]
      AND cardinality(extra_ticket_codes) <= 20
    );

COMMENT ON COLUMN public.parking_registrations.extra_ticket_codes
  IS '기본 시간권에 추가로 발급한 시간권 코드 목록. 중복 코드를 허용한다.';

NOTIFY pgrst, 'reload schema';
