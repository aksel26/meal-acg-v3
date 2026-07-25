\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_member_id uuid;
  v_first_approver_id uuid;
  v_final_approver_id uuid;
  v_full_date date;
  v_half_date date;
  v_dayoff_id uuid;
  v_approval_id uuid;
  v_daily_allowance integer;
  v_base_deduction bigint;
  v_total_deduction bigint;
  v_total_used bigint;
  v_total_allowance bigint;
  v_original_allowance bigint;
  v_work_days bigint;
  v_holiday_deduction bigint;
  v_annual_days bigint;
  v_half_days bigint;
  v_half_deduction bigint;
  v_leave_used numeric;
  v_expected_error boolean;
BEGIN
  SELECT id INTO v_member_id FROM members ORDER BY id LIMIT 1;
  SELECT id INTO v_first_approver_id
  FROM members
  WHERE id <> v_member_id
  ORDER BY id
  LIMIT 1;
  SELECT id INTO v_final_approver_id
  FROM members
  WHERE id NOT IN (v_member_id, v_first_approver_id)
  ORDER BY id
  LIMIT 1;

  IF v_member_id IS NULL
    OR v_first_approver_id IS NULL
    OR v_final_approver_id IS NULL THEN
    RAISE EXCEPTION 'leave meal impact test requires three seeded members';
  END IF;

  SELECT candidate::date INTO v_full_date
  FROM generate_series(date '2030-04-01', date '2030-04-30', interval '1 day') candidate
  WHERE extract(isodow FROM candidate) BETWEEN 1 AND 5
    AND candidate::date NOT IN (SELECT holiday_date FROM holidays)
  ORDER BY candidate
  LIMIT 1;

  SELECT candidate::date INTO v_half_date
  FROM generate_series(v_full_date + 1, date '2030-04-30', interval '1 day') candidate
  WHERE extract(isodow FROM candidate) BETWEEN 1 AND 5
    AND candidate::date NOT IN (SELECT holiday_date FROM holidays)
  ORDER BY candidate
  LIMIT 1;

  DELETE FROM approval_requests
  WHERE related_table = 'dayoffs'
    AND related_id IN (
      SELECT id
      FROM dayoffs
      WHERE target_id = v_member_id
        AND leave_date BETWEEN date '2030-04-01' AND date '2030-04-30'
    );
  DELETE FROM dayoffs
  WHERE target_id = v_member_id
    AND leave_date BETWEEN date '2030-04-01' AND date '2030-04-30';
  DELETE FROM meal_logs
  WHERE user_id = v_member_id
    AND entry_date BETWEEN date '2030-04-01' AND date '2030-04-30';

  INSERT INTO leave_balances(member_id, year, type, granted, used)
  VALUES (v_member_id, 2030, 'annual', 20, 0)
  ON CONFLICT (member_id, year, type)
  DO UPDATE SET granted = 20, used = 0;

  UPDATE global_settings
  SET monthly_allowances =
    monthly_allowances
    || jsonb_build_object(
      '2030',
      coalesce(monthly_allowances -> '2030', '{}'::jsonb)
      || jsonb_build_object(
        '4',
        jsonb_build_object('allowance', 246000, 'workdays', 20)
      )
    )
  WHERE id = 1;

  SELECT
    daily_allowance,
    original_allowance,
    work_days,
    holiday_deduction,
    total_deduction,
    total_allowance
  INTO
    v_daily_allowance,
    v_original_allowance,
    v_work_days,
    v_holiday_deduction,
    v_base_deduction,
    v_total_allowance
  FROM user_monthly_stats
  WHERE user_id = v_member_id
    AND year = 2030
    AND month = 4;

  IF v_daily_allowance <> 12300
    OR v_original_allowance <> 246000
    OR v_work_days <> 20
    OR v_holiday_deduction <> 0
    OR v_base_deduction <> 0
    OR v_total_allowance <> 246000 THEN
    RAISE EXCEPTION
      'configured allowance contract mismatch: daily %, original %, workdays %, holiday %, deduction %, allowance %',
      v_daily_allowance,
      v_original_allowance,
      v_work_days,
      v_holiday_deduction,
      v_base_deduction,
      v_total_allowance;
  END IF;

  v_expected_error := false;
  BEGIN
    INSERT INTO meal_logs(user_id, entry_date, attendance, lunch_amount)
    VALUES (v_member_id, date '2030-04-30', '근무', -1);
  EXCEPTION WHEN check_violation THEN
    v_expected_error := true;
  END;
  IF NOT v_expected_error THEN
    RAISE EXCEPTION 'negative meal amount was allowed';
  END IF;

  INSERT INTO meal_logs(user_id, entry_date, attendance, lunch_amount)
  VALUES (v_member_id, v_full_date, '근무', 7000);

  SELECT dayoff_id, approval_id
  INTO v_dayoff_id, v_approval_id
  FROM create_leave_request_atomic(
    gen_random_uuid(),
    v_member_id,
    v_member_id,
    v_first_approver_id,
    ARRAY[v_full_date],
    5,
    NULL,
    NULL,
    '{}',
    '식대 영향 회귀 테스트',
    'pending'
  );

  SELECT total_used, annual_leave_days
  INTO v_total_used, v_annual_days
  FROM user_monthly_stats
  WHERE user_id = v_member_id
    AND year = 2030
    AND month = 4;

  IF v_total_used <> 7000 OR v_annual_days <> 0 THEN
    RAISE EXCEPTION
      'pending annual leave affected meal stats: used %, annual %',
      v_total_used,
      v_annual_days;
  END IF;

  PERFORM resolve_leave_approval_atomic(
    v_approval_id,
    v_first_approver_id,
    'pre_approve',
    true,
    NULL
  );
  PERFORM resolve_leave_approval_atomic(
    v_approval_id,
    v_final_approver_id,
    'approve',
    true,
    NULL
  );

  SELECT total_used, annual_leave_days, total_deduction
  INTO v_total_used, v_annual_days, v_total_deduction
  FROM user_monthly_stats
  WHERE user_id = v_member_id
    AND year = 2030
    AND month = 4;

  IF v_total_used <> 0
    OR v_annual_days <> 1
    OR v_total_deduction <> v_base_deduction + v_daily_allowance THEN
    RAISE EXCEPTION
      'approved annual leave impact mismatch: used %, annual %, deduction %',
      v_total_used,
      v_annual_days,
      v_total_deduction;
  END IF;

  SELECT used INTO v_leave_used
  FROM leave_balances
  WHERE member_id = v_member_id
    AND year = 2030
    AND type = 'annual';

  IF v_leave_used <> 1 THEN
    RAISE EXCEPTION 'approved annual leave balance mismatch: %', v_leave_used;
  END IF;

  v_expected_error := false;
  BEGIN
    UPDATE meal_logs
    SET lunch_amount = 8000
    WHERE user_id = v_member_id
      AND entry_date = v_full_date;
  EXCEPTION WHEN check_violation THEN
    v_expected_error := SQLERRM = 'APPROVED_LEAVE_MEAL_FORBIDDEN';
  END;
  IF NOT v_expected_error THEN
    RAISE EXCEPTION 'meal update was allowed during approved leave';
  END IF;

  PERFORM resolve_leave_approval_atomic(
    v_approval_id,
    v_final_approver_id,
    'cancel',
    true,
    NULL
  );
  PERFORM resolve_leave_approval_atomic(
    v_approval_id,
    v_first_approver_id,
    'reject',
    true,
    '회귀 테스트 정리'
  );

  SELECT total_used, annual_leave_days, total_deduction
  INTO v_total_used, v_annual_days, v_total_deduction
  FROM user_monthly_stats
  WHERE user_id = v_member_id
    AND year = 2030
    AND month = 4;

  IF v_total_used <> 7000
    OR v_annual_days <> 0
    OR v_total_deduction <> v_base_deduction THEN
    RAISE EXCEPTION
      'cancelled annual leave did not restore meal stats: used %, annual %, deduction %',
      v_total_used,
      v_annual_days,
      v_total_deduction;
  END IF;

  INSERT INTO meal_logs(user_id, entry_date, attendance, lunch_amount)
  VALUES (v_member_id, v_half_date, '근무', 5000);

  SELECT dayoff_id, approval_id
  INTO v_dayoff_id, v_approval_id
  FROM create_leave_request_atomic(
    gen_random_uuid(),
    v_member_id,
    v_member_id,
    v_first_approver_id,
    ARRAY[v_half_date],
    3,
    NULL,
    NULL,
    '{}',
    '반차 식대 영향 회귀 테스트',
    'pending'
  );

  PERFORM resolve_leave_approval_atomic(
    v_approval_id,
    v_first_approver_id,
    'pre_approve',
    true,
    NULL
  );
  PERFORM resolve_leave_approval_atomic(
    v_approval_id,
    v_final_approver_id,
    'approve',
    true,
    NULL
  );

  SELECT
    total_used,
    half_day_off_count,
    half_day_deduction,
    total_deduction
  INTO
    v_total_used,
    v_half_days,
    v_half_deduction,
    v_total_deduction
  FROM user_monthly_stats
  WHERE user_id = v_member_id
    AND year = 2030
    AND month = 4;

  IF v_total_used <> 7000
    OR v_half_days <> 1
    OR v_half_deduction <> v_daily_allowance
    OR v_total_deduction <> v_base_deduction + v_daily_allowance THEN
    RAISE EXCEPTION
      'approved half-day impact mismatch: used %, half %, half deduction %, total deduction %',
      v_total_used,
      v_half_days,
      v_half_deduction,
      v_total_deduction;
  END IF;

  SELECT used INTO v_leave_used
  FROM leave_balances
  WHERE member_id = v_member_id
    AND year = 2030
    AND type = 'annual';

  IF v_leave_used <> 0.5 THEN
    RAISE EXCEPTION 'approved half-day leave balance mismatch: %', v_leave_used;
  END IF;
END;
$$;

ROLLBACK;
