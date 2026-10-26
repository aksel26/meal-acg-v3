-- 식대 사용가능액 계산을 user_monthly_stats 뷰 한 곳으로 모은다.
-- 사용자 앱(/api/meals/stats)과 관리자 stats·export·slack route는 이 뷰의 결과만 읽는다.
--
-- 이전 정의와 달라지는 점
--   1. daily_allowance = 저장된 월 지원금 ÷ 근무일. 없으면 global_settings.daily_allowance.
--   2. work_days = 저장된 근무일. 없으면 평일 수 − 평일 공휴일 수.
--   3. 평일 공휴일 이중 차감 제거. holiday_deduction은 호환을 위해 0으로 유지.
--   4. 주말·공휴일 근무 가산 = 토·일 또는 공휴일에 근태가 '근무'/'출근'이거나, 근태 없이 식사 금액(아침·점심·저녁)만 있는 날.
--      점심을 안 먹어도 가산 대상이다. 개별식사 표시만 제외한다.
--   5. 개별식사·재택·연차/휴무·반차 차감은 base 근무일(평일이면서 공휴일 아님)만 센다.
--   6. total_used는 근태가 비어 있어도 센다. 개별식사만 뺀다.
--
-- 컬럼 이름·순서·타입은 기존 뷰와 같다 (CREATE OR REPLACE VIEW 제약).
-- RPC get_user_monthly_stats는 이 뷰를 그대로 SELECT 하므로 손대지 않는다.

