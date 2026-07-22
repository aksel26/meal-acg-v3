-- 휴가 신청, 결재, 연차 차감의 상태를 하나의 DB 트랜잭션에서 관리한다.

ALTER TABLE dayoffs
  ADD COLUMN IF NOT EXISTS request_id uuid;

CREATE INDEX IF NOT EXISTS idx_dayoffs_request_id
  ON dayoffs(request_id)
  WHERE request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dayoffs_request_date
  ON dayoffs(request_id, leave_date)
  WHERE request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION prevent_duplicate_active_dayoff()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_deleted = false
     AND NEW.approval_status IN ('pending', 'approved')
     AND EXISTS (
       SELECT 1
       FROM dayoffs d
       WHERE d.target_id = NEW.target_id
         AND d.leave_date = NEW.leave_date
         AND d.is_deleted = false
         AND d.approval_status IN ('pending', 'approved')
         AND d.id <> NEW.id
     ) THEN
    RAISE EXCEPTION 'LEAVE_REQUEST_DUPLICATE_DATE' USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_active_dayoff ON dayoffs;
CREATE TRIGGER trg_prevent_duplicate_active_dayoff
  BEFORE INSERT OR UPDATE OF target_id, leave_date, approval_status, is_deleted
  ON dayoffs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_active_dayoff();

CREATE OR REPLACE FUNCTION apply_leave_balance_delta(
  p_member_id uuid,
  p_leave_date date,
  p_leave_type_id integer,
  p_multiplier numeric
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_amount numeric(5,2);
  v_balance_id uuid;
  v_year integer := extract(year FROM p_leave_date)::integer;
BEGIN
  SELECT CASE
           WHEN deducts_annual THEN deduction_amount * p_multiplier
           ELSE 0
         END
  INTO v_amount
  FROM leave_types
  WHERE id = p_leave_type_id;

  IF coalesce(v_amount, 0) = 0 THEN
    RETURN;
  END IF;

  SELECT id
  INTO v_balance_id
  FROM leave_balances
  WHERE member_id = p_member_id
    AND year = v_year
    AND type = 'annual'
  LIMIT 1
  FOR UPDATE;

  IF v_balance_id IS NULL THEN
    SELECT id
    INTO v_balance_id
    FROM leave_balances
    WHERE member_id = p_member_id
      AND year = v_year
      AND type = 'monthly'
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_balance_id IS NOT NULL THEN
    UPDATE leave_balances
    SET used = greatest(0, used + v_amount),
        updated_at = now()
    WHERE id = v_balance_id;
  END IF;
END;
$$;

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
      AND OLD.approval_status = 'approved';
  END IF;

  IF TG_OP <> 'DELETE' THEN
    v_new_effective := NEW.is_deleted = false
      AND NEW.approval_status = 'approved';
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

DROP TRIGGER IF EXISTS trg_dayoff_leave_balance ON dayoffs;
CREATE TRIGGER trg_dayoff_leave_balance
  AFTER INSERT OR DELETE OR UPDATE OF target_id, leave_date, leave_type_id, approval_status, is_deleted
  ON dayoffs
  FOR EACH ROW
  EXECUTE FUNCTION update_leave_balance_on_dayoff();

-- 기존 pending/rejected 오차를 제거하고 승인 완료된 휴가만 used에 반영한다.
UPDATE leave_balances lb
SET used = CASE
  WHEN lb.type = 'annual' THEN coalesce((
    SELECT sum(lt.deduction_amount)
    FROM dayoffs d
    JOIN leave_types lt ON lt.id = d.leave_type_id
    WHERE d.target_id = lb.member_id
      AND extract(year FROM d.leave_date)::integer = lb.year
      AND d.is_deleted = false
      AND d.approval_status = 'approved'
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
        AND d.approval_status = 'approved'
        AND lt.deducts_annual = true
    ), 0)
  WHEN lb.type = 'monthly' THEN 0
  ELSE lb.used
END,
updated_at = now()
WHERE lb.type IN ('annual', 'monthly');

-- 과거 관리자 직접 등록 등 결재 요청이 없던 휴가에 감사 가능한 연결 행을 보강한다.
WITH candidates AS (
  SELECT
    d.*,
    coalesce(d.approver_id, get_approver_for_member(d.target_id)) AS assigned_approver_id
  FROM dayoffs d
  JOIN members target_member ON target_member.id = d.target_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM approval_requests ar
    WHERE ar.related_table = 'dayoffs'
      AND ar.related_id = d.id
  )
)
INSERT INTO approval_requests (
  type,
  requester_id,
  approver_id,
  status,
  cc_member_ids,
  related_table,
  related_id,
  reject_reason,
  requested_at,
  resolved_at,
  resolved_by
)
SELECT
  'leave',
  candidates.target_id,
  candidates.assigned_approver_id,
  CASE
    WHEN candidates.is_deleted THEN 'rejected'
    WHEN candidates.approval_status = 'draft' THEN 'pending'
    ELSE candidates.approval_status
  END,
  coalesce(candidates.cc_member_ids, '{}'),
  'dayoffs',
  candidates.id,
  CASE WHEN candidates.is_deleted THEN '휴가 삭제' ELSE NULL END,
  candidates.created_at,
  CASE
    WHEN candidates.is_deleted
      OR candidates.approval_status IN ('approved', 'rejected')
      THEN candidates.updated_at
    ELSE NULL
  END,
  CASE
    WHEN candidates.approval_status = 'approved'
      THEN candidates.assigned_approver_id
    ELSE NULL
  END
