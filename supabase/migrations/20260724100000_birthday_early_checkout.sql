-- 생일 당일에는 오후 반반차와 동일하게 정상 퇴근 기준을 2시간 앞당긴다.
CREATE OR REPLACE FUNCTION record_attendance_check_out(
  p_member_id uuid,
  p_early_leave_reason text DEFAULT NULL
)
RETURNS SETOF attendance_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_record attendance_records%ROWTYPE;
  v_is_birthday boolean;
  v_is_early_leave boolean;
  v_reason text := nullif(btrim(p_early_leave_reason), '');
  v_overtime_minutes integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_member_id::text, 0));

  SELECT *
  INTO v_record
  FROM attendance_records
  WHERE member_id = p_member_id
    AND check_in_at IS NOT NULL
    AND check_out_at IS NULL
    AND check_in_at <= v_now
    AND check_in_at >= v_now - interval '18 hours'
  ORDER BY check_in_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTENDANCE_OPEN_RECORD_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM members
    WHERE id = p_member_id
      AND birth_date IS NOT NULL
      AND extract(month FROM birth_date) = extract(month FROM v_record.date)
      AND extract(day FROM birth_date) = extract(day FROM v_record.date)
  )
  INTO v_is_birthday;

  v_is_early_leave := v_now < v_record.check_in_at
    + CASE
        WHEN v_is_birthday THEN interval '7 hours'
        ELSE interval '9 hours'
      END;

  IF v_is_early_leave AND v_reason IS NULL THEN
    RAISE EXCEPTION 'ATTENDANCE_EARLY_LEAVE_REASON_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  v_overtime_minutes := greatest(
    0,
    floor(
      extract(epoch FROM (v_now - (v_record.check_in_at + interval '11 hours'))) / 60
    )::integer
  );

  UPDATE attendance_records
  SET check_out_at = v_now,
      check_out_status = CASE WHEN v_is_early_leave THEN 'early_leave' ELSE 'normal' END,
      status = CASE
        WHEN v_is_early_leave THEN 'early_leave'
        ELSE coalesce(check_in_status, status, 'normal')
      END,
      overtime_minutes = v_overtime_minutes,
      approved_at = CASE WHEN v_is_early_leave THEN NULL ELSE v_now END
  WHERE id = v_record.id
    AND check_out_at IS NULL
  RETURNING * INTO v_record;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTENDANCE_ALREADY_CHECKED_OUT' USING ERRCODE = 'P0001';
  END IF;

  IF v_is_early_leave THEN
    INSERT INTO early_leave_requests (
      attendance_record_id,
      requester_id,
      reason,
      approval_status
    )
    VALUES (
      v_record.id,
      p_member_id,
      v_reason,
      'pending'
    );
  END IF;

  RETURN NEXT v_record;
END;
$$;

REVOKE ALL ON FUNCTION record_attendance_check_out(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_attendance_check_out(uuid, text) TO service_role;

COMMENT ON FUNCTION record_attendance_check_out(uuid, text) IS
  '생일 당일 정상 퇴근 기준을 7시간, 그 외에는 9시간으로 적용하고 조기퇴근 요청을 원자적으로 처리한다.';

NOTIFY pgrst, 'reload schema';
