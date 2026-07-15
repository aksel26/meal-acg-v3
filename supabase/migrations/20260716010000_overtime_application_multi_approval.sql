ALTER TABLE work_applications
  ADD COLUMN IF NOT EXISTS location text;

CREATE OR REPLACE FUNCTION create_work_application_with_approvals(
  p_requester_id uuid,
  p_application_type text,
  p_work_date date,
  p_start_time time,
  p_end_time time,
  p_project_name text,
  p_reason text,
  p_approver_ids uuid[],
  p_location text DEFAULT NULL,
  p_cc_member_ids uuid[] DEFAULT '{}'
)
RETURNS SETOF work_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_application work_applications%ROWTYPE;
  v_approver_ids uuid[];
BEGIN
  SELECT array_agg(approver_id ORDER BY first_position)
  INTO v_approver_ids
  FROM (
    SELECT approver_id, min(position) AS first_position
    FROM unnest(coalesce(p_approver_ids, '{}')) WITH ORDINALITY
      AS selected(approver_id, position)
    WHERE approver_id IS NOT NULL
    GROUP BY approver_id
  ) AS unique_approvers;

  IF coalesce(array_length(v_approver_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'WORK_APPLICATION_APPROVER_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  IF p_requester_id = ANY(v_approver_ids) THEN
    RAISE EXCEPTION 'WORK_APPLICATION_SELF_APPROVAL' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO work_applications (
    requester_id,
    application_type,
    work_date,
    start_time,
    end_time,
    project_name,
    location,
    reason,
    approver_id
  ) VALUES (
    p_requester_id,
    p_application_type,
    p_work_date,
    p_start_time,
    p_end_time,
    p_project_name,
    nullif(btrim(p_location), ''),
    p_reason,
    v_approver_ids[1]
  )
  RETURNING * INTO v_application;

  INSERT INTO approval_requests (
    type,
    requester_id,
    approver_id,
    cc_member_ids,
    status,
    related_table,
    related_id
  )
  SELECT
    'overtime',
    p_requester_id,
    approver_id,
    coalesce(p_cc_member_ids, '{}'),
    'pending',
    'work_applications',
    v_application.id
  FROM unnest(v_approver_ids) AS approver_id;

  RETURN NEXT v_application;
END;
$$;

DROP FUNCTION IF EXISTS resolve_work_application_approval(uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION resolve_work_application_approval(
  p_approval_id uuid,
  p_approver_id uuid,
  p_action text,
  p_reject_reason text DEFAULT NULL,
  p_resolved_by uuid DEFAULT NULL
)
RETURNS SETOF work_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_related_id uuid;
  v_approval approval_requests%ROWTYPE;
  v_application work_applications%ROWTYPE;
  v_now timestamptz := clock_timestamp();
  v_reason text := nullif(btrim(p_reject_reason), '');
  v_resolver_id uuid := coalesce(p_resolved_by, p_approver_id);
  v_status text;
  v_previous_approvals jsonb;
BEGIN
  IF p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'WORK_APPLICATION_INVALID_ACTION' USING ERRCODE = 'P0001';
  END IF;

  SELECT related_id
  INTO v_related_id
  FROM approval_requests
  WHERE id = p_approval_id
    AND approver_id = p_approver_id
    AND related_table = 'work_applications';

  IF v_related_id IS NULL THEN
    RAISE EXCEPTION 'WORK_APPLICATION_APPROVAL_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_related_id::text, 0));

  SELECT *
  INTO v_approval
  FROM approval_requests
  WHERE id = p_approval_id
    AND approver_id = p_approver_id
    AND related_table = 'work_applications'
    AND related_id = v_related_id
  FOR UPDATE;

  IF NOT FOUND OR v_approval.status <> 'pending' THEN
    RAISE EXCEPTION 'WORK_APPLICATION_APPROVAL_ALREADY_RESOLVED' USING ERRCODE = 'P0001';
  END IF;

  IF v_approval.requester_id = p_approver_id THEN
    RAISE EXCEPTION 'WORK_APPLICATION_SELF_APPROVAL' USING ERRCODE = 'P0001';
  END IF;

  IF p_action = 'reject' AND v_reason IS NULL THEN
    RAISE EXCEPTION 'WORK_APPLICATION_REJECT_REASON_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(snapshot) ORDER BY snapshot.requested_at, snapshot.id), '[]'::jsonb)
  INTO v_previous_approvals
  FROM (
    SELECT *
    FROM approval_requests
    WHERE related_table = 'work_applications'
      AND related_id = v_related_id
  ) AS snapshot;

  UPDATE approval_requests
  SET status = CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END,
      reject_reason = CASE WHEN p_action = 'reject' THEN v_reason ELSE NULL END,
      resolved_at = v_now,
      resolved_by = v_resolver_id
  WHERE id = p_approval_id;

  IF p_action = 'reject' THEN
    UPDATE approval_requests
    SET status = 'rejected',
        reject_reason = v_reason,
        resolved_at = v_now,
        resolved_by = v_resolver_id
    WHERE related_table = 'work_applications'
      AND related_id = v_related_id
      AND status = 'pending';

    v_status := 'rejected';
  ELSIF EXISTS (
    SELECT 1
    FROM approval_requests
    WHERE related_table = 'work_applications'
      AND related_id = v_related_id
      AND status = 'rejected'
  ) THEN
    v_status := 'rejected';
    SELECT reject_reason
    INTO v_reason
    FROM approval_requests
    WHERE related_table = 'work_applications'
      AND related_id = v_related_id
      AND status = 'rejected'
      AND reject_reason IS NOT NULL
    ORDER BY resolved_at DESC NULLS LAST
    LIMIT 1;
  ELSIF EXISTS (
    SELECT 1
    FROM approval_requests
    WHERE related_table = 'work_applications'
      AND related_id = v_related_id
      AND status = 'pending'
  ) THEN
    v_status := 'pending';
  ELSE
    v_status := 'approved';
  END IF;

  UPDATE work_applications
  SET status = v_status,
      approved_at = CASE WHEN v_status = 'approved' THEN v_now ELSE NULL END,
      reject_reason = CASE WHEN v_status = 'rejected' THEN v_reason ELSE NULL END
  WHERE id = v_related_id
  RETURNING * INTO v_application;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WORK_APPLICATION_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  IF p_resolved_by IS NOT NULL THEN
    INSERT INTO admin_audit_logs (
      actor_id,
      actor_name,
      action,
      target_type,
      target_id,
      risk_level,
      reason,
      metadata
    ) VALUES (
      p_resolved_by,
      (SELECT full_name FROM members WHERE id = p_resolved_by),
      'work_application.approval.' || p_action,
      'work_application',
      v_related_id::text,
      CASE WHEN p_action = 'reject' THEN 'high' ELSE 'medium' END,
      v_reason,
      jsonb_build_object(
        'approvalId', p_approval_id,
        'previousApprovals', v_previous_approvals,
        'applicationStatus', v_status
      )
    );
  END IF;

  RETURN NEXT v_application;
END;
$$;

CREATE OR REPLACE FUNCTION set_work_application_approval_status(
  p_application_id uuid,
  p_status text,
  p_resolved_by uuid,
  p_reject_reason text DEFAULT NULL
)
RETURNS SETOF work_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_application work_applications%ROWTYPE;
  v_now timestamptz := clock_timestamp();
  v_reason text := nullif(btrim(p_reject_reason), '');
  v_previous_application jsonb;
  v_previous_approvals jsonb;
BEGIN
  IF p_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'WORK_APPLICATION_INVALID_STATUS' USING ERRCODE = 'P0001';
  END IF;

  IF p_status = 'rejected' AND v_reason IS NULL THEN
    RAISE EXCEPTION 'WORK_APPLICATION_REJECT_REASON_REQUIRED' USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_application_id::text, 0));

  SELECT *
  INTO v_application
  FROM work_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WORK_APPLICATION_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  v_previous_application := to_jsonb(v_application);
  SELECT coalesce(jsonb_agg(to_jsonb(snapshot) ORDER BY snapshot.requested_at, snapshot.id), '[]'::jsonb)
  INTO v_previous_approvals
  FROM (
    SELECT *
    FROM approval_requests
    WHERE related_table = 'work_applications'
      AND related_id = p_application_id
  ) AS snapshot;

  UPDATE approval_requests
  SET status = p_status,
      reject_reason = CASE WHEN p_status = 'rejected' THEN v_reason ELSE NULL END,
      resolved_at = CASE WHEN p_status = 'pending' THEN NULL ELSE v_now END,
      resolved_by = CASE WHEN p_status = 'pending' THEN NULL ELSE p_resolved_by END
  WHERE related_table = 'work_applications'
    AND related_id = p_application_id;

  UPDATE work_applications
  SET status = p_status,
      approved_at = CASE WHEN p_status = 'approved' THEN v_now ELSE NULL END,
      reject_reason = CASE WHEN p_status = 'rejected' THEN v_reason ELSE NULL END
  WHERE id = p_application_id
  RETURNING * INTO v_application;

  INSERT INTO admin_audit_logs (
    actor_id,
    actor_name,
    action,
    target_type,
    target_id,
    risk_level,
    reason,
    metadata
  ) VALUES (
    p_resolved_by,
    (SELECT full_name FROM members WHERE id = p_resolved_by),
    'work_application.status.override',
    'work_application',
    p_application_id::text,
    'high',
    v_reason,
    jsonb_build_object(
      'previousApplication', v_previous_application,
      'previousApprovals', v_previous_approvals,
      'nextStatus', p_status
    )
  );

  RETURN NEXT v_application;
END;
$$;

CREATE OR REPLACE FUNCTION get_cc_approval_request_ids(
  p_member_id uuid,
  p_limit integer DEFAULT 20
)
RETURNS TABLE(approval_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT ranked.id
  FROM (
    SELECT
      approval_requests.id,
      approval_requests.requested_at,
      row_number() OVER (
        PARTITION BY CASE
          WHEN approval_requests.related_table = 'work_applications'
            AND approval_requests.related_id IS NOT NULL
          THEN 'work_applications:' || approval_requests.related_id::text
          ELSE 'approval_requests:' || approval_requests.id::text
        END
        ORDER BY approval_requests.requested_at DESC, approval_requests.id
      ) AS duplicate_rank
    FROM approval_requests
    WHERE p_member_id = ANY(coalesce(approval_requests.cc_member_ids, '{}'))
  ) AS ranked
  WHERE ranked.duplicate_rank = 1
  ORDER BY ranked.requested_at DESC, ranked.id
  LIMIT least(greatest(p_limit, 1), 100);
$$;

REVOKE ALL ON FUNCTION create_work_application_with_approvals(
  uuid, text, date, time, time, text, text, uuid[], text, uuid[]
)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_work_application_with_approvals(
  uuid, text, date, time, time, text, text, uuid[], text, uuid[]
)
  TO service_role;

REVOKE ALL ON FUNCTION resolve_work_application_approval(uuid, uuid, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION resolve_work_application_approval(uuid, uuid, text, text, uuid)
  TO service_role;

REVOKE ALL ON FUNCTION set_work_application_approval_status(uuid, text, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION set_work_application_approval_status(uuid, text, uuid, text)
  TO service_role;

REVOKE ALL ON FUNCTION get_cc_approval_request_ids(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_cc_approval_request_ids(uuid, integer)
  TO service_role;

COMMENT ON COLUMN work_applications.location IS '연장/주말근무 장소';
COMMENT ON FUNCTION create_work_application_with_approvals(
  uuid, text, date, time, time, text, text, uuid[], text, uuid[]
)
  IS '근무 신청과 복수 승인 요청을 하나의 트랜잭션으로 생성한다.';
COMMENT ON FUNCTION resolve_work_application_approval(uuid, uuid, text, text, uuid)
  IS '복수 승인자가 모두 승인하면 최종 승인하고 한 명이라도 반려하면 즉시 최종 반려한다.';
COMMENT ON FUNCTION set_work_application_approval_status(uuid, text, uuid, text)
  IS '관리자 상태 변경 시 근무 신청과 모든 승인 요청을 하나의 트랜잭션으로 동기화한다.';
COMMENT ON FUNCTION get_cc_approval_request_ids(uuid, integer)
  IS '참조 목록을 신청 단위로 중복 제거한 뒤 최신순으로 페이지 제한한다.';

NOTIFY pgrst, 'reload schema';
