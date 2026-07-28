CREATE OR REPLACE FUNCTION careers.consume_sso_handoff(p_code_hash text)
RETURNS TABLE (admin_member_id uuid, source_app text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, careers
AS $$
BEGIN
  IF p_code_hash IS NULL OR p_code_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'CAREERS_SSO_INVALID_CODE'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  UPDATE careers.sso_handoffs AS handoff
  SET consumed_at = clock_timestamp()
  WHERE handoff.code_hash = p_code_hash
    AND handoff.source_app = 'admin'
    AND handoff.consumed_at IS NULL
    AND handoff.expires_at > clock_timestamp()
  RETURNING handoff.admin_member_id, handoff.source_app;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAREERS_SSO_INVALID_OR_EXPIRED'
      USING ERRCODE = '22023';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION careers.transition_application_stage(
  p_application_id uuid,
  p_stage_id uuid,
  p_status_id uuid,
  p_actor_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS careers.applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, careers
AS $$
DECLARE
  v_application careers.applications%ROWTYPE;
  v_before jsonb;
BEGIN
  IF p_application_id IS NULL OR p_stage_id IS NULL OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'CAREERS_STAGE_TRANSITION_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('careers.application:' || p_application_id::text, 0));

  SELECT *
  INTO v_application
  FROM careers.applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAREERS_APPLICATION_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;
  IF v_application.status <> 'active' THEN
    RAISE EXCEPTION 'CAREERS_APPLICATION_NOT_ACTIVE'
      USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'careers.posting-process:' || v_application.job_posting_id::text,
      0
    )
  );
  IF NOT EXISTS (
    SELECT 1
    FROM careers.job_posting_stages
    WHERE id = p_stage_id
      AND job_posting_id = v_application.job_posting_id
      AND is_active
  ) THEN
    RAISE EXCEPTION 'CAREERS_STAGE_POSTING_MISMATCH'
      USING ERRCODE = '23503';
  END IF;
  IF p_status_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM careers.stage_statuses
    WHERE id = p_status_id
      AND stage_id = p_stage_id
      AND is_active
  ) THEN
    RAISE EXCEPTION 'CAREERS_STATUS_STAGE_MISMATCH'
      USING ERRCODE = '23503';
  END IF;
  IF v_application.current_stage_id = p_stage_id
    AND v_application.current_status_id IS NOT DISTINCT FROM p_status_id THEN
    RETURN v_application;
  END IF;

  v_before := to_jsonb(v_application);

  UPDATE careers.applications
  SET current_stage_id = p_stage_id,
      current_status_id = p_status_id,
      updated_by = p_actor_id
  WHERE id = p_application_id
  RETURNING * INTO v_application;

  INSERT INTO careers.application_stage_history (
    application_id, from_stage_id, from_status_id,
    to_stage_id, to_status_id, changed_by, reason
  ) VALUES (
    p_application_id, (v_before ->> 'current_stage_id')::uuid,
    (v_before ->> 'current_status_id')::uuid,
    p_stage_id, p_status_id, p_actor_id, nullif(btrim(p_reason), '')
  );

  INSERT INTO careers.message_history (
    application_id,
    channel,
    recipient,
    subject,
    body,
    delivery_mode,
    recorded_by
  )
  SELECT
    p_application_id,
    CASE
      WHEN nullif(btrim(applicant.email), '') IS NOT NULL THEN 'email'
      WHEN nullif(btrim(applicant.phone), '') IS NOT NULL THEN 'sms'
      ELSE 'internal'
    END,
    coalesce(
      nullif(btrim(applicant.email), ''),
      nullif(btrim(applicant.phone), ''),
      applicant.name
    ),
    rule.subject_template,
    rule.body_template,
    'record_only',
    p_actor_id
  FROM careers.stage_message_rules AS rule
  JOIN careers.applicants AS applicant
    ON applicant.id = v_application.applicant_id
  WHERE rule.stage_id = p_stage_id
    AND rule.status_id = p_status_id
    AND rule.is_active;

  RETURN v_application;
END;
$$;

CREATE OR REPLACE FUNCTION careers.set_application_final_result(
  p_application_id uuid,
  p_result text,
  p_actor_id uuid,
  p_note text DEFAULT NULL
)
RETURNS careers.application_final_results
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, careers
AS $$
DECLARE
  v_application careers.applications%ROWTYPE;
  v_before careers.application_final_results%ROWTYPE;
  v_result careers.application_final_results%ROWTYPE;
