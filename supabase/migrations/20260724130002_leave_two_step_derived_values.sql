-- 20260724130002_leave_two_step_derived_values.sql
-- ============ SECTION 3: 파생값 확장 (연차·식대·근태·통계·인덱스·편집정책) ============
-- 핵심 원칙: "확정 휴가" = approval_status IN ('pre_approved','approved').
-- 흩어진 approval_status = 'approved' 판정을 이 IN 형태로 확장한다.
--
-- Task 1(20260724130000)·Task 2(20260724130001)이 이미 로컬 적용·커밋된 뒤라
-- 해당 파일에 append 하지 않고(재적용 안 됨) 별도 신규 파일로 재정의한다.
-- 아래 각 함수/뷰는 원본을 전체 복사한 뒤 approval_status 판정 지점만 확장한 것으로,
-- CREATE OR REPLACE 로 본문을 통째로 교체하는 정상 패턴이다(중복 정의 아님).

-- ============ SECTION 3a: 연차 차감 트리거 + 기존 잔액 백필 ============
-- 원본: 20260722100000_leave_request_workflow_integrity.sql:101-196
-- 변경: v_old_effective/v_new_effective 판정 2곳 + 백필 UPDATE 의
--       d.approval_status = 'approved' 2곳 → IN ('pre_approved','approved')

