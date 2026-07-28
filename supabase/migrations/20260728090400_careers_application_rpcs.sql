CREATE OR REPLACE FUNCTION careers.create_application(
  p_applicant jsonb,
  p_application jsonb,
  p_actor_id uuid
)
RETURNS careers.applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, careers
AS $$
DECLARE
  v_applicant_id uuid;
  v_application careers.applications%ROWTYPE;
  v_job_posting_id uuid;
  v_current_stage_id uuid;
  v_current_status_id uuid;
BEGIN
  IF jsonb_typeof(p_applicant) <> 'object'
    OR jsonb_typeof(p_application) <> 'object'
    OR p_actor_id IS NULL
    OR nullif(p_application ->> 'jobPostingId', '') IS NULL THEN
    RAISE EXCEPTION 'CAREERS_APPLICATION_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;

  v_job_posting_id := (p_application ->> 'jobPostingId')::uuid;
  v_current_stage_id := nullif(p_application ->> 'currentStageId', '')::uuid;
  v_current_status_id := nullif(p_application ->> 'currentStatusId', '')::uuid;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('careers.posting-process:' || v_job_posting_id::text, 0)
  );
  PERFORM 1
  FROM careers.job_postings
  WHERE id = v_job_posting_id
    AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAREERS_JOB_POSTING_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_current_stage_id IS NULL THEN
    SELECT id
    INTO v_current_stage_id
    FROM careers.job_posting_stages
    WHERE job_posting_id = v_job_posting_id
      AND is_active
    ORDER BY display_order, id
    LIMIT 1;
    IF v_current_stage_id IS NULL THEN
      RAISE EXCEPTION 'CAREERS_ACTIVE_STAGE_REQUIRED'
        USING ERRCODE = '22023';
    END IF;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM careers.job_posting_stages
    WHERE id = v_current_stage_id
      AND job_posting_id = v_job_posting_id
      AND is_active
  ) THEN
    RAISE EXCEPTION 'CAREERS_STAGE_POSTING_MISMATCH'
      USING ERRCODE = '23503';
  END IF;

  IF v_current_status_id IS NULL THEN
    SELECT id
    INTO v_current_status_id
    FROM careers.stage_statuses
    WHERE stage_id = v_current_stage_id
      AND is_active
    ORDER BY display_order, id
    LIMIT 1;
    IF v_current_status_id IS NULL THEN
      RAISE EXCEPTION 'CAREERS_ACTIVE_STATUS_REQUIRED'
        USING ERRCODE = '22023';
    END IF;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM careers.stage_statuses
    WHERE id = v_current_status_id
      AND stage_id = v_current_stage_id
      AND is_active
  ) THEN
    RAISE EXCEPTION 'CAREERS_STATUS_STAGE_MISMATCH'
      USING ERRCODE = '23503';
  END IF;

  v_applicant_id := nullif(p_applicant ->> 'id', '')::uuid;
  IF v_applicant_id IS NULL THEN
    IF nullif(btrim(p_applicant ->> 'name'), '') IS NULL THEN
      RAISE EXCEPTION 'CAREERS_APPLICANT_NAME_REQUIRED'
        USING ERRCODE = '22023';
    END IF;

    INSERT INTO careers.applicants (
      name, email, phone, source, notes, created_by, updated_by
    ) VALUES (
      btrim(p_applicant ->> 'name'),
      nullif(btrim(p_applicant ->> 'email'), ''),
      nullif(btrim(p_applicant ->> 'phone'), ''),
      nullif(btrim(p_applicant ->> 'source'), ''),
      nullif(btrim(p_applicant ->> 'notes'), ''),
      p_actor_id,
      p_actor_id
    )
    RETURNING id INTO v_applicant_id;
  ELSE
    PERFORM pg_advisory_xact_lock(
      hashtextextended('careers.applicant:' || v_applicant_id::text, 0)
    );
    PERFORM 1
    FROM careers.applicants
    WHERE id = v_applicant_id
      AND deleted_at IS NULL
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'CAREERS_APPLICANT_NOT_FOUND'
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  INSERT INTO careers.applications (
    applicant_id,
    job_posting_id,
    current_stage_id,
    current_status_id,
    status,
    applied_at,
    created_by,
    updated_by
  ) VALUES (
    v_applicant_id,
    v_job_posting_id,
    v_current_stage_id,
    v_current_status_id,
    coalesce(nullif(p_application ->> 'status', ''), 'active'),
    coalesce(nullif(p_application ->> 'appliedAt', '')::timestamptz, now()),
    p_actor_id,
    p_actor_id
  )
  RETURNING * INTO v_application;

  RETURN v_application;
