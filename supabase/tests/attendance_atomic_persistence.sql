\set ON_ERROR_STOP on

BEGIN;

DO $$
BEGIN
  IF has_function_privilege('anon', 'record_attendance_check_in(uuid)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'record_attendance_check_in(uuid)', 'EXECUTE')
    OR has_function_privilege('anon', 'record_attendance_check_out(uuid,text)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'record_attendance_check_out(uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'attendance persistence functions are callable without service_role';
  END IF;

  IF NOT has_function_privilege('service_role', 'record_attendance_check_in(uuid)', 'EXECUTE')
    OR NOT has_function_privilege('service_role', 'record_attendance_check_out(uuid,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role cannot execute attendance persistence functions';
  END IF;
END;
$$;

DO $$
DECLARE
  v_member_id uuid;
  v_first attendance_records%ROWTYPE;
  v_checked_out attendance_records%ROWTYPE;
  v_first_check_in_at timestamptz;
  v_first_check_out_at timestamptz;
  v_expected_error boolean;
  v_request_count integer;
  v_stale_check_in timestamptz;
  v_today date := (clock_timestamp() AT TIME ZONE 'Asia/Seoul')::date;
BEGIN
  SELECT id INTO v_member_id FROM members ORDER BY id LIMIT 1;
  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'attendance test requires one seeded member';
  END IF;

  UPDATE members
  SET birth_date = (v_today - interval '1 day')::date
  WHERE id = v_member_id;

  DELETE FROM attendance_records
  WHERE member_id = v_member_id
    AND (
      date = (clock_timestamp() AT TIME ZONE 'Asia/Seoul')::date
      OR (
        check_out_at IS NULL
        AND check_in_at > clock_timestamp() - interval '18 hours'
      )
    );

  SELECT * INTO v_first FROM record_attendance_check_in(v_member_id);
  v_first_check_in_at := v_first.check_in_at;

  v_expected_error := false;
  BEGIN
    PERFORM record_attendance_check_in(v_member_id);
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'ATTENDANCE_OPEN_RECORD_EXISTS' THEN
      v_expected_error := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT v_expected_error THEN
    RAISE EXCEPTION 'duplicate check-in was not rejected';
  END IF;

  IF (SELECT check_in_at FROM attendance_records WHERE id = v_first.id)
    IS DISTINCT FROM v_first_check_in_at THEN
    RAISE EXCEPTION 'duplicate check-in changed the first timestamp';
  END IF;

  v_expected_error := false;
  BEGIN
    PERFORM record_attendance_check_out(v_member_id, NULL);
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'ATTENDANCE_EARLY_LEAVE_REASON_REQUIRED' THEN
      v_expected_error := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT v_expected_error THEN
    RAISE EXCEPTION 'early checkout without a reason was not rejected';
  END IF;

  IF (SELECT check_out_at FROM attendance_records WHERE id = v_first.id) IS NOT NULL THEN
    RAISE EXCEPTION 'failed early-leave request still saved checkout';
  END IF;

  UPDATE attendance_records
  SET check_in_status = 'late', status = 'late'
  WHERE id = v_first.id;

  SELECT *
  INTO v_checked_out
  FROM record_attendance_check_out(v_member_id, '원자성 회귀 테스트');
  v_first_check_out_at := v_checked_out.check_out_at;

  IF v_checked_out.check_in_status <> 'late'
    OR v_checked_out.check_out_status <> 'early_leave' THEN
    RAISE EXCEPTION 'late and early-leave statuses were not both retained';
  END IF;

  SELECT count(*)
  INTO v_request_count
  FROM early_leave_requests
  WHERE attendance_record_id = v_checked_out.id;
  IF v_request_count <> 1 THEN
    RAISE EXCEPTION 'early checkout did not create exactly one approval request';
  END IF;

  v_expected_error := false;
  BEGIN
    PERFORM record_attendance_check_out(v_member_id, '중복 퇴근');
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'ATTENDANCE_OPEN_RECORD_NOT_FOUND' THEN
      v_expected_error := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT v_expected_error THEN
    RAISE EXCEPTION 'duplicate checkout was not rejected';
  END IF;

  IF (SELECT check_out_at FROM attendance_records WHERE id = v_checked_out.id)
    IS DISTINCT FROM v_first_check_out_at THEN
    RAISE EXCEPTION 'duplicate checkout changed the first timestamp';
  END IF;

  DELETE FROM attendance_records WHERE id = v_checked_out.id;
  v_stale_check_in := clock_timestamp() - interval '19 hours';
  INSERT INTO attendance_records (
    member_id,
    date,
    check_in_at,
    check_in_status,
    status
  )
  VALUES (
    v_member_id,
    (v_stale_check_in AT TIME ZONE 'Asia/Seoul')::date,
    v_stale_check_in,
    'late',
    'late'
  );

  v_expected_error := false;
  BEGIN
    PERFORM record_attendance_check_out(v_member_id, '18시간 초과');
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'ATTENDANCE_OPEN_RECORD_NOT_FOUND' THEN
      v_expected_error := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT v_expected_error THEN
    RAISE EXCEPTION 'checkout accepted an attendance record older than 18 hours';
  END IF;

  DELETE FROM attendance_records WHERE member_id = v_member_id;
  UPDATE members
  SET birth_date = to_date('2000-' || to_char(v_today, 'MM-DD'), 'YYYY-MM-DD')
  WHERE id = v_member_id;

  INSERT INTO attendance_records (
    member_id,
    date,
    check_in_at,
    check_in_status,
    status
  )
  VALUES (
    v_member_id,
    v_today,
    clock_timestamp() - interval '7 hours 1 minute',
    'normal',
    'normal'
  );

  SELECT *
  INTO v_checked_out
  FROM record_attendance_check_out(v_member_id, NULL);

  IF v_checked_out.check_out_status <> 'normal'
    OR v_checked_out.approved_at IS NULL THEN
    RAISE EXCEPTION 'birthday checkout after seven hours was not treated as normal';
  END IF;

  SELECT count(*)
  INTO v_request_count
  FROM early_leave_requests
  WHERE attendance_record_id = v_checked_out.id;
  IF v_request_count <> 0 THEN
    RAISE EXCEPTION 'birthday checkout created an early-leave request';
  END IF;
END;
$$;

ROLLBACK;
