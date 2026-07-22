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
  v_request_fingerprint text;
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

  SELECT md5(concat_ws('|',
    p_author_id::text,
    p_target_id::text,
    p_approver_id::text,
    (
      SELECT string_agg(requested_date::text, ',' ORDER BY requested_date)
      FROM (SELECT DISTINCT unnest(p_dates) AS requested_date) dates
    ),
    p_leave_type_id::text,
    CASE WHEN p_leave_type_id = 1 THEN coalesce(nullif(p_late_hour, ''), '') ELSE '' END,
    CASE WHEN p_leave_type_id = 1 THEN coalesce(nullif(p_late_minute, ''), '') ELSE '' END,
    coalesce((
      SELECT string_agg(member_id::text, ',' ORDER BY member_id)
      FROM (SELECT DISTINCT unnest(coalesce(p_cc_member_ids, '{}')) AS member_id) cc_members
    ), ''),
    coalesce(nullif(btrim(p_reason), ''), ''),
    p_initial_status
  )) INTO v_request_fingerprint;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));

  IF EXISTS (SELECT 1 FROM dayoffs WHERE request_id = p_request_id) THEN
    IF EXISTS (
      SELECT 1
      FROM dayoffs
      WHERE request_id = p_request_id
        AND request_fingerprint IS DISTINCT FROM v_request_fingerprint
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
      request_fingerprint,
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
      v_request_fingerprint,
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