END;
$$;

CREATE OR REPLACE FUNCTION careers.update_application(
  p_application_id uuid,
  p_applicant jsonb,
  p_application jsonb,
  p_actor_id uuid
)
RETURNS careers.applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, careers
AS $$
DECLARE
  v_application careers.applications%ROWTYPE;
BEGIN
  IF p_application_id IS NULL
    OR jsonb_typeof(p_applicant) <> 'object'
    OR jsonb_typeof(p_application) <> 'object'
    OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'CAREERS_APPLICATION_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('careers.application:' || p_application_id::text, 0)
  );

  SELECT *
  INTO v_application
  FROM careers.applications
  WHERE id = p_application_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAREERS_APPLICATION_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('careers.applicant:' || v_application.applicant_id::text, 0)
  );

  IF p_applicant ?| ARRAY['name', 'email', 'phone', 'source', 'notes'] THEN
    UPDATE careers.applicants
    SET name = CASE
          WHEN p_applicant ? 'name' THEN btrim(p_applicant ->> 'name')
          ELSE name
        END,
        email = CASE
          WHEN p_applicant ? 'email' THEN nullif(btrim(p_applicant ->> 'email'), '')
          ELSE email
        END,
        phone = CASE
          WHEN p_applicant ? 'phone' THEN nullif(btrim(p_applicant ->> 'phone'), '')
          ELSE phone
        END,
        source = CASE
          WHEN p_applicant ? 'source' THEN nullif(btrim(p_applicant ->> 'source'), '')
          ELSE source
        END,
        notes = CASE
          WHEN p_applicant ? 'notes' THEN nullif(btrim(p_applicant ->> 'notes'), '')
          ELSE notes
        END,
        updated_by = p_actor_id
    WHERE id = v_application.applicant_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'CAREERS_APPLICANT_NOT_FOUND'
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  UPDATE careers.applications
  SET job_posting_id = CASE
        WHEN p_application ? 'jobPostingId'
          THEN (p_application ->> 'jobPostingId')::uuid
        ELSE job_posting_id
      END,
      current_stage_id = CASE
        WHEN p_application ? 'currentStageId'
          THEN nullif(p_application ->> 'currentStageId', '')::uuid
        ELSE current_stage_id
      END,
      current_status_id = CASE
        WHEN p_application ? 'currentStatusId'
          THEN nullif(p_application ->> 'currentStatusId', '')::uuid
        ELSE current_status_id
      END,
      status = CASE
        WHEN p_application ? 'status' THEN p_application ->> 'status'
        ELSE status
      END,
      applied_at = CASE
        WHEN p_application ? 'appliedAt'
          THEN (p_application ->> 'appliedAt')::timestamptz
        ELSE applied_at
      END,
      updated_by = p_actor_id
  WHERE id = p_application_id
  RETURNING * INTO v_application;

  RETURN v_application;
END;
$$;

REVOKE ALL ON FUNCTION careers.create_application(jsonb, jsonb, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION careers.update_application(uuid, jsonb, jsonb, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION careers.create_application(jsonb, jsonb, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION careers.update_application(uuid, jsonb, jsonb, uuid)
  TO service_role;
