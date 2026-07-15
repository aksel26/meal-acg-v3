\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_requester uuid;
  v_approver_one uuid;
  v_approver_two uuid;
  v_application_id uuid;
  v_rejected_application_id uuid;
  v_approval_one uuid;
  v_approval_two uuid;
  v_status text;
BEGIN
  SELECT id INTO v_requester FROM members ORDER BY id LIMIT 1;
  SELECT id INTO v_approver_one FROM members WHERE id <> v_requester ORDER BY id LIMIT 1;
  SELECT id INTO v_approver_two
  FROM members
  WHERE id NOT IN (v_requester, v_approver_one)
  ORDER BY id
  LIMIT 1;

  IF v_approver_two IS NULL THEN
    RAISE EXCEPTION 'work application test requires three seeded members';
  END IF;

  SELECT id INTO v_application_id
  FROM create_work_application_with_approvals(
    v_requester,
    'overtime',
    (clock_timestamp() AT TIME ZONE 'Asia/Seoul')::date,
    '17:00',
    '19:00',
    '연장근무',
    '복수 승인 테스트',
    ARRAY[v_approver_one, v_approver_two, v_approver_one],
    '테스트 장소',
    ARRAY[v_approver_two]
  );

  IF (
    SELECT count(*)
    FROM approval_requests
    WHERE related_table = 'work_applications'
      AND related_id = v_application_id
  ) <> 2 THEN
    RAISE EXCEPTION 'atomic create did not create exactly one approval per approver';
  END IF;

  IF (
    SELECT count(*)
    FROM get_cc_approval_request_ids(v_approver_two, 20) cc
    JOIN approval_requests approval ON approval.id = cc.approval_id
    WHERE approval.related_table = 'work_applications'
      AND approval.related_id = v_application_id
  ) <> 1 THEN
    RAISE EXCEPTION 'cc request ids were not deduplicated by work application';
  END IF;

  SELECT id INTO v_approval_one
  FROM approval_requests
  WHERE related_id = v_application_id AND approver_id = v_approver_one;
  SELECT id INTO v_approval_two
  FROM approval_requests
  WHERE related_id = v_application_id AND approver_id = v_approver_two;

  PERFORM resolve_work_application_approval(v_approval_one, v_approver_one, 'approve', NULL);
  SELECT status INTO v_status FROM work_applications WHERE id = v_application_id;
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'application was approved before every approver approved';
  END IF;

  PERFORM resolve_work_application_approval(v_approval_two, v_approver_two, 'approve', NULL);
  SELECT status INTO v_status FROM work_applications WHERE id = v_application_id;
  IF v_status <> 'approved' THEN
    RAISE EXCEPTION 'application was not approved after every approver approved';
  END IF;

  PERFORM set_work_application_approval_status(
    v_application_id,
    'pending',
    v_approver_one,
    NULL
  );
  IF EXISTS (
    SELECT 1
    FROM approval_requests
    WHERE related_id = v_application_id
      AND status <> 'pending'
  ) THEN
    RAISE EXCEPTION 'admin reset did not reopen every approval';
  END IF;

  PERFORM set_work_application_approval_status(
    v_application_id,
    'approved',
    v_approver_one,
    NULL
  );
  SELECT status INTO v_status FROM work_applications WHERE id = v_application_id;
  IF v_status <> 'approved' THEN
    RAISE EXCEPTION 'admin override did not synchronize application status';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM approval_requests
    WHERE related_id = v_application_id
      AND resolved_by IS DISTINCT FROM v_approver_one
  ) THEN
    RAISE EXCEPTION 'admin override resolver audit was not stored';
  END IF;
  IF (
    SELECT count(*)
    FROM admin_audit_logs
    WHERE target_type = 'work_application'
      AND target_id = v_application_id::text
      AND action = 'work_application.status.override'
      AND actor_id = v_approver_one
  ) <> 2 THEN
    RAISE EXCEPTION 'admin override append-only audit was not stored atomically';
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
    v_requester,
    'overtime',
    (clock_timestamp() AT TIME ZONE 'Asia/Seoul')::date,
    '17:00',
    '20:00',
    '연장근무',
    '테스트 장소',
    '반려 테스트',
    v_approver_one
  ) RETURNING id INTO v_rejected_application_id;

  INSERT INTO approval_requests (
    type,
    requester_id,
    approver_id,
    related_table,
    related_id
  ) VALUES
    ('overtime', v_requester, v_approver_one, 'work_applications', v_rejected_application_id),
    ('overtime', v_requester, v_approver_two, 'work_applications', v_rejected_application_id);

  SELECT id INTO v_approval_one
  FROM approval_requests
  WHERE related_id = v_rejected_application_id AND approver_id = v_approver_one;
  SELECT id INTO v_approval_two
  FROM approval_requests
  WHERE related_id = v_rejected_application_id AND approver_id = v_approver_two;

  PERFORM resolve_work_application_approval(
    v_approval_one,
    v_approver_one,
    'approve',
    NULL
  );

  SELECT status INTO v_status
  FROM work_applications
  WHERE id = v_rejected_application_id;
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'application did not remain pending after partial approval';
  END IF;

  BEGIN
    PERFORM resolve_work_application_approval(
      v_approval_two,
      v_approver_two,
      'reject',
      NULL
    );
    RAISE EXCEPTION 'rejection without a reason was accepted';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'WORK_APPLICATION_REJECT_REASON_REQUIRED' THEN
        RAISE;
      END IF;
  END;

  PERFORM resolve_work_application_approval(
    v_approval_two,
    v_approver_two,
    'reject',
    '반려 테스트',
    v_approver_one
  );

  SELECT status INTO v_status
  FROM work_applications
  WHERE id = v_rejected_application_id;
  IF v_status <> 'rejected' THEN
    RAISE EXCEPTION 'one rejection did not reject the application';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM admin_audit_logs
    WHERE target_type = 'work_application'
      AND target_id = v_rejected_application_id::text
      AND action = 'work_application.approval.reject'
      AND actor_id = v_approver_one
  ) THEN
    RAISE EXCEPTION 'admin approval audit was not stored atomically';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM approval_requests
    WHERE related_id = v_rejected_application_id
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'remaining approvals were left actionable after rejection';
  END IF;

  IF (
    SELECT count(*)
    FROM approval_requests
    WHERE related_id = v_rejected_application_id
      AND status = 'approved'
  ) <> 1 THEN
    RAISE EXCEPTION 'prior individual approval audit was not preserved';
  END IF;

  BEGIN
    PERFORM resolve_work_application_approval(
      v_approval_one,
      v_approver_one,
      'approve',
      NULL
    );
    RAISE EXCEPTION 'resolved approval was processed again';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      IF SQLERRM <> 'WORK_APPLICATION_APPROVAL_ALREADY_RESOLVED' THEN
        RAISE;
      END IF;
  END;

  SELECT status INTO v_status
  FROM work_applications
  WHERE id = v_rejected_application_id;
  IF v_status <> 'rejected' THEN
    RAISE EXCEPTION 'rejected application was resurrected by a retry';
  END IF;

  IF has_function_privilege(
    'anon',
    'resolve_work_application_approval(uuid,uuid,text,text,uuid)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'resolve_work_application_approval(uuid,uuid,text,text,uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'approval resolver is callable without service_role';
  END IF;

  IF NOT has_function_privilege(
    'service_role',
    'resolve_work_application_approval(uuid,uuid,text,text,uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'approval resolver is not callable by service_role';
  END IF;

  IF has_function_privilege(
    'anon',
    'create_work_application_with_approvals(uuid,text,date,time without time zone,time without time zone,text,text,uuid[],text,uuid[])',
    'EXECUTE'
  ) OR has_function_privilege(
    'anon',
    'get_cc_approval_request_ids(uuid,integer)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'create_work_application_with_approvals(uuid,text,date,time without time zone,time without time zone,text,text,uuid[],text,uuid[])',
    'EXECUTE'
  ) OR has_function_privilege(
    'anon',
    'set_work_application_approval_status(uuid,text,uuid,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'set_work_application_approval_status(uuid,text,uuid,text)',
    'EXECUTE'
  ) OR has_function_privilege(
    'authenticated',
    'get_cc_approval_request_ids(uuid,integer)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'work application write RPC is callable without service_role';
  END IF;

  IF NOT has_function_privilege(
    'service_role',
    'create_work_application_with_approvals(uuid,text,date,time without time zone,time without time zone,text,text,uuid[],text,uuid[])',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'set_work_application_approval_status(uuid,text,uuid,text)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'get_cc_approval_request_ids(uuid,integer)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'work application write RPC is not callable by service_role';
  END IF;
END;
$$;

ROLLBACK;