CREATE OR REPLACE FUNCTION update_leave_balance_on_dayoff()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_old_effective boolean := false;
  v_new_effective boolean := false;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    v_old_effective := OLD.is_deleted = false
      AND OLD.approval_status IN ('pre_approved', 'approved');
  END IF;

  IF TG_OP <> 'DELETE' THEN
    v_new_effective := NEW.is_deleted = false
      AND NEW.approval_status IN ('pre_approved', 'approved');
  END IF;

  IF v_old_effective AND (
    NOT v_new_effective
    OR OLD.target_id IS DISTINCT FROM NEW.target_id
    OR OLD.leave_date IS DISTINCT FROM NEW.leave_date
    OR OLD.leave_type_id IS DISTINCT FROM NEW.leave_type_id
  ) THEN
    PERFORM apply_leave_balance_delta(
      OLD.target_id,
      OLD.leave_date,
      OLD.leave_type_id,
      -1
    );
  END IF;

  IF v_new_effective AND (
    NOT v_old_effective
    OR OLD.target_id IS DISTINCT FROM NEW.target_id
    OR OLD.leave_date IS DISTINCT FROM NEW.leave_date
    OR OLD.leave_type_id IS DISTINCT FROM NEW.leave_type_id
  ) THEN
    PERFORM apply_leave_balance_delta(
      NEW.target_id,
      NEW.leave_date,
      NEW.leave_type_id,
      1
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- trg_dayoff_leave_balance 는 이미 approval_status 를 OF 목록에 포함하고 있어
-- 트리거 재생성 불필요 (CREATE OR REPLACE FUNCTION 만으로 본문 교체됨).

-- 기존 pending/rejected 오차를 제거하고, 확정 휴가(가승인 포함)만 used에 반영한다.
UPDATE leave_balances lb
SET used = CASE
  WHEN lb.type = 'annual' THEN coalesce((
    SELECT sum(lt.deduction_amount)
    FROM dayoffs d
    JOIN leave_types lt ON lt.id = d.leave_type_id
    WHERE d.target_id = lb.member_id
      AND extract(year FROM d.leave_date)::integer = lb.year
      AND d.is_deleted = false
      AND d.approval_status IN ('pre_approved', 'approved')
      AND lt.deducts_annual = true
  ), 0)
  WHEN lb.type = 'monthly'
    AND NOT EXISTS (
      SELECT 1
      FROM leave_balances annual
      WHERE annual.member_id = lb.member_id
        AND annual.year = lb.year
        AND annual.type = 'annual'
    ) THEN coalesce((
      SELECT sum(lt.deduction_amount)
      FROM dayoffs d
      JOIN leave_types lt ON lt.id = d.leave_type_id
      WHERE d.target_id = lb.member_id
        AND extract(year FROM d.leave_date)::integer = lb.year
        AND d.is_deleted = false
        AND d.approval_status IN ('pre_approved', 'approved')
        AND lt.deducts_annual = true
    ), 0)
  WHEN lb.type = 'monthly' THEN 0
  ELSE lb.used
END,
updated_at = now()
WHERE lb.type IN ('annual', 'monthly');

-- ============ SECTION 3b: 식대 뷰 + 식대입력 차단 트리거 ============
-- 원본: 20260723100000_approved_leave_meal_impact.sql:1-255 (전체 복사)
-- 변경: approved_leave_totals CTE(원본 :47), meal_totals NOT EXISTS(원본 :95),
--       prevent_meal_log_on_approved_leave(원본 :236) 의
--       d.approval_status = 'approved' → IN ('pre_approved','approved')

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
  WHERE d.approval_status IN ('pre_approved', 'approved')
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
      AND d.approval_status IN ('pre_approved', 'approved')
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
      AND d.approval_status IN ('pre_approved', 'approved')
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

-- trg_prevent_meal_log_on_approved_leave 는 이미 존재하므로 재생성 불필요
-- (CREATE OR REPLACE FUNCTION 만으로 본문 교체됨).

-- ============ SECTION 3c: 월별 휴가통계 RPC + 부분 인덱스 ============
-- 원본: 20260724110000_query_performance_indexes.sql (읽기 참조, 수정 금지)
-- 변경: get_dayoff_monthly_stats 의 d.approval_status = 'approved' (원본 :46)
--       → IN ('pre_approved','approved')
--       부분 인덱스 idx_dayoffs_approved_leave_date (원본 :2-6) 재생성

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
    AND d.approval_status IN ('pre_approved', 'approved')
    AND d.leave_date >= v_start_date
    AND d.leave_date < (v_start_date + interval '1 month')::date
  GROUP BY d.target_id, m.full_name, t.name, d.leave_type_id, lt.name
  ORDER BY m.full_name, d.leave_type_id;
END;
$$;

DROP INDEX IF EXISTS idx_dayoffs_approved_leave_date;
CREATE INDEX idx_dayoffs_approved_leave_date
  ON public.dayoffs (leave_date)
  INCLUDE (target_id, leave_type_id)
  WHERE is_deleted = false
    AND approval_status IN ('pre_approved', 'approved');

-- ============ SECTION 3d: 편집정책 승인자 보존 확장 ============
-- 원본: 20260722100900_leave_request_update_policy.sql (전체, 최신 적용본)
-- 변경: 수정사유 필수 조건(원본 :36) v_dayoff.approval_status = 'approved'
--       → IN ('pre_approved','approved')
--       승인자/승인시각 보존(원본 :80-85) approval_status = 'approved'
--       → IN ('pre_approved','approved')
--       (first_approver_id/final_approver_id 는 이 함수가 건드리지 않아 자동 보존됨)

CREATE OR REPLACE FUNCTION update_dayoff_atomic(
  p_dayoff_id uuid,
  p_editor_id uuid,
  p_is_admin boolean,
  p_changes jsonb
)
RETURNS SETOF dayoffs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dayoff dayoffs%ROWTYPE;
  v_result dayoffs%ROWTYPE;
  v_leave_date date;
  v_leave_type_id integer;
  v_approver_id uuid;
  v_cc_member_ids uuid[];
  v_edit_reason text;
  v_old_category text;
  v_new_category text;
BEGIN
  SELECT * INTO v_dayoff FROM dayoffs
  WHERE id = p_dayoff_id AND is_deleted = false FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAVE_DAYOFF_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF NOT p_is_admin AND v_dayoff.author_id <> p_editor_id
     AND v_dayoff.target_id <> p_editor_id THEN
    RAISE EXCEPTION 'LEAVE_DAYOFF_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF NOT p_is_admin AND p_changes ? 'approverId' THEN
    RAISE EXCEPTION 'LEAVE_APPROVER_CHANGE_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  v_edit_reason := nullif(btrim(p_changes->>'editReason'), '');
  IF NOT p_is_admin AND v_dayoff.approval_status IN ('pre_approved', 'approved')
     AND v_edit_reason IS NULL THEN
    RAISE EXCEPTION 'LEAVE_EDIT_REASON_REQUIRED' USING ERRCODE = '22023';
  END IF;
  v_leave_date := CASE WHEN p_changes ? 'leaveDate'
    THEN (p_changes->>'leaveDate')::date ELSE v_dayoff.leave_date END;
  v_leave_type_id := CASE WHEN p_changes ? 'leaveTypeId'
    THEN (p_changes->>'leaveTypeId')::integer ELSE v_dayoff.leave_type_id END;
  v_approver_id := CASE WHEN p_changes ? 'approverId'
    THEN nullif(p_changes->>'approverId', '')::uuid ELSE v_dayoff.approver_id END;
  v_cc_member_ids := CASE WHEN p_changes ? 'ccMemberIds' THEN ARRAY(
    SELECT jsonb_array_elements_text(p_changes->'ccMemberIds')::uuid
  ) ELSE v_dayoff.cc_member_ids END;

  SELECT category INTO v_new_category FROM leave_types WHERE id = v_leave_type_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAVE_REQUEST_INVALID_TYPE' USING ERRCODE = '22023';
  END IF;
  SELECT category INTO v_old_category FROM leave_types WHERE id = v_dayoff.leave_type_id;

  IF NOT p_is_admin AND p_changes ? 'leaveDate' AND (
    v_leave_date < (now() AT TIME ZONE 'Asia/Seoul')::date
    OR extract(isodow FROM v_leave_date) IN (6, 7)
    OR EXISTS (SELECT 1 FROM holidays WHERE holiday_date = v_leave_date)
  ) THEN
    RAISE EXCEPTION 'LEAVE_REQUEST_INVALID_DATE' USING ERRCODE = '22023';
  END IF;

  IF NOT p_is_admin
     AND p_changes ? 'leaveTypeId'
     AND v_old_category IS DISTINCT FROM '지각/조퇴'
     AND v_new_category = '지각/조퇴' THEN
    RAISE EXCEPTION 'LEAVE_REQUEST_INVALID_TYPE' USING ERRCODE = '22023';
  END IF;

  UPDATE dayoffs
  SET leave_date = v_leave_date,
      leave_type_id = v_leave_type_id,
      late_hour = CASE WHEN v_leave_type_id = 1 THEN
        CASE WHEN p_changes ? 'lateHour' THEN nullif(p_changes->>'lateHour', '') ELSE late_hour END
        ELSE NULL END,
      late_minute = CASE WHEN v_leave_type_id = 1 THEN
        CASE WHEN p_changes ? 'lateMinute' THEN nullif(p_changes->>'lateMinute', '') ELSE late_minute END
        ELSE NULL END,
      approver_id = CASE
        WHEN approval_status IN ('pre_approved', 'approved') THEN v_approver_id
        ELSE NULL
      END,
      approved_at = CASE WHEN approval_status IN ('pre_approved', 'approved') AND v_approver_id IS NOT NULL
        THEN coalesce(approved_at, now()) ELSE NULL END,
      cc_member_ids = v_cc_member_ids,
      reason = CASE WHEN p_changes ? 'reason' THEN nullif(btrim(p_changes->>'reason'), '') ELSE reason END,
      edit_reason = CASE WHEN p_changes ? 'editReason' THEN v_edit_reason ELSE edit_reason END,
      last_editor_id = p_editor_id
  WHERE id = p_dayoff_id RETURNING * INTO v_result;
  UPDATE approval_requests
  SET approver_id = coalesce(v_approver_id, approver_id), cc_member_ids = v_cc_member_ids
  WHERE related_table = 'dayoffs' AND related_id = p_dayoff_id;
  RETURN NEXT v_result;
END;
$$;
