\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_period record;
  v_difference_count bigint;
  v_plan json;
BEGIN
  FOR v_period IN
    SELECT DISTINCT
      extract(year FROM leave_date)::integer AS year,
      extract(month FROM leave_date)::integer AS month
    FROM public.dayoffs
  LOOP
    WITH expected AS (
      SELECT
        d.target_id AS member_id,
        m.full_name AS member_name,
        t.name AS team_name,
        d.leave_type_id,
        lt.name AS leave_type_name,
        count(*)::bigint AS count
      FROM public.dayoffs d
      JOIN public.members m ON m.id = d.target_id
      JOIN public.leave_types lt ON lt.id = d.leave_type_id
      LEFT JOIN public.teams t ON t.id = m.team_id
      WHERE d.is_deleted = false
        AND d.approval_status IN ('pre_approved', 'approved')
        AND extract(year FROM d.leave_date) = v_period.year
        AND extract(month FROM d.leave_date) = v_period.month
      GROUP BY d.target_id, m.full_name, t.name, d.leave_type_id, lt.name
    ),
    actual AS (
      SELECT *
      FROM public.get_dayoff_monthly_stats(v_period.year, v_period.month)
    ),
    differences AS (
      (SELECT * FROM expected EXCEPT ALL SELECT * FROM actual)
      UNION ALL
      (SELECT * FROM actual EXCEPT ALL SELECT * FROM expected)
    )
    SELECT count(*)
    INTO v_difference_count
    FROM differences;

    IF v_difference_count <> 0 THEN
      RAISE EXCEPTION
        'monthly dayoff stats changed for %-%: % differences',
        v_period.year,
        v_period.month,
        v_difference_count;
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM public.get_dayoff_monthly_stats(2026, 13)) THEN
    RAISE EXCEPTION 'invalid month returned rows';
  END IF;

  PERFORM set_config('enable_seqscan', 'off', true);
  EXECUTE $plan$
    EXPLAIN (FORMAT JSON)
    SELECT target_id, leave_type_id
    FROM public.dayoffs
    WHERE is_deleted = false
      AND approval_status IN ('pre_approved', 'approved')
      AND leave_date >= date '2026-01-01'
      AND leave_date < date '2027-01-01'
  $plan$
  INTO v_plan;

  IF v_plan::text NOT LIKE '%idx_dayoffs_approved_leave_date%' THEN
    RAISE EXCEPTION 'approved leave date query did not use the expected index: %', v_plan;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname IN ('public', 'supervisor')
      AND indexname IN (
        'idx_attendance_member_date',
        'idx_early_leave_req_record',
        'idx_members_login_id',
        'idx_monthly_allowances_user_year_month',
        'idx_monthly_drink_settings_year_month',
        'idx_multisource_evaluation_subjects_round_member',
        'idx_settlement_status_user_month',
        'idx_interview_expense_reports_job_posting'
      )
  ) THEN
    RAISE EXCEPTION 'redundant indexes remain';
  END IF;

  IF EXISTS (
    SELECT canonical_name
    FROM unnest(ARRAY[
      'public.attendance_records_member_id_date_key',
      'public.idx_early_leave_request_attendance_record',
      'public.members_login_id_key',
      'public.monthly_allowances_user_id_year_month_key',
      'public.monthly_drink_settings_year_month_key',
      'public.multisource_evaluation_subjects_round_member_key',
      'public.settlement_status_user_id_year_month_key',
      'supervisor.interview_expense_reports_job_posting_id_key'
    ]) AS canonical_names(canonical_name)
    WHERE to_regclass(canonical_name) IS NULL
  ) THEN
    RAISE EXCEPTION 'canonical unique index is missing';
  END IF;
END;
$$;

ROLLBACK;