FROM candidates
JOIN members approver_member
  ON approver_member.id = candidates.assigned_approver_id;

CREATE OR REPLACE FUNCTION prevent_duplicate_dayoff_approval_request()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.related_table = 'dayoffs'
     AND NEW.related_id IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM approval_requests ar
       WHERE ar.related_table = 'dayoffs'
         AND ar.related_id = NEW.related_id
         AND ar.id <> NEW.id
     ) THEN
    RAISE EXCEPTION 'LEAVE_APPROVAL_DUPLICATE_RELATION' USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_dayoff_approval_request
  ON approval_requests;
CREATE TRIGGER trg_prevent_duplicate_dayoff_approval_request
  BEFORE INSERT OR UPDATE OF related_table, related_id
  ON approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_dayoff_approval_request();

CREATE OR REPLACE FUNCTION create_leave_request_atomic(
  p_request_id uuid,
  p_author_id uuid,
  p_target_id uuid,
  p_approver_id uuid,
  p_dates date[],
  p_leave_type_id integer,
  p_late_hour text DEFAULT NULL,
  p_late_minute text DEFAULT NULL,
  p_cc_member_ids uuid[] DEFAULT '{}',
  p_reason text DEFAULT NULL,
  p_initial_status text DEFAULT 'pending'
)
RETURNS TABLE (
  dayoff_id uuid,
  approval_id uuid,
  leave_date date,
  approval_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $create_leave_request$
DECLARE
  v_requested_date date;
BEGIN
  IF p_request_id IS NULL
     OR p_author_id IS NULL
     OR p_target_id IS NULL
     OR p_approver_id IS NULL
     OR p_dates IS NULL
     OR cardinality(p_dates) = 0
     OR p_leave_type_id IS NULL THEN
    RAISE EXCEPTION 'LEAVE_REQUEST_INVALID_INPUT' USING ERRCODE = '22023';
  END IF;

  IF p_initial_status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'LEAVE_REQUEST_INVALID_STATUS' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM unnest(p_dates) value WHERE value IS NULL) THEN
    RAISE EXCEPTION 'LEAVE_REQUEST_INVALID_DATE' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM leave_types WHERE id = p_leave_type_id) THEN
    RAISE EXCEPTION 'LEAVE_REQUEST_INVALID_TYPE' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));

  IF EXISTS (SELECT 1 FROM dayoffs WHERE request_id = p_request_id) THEN
    IF EXISTS (
      SELECT 1
      FROM dayoffs
      WHERE request_id = p_request_id
        AND (author_id <> p_author_id OR target_id <> p_target_id)
    ) THEN
      RAISE EXCEPTION 'LEAVE_REQUEST_IDEMPOTENCY_CONFLICT' USING ERRCODE = '23505';
    END IF;

    RETURN QUERY
    SELECT d.id, ar.id, d.leave_date, d.approval_status
    FROM dayoffs d
    JOIN approval_requests ar
      ON ar.related_table = 'dayoffs'
     AND ar.related_id = d.id
    WHERE d.request_id = p_request_id
    ORDER BY d.leave_date;
    RETURN;
  END IF;

  FOR v_requested_date IN
    SELECT DISTINCT requested_date
    FROM unnest(p_dates) requested_date
    ORDER BY requested_date
  LOOP
    INSERT INTO dayoffs (
      request_id,
      author_id,
      target_id,
      leave_date,
      leave_type_id,
      late_hour,
      late_minute,
      cc_member_ids,
      reason,
      approver_id,
      approved_at,
      approval_status
    ) VALUES (
      p_request_id,
      p_author_id,
      p_target_id,
      v_requested_date,
      p_leave_type_id,
      CASE WHEN p_leave_type_id = 1 THEN nullif(p_late_hour, '') ELSE NULL END,
      CASE WHEN p_leave_type_id = 1 THEN nullif(p_late_minute, '') ELSE NULL END,
      coalesce(p_cc_member_ids, '{}'),
      nullif(btrim(p_reason), ''),
      CASE WHEN p_initial_status = 'approved' THEN p_approver_id ELSE NULL END,
      CASE WHEN p_initial_status = 'approved' THEN now() ELSE NULL END,
      p_initial_status
    )
    RETURNING id, dayoffs.leave_date, dayoffs.approval_status
    INTO dayoff_id, leave_date, approval_status;

    INSERT INTO approval_requests (
      type,
      requester_id,
      approver_id,
      status,
      cc_member_ids,
      related_table,
      related_id,
      resolved_at,
      resolved_by
    ) VALUES (
      'leave',
      p_target_id,
      p_approver_id,
      p_initial_status,
      coalesce(p_cc_member_ids, '{}'),
      'dayoffs',
      dayoff_id,
      CASE WHEN p_initial_status = 'approved' THEN now() ELSE NULL END,
      CASE WHEN p_initial_status = 'approved' THEN p_author_id ELSE NULL END
    )
    RETURNING id INTO approval_id;

    RETURN NEXT;
  END LOOP;
END;
$create_leave_request$;
