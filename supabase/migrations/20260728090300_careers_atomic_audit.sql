CREATE OR REPLACE FUNCTION careers.audit_domain_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, careers
AS $$
DECLARE
  v_before jsonb;
  v_after jsonb;
  v_actor_admin_id uuid;
  v_entity_id uuid;
  v_action text;
BEGIN
  IF current_setting('careers.skip_domain_audit', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  v_before := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  v_after := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  v_entity_id := coalesce(
    nullif(v_after ->> 'id', '')::uuid,
    nullif(v_before ->> 'id', '')::uuid
  );
  v_actor_admin_id := coalesce(
    nullif(v_after ->> 'deleted_by', '')::uuid,
    nullif(v_after ->> 'restored_by', '')::uuid,
    nullif(v_after ->> 'updated_by', '')::uuid,
    nullif(v_after ->> 'decided_by', '')::uuid,
    nullif(v_after ->> 'separated_by', '')::uuid,
    nullif(v_after ->> 'recorded_by', '')::uuid,
    nullif(v_after ->> 'uploaded_by', '')::uuid,
    nullif(v_after ->> 'changed_by', '')::uuid,
    nullif(v_after ->> 'created_by', '')::uuid,
    nullif(v_before ->> 'updated_by', '')::uuid,
    nullif(v_before ->> 'created_by', '')::uuid
  );

  IF v_actor_admin_id IS NULL THEN
    RAISE EXCEPTION 'CAREERS_AUDIT_ACTOR_REQUIRED'
      USING ERRCODE = '23502';
  END IF;

  v_action := TG_TABLE_NAME || '.' || lower(TG_OP);
  IF TG_TABLE_NAME = 'applications' AND TG_OP = 'UPDATE' THEN
    IF OLD.current_stage_id IS DISTINCT FROM NEW.current_stage_id
      OR OLD.current_status_id IS DISTINCT FROM NEW.current_status_id THEN
      v_action := 'application.stage_transition';
    ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'separated' THEN
      v_action := 'application.separated';
    ELSIF OLD.status IS DISTINCT FROM NEW.status AND OLD.status = 'separated' THEN
      v_action := 'application.restored';
    ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
      v_action := 'application.completed';
    END IF;
  END IF;

  INSERT INTO careers.audit_logs (
    actor_admin_id, action, entity_type, entity_id, before_data, after_data
  ) VALUES (
    v_actor_admin_id, v_action, TG_TABLE_NAME, v_entity_id, v_before, v_after
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_job_postings
  AFTER INSERT OR UPDATE OR DELETE ON careers.job_postings
  FOR EACH ROW EXECUTE FUNCTION careers.audit_domain_change();
CREATE TRIGGER audit_job_posting_stages
  AFTER INSERT OR UPDATE OR DELETE ON careers.job_posting_stages
  FOR EACH ROW EXECUTE FUNCTION careers.audit_domain_change();
CREATE TRIGGER audit_stage_statuses
  AFTER INSERT OR UPDATE OR DELETE ON careers.stage_statuses
  FOR EACH ROW EXECUTE FUNCTION careers.audit_domain_change();
CREATE TRIGGER audit_stage_message_rules
  AFTER INSERT OR UPDATE OR DELETE ON careers.stage_message_rules
  FOR EACH ROW EXECUTE FUNCTION careers.audit_domain_change();
CREATE TRIGGER audit_applicants
  AFTER INSERT OR UPDATE OR DELETE ON careers.applicants
  FOR EACH ROW EXECUTE FUNCTION careers.audit_domain_change();
CREATE TRIGGER audit_applications
  AFTER INSERT OR UPDATE OR DELETE ON careers.applications
  FOR EACH ROW EXECUTE FUNCTION careers.audit_domain_change();
CREATE TRIGGER audit_application_final_results
  AFTER INSERT OR UPDATE OR DELETE ON careers.application_final_results
  FOR EACH ROW EXECUTE FUNCTION careers.audit_domain_change();
CREATE TRIGGER audit_application_separations
  AFTER INSERT OR UPDATE OR DELETE ON careers.application_separations
  FOR EACH ROW EXECUTE FUNCTION careers.audit_domain_change();
CREATE TRIGGER audit_message_history
  AFTER INSERT ON careers.message_history
  FOR EACH ROW EXECUTE FUNCTION careers.audit_domain_change();
CREATE TRIGGER audit_applicant_files
  AFTER INSERT OR UPDATE OR DELETE ON careers.applicant_files
  FOR EACH ROW EXECUTE FUNCTION careers.audit_domain_change();
CREATE TRIGGER audit_schedule_events
  AFTER INSERT OR UPDATE OR DELETE ON careers.schedule_events
  FOR EACH ROW EXECUTE FUNCTION careers.audit_domain_change();

CREATE OR REPLACE FUNCTION careers.save_job_posting_process(
  p_job_posting_id uuid,
  p_stages jsonb,
  p_actor_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, careers
AS $$
DECLARE
  v_before jsonb;
  v_after jsonb;
  v_stage jsonb;
  v_status jsonb;
  v_message_rule jsonb;
  v_stage_id uuid;
  v_status_id uuid;
  v_seen_stage_ids uuid[] := ARRAY[]::uuid[];
  v_seen_status_ids uuid[] := ARRAY[]::uuid[];
  v_all_seen_status_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF p_job_posting_id IS NULL
    OR p_actor_admin_id IS NULL
    OR jsonb_typeof(p_stages) <> 'array' THEN
    RAISE EXCEPTION 'CAREERS_POSTING_PROCESS_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_stages) > 20 THEN
    RAISE EXCEPTION 'CAREERS_POSTING_PROCESS_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('careers.posting-process:' || p_job_posting_id::text, 0)
  );
  PERFORM 1
  FROM careers.job_postings
  WHERE id = p_job_posting_id
    AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAREERS_JOB_POSTING_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT coalesce(jsonb_agg(stage_row ORDER BY display_order), '[]'::jsonb)
  INTO v_before
  FROM (
    SELECT to_jsonb(stage) || jsonb_build_object(
      'statuses',
      coalesce((
        SELECT jsonb_agg(
          to_jsonb(status_row) || jsonb_build_object(
            'message_rule',
            (
              SELECT to_jsonb(message_rule)
              FROM careers.stage_message_rules AS message_rule
              WHERE message_rule.stage_id = stage.id
                AND message_rule.status_id = status_row.id
                AND message_rule.is_active
            )
          )
          ORDER BY status_row.display_order
        )
        FROM careers.stage_statuses AS status_row
        WHERE status_row.stage_id = stage.id
          AND status_row.is_active
      ), '[]'::jsonb)
    ) AS stage_row_json,
    stage.display_order
    FROM careers.job_posting_stages AS stage
    WHERE stage.job_posting_id = p_job_posting_id
      AND stage.is_active
  ) AS snapshot(stage_row, display_order);

  PERFORM set_config('careers.skip_domain_audit', 'on', true);

  UPDATE careers.stage_message_rules
  SET is_active = false,
      updated_by = p_actor_admin_id
  WHERE stage_id IN (
    SELECT id
    FROM careers.job_posting_stages
    WHERE job_posting_id = p_job_posting_id
  )
    AND is_active;

  UPDATE careers.stage_statuses
  SET is_active = false,
      updated_by = p_actor_admin_id
  WHERE stage_id IN (
    SELECT id
    FROM careers.job_posting_stages
    WHERE job_posting_id = p_job_posting_id
  )
    AND is_active;

  UPDATE careers.job_posting_stages
  SET is_active = false,
      updated_by = p_actor_admin_id
  WHERE job_posting_id = p_job_posting_id
    AND is_active;

  FOR v_stage IN
    SELECT value || jsonb_build_object('_displayOrder', ordinality - 1)
    FROM jsonb_array_elements(p_stages) WITH ORDINALITY
  LOOP
    IF jsonb_typeof(v_stage) <> 'object'
      OR nullif(btrim(v_stage ->> 'name'), '') IS NULL
      OR char_length(btrim(v_stage ->> 'name')) > 100
      OR nullif(btrim(v_stage ->> 'type'), '') IS NULL
      OR jsonb_typeof(coalesce(v_stage -> 'statuses', '[]'::jsonb)) <> 'array' THEN
      RAISE EXCEPTION 'CAREERS_POSTING_STAGE_INVALID'
        USING ERRCODE = '22023';
    END IF;
    IF jsonb_array_length(coalesce(v_stage -> 'statuses', '[]'::jsonb)) > 20 THEN
      RAISE EXCEPTION 'CAREERS_POSTING_STAGE_INVALID'
        USING ERRCODE = '22023';
    END IF;

    v_stage_id := coalesce(nullif(v_stage ->> 'id', '')::uuid, gen_random_uuid());
    v_seen_stage_ids := array_append(v_seen_stage_ids, v_stage_id);

    INSERT INTO careers.job_posting_stages (
      id, job_posting_id, name, stage_type, display_order,
      show_on_calendar, is_active, created_by, updated_by
    ) VALUES (
      v_stage_id, p_job_posting_id, btrim(v_stage ->> 'name'),
      btrim(v_stage ->> 'type'),
      coalesce((v_stage ->> 'displayOrder')::integer, (v_stage ->> '_displayOrder')::integer),
      coalesce((v_stage ->> 'showOnCalendar')::boolean, true),
      coalesce((v_stage ->> 'isActive')::boolean, true),
      p_actor_admin_id, p_actor_admin_id
    )
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        stage_type = EXCLUDED.stage_type,
        display_order = EXCLUDED.display_order,
        show_on_calendar = EXCLUDED.show_on_calendar,
        is_active = EXCLUDED.is_active,
        updated_by = EXCLUDED.updated_by
    WHERE job_posting_stages.job_posting_id = p_job_posting_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'CAREERS_STAGE_POSTING_MISMATCH'
        USING ERRCODE = '23503';
    END IF;

    FOR v_status IN
      SELECT value || jsonb_build_object('_displayOrder', ordinality - 1)
      FROM jsonb_array_elements(coalesce(v_stage -> 'statuses', '[]'::jsonb))
        WITH ORDINALITY
    LOOP
      IF v_status ? 'messageRules'
        AND jsonb_typeof(v_status -> 'messageRules') <> 'array' THEN
        RAISE EXCEPTION 'CAREERS_STAGE_STATUS_INVALID'
          USING ERRCODE = '22023';
      END IF;
      IF v_status ? 'messageRules'
        AND jsonb_array_length(v_status -> 'messageRules') > 10 THEN
        RAISE EXCEPTION 'CAREERS_STAGE_STATUS_INVALID'
          USING ERRCODE = '22023';
      END IF;

      IF jsonb_typeof(v_status) <> 'object'
        OR nullif(btrim(v_status ->> 'name'), '') IS NULL
        OR char_length(btrim(v_status ->> 'name')) > 100
        OR coalesce(v_status ->> 'resultMeaning', 'neutral')
          NOT IN ('neutral', 'pass', 'fail') THEN
        RAISE EXCEPTION 'CAREERS_STAGE_STATUS_INVALID'
          USING ERRCODE = '22023';
      END IF;

      v_status_id := coalesce(nullif(v_status ->> 'id', '')::uuid, gen_random_uuid());
      v_seen_status_ids := array_append(v_seen_status_ids, v_status_id);
      v_all_seen_status_ids := array_append(v_all_seen_status_ids, v_status_id);

      INSERT INTO careers.stage_statuses (
        id, stage_id, name, display_order, result_meaning,
        is_terminal, is_active, created_by, updated_by
      ) VALUES (
        v_status_id, v_stage_id, btrim(v_status ->> 'name'),
        coalesce(
          (v_status ->> 'displayOrder')::integer,
          (v_status ->> '_displayOrder')::integer
        ),
        coalesce(v_status ->> 'resultMeaning', 'neutral'),
        coalesce((v_status ->> 'isTerminal')::boolean, false),
        coalesce((v_status ->> 'isActive')::boolean, true),
        p_actor_admin_id, p_actor_admin_id
      )
      ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          display_order = EXCLUDED.display_order,
          result_meaning = EXCLUDED.result_meaning,
          is_terminal = EXCLUDED.is_terminal,
          is_active = EXCLUDED.is_active,
          updated_by = EXCLUDED.updated_by
      WHERE stage_statuses.stage_id = v_stage_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'CAREERS_STATUS_STAGE_MISMATCH'
          USING ERRCODE = '23503';
      END IF;

      v_message_rule := v_status -> 'messageRule';
      IF v_message_rule IS NOT NULL AND jsonb_typeof(v_message_rule) <> 'null' THEN
        IF jsonb_typeof(v_message_rule) <> 'object'
          OR nullif(btrim(v_message_rule ->> 'bodyTemplate'), '') IS NULL
          OR char_length(coalesce(v_message_rule ->> 'subjectTemplate', '')) > 200
          OR char_length(btrim(v_message_rule ->> 'bodyTemplate')) > 10000 THEN
          RAISE EXCEPTION 'CAREERS_MESSAGE_RULE_INVALID'
            USING ERRCODE = '22023';
        END IF;

        INSERT INTO careers.stage_message_rules (
          id, stage_id, status_id, is_active, subject_template,
          body_template, created_by, updated_by
        ) VALUES (
          coalesce(nullif(v_message_rule ->> 'id', '')::uuid, gen_random_uuid()),
          v_stage_id,
          v_status_id,
          coalesce((v_message_rule ->> 'isActive')::boolean, true),
          nullif(btrim(v_message_rule ->> 'subjectTemplate'), ''),
          btrim(v_message_rule ->> 'bodyTemplate'),
          p_actor_admin_id,
          p_actor_admin_id
        )
        ON CONFLICT (stage_id, status_id) DO UPDATE
        SET is_active = EXCLUDED.is_active,
            subject_template = EXCLUDED.subject_template,
            body_template = EXCLUDED.body_template,
            updated_by = EXCLUDED.updated_by;
      ELSE
        UPDATE careers.stage_message_rules
        SET is_active = false,
            updated_by = p_actor_admin_id
        WHERE stage_id = v_stage_id
          AND status_id = v_status_id
          AND is_active;
      END IF;
    END LOOP;

    UPDATE careers.stage_statuses
    SET is_active = false,
        updated_by = p_actor_admin_id
    WHERE stage_id = v_stage_id
      AND is_active
      AND NOT (id = ANY(v_seen_status_ids));

    v_seen_status_ids := ARRAY[]::uuid[];
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM careers.applications AS application
    LEFT JOIN careers.job_posting_stages AS stage
      ON stage.id = application.current_stage_id
    LEFT JOIN careers.stage_statuses AS stage_status
      ON stage_status.id = application.current_status_id
    WHERE application.job_posting_id = p_job_posting_id
      AND (
        (
          application.current_stage_id IS NOT NULL
          AND (
            NOT (application.current_stage_id = ANY(v_seen_stage_ids))
            OR NOT coalesce(stage.is_active, false)
          )
        )
        OR (
          application.current_status_id IS NOT NULL
          AND (
            NOT (application.current_status_id = ANY(v_all_seen_status_ids))
            OR NOT coalesce(stage_status.is_active, false)
          )
        )
      )
  ) THEN
    RAISE EXCEPTION 'CAREERS_PROCESS_IN_USE'
      USING ERRCODE = '55000';
  END IF;

  UPDATE careers.job_posting_stages
  SET is_active = false,
      updated_by = p_actor_admin_id
  WHERE job_posting_id = p_job_posting_id
    AND is_active
    AND NOT (id = ANY(v_seen_stage_ids));

  SELECT coalesce(jsonb_agg(stage_row ORDER BY display_order), '[]'::jsonb)
  INTO v_after
  FROM (
    SELECT to_jsonb(stage) || jsonb_build_object(
      'statuses',
      coalesce((
        SELECT jsonb_agg(
          to_jsonb(status_row) || jsonb_build_object(
            'message_rule',
            (
              SELECT to_jsonb(message_rule)
              FROM careers.stage_message_rules AS message_rule
              WHERE message_rule.stage_id = stage.id
                AND message_rule.status_id = status_row.id
                AND message_rule.is_active
            )
          )
          ORDER BY status_row.display_order
        )
        FROM careers.stage_statuses AS status_row
        WHERE status_row.stage_id = stage.id
          AND status_row.is_active
      ), '[]'::jsonb)
    ) AS stage_row_json,
    stage.display_order
    FROM careers.job_posting_stages AS stage
    WHERE stage.job_posting_id = p_job_posting_id
      AND stage.is_active
  ) AS snapshot(stage_row, display_order);

  PERFORM set_config('careers.skip_domain_audit', 'off', true);

  IF v_before IS DISTINCT FROM v_after THEN
    INSERT INTO careers.audit_logs (
      actor_admin_id,
      action,
      entity_type,
      entity_id,
      before_data,
      after_data
    ) VALUES (
      p_actor_admin_id,
      'job_posting.process_saved',
      'job_posting',
      p_job_posting_id,
      v_before,
      v_after
    );
  END IF;

  RETURN v_after;
EXCEPTION
  WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'CAREERS_POSTING_PROCESS_INVALID_INPUT'
      USING ERRCODE = '22023';
END;
$$;

REVOKE ALL ON FUNCTION careers.audit_domain_change()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION careers.save_job_posting_process(uuid, jsonb, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION careers.save_job_posting_process(uuid, jsonb, uuid)
  TO service_role;
