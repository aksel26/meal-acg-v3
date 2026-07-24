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
        make_date(years.year, months.month, 1) + interval '1 month' - interval '1 day',
        interval '1 day'
      ) AS d
      WHERE extract(dow FROM d) <> ALL (ARRAY[0, 6])
    ) AS weekday_count,
    (
      SELECT count(*)
      FROM public.holidays h
      WHERE extract(year FROM h.holiday_date) = years.year
        AND extract(month FROM h.holiday_date) = months.month
        AND extract(dow FROM h.holiday_date) <> ALL (ARRAY[0, 6])
    ) AS public_holiday_count
  FROM public.members m
  CROSS JOIN (
    SELECT generate_series(2024, extract(year FROM current_date)::integer + 5) AS year
  ) years
  CROSS JOIN (SELECT generate_series(1, 12) AS month) months
),
approved_leave_totals AS (
  SELECT
    d.target_id AS user_id,
    extract(year FROM d.leave_date)::integer AS year,
    extract(month FROM d.leave_date)::integer AS month,
    count(*) FILTER (
      WHERE lt.duration_type = 'full' AND lt.deducts_annual
    ) AS annual_leave_days,
    count(*) FILTER (
      WHERE lt.duration_type = 'full' AND NOT lt.deducts_annual
    ) AS day_off_days,
    count(*) FILTER (
      WHERE lt.duration_type IN ('morning', 'afternoon')
    ) AS half_day_off_count
  FROM public.dayoffs d
  JOIN public.leave_types lt ON lt.id = d.leave_type_id
  WHERE d.approval_status = 'approved'
    AND NOT d.is_deleted
    AND lt.include_in_stats
    AND lt.category <> '지각/조퇴'
  GROUP BY
    d.target_id,
    extract(year FROM d.leave_date),
    extract(month FROM d.leave_date)
),
meal_totals AS (
  SELECT
    ml.user_id,
    extract(year FROM ml.entry_date)::integer AS year,
    extract(month FROM ml.entry_date)::integer AS month,
    sum(
      CASE
        WHEN ml.attendance NOT ILIKE '%개별식사%' THEN ml.lunch_amount
        ELSE 0
      END
    ) AS total_used,
    count(*) FILTER (
      WHERE (
        extract(dow FROM ml.entry_date) = ANY (ARRAY[0, 6])
        OR ml.entry_date IN (SELECT holiday_date FROM public.holidays)
      )
      AND ml.attendance IN ('근무', '출근')
      AND (
        coalesce(ml.lunch_amount, 0) > 0
        OR nullif(trim(ml.lunch_store), '') IS NOT NULL
        OR nullif(trim(ml.lunch_payer), '') IS NOT NULL
        OR coalesce(ml.dinner_amount, 0) > 0
        OR nullif(trim(ml.dinner_store), '') IS NOT NULL
        OR nullif(trim(ml.dinner_payer), '') IS NOT NULL
      )
    ) AS weekend_work_days,
    count(*) FILTER (
      WHERE ml.attendance ILIKE '%개별식사%'
    ) AS individual_meals,
    count(*) FILTER (
      WHERE ml.attendance ILIKE '%재택%'
    ) AS remote_work_days
  FROM public.meal_logs ml
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.dayoffs d
    JOIN public.leave_types lt ON lt.id = d.leave_type_id
    WHERE d.target_id = ml.user_id
      AND d.leave_date = ml.entry_date
      AND d.approval_status = 'approved'
      AND NOT d.is_deleted
      AND lt.include_in_stats
      AND lt.category <> '지각/조퇴'
  )
  GROUP BY
    ml.user_id,
    extract(year FROM ml.entry_date),
    extract(month FROM ml.entry_date)
),
allowance_data AS (
  SELECT daily_allowance, monthly_allowances
  FROM public.global_settings
  WHERE id = 1
),
configured_months AS (
  SELECT
    md.*,
    coalesce(
      (
        ad.monthly_allowances
        -> md.year::text
        -> md.month::text
        ->> 'workdays'
      )::bigint,
      md.weekday_count - md.public_holiday_count
    ) AS work_days,
    coalesce(
      (
        ad.monthly_allowances
        -> md.year::text
        -> md.month::text
        ->> 'allowance'
      )::bigint,
      0
    ) AS original_allowance,
    coalesce(
      (
        (
          ad.monthly_allowances
          -> md.year::text
          -> md.month::text
          ->> 'allowance'
        )::bigint
        / nullif(
          (
            ad.monthly_allowances
            -> md.year::text
            -> md.month::text
            ->> 'workdays'
          )::bigint,
          0
        )
      )::integer,
      ad.daily_allowance
    ) AS daily_allowance
  FROM monthly_data md
  CROSS JOIN allowance_data ad
)
SELECT
  cm.user_id,
  cm.full_name,
  cm.login_id,
  cm.year,
  cm.month,
  cm.work_days,
  (
    coalesce(alt.annual_leave_days, 0)
    + coalesce(alt.day_off_days, 0)
    + coalesce(alt.half_day_off_count, 0)
  ) AS holiday_count,
  cm.public_holiday_count,
  cm.daily_allowance,
  cm.original_allowance,
  coalesce(mt.individual_meals, 0) * cm.daily_allowance AS individual_meal_deduction,
  (
    coalesce(alt.annual_leave_days, 0)
    + coalesce(alt.day_off_days, 0)
    + coalesce(mt.remote_work_days, 0)
  ) * cm.daily_allowance AS no_meal_deduction,
  coalesce(alt.half_day_off_count, 0) * cm.daily_allowance AS half_day_deduction,
  0::bigint AS holiday_deduction,
  (
    coalesce(mt.individual_meals, 0)
    + coalesce(alt.annual_leave_days, 0)
    + coalesce(alt.day_off_days, 0)
    + coalesce(mt.remote_work_days, 0)
    + coalesce(alt.half_day_off_count, 0)
  ) * cm.daily_allowance AS total_deduction,
  (
    cm.original_allowance
    - (
      coalesce(mt.individual_meals, 0)
      + coalesce(alt.annual_leave_days, 0)
      + coalesce(alt.day_off_days, 0)
      + coalesce(mt.remote_work_days, 0)
      + coalesce(alt.half_day_off_count, 0)
    ) * cm.daily_allowance
    + coalesce(mt.weekend_work_days, 0) * cm.daily_allowance
  ) AS total_allowance,
  coalesce(mt.total_used, 0) AS total_used,
  (
    cm.original_allowance
    - (
      coalesce(mt.individual_meals, 0)
      + coalesce(alt.annual_leave_days, 0)
      + coalesce(alt.day_off_days, 0)
      + coalesce(mt.remote_work_days, 0)
      + coalesce(alt.half_day_off_count, 0)
    ) * cm.daily_allowance
    + coalesce(mt.weekend_work_days, 0) * cm.daily_allowance
    - coalesce(mt.total_used, 0)
  ) AS balance,
  coalesce(mt.weekend_work_days, 0) AS weekend_work_days,
  coalesce(mt.individual_meals, 0) AS individual_meals,
  coalesce(mt.remote_work_days, 0) AS remote_work_days,
  coalesce(alt.half_day_off_count, 0) AS half_day_off_count,
  coalesce(alt.annual_leave_days, 0) AS annual_leave_days,
  coalesce(alt.day_off_days, 0) AS day_off_days
FROM configured_months cm
LEFT JOIN meal_totals mt
  ON mt.user_id = cm.user_id
  AND mt.year = cm.year
  AND mt.month = cm.month
LEFT JOIN approved_leave_totals alt
  ON alt.user_id = cm.user_id
  AND alt.year = cm.year
  AND alt.month = cm.month;

CREATE OR REPLACE FUNCTION public.prevent_meal_log_on_approved_leave()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.dayoffs d
    JOIN public.leave_types lt ON lt.id = d.leave_type_id
    WHERE d.target_id = NEW.user_id
      AND d.leave_date = NEW.entry_date
      AND d.approval_status = 'approved'
      AND NOT d.is_deleted
      AND lt.include_in_stats
      AND lt.category <> '지각/조퇴'
  ) THEN
    RAISE EXCEPTION 'APPROVED_LEAVE_MEAL_FORBIDDEN'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_meal_log_on_approved_leave
ON public.meal_logs;

CREATE TRIGGER trg_prevent_meal_log_on_approved_leave
BEFORE INSERT OR UPDATE ON public.meal_logs
FOR EACH ROW
EXECUTE FUNCTION public.prevent_meal_log_on_approved_leave();
