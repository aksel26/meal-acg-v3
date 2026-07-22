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
  v_status text;
  v_now timestamptz := now();
BEGIN
  IF p_action NOT IN ('approve', 'reject', 'cancel') THEN
    RAISE EXCEPTION 'LEAVE_APPROVAL_INVALID_ACTION' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_approval
  FROM approval_requests
  WHERE id = p_approval_id
    AND related_table = 'dayoffs'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAVE_APPROVAL_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF p_require_assigned_approver AND v_approval.approver_id <> p_actor_id THEN
    RAISE EXCEPTION 'LEAVE_APPROVAL_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_dayoff
  FROM dayoffs
  WHERE id = v_approval.related_id
  FOR UPDATE;

  IF NOT FOUND OR v_dayoff.is_deleted THEN
    RAISE EXCEPTION 'LEAVE_DAYOFF_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF p_action = 'cancel' THEN
    IF v_approval.status NOT IN ('approved', 'rejected') THEN
      RAISE EXCEPTION 'LEAVE_APPROVAL_NOT_RESOLVED' USING ERRCODE = '22023';
    END IF;
    v_status := 'pending';
  ELSE
    IF v_approval.status <> 'pending' THEN
      RAISE EXCEPTION 'LEAVE_APPROVAL_ALREADY_RESOLVED' USING ERRCODE = '22023';
    END IF;
    v_status := CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END;
  END IF;

  UPDATE dayoffs
  SET approval_status = v_status,
      approver_id = CASE WHEN v_status = 'approved' THEN p_actor_id ELSE NULL END,
      approved_at = CASE WHEN v_status = 'approved' THEN v_now ELSE NULL END
  WHERE id = v_dayoff.id;

  UPDATE approval_requests
  SET status = v_status,
      reject_reason = CASE
        WHEN v_status = 'rejected' THEN nullif(btrim(p_reject_reason), '')
        ELSE NULL
      END,
      resolved_at = CASE WHEN v_status = 'pending' THEN NULL ELSE v_now END,
      resolved_by = CASE WHEN v_status = 'pending' THEN NULL ELSE p_actor_id END
  WHERE id = v_approval.id
  RETURNING * INTO v_approval;

  RETURN NEXT v_approval;
END;
$$;