BEGIN
  IF p_result NOT IN ('hired', 'rejected', 'withdrawn') OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'CAREERS_FINAL_RESULT_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('careers.application:' || p_application_id::text, 0));

  SELECT * INTO v_application
  FROM careers.applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAREERS_APPLICATION_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;
  IF v_application.status = 'separated' THEN
    RAISE EXCEPTION 'CAREERS_APPLICATION_SEPARATED'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_before
  FROM careers.application_final_results
  WHERE application_id = p_application_id
  FOR UPDATE;

  IF FOUND
    AND v_before.result = p_result
    AND v_before.note IS NOT DISTINCT FROM nullif(btrim(p_note), '') THEN
    RETURN v_before;
  END IF;

  INSERT INTO careers.application_final_results (
    application_id, result, decided_by, decided_at, note
  ) VALUES (
    p_application_id, p_result, p_actor_id, clock_timestamp(), nullif(btrim(p_note), '')
  )
  ON CONFLICT (application_id) DO UPDATE
  SET result = EXCLUDED.result,
      decided_by = EXCLUDED.decided_by,
      decided_at = EXCLUDED.decided_at,
      note = EXCLUDED.note
  RETURNING * INTO v_result;

  UPDATE careers.applications
  SET status = 'completed',
      updated_by = p_actor_id
  WHERE id = p_application_id;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION careers.separate_application(
  p_application_id uuid,
  p_actor_id uuid,
  p_reason text
)
RETURNS careers.application_separations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, careers
AS $$
DECLARE
  v_application careers.applications%ROWTYPE;
  v_separation careers.application_separations%ROWTYPE;
  v_snapshot jsonb;
BEGIN
  IF p_actor_id IS NULL OR nullif(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'CAREERS_SEPARATION_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('careers.application:' || p_application_id::text, 0));

  SELECT * INTO v_application
  FROM careers.applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAREERS_APPLICATION_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_separation
  FROM careers.application_separations
  WHERE application_id = p_application_id
    AND restored_at IS NULL
  FOR UPDATE;

  IF FOUND THEN
    RETURN v_separation;
  END IF;
  IF v_application.status = 'separated' THEN
    RAISE EXCEPTION 'CAREERS_SEPARATION_STATE_INVALID'
      USING ERRCODE = '22023';
  END IF;

  SELECT jsonb_build_object(
    'application', to_jsonb(v_application),
    'applicant', to_jsonb(applicant),
    'jobPosting', to_jsonb(posting),
    'stage', CASE WHEN stage.id IS NULL THEN NULL ELSE to_jsonb(stage) END,
    'stageStatus', CASE WHEN stage_status.id IS NULL THEN NULL ELSE to_jsonb(stage_status) END
  )
  INTO v_snapshot
  FROM careers.applicants AS applicant
  JOIN careers.job_postings AS posting ON posting.id = v_application.job_posting_id
  LEFT JOIN careers.job_posting_stages AS stage ON stage.id = v_application.current_stage_id
  LEFT JOIN careers.stage_statuses AS stage_status ON stage_status.id = v_application.current_status_id
  WHERE applicant.id = v_application.applicant_id;

  INSERT INTO careers.application_separations (
    application_id, reason, separated_by, snapshot
  ) VALUES (
    p_application_id, btrim(p_reason), p_actor_id, v_snapshot
  )
  RETURNING * INTO v_separation;

  UPDATE careers.applications
  SET status = 'separated',
      updated_by = p_actor_id
  WHERE id = p_application_id;

  RETURN v_separation;
END;
$$;

CREATE OR REPLACE FUNCTION careers.restore_application(
  p_application_id uuid,
  p_actor_id uuid
)
RETURNS careers.applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, careers
AS $$
DECLARE
  v_application careers.applications%ROWTYPE;
  v_separation careers.application_separations%ROWTYPE;
  v_restored_status text;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'CAREERS_RESTORE_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('careers.application:' || p_application_id::text, 0));

  SELECT * INTO v_application
  FROM careers.applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAREERS_APPLICATION_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_separation
  FROM careers.application_separations
  WHERE application_id = p_application_id
    AND restored_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    IF v_application.status <> 'separated' THEN
      RETURN v_application;
    END IF;
    RAISE EXCEPTION 'CAREERS_ACTIVE_SEPARATION_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  v_restored_status := v_separation.snapshot #>> '{application,status}';
  IF v_restored_status NOT IN ('active', 'completed') THEN
    RAISE EXCEPTION 'CAREERS_SEPARATION_SNAPSHOT_INVALID'
      USING ERRCODE = '22023';
  END IF;

  UPDATE careers.application_separations
  SET restored_by = p_actor_id,
      restored_at = clock_timestamp()
  WHERE id = v_separation.id;

  UPDATE careers.applications
  SET status = v_restored_status,
      current_stage_id = (v_separation.snapshot #>> '{application,current_stage_id}')::uuid,
      current_status_id = (v_separation.snapshot #>> '{application,current_status_id}')::uuid,
      updated_by = p_actor_id
  WHERE id = p_application_id
  RETURNING * INTO v_application;

  RETURN v_application;
END;
$$;

REVOKE ALL ON FUNCTION careers.consume_sso_handoff(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION careers.transition_application_stage(uuid, uuid, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION careers.set_application_final_result(uuid, text, uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION careers.separate_application(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION careers.restore_application(uuid, uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION careers.consume_sso_handoff(text) TO service_role;
GRANT EXECUTE ON FUNCTION careers.transition_application_stage(uuid, uuid, uuid, uuid, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION careers.set_application_final_result(uuid, text, uuid, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION careers.separate_application(uuid, uuid, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION careers.restore_application(uuid, uuid)
  TO service_role;
