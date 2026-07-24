-- 월별 승인 휴가 조회가 날짜 범위로 인덱스를 사용할 수 있도록 한다.
CREATE INDEX IF NOT EXISTS idx_dayoffs_approved_leave_date
  ON public.dayoffs (leave_date)
  INCLUDE (target_id, leave_type_id)
  WHERE is_deleted = false
    AND approval_status = 'approved';

CREATE OR REPLACE FUNCTION public.get_dayoff_monthly_stats(
  p_year integer,
  p_month integer
)
RETURNS TABLE (
  member_id uuid,
  member_name text,
  team_name text,
  leave_type_id integer,
  leave_type_name text,
  count bigint
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_start_date date;
BEGIN
  IF p_year NOT BETWEEN 1 AND 9999 OR p_month NOT BETWEEN 1 AND 12 THEN
    RETURN;
  END IF;

  v_start_date := make_date(p_year, p_month, 1);

  RETURN QUERY
  SELECT
    d.target_id,
    m.full_name,
    t.name,
    d.leave_type_id,
    lt.name,
    count(*)::bigint
  FROM dayoffs d
  JOIN members m ON m.id = d.target_id
  JOIN leave_types lt ON lt.id = d.leave_type_id
  LEFT JOIN teams t ON t.id = m.team_id
  WHERE d.is_deleted = false
    AND d.approval_status = 'approved'
    AND d.leave_date >= v_start_date
    AND d.leave_date < (v_start_date + interval '1 month')::date
  GROUP BY d.target_id, m.full_name, t.name, d.leave_type_id, lt.name
  ORDER BY m.full_name, d.leave_type_id;
END;
$$;

-- 같은 정의의 UNIQUE 인덱스가 실제로 존재할 때만 중복 인덱스를 제거한다.
DO $$
DECLARE
  v_index record;
  v_safe_to_drop boolean;
BEGIN
  FOR v_index IN
    SELECT *
    FROM (
      VALUES
        ('public', 'idx_attendance_member_date', 'attendance_records_member_id_date_key'),
        ('public', 'idx_early_leave_req_record', 'idx_early_leave_request_attendance_record'),
        ('public', 'idx_members_login_id', 'members_login_id_key'),
        ('public', 'idx_monthly_allowances_user_year_month', 'monthly_allowances_user_id_year_month_key'),
        ('public', 'idx_monthly_drink_settings_year_month', 'monthly_drink_settings_year_month_key'),
        ('public', 'idx_multisource_evaluation_subjects_round_member', 'multisource_evaluation_subjects_round_member_key'),
        ('public', 'idx_settlement_status_user_month', 'settlement_status_user_id_year_month_key'),
        ('supervisor', 'idx_interview_expense_reports_job_posting', 'interview_expense_reports_job_posting_id_key')
    ) AS indexes(schema_name, redundant_name, canonical_name)
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM pg_index redundant
      JOIN pg_index canonical
        ON canonical.indexrelid = to_regclass(
          format('%I.%I', v_index.schema_name, v_index.canonical_name)
        )
      WHERE redundant.indexrelid = to_regclass(
          format('%I.%I', v_index.schema_name, v_index.redundant_name)
        )
        AND canonical.indisunique
        AND redundant.indkey = canonical.indkey
        AND redundant.indclass = canonical.indclass
        AND redundant.indcollation = canonical.indcollation
        AND redundant.indoption = canonical.indoption
        AND redundant.indnkeyatts = canonical.indnkeyatts
        AND redundant.indnatts = canonical.indnatts
        AND pg_get_expr(redundant.indexprs, redundant.indrelid)
          IS NOT DISTINCT FROM pg_get_expr(canonical.indexprs, canonical.indrelid)
        AND pg_get_expr(redundant.indpred, redundant.indrelid)
          IS NOT DISTINCT FROM pg_get_expr(canonical.indpred, canonical.indrelid)
    )
    INTO v_safe_to_drop;

    IF v_safe_to_drop THEN
      EXECUTE format(
        'DROP INDEX %I.%I',
        v_index.schema_name,
        v_index.redundant_name
      );
    END IF;
  END LOOP;
END;
$$;
