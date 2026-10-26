-- user_monthly_stats 뷰 회귀 검사.
-- 로컬 docker DB에서만 실행한다. 트랜잭션 안에서 뷰를 교체하고 fixture를 넣은 뒤 ROLLBACK 한다.
--
-- 실행:
--   (echo 'BEGIN;'; cat supabase/migrations/20261020_user_monthly_stats_single_source.sql; cat supabase/tests/user_monthly_stats.sql) \
--     | docker exec -i supabase_db_meal-v3 psql -U postgres -d postgres -v ON_ERROR_STOP=1
--
-- 기대: NOTICE "user_monthly_stats regression: OK" 뒤에 ROLLBACK.

DO $$
DECLARE
  uid uuid;
  r record;
BEGIN
  SELECT id INTO uid FROM public.members ORDER BY created_at LIMIT 1;
  ASSERT uid IS NOT NULL, 'members 테이블이 비어 있다';

  -- 2026-10 fixture가 기존 로컬 데이터와 섞이지 않게 비운다 (ROLLBACK 되므로 로컬 DB는 그대로)
  DELETE FROM public.meal_logs WHERE user_id = uid AND entry_date BETWEEN '2026-10-01' AND '2026-10-31';
  DELETE FROM public.holidays WHERE holiday_date BETWEEN '2026-10-01' AND '2026-10-31';
  IF to_regclass('public.dayoffs') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.dayoffs WHERE target_id = $1 AND leave_date BETWEEN ''2026-10-01'' AND ''2026-10-31''' USING uid;
  END IF;

  INSERT INTO public.holidays (holiday_date, description) VALUES
    ('2026-10-05', '쉬는 날 개천절'),  -- 월
    ('2026-10-09', '한글날');          -- 금

  UPDATE public.global_settings
  SET daily_allowance = 10000,
      monthly_allowances = '{"2026": {"10": {"workdays": 20, "allowance": 240000}}}'::jsonb
  WHERE id = 1;

  INSERT INTO public.meal_logs (user_id, entry_date, attendance, dinner_amount) VALUES
    (uid, '2026-10-24', NULL, 13000);                        -- 토, 저녁 금액만 → 가산 1, 사용액(점심)에는 미포함

  INSERT INTO public.meal_logs (user_id, entry_date, attendance, lunch_amount) VALUES
    (uid, '2026-10-09', '근무', 10000),                      -- 금·공휴일, 근무 → 가산 1
    (uid, '2026-10-10', '근무', 0),                          -- 토, 근무, 식사 기록 없음 → 가산 1
    (uid, '2026-10-11', '출근', 5000),                       -- 일, 출근 → 가산 1
    (uid, '2026-10-17', NULL, 7000),                         -- 토, 근태 없이 점심 금액만 → 가산 1, 사용액 포함
    (uid, '2026-10-18', NULL, 0),                            -- 일, 근태도 금액도 없음 → 가산 0
    (uid, '2026-10-05', '연차/휴무', 0),                     -- 월·공휴일에 연차 → 차감 0
    (uid, '2026-10-12', '근무', 12000),                      -- 평일 근무 → 변화 없음
    (uid, '2026-10-13', '근무(개별식사 / 식사안함)', 12000), -- 개별식사 → 차감 1, 사용액 제외
    (uid, '2026-10-14', '오전 반차/휴무', 8000),             -- 반차 → 차감 1
    (uid, '2026-10-15', '재택근무', 0),                      -- 재택 → 차감 1
    (uid, '2026-10-16', '휴무', 0);                          -- 휴무 → 차감 1

  SELECT * INTO r FROM public.get_user_monthly_stats(2026, 10, uid);

  ASSERT r.daily_allowance = 12000,      'daily_allowance = ' || r.daily_allowance;
  ASSERT r.work_days = 20,               'work_days = ' || r.work_days;
  ASSERT r.public_holiday_count = 2,     'public_holiday_count = ' || r.public_holiday_count;
  ASSERT r.original_allowance = 240000,  'original_allowance = ' || r.original_allowance;
  ASSERT r.weekend_work_days = 5,        'weekend_work_days = ' || r.weekend_work_days;
  ASSERT r.individual_meals = 1,         'individual_meals = ' || r.individual_meals;
  ASSERT r.remote_work_days = 1,         'remote_work_days = ' || r.remote_work_days;
  ASSERT r.annual_leave_days = 0,        'annual_leave_days = ' || r.annual_leave_days;
  ASSERT r.day_off_days = 1,             'day_off_days = ' || r.day_off_days;
  ASSERT r.half_day_off_count = 1,       'half_day_off_count = ' || r.half_day_off_count;
  ASSERT r.holiday_count = 2,            'holiday_count = ' || r.holiday_count;
  ASSERT r.holiday_deduction = 0,        'holiday_deduction = ' || r.holiday_deduction;
  ASSERT r.individual_meal_deduction = 12000, 'individual_meal_deduction = ' || r.individual_meal_deduction;
  ASSERT r.no_meal_deduction = 24000,    'no_meal_deduction = ' || r.no_meal_deduction;
  ASSERT r.half_day_deduction = 12000,   'half_day_deduction = ' || r.half_day_deduction;
  ASSERT r.total_deduction = 48000,      'total_deduction = ' || r.total_deduction;
  ASSERT r.total_used = 42000,           'total_used = ' || r.total_used;
  ASSERT r.total_allowance = 252000,     'total_allowance = ' || r.total_allowance;
  ASSERT r.balance = 210000,             'balance = ' || r.balance;

  RAISE NOTICE 'user_monthly_stats regression: OK';
END $$;

ROLLBACK;
