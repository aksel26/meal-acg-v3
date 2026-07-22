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
  IF NOT p_is_admin AND v_dayoff.approval_status = 'approved'
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
        WHEN approval_status = 'approved' THEN v_approver_id
        ELSE NULL
      END,
      approved_at = CASE WHEN approval_status = 'approved' AND v_approver_id IS NOT NULL
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
