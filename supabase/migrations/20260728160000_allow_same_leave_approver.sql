-- 동일한 관리자가 휴가를 가승인한 뒤 최종승인할 수 있도록 허용한다.
-- 기존 상태 전이, 행 잠금, 원자 갱신과 권한 검사는 그대로 유지한다.

CREATE OR REPLACE FUNCTION resolve_leave_approval_atomic(
  p_approval_id uuid,
  p_actor_id uuid,
  p_action text,
  p_require_assigned_approver boolean DEFAULT true,
  p_reject_reason text DEFAULT NULL
)
RETURNS SETOF approval_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_approval approval_requests%ROWTYPE;
  v_dayoff dayoffs%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  IF p_action NOT IN ('pre_approve', 'approve', 'reject', 'revert', 'cancel') THEN
    RAISE EXCEPTION 'LEAVE_INVALID_ACTION' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_approval
  FROM approval_requests
  WHERE id = p_approval_id
    AND related_table = 'dayoffs'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAVE_APPROVAL_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF p_require_assigned_approver AND p_action = 'pre_approve'
     AND v_approval.approver_id <> p_actor_id THEN
    RAISE EXCEPTION 'LEAVE_APPROVAL_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_dayoff
  FROM dayoffs
  WHERE id = v_approval.related_id
  FOR UPDATE;

  IF NOT FOUND OR v_dayoff.is_deleted THEN
    RAISE EXCEPTION 'LEAVE_DAYOFF_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF p_action = 'pre_approve' THEN
    IF v_dayoff.approval_status <> 'pending' THEN
      RAISE EXCEPTION 'LEAVE_INVALID_TRANSITION' USING ERRCODE = '22023';
    END IF;

    UPDATE dayoffs
    SET approval_status = 'pre_approved',
        first_approver_id = p_actor_id,
        first_approved_at = v_now
    WHERE id = v_dayoff.id;

    UPDATE approval_requests
    SET status = 'pre_approved'
    WHERE id = v_approval.id
    RETURNING * INTO v_approval;

  ELSIF p_action = 'approve' THEN
    IF v_dayoff.approval_status <> 'pre_approved' THEN
      RAISE EXCEPTION 'LEAVE_INVALID_TRANSITION' USING ERRCODE = '22023';
    END IF;

    UPDATE dayoffs
    SET approval_status = 'approved',
        final_approver_id = p_actor_id,
        final_approved_at = v_now,
        approver_id = p_actor_id,
        approved_at = v_now
    WHERE id = v_dayoff.id;

    UPDATE approval_requests
    SET status = 'approved',
        resolved_at = v_now,
        resolved_by = p_actor_id
    WHERE id = v_approval.id
    RETURNING * INTO v_approval;

  ELSIF p_action = 'reject' THEN
    IF v_dayoff.approval_status NOT IN ('pending', 'pre_approved') THEN
      RAISE EXCEPTION 'LEAVE_INVALID_TRANSITION' USING ERRCODE = '22023';
    END IF;

    UPDATE dayoffs
    SET approval_status = 'rejected'
    WHERE id = v_dayoff.id;

    UPDATE approval_requests
    SET status = 'rejected',
        reject_reason = nullif(btrim(p_reject_reason), ''),
        resolved_at = v_now,
        resolved_by = p_actor_id
    WHERE id = v_approval.id
    RETURNING * INTO v_approval;

  ELSIF p_action = 'revert' THEN
    IF v_dayoff.approval_status <> 'pre_approved' THEN
      RAISE EXCEPTION 'LEAVE_INVALID_TRANSITION' USING ERRCODE = '22023';
    END IF;

    UPDATE dayoffs
    SET approval_status = 'pending',
        first_approver_id = NULL,
        first_approved_at = NULL
    WHERE id = v_dayoff.id;

    UPDATE approval_requests
    SET status = 'pending',
        resolved_at = NULL,
        resolved_by = NULL
    WHERE id = v_approval.id
    RETURNING * INTO v_approval;

  ELSIF p_action = 'cancel' THEN
    IF v_dayoff.approval_status NOT IN ('approved', 'rejected') THEN
      RAISE EXCEPTION 'LEAVE_APPROVAL_NOT_RESOLVED' USING ERRCODE = '22023';
    END IF;

    UPDATE dayoffs
    SET approval_status = 'pending',
        first_approver_id = NULL,
        first_approved_at = NULL,
        final_approver_id = NULL,
        final_approved_at = NULL,
        approver_id = NULL,
        approved_at = NULL
    WHERE id = v_dayoff.id;

    UPDATE approval_requests
    SET status = 'pending',
        reject_reason = NULL,
        resolved_at = NULL,
        resolved_by = NULL
    WHERE id = v_approval.id
    RETURNING * INTO v_approval;
  END IF;

  RETURN NEXT v_approval;
END;
$$;
