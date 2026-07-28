\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_member_id uuid;
  v_old_approver_id uuid;
  v_new_approver_id uuid;
  v_dayoff_id uuid;
  v_approval_id uuid;
  v_used numeric;
BEGIN
  INSERT INTO members (login_id, password, full_name)
  SELECT 'leave-reassignment-test-' || gen_random_uuid(), 'test-only', 'Leave Reassignment Test'
  FROM generate_series(1, greatest(0, 3 - (SELECT count(*) FROM members)));

  SELECT id INTO v_member_id FROM members ORDER BY id LIMIT 1;
  SELECT id INTO v_old_approver_id
  FROM members WHERE id <> v_member_id ORDER BY id LIMIT 1;
  SELECT id INTO v_new_approver_id
  FROM members
  WHERE id NOT IN (v_member_id, v_old_approver_id)
  ORDER BY id
  LIMIT 1;

  IF v_new_approver_id IS NULL THEN
    RAISE EXCEPTION 'approver reassignment test requires three seeded members';
  END IF;

  DELETE FROM approval_requests
  WHERE related_table = 'dayoffs'
    AND related_id IN (
      SELECT id FROM dayoffs
      WHERE target_id = v_member_id AND leave_date = date '2099-04-06'
    );
  DELETE FROM dayoffs
  WHERE target_id = v_member_id AND leave_date = date '2099-04-06';

  INSERT INTO leave_balances(member_id, year, type, granted, used)
  VALUES (v_member_id, 2099, 'annual', 20, 0)
  ON CONFLICT (member_id, year, type)
  DO UPDATE SET granted = 20, used = 0;

  SELECT dayoff_id, approval_id INTO v_dayoff_id, v_approval_id
  FROM create_leave_request_atomic(
    gen_random_uuid(), v_member_id, v_member_id, v_old_approver_id,
    ARRAY[date '2099-04-06'], 5, NULL, NULL, '{}', '승인자 변경 테스트', 'pending'
  );
  PERFORM resolve_leave_approval_atomic(
    v_approval_id, v_old_approver_id, 'pre_approve', true, NULL
  );
  PERFORM resolve_leave_approval_atomic(
    v_approval_id, v_new_approver_id, 'approve', true, NULL
  );

  DELETE FROM leave_balances
  WHERE member_id = v_member_id AND year = 2099 AND type = 'annual';

  PERFORM update_dayoff_atomic(
    v_dayoff_id,
    v_member_id,
    false,
    jsonb_build_object(
      'approverId', v_new_approver_id,
      'editReason', '승인자 변경'
    )
  );

  IF (SELECT approval_status FROM dayoffs WHERE id = v_dayoff_id) <> 'pending'
    OR (SELECT status FROM approval_requests WHERE id = v_approval_id) <> 'pending'
    OR (SELECT approver_id FROM approval_requests WHERE id = v_approval_id) <> v_new_approver_id
    OR (SELECT approver_id FROM dayoffs WHERE id = v_dayoff_id) IS NOT NULL
    OR (SELECT first_approver_id FROM dayoffs WHERE id = v_dayoff_id) IS NOT NULL
    OR (SELECT final_approver_id FROM dayoffs WHERE id = v_dayoff_id) IS NOT NULL
    OR (SELECT resolved_at FROM approval_requests WHERE id = v_approval_id) IS NOT NULL
    OR (SELECT resolved_by FROM approval_requests WHERE id = v_approval_id) IS NOT NULL THEN
    RAISE EXCEPTION 'approved leave reassignment did not restart approval';
  END IF;

  IF EXISTS (
    SELECT 1 FROM approval_requests
    WHERE id = v_approval_id
      AND approver_id = v_old_approver_id
      AND status = 'pending'
  ) OR NOT EXISTS (
    SELECT 1 FROM approval_requests
    WHERE id = v_approval_id
      AND approver_id = v_new_approver_id
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'approval request was not moved to the new approver queue';
  END IF;

  SELECT used INTO v_used FROM leave_balances
  WHERE member_id = v_member_id AND year = 2099 AND type = 'annual';
  IF v_used IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'reassignment did not repair and restore leave balance: %', v_used;
  END IF;
END;
$$;

ROLLBACK;
