-- 출퇴근 최초 시각과 조기퇴근 승인 요청을 DB 트랜잭션으로 보장한다.

ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS check_in_status text,
  ADD COLUMN IF NOT EXISTS check_out_status text;

UPDATE attendance_records
SET check_in_status = CASE
  WHEN check_in_at IS NULL THEN NULL
  WHEN (check_in_at AT TIME ZONE 'Asia/Seoul')::time < time '08:00:00'
    THEN 'early_check_in'
  WHEN (check_in_at AT TIME ZONE 'Asia/Seoul')::time <= time '10:00:00'
    THEN 'normal'
  ELSE 'late'
END
WHERE check_in_at IS NOT NULL
  AND check_in_status IS NULL;

UPDATE attendance_records
SET check_out_status = CASE
  WHEN check_out_at IS NULL THEN NULL
  WHEN status = 'early_leave' THEN 'early_leave'
  ELSE 'normal'
END
WHERE check_out_at IS NOT NULL
  AND check_out_status IS NULL;

ALTER TABLE attendance_records
  DROP CONSTRAINT IF EXISTS attendance_records_check_in_status_check,
  DROP CONSTRAINT IF EXISTS attendance_records_check_out_status_check,
  DROP CONSTRAINT IF EXISTS attendance_records_check_in_state_check,
  DROP CONSTRAINT IF EXISTS attendance_records_check_out_state_check,
  DROP CONSTRAINT IF EXISTS attendance_records_timestamp_order_check,
  DROP CONSTRAINT IF EXISTS attendance_records_date_matches_check_in_check,
  DROP CONSTRAINT IF EXISTS attendance_records_overtime_nonnegative_check;

ALTER TABLE attendance_records
  ADD CONSTRAINT attendance_records_check_in_status_check
    CHECK (check_in_status IN ('early_check_in', 'normal', 'late')),
  ADD CONSTRAINT attendance_records_check_out_status_check
    CHECK (check_out_status IN ('normal', 'early_leave')),
  ADD CONSTRAINT attendance_records_check_in_state_check
    CHECK (
      (check_in_at IS NULL AND check_in_status IS NULL)
      OR (check_in_at IS NOT NULL AND check_in_status IS NOT NULL)
    ),
  ADD CONSTRAINT attendance_records_check_out_state_check
    CHECK (
      (check_out_at IS NULL AND check_out_status IS NULL)
      OR (check_out_at IS NOT NULL AND check_out_status IS NOT NULL)
    ),
  ADD CONSTRAINT attendance_records_timestamp_order_check
    CHECK (check_out_at IS NULL OR check_out_at >= check_in_at),
  ADD CONSTRAINT attendance_records_date_matches_check_in_check
    CHECK (
      check_in_at IS NULL
      OR date = (check_in_at AT TIME ZONE 'Asia/Seoul')::date
    ),
  ADD CONSTRAINT attendance_records_overtime_nonnegative_check
    CHECK (overtime_minutes >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS idx_early_leave_request_attendance_record
  ON early_leave_requests(attendance_record_id);

CREATE OR REPLACE FUNCTION record_attendance_check_in(p_member_id uuid)
RETURNS SETOF attendance_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_date date := (v_now AT TIME ZONE 'Asia/Seoul')::date;
  v_local_time time := (v_now AT TIME ZONE 'Asia/Seoul')::time;
  v_status text;
  v_record attendance_records%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_member_id::text, 0));

  IF EXISTS (
    SELECT 1
    FROM attendance_records
    WHERE member_id = p_member_id
      AND check_in_at IS NOT NULL
      AND check_out_at IS NULL
      AND check_in_at <= v_now
      AND check_in_at >= v_now - interval '18 hours'
  ) THEN
    RAISE EXCEPTION 'ATTENDANCE_OPEN_RECORD_EXISTS' USING ERRCODE = 'P0001';
  END IF;

  v_status := CASE
    WHEN v_local_time < time '08:00:00' THEN 'early_check_in'
    WHEN v_local_time <= time '10:00:00' THEN 'normal'
    ELSE 'late'
  END;

  INSERT INTO attendance_records (
    member_id,
    date,
    check_in_at,
    check_in_status,
    status,
    is_weekend
  )
  VALUES (
    p_member_id,
    v_date,
    v_now,
    v_status,
    v_status,
    extract(isodow FROM v_date) IN (6, 7)
  )
  ON CONFLICT (member_id, date) DO UPDATE
  SET check_in_at = EXCLUDED.check_in_at,
      check_in_status = EXCLUDED.check_in_status,
      status = EXCLUDED.status,
      is_weekend = EXCLUDED.is_weekend
  WHERE attendance_records.check_in_at IS NULL
  RETURNING * INTO v_record;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ATTENDANCE_ALREADY_CHECKED_IN' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEXT v_record;
END;
$$;

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

  v_is_early_leave := v_now < v_record.check_in_at + interval '9 hours';

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

REVOKE ALL ON FUNCTION record_attendance_check_in(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION record_attendance_check_out(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_attendance_check_in(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION record_attendance_check_out(uuid, text) TO service_role;

COMMENT ON COLUMN attendance_records.check_in_status IS '출근 상태: early_check_in, normal, late';
COMMENT ON COLUMN attendance_records.check_out_status IS '퇴근 상태: normal, early_leave';
COMMENT ON FUNCTION record_attendance_check_in(uuid) IS '18시간 내 미퇴근과 중복 출근을 원자적으로 차단하고 최초 출근을 기록한다.';
COMMENT ON FUNCTION record_attendance_check_out(uuid, text) IS '18시간 내 최근 미퇴근 기록과 조기퇴근 승인 요청을 한 트랜잭션으로 처리한다.';

NOTIFY pgrst, 'reload schema';