CREATE OR REPLACE VIEW public.user_monthly_stats AS
WITH monthly_data AS (
  SELECT
    m.id AS user_id,
    m.full_name,
    m.login_id,
    years.year,
    months.month,
    (
      SELECT count(*)
      FROM generate_series(
        make_date(years.year, months.month, 1)::timestamp,
        make_date(years.year, months.month, 1) + interval '1 mon' - interval '1 day',
        interval '1 day'
      ) AS d(d)
      WHERE extract(dow FROM d.d) NOT IN (0, 6)
    ) AS weekday_count,
    (
      SELECT count(*)
      FROM public.holidays h
      WHERE extract(year FROM h.holiday_date) = years.year
        AND extract(month FROM h.holiday_date) = months.month
        AND extract(dow FROM h.holiday_date) NOT IN (0, 6)
    ) AS public_holiday_count
  FROM public.members m
  CROSS JOIN (SELECT generate_series(2024, extract(year FROM current_date)::integer + 5) AS year) AS years
  CROSS JOIN (SELECT generate_series(1, 12) AS month) AS months
),
allowance_data AS (
  SELECT gs.daily_allowance, gs.monthly_allowances
  FROM public.global_settings gs
  WHERE gs.id = 1
),
configured_months AS (
  SELECT
    md.user_id,
    md.full_name,
    md.login_id,
    md.year,
    md.month,
    md.public_holiday_count,
    COALESCE(
      ((ad.monthly_allowances -> md.year::text -> md.month::text) ->> 'workdays')::bigint,
      md.weekday_count - md.public_holiday_count
    ) AS work_days,
    COALESCE(
      ((ad.monthly_allowances -> md.year::text -> md.month::text) ->> 'allowance')::bigint,
      0
    ) AS original_allowance,
    COALESCE(
      (
        ((ad.monthly_allowances -> md.year::text -> md.month::text) ->> 'allowance')::bigint
        / NULLIF(((ad.monthly_allowances -> md.year::text -> md.month::text) ->> 'workdays')::bigint, 0)
      )::integer,
      ad.daily_allowance
    ) AS daily_allowance
  FROM monthly_data md
  CROSS JOIN allowance_data ad
),
logs AS (
  SELECT
    ml.user_id,
    extract(year FROM ml.entry_date)::integer AS year,
    extract(month FROM ml.entry_date)::integer AS month,
    COALESCE(ml.attendance, '') AS attendance,
    ml.lunch_amount,
    ml.total_amount,
    extract(dow FROM ml.entry_date) NOT IN (0, 6)
      AND NOT EXISTS (SELECT 1 FROM public.holidays h WHERE h.holiday_date = ml.entry_date) AS is_base_workday
  FROM public.meal_logs ml
),
meal_totals AS (
  SELECT
    l.user_id,
    l.year,
    l.month,
    sum(CASE WHEN l.attendance NOT ILIKE '%개별식사%' THEN l.lunch_amount ELSE 0 END) AS total_used,
    count(*) FILTER (WHERE NOT l.is_base_workday
      AND (trim(l.attendance) IN ('근무', '출근')
           OR (l.attendance NOT ILIKE '%개별식사%' AND COALESCE(l.total_amount, 0) > 0))) AS weekend_work_days,
    count(*) FILTER (WHERE l.is_base_workday AND l.attendance ILIKE '%개별식사%') AS individual_meals,
    count(*) FILTER (WHERE l.is_base_workday AND l.attendance ILIKE '%재택%') AS remote_work_days,
    count(*) FILTER (WHERE l.is_base_workday AND l.attendance ILIKE '%연차%' AND l.attendance NOT ILIKE '%반차%') AS annual_leave_days,
    count(*) FILTER (WHERE l.is_base_workday AND l.attendance ILIKE '%반차%') AS half_day_off_count,
    count(*) FILTER (WHERE l.is_base_workday AND l.attendance ILIKE '%휴무%' AND l.attendance NOT ILIKE '%연차%' AND l.attendance NOT ILIKE '%반차%') AS day_off_days
  FROM logs l
  GROUP BY l.user_id, l.year, l.month
)
SELECT
  cm.user_id,
  cm.full_name,
  cm.login_id,
  cm.year,
  cm.month,
  cm.work_days,
  COALESCE(mt.annual_leave_days, 0) + COALESCE(mt.day_off_days, 0) + COALESCE(mt.half_day_off_count, 0) AS holiday_count,
  cm.public_holiday_count,
  cm.daily_allowance,
  cm.original_allowance,
  COALESCE(mt.individual_meals, 0) * cm.daily_allowance AS individual_meal_deduction,
  (COALESCE(mt.annual_leave_days, 0) + COALESCE(mt.day_off_days, 0) + COALESCE(mt.remote_work_days, 0)) * cm.daily_allowance AS no_meal_deduction,
  COALESCE(mt.half_day_off_count, 0) * cm.daily_allowance AS half_day_deduction,
  0::bigint AS holiday_deduction,
  (COALESCE(mt.individual_meals, 0) + COALESCE(mt.annual_leave_days, 0) + COALESCE(mt.day_off_days, 0) + COALESCE(mt.remote_work_days, 0) + COALESCE(mt.half_day_off_count, 0)) * cm.daily_allowance AS total_deduction,
  cm.original_allowance
    - (COALESCE(mt.individual_meals, 0) + COALESCE(mt.annual_leave_days, 0) + COALESCE(mt.day_off_days, 0) + COALESCE(mt.remote_work_days, 0) + COALESCE(mt.half_day_off_count, 0)) * cm.daily_allowance
    + COALESCE(mt.weekend_work_days, 0) * cm.daily_allowance AS total_allowance,
  COALESCE(mt.total_used, 0) AS total_used,
  cm.original_allowance
    - (COALESCE(mt.individual_meals, 0) + COALESCE(mt.annual_leave_days, 0) + COALESCE(mt.day_off_days, 0) + COALESCE(mt.remote_work_days, 0) + COALESCE(mt.half_day_off_count, 0)) * cm.daily_allowance
    + COALESCE(mt.weekend_work_days, 0) * cm.daily_allowance
    - COALESCE(mt.total_used, 0) AS balance,
  COALESCE(mt.weekend_work_days, 0) AS weekend_work_days,
  COALESCE(mt.individual_meals, 0) AS individual_meals,
  COALESCE(mt.remote_work_days, 0) AS remote_work_days,
  COALESCE(mt.half_day_off_count, 0) AS half_day_off_count,
  COALESCE(mt.annual_leave_days, 0) AS annual_leave_days,
  COALESCE(mt.day_off_days, 0) AS day_off_days
FROM configured_months cm
LEFT JOIN meal_totals mt
  ON mt.user_id = cm.user_id AND mt.year = cm.year AND mt.month = cm.month;
