\set ON_ERROR_STOP on

BEGIN;

DO $$
BEGIN
  IF has_table_privilege('anon', 'dayoffs', 'SELECT,INSERT,UPDATE,DELETE')
    OR has_table_privilege('authenticated', 'dayoffs', 'SELECT,INSERT,UPDATE,DELETE')
    OR has_table_privilege('anon', 'approval_requests', 'SELECT,INSERT,UPDATE,DELETE')
    OR has_table_privilege('authenticated', 'approval_requests', 'SELECT,INSERT,UPDATE,DELETE')
    OR has_table_privilege('anon', 'leave_balances', 'SELECT,INSERT,UPDATE,DELETE')
    OR has_table_privilege('authenticated', 'leave_balances', 'SELECT,INSERT,UPDATE,DELETE') THEN
    RAISE EXCEPTION 'leave workflow tables are directly accessible without service_role';
  END IF;

  IF has_function_privilege(
    'anon', 'apply_leave_balance_delta(uuid,date,integer,numeric)', 'EXECUTE'
  ) OR has_function_privilege(
    'authenticated', 'apply_leave_balance_delta(uuid,date,integer,numeric)', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'leave balance helper is callable without service_role';
  END IF;

  IF has_function_privilege('anon', 'create_leave_request_atomic(uuid,uuid,uuid,uuid,date[],integer,text,text,uuid[],text,text)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'create_leave_request_atomic(uuid,uuid,uuid,uuid,date[],integer,text,text,uuid[],text,text)', 'EXECUTE')
    OR has_function_privilege('anon', 'resolve_leave_approval_atomic(uuid,uuid,text,boolean,text)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'resolve_leave_approval_atomic(uuid,uuid,text,boolean,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'leave workflow functions are callable without service_role';
  END IF;

  IF NOT has_function_privilege('service_role', 'create_leave_request_atomic(uuid,uuid,uuid,uuid,date[],integer,text,text,uuid[],text,text)', 'EXECUTE')
    OR NOT has_function_privilege('service_role', 'resolve_leave_approval_atomic(uuid,uuid,text,boolean,text)', 'EXECUTE')
    OR NOT has_function_privilege('service_role', 'update_dayoff_atomic(uuid,uuid,boolean,jsonb)', 'EXECUTE')
    OR NOT has_function_privilege('service_role', 'delete_dayoff_atomic(uuid,uuid,boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role cannot execute leave workflow functions';
  END IF;

  IF position(
    'pg_advisory_xact_lock' IN pg_get_functiondef('prevent_duplicate_active_dayoff()'::regprocedure)
  ) = 0 THEN
    RAISE EXCEPTION 'duplicate-date trigger does not serialize concurrent requests';
  END IF;
END;
$$;

DO $$
DECLARE
  v_member_id uuid;
  v_approver_id uuid;
  v_request_id uuid := gen_random_uuid();
  v_dayoff_id uuid;
  v_approval_id uuid;
  v_used numeric;
  v_count integer;
  v_expected_error boolean;
  v_atomic_request_id uuid := gen_random_uuid();
  v_missing_balance_dayoff_id uuid;
  v_missing_balance_approval_id uuid;
  v_weekend_date date;
BEGIN
  SELECT id INTO v_member_id FROM members ORDER BY id LIMIT 1;
  SELECT id INTO v_approver_id
  FROM members
  WHERE id <> v_member_id
  ORDER BY id
  LIMIT 1;
  IF v_member_id IS NULL OR v_approver_id IS NULL THEN
    RAISE EXCEPTION 'leave workflow test requires two seeded members';
  END IF;

  DELETE FROM approval_requests
  WHERE related_table = 'dayoffs'
    AND related_id IN (
      SELECT id FROM dayoffs
      WHERE target_id = v_member_id
        AND leave_date BETWEEN date '2099-01-01' AND date '2099-01-31'
    );
  DELETE FROM dayoffs
  WHERE target_id = v_member_id
    AND leave_date BETWEEN date '2099-01-01' AND date '2099-01-31';

  INSERT INTO leave_balances(member_id, year, type, granted, used)
  VALUES (v_member_id, 2099, 'annual', 20, 0)
  ON CONFLICT (member_id, year, type)
  DO UPDATE SET granted = 20, used = 0;

  SELECT dayoff_id, approval_id
  INTO v_dayoff_id, v_approval_id
  FROM create_leave_request_atomic(
    v_request_id, v_member_id, v_member_id, v_approver_id,
    ARRAY[date '2099-01-05'], 5, NULL, NULL, '{}', '회귀 테스트', 'pending'
  );

  SELECT used INTO v_used FROM leave_balances
  WHERE member_id = v_member_id AND year = 2099 AND type = 'annual';
  IF v_used <> 0 THEN
    RAISE EXCEPTION 'pending leave changed used balance: %', v_used;
  END IF;

  SELECT count(*) INTO v_count
  FROM create_leave_request_atomic(
    v_request_id, v_member_id, v_member_id, v_approver_id,
    ARRAY[date '2099-01-05'], 5, NULL, NULL, '{}', '회귀 테스트', 'pending'
  );
  IF v_count <> 1 OR (SELECT count(*) FROM dayoffs WHERE request_id = v_request_id) <> 1 THEN
    RAISE EXCEPTION 'idempotent create produced duplicate rows';
  END IF;

  v_expected_error := false;
  BEGIN
    PERFORM create_leave_request_atomic(
      v_request_id, v_member_id, v_member_id, v_approver_id,
      ARRAY[date '2099-01-05'], 3, NULL, NULL, '{}', '회귀 테스트', 'pending'
    );
  EXCEPTION WHEN unique_violation THEN
    v_expected_error := SQLERRM = 'LEAVE_REQUEST_IDEMPOTENCY_CONFLICT';
  END;
  IF NOT v_expected_error THEN
    RAISE EXCEPTION 'changed payload reused an idempotency request id';
  END IF;

  v_expected_error := false;
  BEGIN
    PERFORM resolve_leave_approval_atomic(v_approval_id, v_member_id, 'approve', true, NULL);
  EXCEPTION WHEN insufficient_privilege THEN
    v_expected_error := SQLERRM = 'LEAVE_APPROVAL_FORBIDDEN';
  END;
  IF NOT v_expected_error THEN
    RAISE EXCEPTION 'non-assigned approver was not rejected';
  END IF;

  PERFORM resolve_leave_approval_atomic(v_approval_id, v_approver_id, 'approve', true, NULL);
  IF (SELECT approval_status FROM dayoffs WHERE id = v_dayoff_id) <> 'approved'
    OR (SELECT status FROM approval_requests WHERE id = v_approval_id) <> 'approved' THEN
    RAISE EXCEPTION 'approval states diverged';
  END IF;
  SELECT used INTO v_used FROM leave_balances
  WHERE member_id = v_member_id AND year = 2099 AND type = 'annual';
  IF v_used <> 1 THEN
    RAISE EXCEPTION 'approved leave did not deduct exactly once: %', v_used;
  END IF;

  v_expected_error := false;
  BEGIN
    PERFORM update_dayoff_atomic(
      v_dayoff_id, v_approver_id, true,
      jsonb_build_object('approverId', v_member_id)
    );
  EXCEPTION WHEN invalid_parameter_value THEN
    v_expected_error := SQLERRM = 'LEAVE_APPROVER_CHANGE_FORBIDDEN';
  END;
  IF NOT v_expected_error THEN
    RAISE EXCEPTION 'approved leave approver was changed';
  END IF;

  v_expected_error := false;
  BEGIN
    PERFORM resolve_leave_approval_atomic(v_approval_id, v_approver_id, 'approve', true, NULL);
  EXCEPTION WHEN invalid_parameter_value THEN
    v_expected_error := SQLERRM = 'LEAVE_APPROVAL_ALREADY_RESOLVED';
  END;
  IF NOT v_expected_error THEN
    RAISE EXCEPTION 'duplicate approval was not rejected';
  END IF;

  PERFORM resolve_leave_approval_atomic(v_approval_id, v_approver_id, 'cancel', true, NULL);
  SELECT used INTO v_used FROM leave_balances
  WHERE member_id = v_member_id AND year = 2099 AND type = 'annual';
  IF v_used <> 0 THEN
    RAISE EXCEPTION 'approval cancellation did not restore balance: %', v_used;
  END IF;

  PERFORM resolve_leave_approval_atomic(v_approval_id, v_approver_id, 'reject', true, '반려');
  IF (SELECT approval_status FROM dayoffs WHERE id = v_dayoff_id) <> 'rejected'
    OR (SELECT status FROM approval_requests WHERE id = v_approval_id) <> 'rejected' THEN
    RAISE EXCEPTION 'rejection states diverged';
  END IF;

  v_expected_error := false;
  BEGIN
    PERFORM update_dayoff_atomic(
      v_dayoff_id, v_approver_id, true,
      jsonb_build_object('approverId', v_member_id)
    );
  EXCEPTION WHEN invalid_parameter_value THEN
    v_expected_error := SQLERRM = 'LEAVE_APPROVER_CHANGE_FORBIDDEN';
  END;
  IF NOT v_expected_error THEN
    RAISE EXCEPTION 'rejected leave approver was changed';
  END IF;

  SELECT dayoff_id, approval_id INTO v_dayoff_id, v_approval_id
  FROM create_leave_request_atomic(
    gen_random_uuid(), v_member_id, v_member_id, v_approver_id,
    ARRAY[date '2099-01-06'], 5, NULL, NULL, '{}', NULL, 'pending'
  );
  v_expected_error := false;
  BEGIN
    PERFORM create_leave_request_atomic(
      gen_random_uuid(), v_member_id, v_member_id, v_approver_id,
      ARRAY[date '2099-01-06'], 3, NULL, NULL, '{}', NULL, 'pending'
    );
  EXCEPTION WHEN unique_violation THEN
    v_expected_error := SQLERRM = 'LEAVE_REQUEST_DUPLICATE_DATE';
  END;
  IF NOT v_expected_error THEN
    RAISE EXCEPTION 'duplicate active leave date was not rejected';
  END IF;

  SELECT candidate::date INTO v_weekend_date
  FROM generate_series(date '2099-01-08', date '2099-01-31', interval '1 day') candidate
  WHERE extract(isodow FROM candidate) IN (6, 7)
  LIMIT 1;

  v_expected_error := false;
  BEGIN
    PERFORM update_dayoff_atomic(
      v_dayoff_id, v_member_id, false,
      jsonb_build_object('leaveDate', v_weekend_date)
    );
  EXCEPTION WHEN invalid_parameter_value THEN
    v_expected_error := SQLERRM = 'LEAVE_REQUEST_INVALID_DATE';
  END;
  IF NOT v_expected_error THEN
    RAISE EXCEPTION 'non-admin moved leave to a weekend';
  END IF;

  v_expected_error := false;
  BEGIN
    PERFORM update_dayoff_atomic(
      v_dayoff_id, v_member_id, false,
      jsonb_build_object('leaveTypeId', 1)
    );
  EXCEPTION WHEN invalid_parameter_value THEN
    v_expected_error := SQLERRM = 'LEAVE_REQUEST_INVALID_TYPE';
  END;
  IF NOT v_expected_error THEN
    RAISE EXCEPTION 'non-admin changed official leave to attendance type';
  END IF;

  PERFORM resolve_leave_approval_atomic(v_approval_id, v_approver_id, 'approve', true, NULL);
  PERFORM update_dayoff_atomic(
    v_dayoff_id, v_member_id, false,
    jsonb_build_object('leaveTypeId', 3, 'editReason', '유형 정정')
  );
  SELECT used INTO v_used FROM leave_balances
  WHERE member_id = v_member_id AND year = 2099 AND type = 'annual';
  IF v_used <> 0.5 THEN
    RAISE EXCEPTION 'approved type edit did not recalculate balance: %', v_used;
  END IF;

  PERFORM delete_dayoff_atomic(v_dayoff_id, v_member_id, false);
  SELECT used INTO v_used FROM leave_balances
  WHERE member_id = v_member_id AND year = 2099 AND type = 'annual';
  IF v_used <> 0 OR (SELECT status FROM approval_requests WHERE id = v_approval_id) <> 'rejected' THEN
    RAISE EXCEPTION 'delete did not synchronize approval and balance';
  END IF;

  DELETE FROM leave_balances
  WHERE member_id = v_member_id AND year = 2098 AND type IN ('annual', 'monthly');
  SELECT dayoff_id, approval_id
  INTO v_missing_balance_dayoff_id, v_missing_balance_approval_id
  FROM create_leave_request_atomic(
    gen_random_uuid(), v_member_id, v_member_id, v_approver_id,
    ARRAY[date '2098-02-03'], 5, NULL, NULL, '{}', NULL, 'pending'
  );
  v_expected_error := false;
  BEGIN
    PERFORM resolve_leave_approval_atomic(
      v_missing_balance_approval_id, v_approver_id, 'approve', true, NULL
    );
  EXCEPTION WHEN raise_exception THEN
    v_expected_error := SQLERRM = 'LEAVE_BALANCE_NOT_FOUND';
  END;
  IF NOT v_expected_error
     OR (SELECT approval_status FROM dayoffs WHERE id = v_missing_balance_dayoff_id) <> 'pending'
     OR (SELECT status FROM approval_requests WHERE id = v_missing_balance_approval_id) <> 'pending' THEN
    RAISE EXCEPTION 'approval without a leave balance did not fail atomically';
  END IF;

  CREATE OR REPLACE FUNCTION pg_temp.fail_leave_approval_insert()
  RETURNS trigger LANGUAGE plpgsql AS $failure$
  BEGIN
    IF NEW.related_table = 'dayoffs' THEN
      RAISE EXCEPTION 'TEST_APPROVAL_INSERT_FAILURE';
    END IF;
    RETURN NEW;
  END;
  $failure$;
  CREATE TRIGGER test_fail_leave_approval_insert
    BEFORE INSERT ON approval_requests
    FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_leave_approval_insert();

  BEGIN
    PERFORM create_leave_request_atomic(
      v_atomic_request_id, v_member_id, v_member_id, v_approver_id,
      ARRAY[date '2099-01-07'], 5, NULL, NULL, '{}', NULL, 'pending'
    );
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'TEST_APPROVAL_INSERT_FAILURE' THEN RAISE; END IF;
  END;
  DROP TRIGGER test_fail_leave_approval_insert ON approval_requests;
  IF EXISTS (SELECT 1 FROM dayoffs WHERE request_id = v_atomic_request_id) THEN
    RAISE EXCEPTION 'failed approval insert left orphan dayoff';
  END IF;
END;
$$;

ROLLBACK;
