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
  v_approval approval_requests%ROWTYPE;
  v_result dayoffs%ROWTYPE;
  v_leave_date date;
  v_leave_type_id integer;
  v_approver_id uuid;
  v_cc_member_ids uuid[];
  v_edit_reason text;
  v_old_category text;
  v_new_category text;
  v_reassign boolean;
  v_old_deducts_annual boolean;
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

  SELECT * INTO v_approval FROM approval_requests
  WHERE related_table = 'dayoffs' AND related_id = p_dayoff_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAVE_APPROVAL_NOT_FOUND' USING ERRCODE = 'P0002';
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
    THEN nullif(p_changes->>'approverId', '')::uuid ELSE v_approval.approver_id END;
  IF v_approver_id IS NULL THEN
    RAISE EXCEPTION 'LEAVE_INVALID_APPROVER' USING ERRCODE = '22023';
  END IF;
  v_reassign := p_changes ? 'approverId'
    AND v_approver_id IS DISTINCT FROM v_approval.approver_id;
  v_cc_member_ids := CASE WHEN p_changes ? 'ccMemberIds' THEN ARRAY(
    SELECT jsonb_array_elements_text(p_changes->'ccMemberIds')::uuid
  ) ELSE v_dayoff.cc_member_ids END;

  SELECT category INTO v_new_category FROM leave_types WHERE id = v_leave_type_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAVE_REQUEST_INVALID_TYPE' USING ERRCODE = '22023';
  END IF;
  SELECT category INTO v_old_category FROM leave_types WHERE id = v_dayoff.leave_type_id;
  SELECT deducts_annual INTO v_old_deducts_annual
  FROM leave_types
  WHERE id = v_dayoff.leave_type_id;

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

  IF v_reassign
     AND v_dayoff.approval_status IN ('pre_approved', 'approved')
     AND v_old_deducts_annual
     AND NOT EXISTS (
       SELECT 1 FROM leave_balances
       WHERE member_id = v_dayoff.target_id
         AND year = extract(year FROM v_dayoff.leave_date)::integer
         AND type IN ('annual', 'monthly')
     ) THEN
    INSERT INTO leave_balances(member_id, year, type, granted, used, note)
    SELECT
      v_dayoff.target_id,
      extract(year FROM v_dayoff.leave_date)::integer,
      'annual',
      0,
      coalesce(sum(lt.deduction_amount), 0),
      '기존 승인 휴가 잔액 자동 복구'
    FROM dayoffs d
    JOIN leave_types lt ON lt.id = d.leave_type_id
    WHERE d.target_id = v_dayoff.target_id
      AND extract(year FROM d.leave_date) = extract(year FROM v_dayoff.leave_date)
      AND d.is_deleted = false
      AND d.approval_status IN ('pre_approved', 'approved')
      AND lt.deducts_annual = true
    ON CONFLICT (member_id, year, type) DO NOTHING;
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
      approval_status = CASE WHEN v_reassign THEN 'pending' ELSE approval_status END,
      first_approver_id = CASE WHEN v_reassign THEN NULL ELSE first_approver_id END,
      first_approved_at = CASE WHEN v_reassign THEN NULL ELSE first_approved_at END,
      final_approver_id = CASE WHEN v_reassign THEN NULL ELSE final_approver_id END,
      final_approved_at = CASE WHEN v_reassign THEN NULL ELSE final_approved_at END,
      approver_id = CASE WHEN v_reassign THEN NULL ELSE approver_id END,
      approved_at = CASE WHEN v_reassign THEN NULL ELSE approved_at END,
      cc_member_ids = v_cc_member_ids,
      reason = CASE WHEN p_changes ? 'reason' THEN nullif(btrim(p_changes->>'reason'), '') ELSE reason END,
      edit_reason = CASE WHEN p_changes ? 'editReason' THEN v_edit_reason ELSE edit_reason END,
      last_editor_id = p_editor_id
  WHERE id = p_dayoff_id RETURNING * INTO v_result;

  UPDATE approval_requests
  SET approver_id = v_approver_id,
      cc_member_ids = v_cc_member_ids,
      status = CASE WHEN v_reassign THEN 'pending' ELSE status END,
      reject_reason = CASE WHEN v_reassign THEN NULL ELSE reject_reason END,
      requested_at = CASE WHEN v_reassign THEN now() ELSE requested_at END,
      resolved_at = CASE WHEN v_reassign THEN NULL ELSE resolved_at END,
      resolved_by = CASE WHEN v_reassign THEN NULL ELSE resolved_by END
  WHERE id = v_approval.id;

  RETURN NEXT v_result;
END;
$$;
