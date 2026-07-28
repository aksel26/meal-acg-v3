\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_table record;
  v_fk record;
BEGIN
  IF has_schema_privilege('anon', 'careers', 'USAGE')
    OR has_schema_privilege('authenticated', 'careers', 'USAGE') THEN
    RAISE EXCEPTION 'careers schema is exposed to a browser role';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_namespace AS schema_row
    CROSS JOIN LATERAL aclexplode(
      coalesce(schema_row.nspacl, acldefault('n', schema_row.nspowner))
    ) AS privilege_row
    WHERE schema_row.nspname = 'careers'
      AND privilege_row.grantee = 0
      AND privilege_row.privilege_type = 'USAGE'
  ) THEN
    RAISE EXCEPTION 'careers schema is exposed to PUBLIC';
  END IF;

  FOR v_table IN
    SELECT format('%I.%I', schemaname, tablename) AS qualified_name
    FROM pg_tables
    WHERE schemaname = 'careers'
  LOOP
    IF has_table_privilege('anon', v_table.qualified_name, 'SELECT,INSERT,UPDATE,DELETE')
      OR has_table_privilege('authenticated', v_table.qualified_name, 'SELECT,INSERT,UPDATE,DELETE') THEN
      RAISE EXCEPTION 'careers table privilege leak: %', v_table.qualified_name;
    END IF;
    IF NOT has_table_privilege('service_role', v_table.qualified_name, 'SELECT') THEN
      RAISE EXCEPTION 'service_role cannot read careers table: %', v_table.qualified_name;
    END IF;
  END LOOP;
  IF EXISTS (
    SELECT 1
    FROM pg_class AS table_row
    JOIN pg_namespace AS schema_row ON schema_row.oid = table_row.relnamespace
    CROSS JOIN LATERAL aclexplode(
      coalesce(table_row.relacl, acldefault('r', table_row.relowner))
    ) AS privilege_row
    WHERE schema_row.nspname = 'careers'
      AND table_row.relkind = 'r'
      AND privilege_row.grantee = 0
      AND privilege_row.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ) THEN
    RAISE EXCEPTION 'a careers table is exposed to PUBLIC';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class AS table_class
    JOIN pg_namespace AS table_schema ON table_schema.oid = table_class.relnamespace
    WHERE table_schema.nspname = 'careers'
      AND table_class.relkind = 'r'
      AND NOT table_class.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'a careers table does not have RLS enabled';
  END IF;

  IF has_table_privilege('service_role', 'careers.audit_logs', 'UPDATE,DELETE')
    OR has_table_privilege(
      'service_role',
      'careers.application_stage_history',
      'UPDATE,DELETE'
    )
    OR has_table_privilege(
      'service_role',
      'careers.message_history',
      'UPDATE,DELETE'
    ) THEN
    RAISE EXCEPTION 'append-only careers tables are mutable by service_role';
  END IF;

  IF has_table_privilege('service_role', 'careers.job_postings', 'DELETE')
    OR has_table_privilege('service_role', 'careers.applicants', 'DELETE')
    OR has_table_privilege('service_role', 'careers.applications', 'DELETE')
    OR has_table_privilege('service_role', 'careers.applicant_files', 'DELETE')
    OR has_table_privilege('service_role', 'careers.schedule_events', 'DELETE') THEN
    RAISE EXCEPTION 'soft-delete careers tables are hard-deletable by service_role';
  END IF;

  IF has_function_privilege(
      'anon', 'careers.consume_sso_handoff(text)', 'EXECUTE'
    )
    OR has_function_privilege(
      'authenticated', 'careers.transition_application_stage(uuid,uuid,uuid,uuid,text)', 'EXECUTE'
    )
    OR NOT has_function_privilege(
      'service_role', 'careers.consume_sso_handoff(text)', 'EXECUTE'
    )
    OR NOT has_function_privilege(
      'service_role', 'careers.save_job_posting_process(uuid,jsonb,uuid)', 'EXECUTE'
    )
    OR has_function_privilege(
      'anon', 'careers.create_job_posting_with_preset(jsonb,uuid)', 'EXECUTE'
    )
    OR has_function_privilege(
      'authenticated', 'careers.clear_application_final_result(uuid,uuid)', 'EXECUTE'
    )
    OR NOT has_function_privilege(
      'service_role', 'careers.delete_job_posting_cascade(uuid,uuid)', 'EXECUTE'
    )
    OR NOT has_function_privilege(
      'service_role', 'careers.delete_application(uuid,uuid)', 'EXECUTE'
    )
    OR has_function_privilege(
      'authenticated', 'careers.delete_application(uuid,uuid)', 'EXECUTE'
    )
    OR NOT has_function_privilege(
      'service_role',
      'careers.record_application_stage_message(uuid,uuid,jsonb,uuid)',
      'EXECUTE'
    ) THEN
    RAISE EXCEPTION 'careers RPC privileges are invalid';
  END IF;

  IF pg_get_indexdef(
      'careers.job_postings_active_created_id_idx'::regclass
    ) NOT LIKE '%(created_at DESC, id DESC)%WHERE (deleted_at IS NULL)'
    OR pg_get_indexdef(
      'careers.job_postings_active_status_created_id_idx'::regclass
    ) NOT LIKE '%(status, created_at DESC, id DESC)%WHERE (deleted_at IS NULL)'
    OR pg_get_indexdef(
      'careers.applications_status_created_id_idx'::regclass
    ) NOT LIKE '%(status, created_at DESC, id DESC)%'
    OR pg_get_indexdef(
      'careers.schedule_events_active_starts_id_idx'::regclass
    ) NOT LIKE '%(starts_at, id DESC)%WHERE (deleted_at IS NULL)' THEN
    RAISE EXCEPTION 'careers keyset index order or predicate drifted';
  END IF;

  FOR v_fk IN
    SELECT
      constraint_row.conname,
      constraint_row.conrelid,
      constraint_row.conkey
    FROM pg_constraint AS constraint_row
    JOIN pg_namespace AS table_schema
      ON table_schema.oid = constraint_row.connamespace
    WHERE table_schema.nspname = 'careers'
      AND constraint_row.contype = 'f'
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_index AS index_row
      WHERE index_row.indrelid = v_fk.conrelid
        AND index_row.indisvalid
        AND index_row.indisready
        AND v_fk.conkey <@ (index_row.indkey::smallint[])
    ) THEN
      RAISE EXCEPTION 'careers FK has no covering index: %', v_fk.conname;
    END IF;
  END LOOP;
END;
$$;

DO $$
DECLARE
  v_actor_id uuid := gen_random_uuid();
  v_posting_id uuid := gen_random_uuid();
  v_other_posting_id uuid := gen_random_uuid();
  v_stage_one_id uuid := gen_random_uuid();
  v_stage_two_id uuid := gen_random_uuid();
  v_other_stage_id uuid := gen_random_uuid();
  v_other_status_id uuid := gen_random_uuid();
  v_middle_stage_id uuid := gen_random_uuid();
  v_middle_status_id uuid := gen_random_uuid();
  v_tail_stage_id uuid := gen_random_uuid();
  v_tail_status_id uuid := gen_random_uuid();
  v_replacement_stage_id uuid := gen_random_uuid();
  v_replacement_status_id uuid := gen_random_uuid();
  v_status_one_default_id uuid := gen_random_uuid();
  v_status_one_id uuid := gen_random_uuid();
  v_status_two_id uuid := gen_random_uuid();
  v_application careers.applications%ROWTYPE;
  v_default_application careers.applications%ROWTYPE;
  v_separation careers.application_separations%ROWTYPE;
  v_hash text := encode(digest(gen_random_uuid()::text, 'sha256'), 'hex');
  v_expired_hash text := encode(digest(gen_random_uuid()::text, 'sha256'), 'hex');
  v_consumed_member_id uuid;
  v_source_app text;
  v_process jsonb;
  v_count integer;
  v_failed boolean;
BEGIN
  INSERT INTO public.members (
    id, login_id, password, full_name, role, admin_role
  ) VALUES (
    v_actor_id,
    'careers-test-' || v_actor_id::text,
    'careers-test-password',
    'Careers Test Admin',
    'admin',
    '일반'
  );

  INSERT INTO careers.sso_handoffs (
    code_hash, admin_member_id, expires_at
  ) VALUES (
    v_hash, v_actor_id, now() + interval '60 seconds'
  );

  SELECT admin_member_id, source_app
  INTO v_consumed_member_id, v_source_app
  FROM careers.consume_sso_handoff(v_hash);
  IF v_consumed_member_id <> v_actor_id OR v_source_app <> 'admin' THEN
    RAISE EXCEPTION 'SSO consume returned an invalid contract';
  END IF;

  v_failed := false;
  BEGIN
    PERFORM careers.consume_sso_handoff(v_hash);
  EXCEPTION WHEN invalid_parameter_value THEN
    v_failed := SQLERRM = 'CAREERS_SSO_INVALID_OR_EXPIRED';
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'consumed SSO code was reusable';
  END IF;

  INSERT INTO careers.sso_handoffs (
    code_hash, admin_member_id, created_at, expires_at
  ) VALUES (
    v_expired_hash,
    v_actor_id,
    now() - interval '60 seconds',
    now() - interval '1 second'
  );
  v_failed := false;
  BEGIN
    PERFORM careers.consume_sso_handoff(v_expired_hash);
  EXCEPTION WHEN invalid_parameter_value THEN
    v_failed := SQLERRM = 'CAREERS_SSO_INVALID_OR_EXPIRED';
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'expired SSO code was consumed';
  END IF;

  INSERT INTO careers.job_postings (
    id, title, employment_type, created_by, updated_by
  ) VALUES
    (v_posting_id, 'Backend Engineer', 'full_time', v_actor_id, v_actor_id),
    (v_other_posting_id, 'Designer', 'full_time', v_actor_id, v_actor_id);

  v_failed := false;
  BEGIN
    PERFORM careers.save_job_posting_process(
      v_posting_id,
      (
        SELECT jsonb_agg(jsonb_build_object(
          'name', 'Stage ' || sequence_number,
          'type', 'other',
          'statuses', jsonb_build_array()
        ))
        FROM generate_series(1, 21) AS sequence_number
      ),
      v_actor_id
    );
  EXCEPTION WHEN invalid_parameter_value THEN
    v_failed := SQLERRM = 'CAREERS_POSTING_PROCESS_INVALID_INPUT';
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'posting process accepted more than 20 stages';
  END IF;

  v_failed := false;
  BEGIN
    PERFORM careers.save_job_posting_process(
      v_posting_id,
      jsonb_build_array(jsonb_build_object(
        'name', 'Oversized statuses',
        'type', 'other',
        'statuses', (
          SELECT jsonb_agg(jsonb_build_object('name', 'Status ' || sequence_number))
          FROM generate_series(1, 21) AS sequence_number
        )
      )),
      v_actor_id
    );
  EXCEPTION WHEN invalid_parameter_value THEN
    v_failed := SQLERRM = 'CAREERS_POSTING_STAGE_INVALID';
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'posting stage accepted more than 20 statuses';
  END IF;

  v_failed := false;
  BEGIN
    PERFORM careers.save_job_posting_process(
      v_posting_id,
      jsonb_build_array(jsonb_build_object(
        'name', repeat('s', 101),
        'type', 'other',
        'statuses', jsonb_build_array()
      )),
      v_actor_id
    );
  EXCEPTION WHEN invalid_parameter_value THEN
    v_failed := SQLERRM = 'CAREERS_POSTING_STAGE_INVALID';
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'posting process accepted an oversized stage name';
  END IF;

  v_failed := false;
  BEGIN
    PERFORM careers.save_job_posting_process(
      v_posting_id,
      jsonb_build_array(jsonb_build_object(
        'name', 'Oversized message rules',
        'type', 'other',
        'statuses', jsonb_build_array(jsonb_build_object(
          'name', 'Status',
          'messageRules', (
            SELECT jsonb_agg(jsonb_build_object('bodyTemplate', 'Message'))
            FROM generate_series(1, 11)
          )
        ))
      )),
      v_actor_id
    );
  EXCEPTION WHEN invalid_parameter_value THEN
    v_failed := SQLERRM = 'CAREERS_STAGE_STATUS_INVALID';
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'posting status accepted more than 10 message rules';
  END IF;

  v_failed := false;
  BEGIN
    PERFORM careers.save_job_posting_process(
      v_posting_id,
      jsonb_build_array(jsonb_build_object(
        'name', 'Oversized template',
        'type', 'other',
        'statuses', jsonb_build_array(jsonb_build_object(
          'name', 'Status',
          'messageRule', jsonb_build_object(
            'bodyTemplate', repeat('m', 10001)
          )
        ))
      )),
      v_actor_id
    );
  EXCEPTION WHEN invalid_parameter_value THEN
    v_failed := SQLERRM = 'CAREERS_MESSAGE_RULE_INVALID';
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'posting status accepted an oversized message template';
  END IF;

  PERFORM careers.save_job_posting_process(
    v_posting_id,
    jsonb_build_array(
      jsonb_build_object(
        'id', v_stage_one_id,
        'name', 'Document',
        'type', 'document',
        'showOnCalendar', false,
        'statuses', jsonb_build_array(
          jsonb_build_object(
            'id', v_status_one_default_id,
            'name', 'Pending'
          ),
          jsonb_build_object(
            'id', v_status_one_id,
            'name', 'Passed',
            'resultMeaning', 'pass',
            'isTerminal', true,
            'messageRule', jsonb_build_object(
              'isActive', true,
              'subjectTemplate', 'Document result',
              'bodyTemplate', 'The document stage result was recorded.'
            )
          )
        )
      ),
      jsonb_build_object(
        'id', v_stage_two_id,
        'name', 'Interview',
        'type', 'interview',
        'showOnCalendar', true,
        'statuses', jsonb_build_array(
          jsonb_build_object(
            'id', v_status_two_id,
            'name', 'Scheduled'
          )
        )
      )
    ),
    v_actor_id
  );
  PERFORM careers.save_job_posting_process(
    v_other_posting_id,
    jsonb_build_array(
      jsonb_build_object(
        'id', v_other_stage_id,
        'name', 'Other stage',
        'type', 'other',
        'statuses', jsonb_build_array(
          jsonb_build_object(
            'id', v_other_status_id,
            'name', 'Inactive',
            'isActive', false
          )
        )
      )
    ),
    v_actor_id
  );

  IF NOT EXISTS (
    SELECT 1
    FROM careers.stage_message_rules
    WHERE stage_id = v_stage_one_id
      AND status_id = v_status_one_id
      AND is_active
  ) THEN
    RAISE EXCEPTION 'posting process did not persist nested message rule';
  END IF;

  v_failed := false;
  BEGIN
    EXECUTE 'SET LOCAL ROLE anon';
    PERFORM count(*) FROM careers.job_postings;
  EXCEPTION WHEN insufficient_privilege THEN
    v_failed := true;
  END;
  EXECUTE 'RESET ROLE';
  IF NOT v_failed THEN
    RAISE EXCEPTION 'anon role directly read careers data';
  END IF;

  v_failed := false;
  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM count(*) FROM careers.job_postings;
  EXCEPTION WHEN insufficient_privilege THEN
    v_failed := true;
  END;
  EXECUTE 'RESET ROLE';
  IF NOT v_failed THEN
    RAISE EXCEPTION 'authenticated role directly read careers data';
  END IF;

  EXECUTE 'SET LOCAL ROLE service_role';
  PERFORM count(*) FROM careers.job_postings;
  EXECUTE 'RESET ROLE';

  v_failed := false;
  BEGIN
    EXECUTE 'SET LOCAL ROLE anon';
    INSERT INTO storage.objects (bucket_id, name)
    VALUES ('careers-applicant-files', gen_random_uuid()::text);
  EXCEPTION WHEN insufficient_privilege THEN
    v_failed := true;
  END;
  EXECUTE 'RESET ROLE';
  IF NOT v_failed THEN
    RAISE EXCEPTION 'anon role wrote directly to private careers storage';
  END IF;

  v_failed := false;
  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    INSERT INTO storage.objects (bucket_id, name)
    VALUES ('careers-applicant-files', gen_random_uuid()::text);
  EXCEPTION WHEN insufficient_privilege THEN
    v_failed := true;
  END;
  EXECUTE 'RESET ROLE';
  IF NOT v_failed THEN
    RAISE EXCEPTION 'authenticated role wrote directly to private careers storage';
  END IF;

  SELECT *
  INTO v_application
  FROM careers.create_application(
    jsonb_build_object(
      'name', 'Applicant',
      'email', 'applicant@example.com',
      'notes', 'Initial note'
    ),
    jsonb_build_object(
      'jobPostingId', v_posting_id,
      'currentStageId', v_stage_two_id,
      'currentStatusId', v_status_two_id
    ),
    v_actor_id
  );

  SELECT *
  INTO v_default_application
  FROM careers.create_application(
    jsonb_build_object(
      'name', 'Default Process Applicant'
    ),
    jsonb_build_object(
      'jobPostingId', v_posting_id
    ),
    v_actor_id
  );
  IF v_default_application.current_stage_id <> v_stage_one_id
    OR v_default_application.current_status_id <> v_status_one_default_id THEN
    RAISE EXCEPTION 'application did not select the first active stage and status';
  END IF;

  v_failed := false;
  BEGIN
    PERFORM careers.create_application(
      jsonb_build_object('name', 'No Active Status Applicant'),
      jsonb_build_object('jobPostingId', v_other_posting_id),
      v_actor_id
    );
  EXCEPTION WHEN invalid_parameter_value THEN
    v_failed := SQLERRM = 'CAREERS_ACTIVE_STATUS_REQUIRED';
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'application was created without an active stage status';
  END IF;

  v_failed := false;
  BEGIN
    PERFORM careers.create_application(
      jsonb_build_object('name', 'Inactive Status Applicant'),
      jsonb_build_object(
        'jobPostingId', v_other_posting_id,
        'currentStageId', v_other_stage_id,
        'currentStatusId', v_other_status_id
      ),
      v_actor_id
    );
  EXCEPTION WHEN foreign_key_violation THEN
    v_failed := SQLERRM = 'CAREERS_STATUS_STAGE_MISMATCH';
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'application was created with an inactive status';
  END IF;

  UPDATE careers.job_posting_stages
  SET is_active = false,
      updated_by = v_actor_id
  WHERE id = v_other_stage_id;
  v_failed := false;
  BEGIN
    PERFORM careers.create_application(
      jsonb_build_object('name', 'No Active Stage Applicant'),
      jsonb_build_object('jobPostingId', v_other_posting_id),
      v_actor_id
    );
  EXCEPTION WHEN invalid_parameter_value THEN
    v_failed := SQLERRM = 'CAREERS_ACTIVE_STAGE_REQUIRED';
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'application was created without an active stage';
  END IF;
  UPDATE careers.job_posting_stages
  SET is_active = true,
      updated_by = v_actor_id
  WHERE id = v_other_stage_id;

  v_process := careers.save_job_posting_process(
    v_other_posting_id,
    jsonb_build_array(
      jsonb_build_object(
        'id', v_other_stage_id,
        'name', 'Other stage',
        'type', 'other',
        'statuses', jsonb_build_array(
          jsonb_build_object('id', v_other_status_id, 'name', 'Start'),
          jsonb_build_object('id', v_middle_status_id, 'name', 'Middle'),
          jsonb_build_object('id', v_tail_status_id, 'name', 'Tail')
        )
      ),
      jsonb_build_object(
        'id', v_middle_stage_id,
        'name', 'Middle stage',
        'type', 'other',
        'statuses', jsonb_build_array(
          jsonb_build_object('name', 'Only status')
        )
      ),
      jsonb_build_object(
        'id', v_tail_stage_id,
        'name', 'Tail stage',
        'type', 'other',
        'statuses', jsonb_build_array(
          jsonb_build_object('name', 'Only status')
        )
      )
    ),
    v_actor_id
  );

  v_process := careers.save_job_posting_process(
    v_other_posting_id,
    jsonb_build_array(
      jsonb_build_object(
        'id', v_other_stage_id,
        'name', 'Other stage',
        'type', 'other',
        'statuses', jsonb_build_array(
          jsonb_build_object('id', v_other_status_id, 'name', 'Start'),
          jsonb_build_object('id', v_tail_status_id, 'name', 'Tail')
        )
      ),
      jsonb_build_object(
        'id', v_tail_stage_id,
        'name', 'Tail stage',
        'type', 'other',
        'statuses', jsonb_build_array(
          jsonb_build_object('name', 'Only status')
        )
      )
    ),
    v_actor_id
  );
  IF (SELECT display_order FROM careers.job_posting_stages
      WHERE id = v_tail_stage_id) <> 1
    OR (SELECT display_order FROM careers.stage_statuses
      WHERE id = v_tail_status_id) <> 1
    OR (SELECT is_active FROM careers.job_posting_stages
      WHERE id = v_middle_stage_id)
    OR (SELECT is_active FROM careers.stage_statuses
      WHERE id = v_middle_status_id) THEN
    RAISE EXCEPTION 'unused middle process items were not deactivated and renumbered';
  END IF;

  v_process := careers.save_job_posting_process(
    v_other_posting_id,
    jsonb_build_array(
      jsonb_build_object(
        'id', v_other_stage_id,
        'name', 'Other stage',
        'type', 'other',
        'statuses', jsonb_build_array(
          jsonb_build_object('id', v_other_status_id, 'name', 'Start'),
          jsonb_build_object('id', v_replacement_status_id, 'name', 'Replacement'),
          jsonb_build_object('id', v_tail_status_id, 'name', 'Tail')
        )
      ),
      jsonb_build_object(
        'id', v_replacement_stage_id,
        'name', 'Replacement stage',
        'type', 'other',
        'statuses', jsonb_build_array(
          jsonb_build_object('name', 'Only status')
        )
      ),
      jsonb_build_object(
        'id', v_tail_stage_id,
        'name', 'Tail stage',
        'type', 'other',
        'statuses', jsonb_build_array(
          jsonb_build_object('name', 'Only status')
        )
      )
    ),
    v_actor_id
  );
  IF (SELECT display_order FROM careers.job_posting_stages
      WHERE id = v_replacement_stage_id) <> 1
    OR (SELECT display_order FROM careers.stage_statuses
      WHERE id = v_replacement_status_id) <> 1
    OR jsonb_array_length(v_process) <> 3
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_process) AS stages(stage_row)
      WHERE coalesce((stage_row ->> 'is_active')::boolean, false) IS NOT TRUE
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(stage_row -> 'statuses')
            AS statuses(status_row)
          WHERE coalesce((status_row ->> 'is_active')::boolean, false) IS NOT TRUE
        )
    ) THEN
    RAISE EXCEPTION 'deleted process order was not reusable or inactive items leaked';
  END IF;

  v_failed := false;
  BEGIN
    PERFORM careers.transition_application_stage(
      v_application.id,
      v_stage_one_id,
      v_status_two_id,
      v_actor_id,
      'invalid status'
    );
  EXCEPTION WHEN foreign_key_violation THEN
    v_failed := SQLERRM = 'CAREERS_STATUS_STAGE_MISMATCH';
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'application accepted a status from another stage';
  END IF;

  v_failed := false;
  BEGIN
    UPDATE careers.applications
    SET current_stage_id = v_other_stage_id,
        updated_by = v_actor_id
    WHERE id = v_application.id;
  EXCEPTION WHEN foreign_key_violation THEN
    v_failed := true;
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'application accepted a stage from another posting';
  END IF;

  PERFORM careers.transition_application_stage(
    v_application.id,
    v_stage_one_id,
    v_status_one_id,
    v_actor_id,
    'Document passed'
  );

  IF (SELECT count(*) FROM careers.application_stage_history
      WHERE application_id = v_application.id) <> 1 THEN
    RAISE EXCEPTION 'stage transition history was not stored exactly once';
  END IF;

  v_failed := false;
  BEGIN
    INSERT INTO careers.application_stage_history (
      application_id,
      from_stage_id,
      from_status_id,
      to_stage_id,
      to_status_id,
      changed_by,
      reason
    ) VALUES (
      v_application.id,
      v_stage_one_id,
      v_status_two_id,
      v_stage_one_id,
      v_status_one_id,
      v_actor_id,
      'cross-stage mismatch'
    );
  EXCEPTION WHEN foreign_key_violation THEN
    v_failed := true;
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'stage history accepted a status from another stage';
  END IF;

  IF (SELECT count(*) FROM careers.message_history
      WHERE application_id = v_application.id
        AND delivery_mode = 'record_only') <> 0
    OR (SELECT send_meta
        FROM careers.application_stage_records
        WHERE application_id = v_application.id
          AND stage_id = v_stage_one_id) IS NOT NULL THEN
    RAISE EXCEPTION 'legacy rule created message history without send intent';
  END IF;

  v_failed := false;
  BEGIN
    EXECUTE 'SET LOCAL ROLE service_role';
    UPDATE careers.message_history
    SET body = 'tampered'
    WHERE application_id = v_application.id;
  EXCEPTION WHEN insufficient_privilege THEN
    v_failed := true;
  END;
  EXECUTE 'RESET ROLE';
  IF NOT v_failed THEN
    RAISE EXCEPTION 'service_role mutated record-only message history';
  END IF;

  v_failed := false;
  BEGIN
    EXECUTE 'SET LOCAL ROLE service_role';
    DELETE FROM careers.message_history
    WHERE application_id = v_application.id;
  EXCEPTION WHEN insufficient_privilege THEN
    v_failed := true;
  END;
  EXECUTE 'RESET ROLE';
  IF NOT v_failed THEN
    RAISE EXCEPTION 'service_role deleted record-only message history';
  END IF;

  v_failed := false;
  BEGIN
    UPDATE careers.applications
    SET job_posting_id = v_other_posting_id,
        updated_by = v_actor_id
    WHERE id = v_application.id;
  EXCEPTION WHEN invalid_parameter_value THEN
    v_failed := SQLERRM = 'CAREERS_APPLICATION_POSTING_CHANGE_FORBIDDEN';
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'posting changed after stage history existed';
  END IF;

  PERFORM careers.transition_application_stage(
    v_application.id,
    v_stage_one_id,
    v_status_one_id,
    v_actor_id,
    'retry'
  );
  IF (SELECT count(*) FROM careers.application_stage_history
      WHERE application_id = v_application.id) <> 1
    OR (SELECT count(*) FROM careers.message_history
      WHERE application_id = v_application.id) <> 0
    OR (SELECT send_meta
        FROM careers.application_stage_records
        WHERE application_id = v_application.id
          AND stage_id = v_stage_one_id) IS NOT NULL THEN
    RAISE EXCEPTION 'stage transition retry was not idempotent';
  END IF;

  UPDATE careers.stage_statuses
  SET is_active = false,
      updated_by = v_actor_id
  WHERE id = v_status_two_id;
  v_failed := false;
  BEGIN
    PERFORM careers.transition_application_stage(
      v_application.id,
      v_stage_two_id,
      v_status_two_id,
      v_actor_id,
      'inactive transition'
    );
  EXCEPTION WHEN foreign_key_violation THEN
    v_failed := SQLERRM = 'CAREERS_STATUS_STAGE_MISMATCH';
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'application transitioned to an inactive status';
  END IF;
  UPDATE careers.stage_statuses
  SET is_active = true,
      updated_by = v_actor_id
  WHERE id = v_status_two_id;

  UPDATE careers.job_posting_stages
  SET is_active = false,
      updated_by = v_actor_id
  WHERE id = v_stage_two_id;
  v_failed := false;
  BEGIN
    PERFORM careers.transition_application_stage(
      v_application.id,
      v_stage_two_id,
      v_status_two_id,
      v_actor_id,
      'inactive stage transition'
    );
  EXCEPTION WHEN foreign_key_violation THEN
    v_failed := SQLERRM = 'CAREERS_STAGE_POSTING_MISMATCH';
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'application transitioned to an inactive stage';
  END IF;
  UPDATE careers.job_posting_stages
  SET is_active = true,
      updated_by = v_actor_id
  WHERE id = v_stage_two_id;

  PERFORM careers.save_job_posting_process(
    v_posting_id,
    jsonb_build_array(
      jsonb_build_object(
        'id', v_stage_two_id,
        'name', 'Interview',
        'type', 'interview',
        'statuses', jsonb_build_array(
          jsonb_build_object(
            'id', v_status_two_id,
            'name', 'Scheduled'
          )
        )
      )
    ),
    v_actor_id
  );
  IF (SELECT current_stage_id FROM careers.applications
      WHERE id = v_application.id) <> v_stage_two_id
    OR (SELECT current_status_id FROM careers.applications
        WHERE id = v_application.id) <> v_status_two_id
    OR EXISTS (
      SELECT 1
      FROM careers.application_stage_records
      WHERE application_id = v_application.id
        AND stage_id = v_stage_one_id
    ) THEN
    RAISE EXCEPTION 'removed in-use stage did not remap the application';
  END IF;

  PERFORM careers.save_job_posting_process(
    v_posting_id,
    jsonb_build_array(
      jsonb_build_object(
        'id', v_stage_two_id,
        'name', 'Interview',
        'type', 'interview',
        'statuses', jsonb_build_array(
          jsonb_build_object(
            'id', v_status_two_id,
            'name', 'Scheduled'
          )
        )
      ),
      jsonb_build_object(
        'id', v_stage_one_id,
        'name', 'Document',
        'type', 'document',
        'statuses', jsonb_build_array(
          jsonb_build_object(
            'id', v_status_one_id,
            'name', 'Passed',
            'resultMeaning', 'pass'
          )
        )
      )
    ),
    v_actor_id
  );
  SET CONSTRAINTS ALL IMMEDIATE;
  SET CONSTRAINTS ALL DEFERRED;
  IF (SELECT display_order FROM careers.job_posting_stages
      WHERE id = v_stage_two_id) <> 0
    OR (SELECT display_order FROM careers.job_posting_stages
      WHERE id = v_stage_one_id) <> 1 THEN
    RAISE EXCEPTION 'posting process did not atomically reorder stages';
  END IF;

  PERFORM careers.set_application_final_result(
    v_application.id, 'hired', v_actor_id, 'Offer'
  );
  IF (SELECT count(*) FROM careers.application_stage_history
      WHERE application_id = v_application.id) <> 2 THEN
    RAISE EXCEPTION 'final result changed stage history';
  END IF;

  SELECT *
  INTO v_separation
  FROM careers.separate_application(
    v_application.id, v_actor_id, 'Hold'
  );
  IF v_separation.snapshot #>> '{application,status}' <> 'completed'
    OR v_separation.snapshot #>> '{applicant,name}' <> 'Applicant' THEN
    RAISE EXCEPTION 'separation snapshot did not preserve historical state';
  END IF;

  PERFORM careers.restore_application(v_application.id, v_actor_id);
  IF (SELECT status FROM careers.applications WHERE id = v_application.id) <> 'completed'
    OR (SELECT restored_at FROM careers.application_separations
        WHERE id = v_separation.id) IS NULL THEN
    RAISE EXCEPTION 'application restore did not restore snapshot state';
  END IF;

  INSERT INTO careers.schedule_events (
    application_id, job_posting_id, stage_id, title,
    starts_at, ends_at, created_by, updated_by
  ) VALUES
    (
      v_application.id, v_posting_id, v_stage_one_id, 'Interview 1',
      now() + interval '1 day', now() + interval '1 day 1 hour',
      v_actor_id, v_actor_id
    ),
    (
      v_application.id, v_posting_id, v_stage_one_id, 'Interview 2',
      now() + interval '2 days', now() + interval '2 days 1 hour',
      v_actor_id, v_actor_id
    );
  SELECT count(*) INTO v_count
  FROM careers.schedule_events
  WHERE application_id = v_application.id;
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'multiple schedules per application were not retained';
  END IF;

  FOREACH v_source_app IN ARRAY ARRAY[
    'job_postings',
    'applicants',
    'applications',
    'applicant_files',
    'schedule_events'
  ]
  LOOP
    v_failed := false;
    BEGIN
      EXECUTE 'SET LOCAL ROLE service_role';
      EXECUTE format('DELETE FROM careers.%I WHERE false', v_source_app);
    EXCEPTION WHEN insufficient_privilege THEN
      v_failed := true;
    END;
    EXECUTE 'RESET ROLE';
    IF NOT v_failed THEN
      RAISE EXCEPTION 'service_role retained hard-delete privilege on %', v_source_app;
    END IF;
  END LOOP;

  UPDATE careers.applicants
  SET deleted_at = now(),
      deleted_by = v_actor_id,
      updated_by = v_actor_id
  WHERE id = v_application.applicant_id;
  IF EXISTS (
    SELECT 1
    FROM careers.applicants
    WHERE id = v_application.applicant_id
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'soft-deleted applicant remained in active query';
  END IF;

  v_failed := false;
  BEGIN
    UPDATE careers.audit_logs
    SET action = 'tampered'
    WHERE entity_id = v_application.id;
  EXCEPTION WHEN object_not_in_prerequisite_state THEN
    v_failed := SQLERRM = 'CAREERS_APPEND_ONLY';
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'audit log update was not blocked';
  END IF;

  v_failed := false;
  BEGIN
    DELETE FROM careers.audit_logs
    WHERE entity_id = v_application.id;
  EXCEPTION WHEN object_not_in_prerequisite_state THEN
    v_failed := SQLERRM = 'CAREERS_APPEND_ONLY';
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'audit log delete was not blocked';
  END IF;

  v_failed := false;
  BEGIN
    UPDATE careers.application_stage_history
    SET reason = 'tampered'
    WHERE application_id = v_application.id;
  EXCEPTION WHEN object_not_in_prerequisite_state THEN
    v_failed := SQLERRM = 'CAREERS_APPEND_ONLY';
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'stage history update was not blocked';
  END IF;

  v_failed := false;
  BEGIN
    DELETE FROM careers.application_stage_history
    WHERE application_id = v_application.id;
  EXCEPTION WHEN object_not_in_prerequisite_state THEN
    v_failed := SQLERRM = 'CAREERS_APPEND_ONLY';
  END;
  IF NOT v_failed THEN
    RAISE EXCEPTION 'stage history delete was not blocked';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM careers.audit_logs
    WHERE entity_id = v_application.id
      AND action = 'application.stage_transition'
  ) THEN
    RAISE EXCEPTION 'application transition audit was not atomic';
  END IF;
END;
$$;

DO $$
DECLARE
  v_actor_id uuid := gen_random_uuid();
  v_posting careers.job_postings%ROWTYPE;
  v_second_posting careers.job_postings%ROWTYPE;
  v_application careers.applications%ROWTYPE;
  v_applicant_id uuid;
  v_stage_id uuid;
  v_status_id uuid;
  v_early_stage_id uuid;
  v_early_status_id uuid;
  v_later_status_id uuid;
  v_question_id uuid;
  v_shared_application careers.applications%ROWTYPE;
  v_orphan_application careers.applications%ROWTYPE;
  v_separation careers.application_separations%ROWTYPE;
  v_separated_at timestamptz;
  v_deleted_at timestamptz;
BEGIN
  INSERT INTO public.members (
    id, login_id, password, full_name, role, admin_role
  ) VALUES (
    v_actor_id,
    'careers-parity-' || v_actor_id::text,
    'careers-parity-password',
    'Careers Parity Admin',
    'admin',
    '일반'
  );

  PERFORM careers.save_process_preset(
    jsonb_build_array(
      jsonb_build_object(
        'name', '서류',
        'showOnCalendar', false,
        'autoSend', jsonb_build_object(
          'enabled', false,
          'channels', jsonb_build_array('email', 'sms'),
          'title', '{{전형단계명}} 안내',
          'body', '지원자 {{지원자명}}'
        ),
        'statuses', jsonb_build_array(
          jsonb_build_object(
            'name', '대기',
            'color', 'gray',
            'hasDateInput', true
          ),
          jsonb_build_object(
            'name', '완료',
            'color', 'green',
            'hasDateInput', true
          )
        )
      ),
      jsonb_build_object(
        'name', '면접',
        'showOnCalendar', true,
        'autoSend', jsonb_build_object(
          'enabled', true,
          'channels', jsonb_build_array('email', 'sms'),
          'title', '면접 안내',
          'body', '{{면접일시}}'
        ),
        'statuses', jsonb_build_array(
          jsonb_build_object(
            'name', '안내',
            'color', 'gray',
            'hasDateInput', true
          ),
          jsonb_build_object(
            'name', '진행완료',
            'color', 'purple',
            'hasDateInput', true
          )
        )
      )
    ),
    v_actor_id
  );

  SELECT *
  INTO v_posting
  FROM careers.create_job_posting_with_preset(
    jsonb_build_object(
      'title', 'Parity Engineer',
      'field', '플랫폼 개발',
      'careerType', '경력',
      'employmentType', '정규직',
      'startDate', current_date::text,
      'endDate', (current_date + 30)::text,
      'isPublic', true,
      'description', '한 줄 소개',
      'content', '공고 본문',
      'coverLetterQuestions', jsonb_build_array(
        jsonb_build_object(
          'question', '지원 동기를 작성해주세요.',
          'maxLength', 1000
        )
      )
    ),
    v_actor_id
  );

  SELECT *
  INTO v_second_posting
  FROM careers.create_job_posting_with_preset(
    jsonb_build_object(
      'title', 'Parity Designer',
      'field', '제품 디자인',
      'careerType', '신입',
      'employmentType', '인턴',
      'startDate', current_date::text,
      'endDate', (current_date + 15)::text,
      'isPublic', false
    ),
    v_actor_id
  );

  IF v_posting.field <> '플랫폼 개발'
    OR v_posting.career_type <> '경력'
    OR NOT v_posting.is_public
    OR v_posting.content <> '공고 본문'
    OR (SELECT count(*) FROM careers.job_posting_stages
        WHERE job_posting_id = v_posting.id AND is_active) <> 2
    OR EXISTS (
      SELECT 1
      FROM careers.job_posting_stages AS first_stage
      JOIN careers.job_posting_stages AS second_stage
        ON second_stage.id = first_stage.id
      WHERE first_stage.job_posting_id = v_posting.id
        AND second_stage.job_posting_id = v_second_posting.id
    ) THEN
    RAISE EXCEPTION 'posting preset was not cloned as an independent snapshot';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM careers.job_posting_stages AS stage
    WHERE stage.job_posting_id = v_posting.id
      AND stage.is_active
      AND (
        (SELECT count(*) FROM careers.stage_statuses AS status
         WHERE status.stage_id = stage.id
           AND status.is_active
           AND status.is_default) <> 1
        OR
        (SELECT count(*) FROM careers.stage_statuses AS status
         WHERE status.stage_id = stage.id
           AND status.is_active
           AND status.is_completion) <> 1
      )
  ) THEN
    RAISE EXCEPTION 'positional stage status flags were not synchronized';
  END IF;

  SELECT id
  INTO v_question_id
  FROM careers.cover_letter_questions
  WHERE job_posting_id = v_posting.id
    AND is_active;

  SELECT stage.id, status.id
  INTO v_stage_id, v_status_id
  FROM careers.job_posting_stages AS stage
  JOIN careers.stage_statuses AS status
    ON status.stage_id = stage.id
   AND status.is_active
   AND status.is_default
  WHERE stage.job_posting_id = v_posting.id
    AND stage.name = '면접'
    AND stage.is_active;

  SELECT *
  INTO v_application
  FROM careers.create_application(
    jsonb_build_object(
      'name', '김지원',
      'platform', '링크드인',
      'gender', '여성',
      'birthDate', '1998-04-03',
      'email', 'applicant@example.com',
      'phone', '010-1234-5678',
      'region', '서울',
      'regionDetail', '강남구',
      'address', '서울특별시 강남구',
      'educations', jsonb_build_array(
        jsonb_build_object('schoolName', 'ACG대학교')
      ),
      'certificates', '[]'::jsonb,
      'careerEntries', jsonb_build_array(
        jsonb_build_object('company', 'ACG')
      ),
      'activities', '[]'::jsonb,
      'statisticsPackages', '[]'::jsonb,
      'thesis', jsonb_build_object('title', '채용 시스템'),
      'submissionStatus', '완료',
      'memo', '우선 검토'
    ),
    jsonb_build_object(
      'jobPostingId', v_posting.id,
      'coverLetter', jsonb_build_array(
        jsonb_build_object(
          'questionId', v_question_id,
          'question', '지원 동기를 작성해주세요.',
          'answer', '제품과 조직에 기여하고 싶습니다.'
        )
      )
    ),
    v_actor_id
  );
  v_applicant_id := v_application.applicant_id;

  IF (SELECT platform FROM careers.applicants WHERE id = v_applicant_id)
      <> '링크드인'
    OR (SELECT gender FROM careers.applicants WHERE id = v_applicant_id)
      <> '여성'
    OR (SELECT submission_status FROM careers.applicants
        WHERE id = v_applicant_id) <> '완료'
    OR (SELECT count(*) FROM careers.application_cover_letter_answers
        WHERE application_id = v_application.id) <> 1
    OR (SELECT count(*) FROM careers.application_stage_records
        WHERE application_id = v_application.id) <> 2 THEN
    RAISE EXCEPTION 'full applicant profile or embedded records were not persisted';
  END IF;

  PERFORM careers.update_application(
    v_application.id,
    '{}'::jsonb,
    jsonb_build_object('jobPostingId', v_second_posting.id),
    v_actor_id
  );
  IF (SELECT job_posting_id FROM careers.applications
      WHERE id = v_application.id) <> v_second_posting.id
    OR EXISTS (
      SELECT 1
      FROM careers.application_stage_records AS record
      JOIN careers.job_posting_stages AS stage
        ON stage.id = record.stage_id
      WHERE record.application_id = v_application.id
        AND stage.job_posting_id <> v_second_posting.id
    )
    OR (SELECT count(*) FROM careers.application_stage_history
        WHERE application_id = v_application.id
          AND reason = 'job posting changed') <> 1 THEN
    RAISE EXCEPTION 'application posting change did not reinitialize its process';
  END IF;

  PERFORM careers.update_application(
    v_application.id,
    '{}'::jsonb,
    jsonb_build_object('jobPostingId', v_posting.id),
    v_actor_id
  );
  IF (SELECT job_posting_id FROM careers.applications
      WHERE id = v_application.id) <> v_posting.id
    OR (SELECT count(*) FROM careers.application_stage_history
        WHERE application_id = v_application.id
          AND reason = 'job posting changed') <> 2 THEN
    RAISE EXCEPTION 'application posting change bypass was not safely repeatable';
  END IF;

  SELECT status.id
  INTO v_later_status_id
  FROM careers.stage_statuses AS status
  WHERE status.stage_id = v_stage_id
    AND status.is_active
    AND NOT status.is_default
  ORDER BY status.display_order DESC, status.id
  LIMIT 1;

  SELECT stage.id, status.id
  INTO v_early_stage_id, v_early_status_id
  FROM careers.job_posting_stages AS stage
  JOIN careers.stage_statuses AS status
    ON status.stage_id = stage.id
   AND status.is_active
   AND NOT status.is_default
  WHERE stage.job_posting_id = v_posting.id
    AND stage.name = '서류'
    AND stage.is_active
  ORDER BY status.display_order DESC, status.id
  LIMIT 1;

  PERFORM careers.transition_application_stage(
    v_application.id,
    v_stage_id,
    v_later_status_id,
    v_actor_id,
    '뒤 단계 진행'
  );
  PERFORM careers.transition_application_stage(
    v_application.id,
    v_early_stage_id,
    v_early_status_id,
    v_actor_id,
    '앞 단계 보정'
  );
  IF (SELECT current_stage_id FROM careers.applications
      WHERE id = v_application.id) <> v_stage_id
    OR (SELECT current_status_id FROM careers.applications
        WHERE id = v_application.id) <> v_later_status_id THEN
    RAISE EXCEPTION 'earlier stage edit replaced the canonical later pointer';
  END IF;

  PERFORM careers.transition_application_stage(
    v_application.id,
    v_stage_id,
    v_later_status_id,
    v_actor_id,
    '면접 일정 등록',
    jsonb_build_object(
      'startDate', current_date::text,
      'endDate', current_date::text,
      'time', '10:00',
      'note', '2층 회의실',
      'send', jsonb_build_object(
        'sentAt', now(),
        'channels', jsonb_build_array('email'),
        'auto', true,
        'subject', '면접 안내'
      )
    )
  );

  IF (SELECT note FROM careers.application_stage_records
      WHERE application_id = v_application.id
        AND stage_id = v_stage_id) <> '2층 회의실'
    OR (SELECT bucket FROM careers.derived_schedule_events
        WHERE application_id = v_application.id
          AND stage_id = v_stage_id) <> 'upcoming' THEN
    RAISE EXCEPTION 'stage metadata did not derive an upcoming schedule';
  END IF;
  IF (SELECT count(*) FROM careers.message_history
      WHERE application_id = v_application.id
        AND channel = 'email'
        AND delivery_mode = 'record_only'
        AND body = '') <> 1
    OR (SELECT send_meta ->> 'subject'
        FROM careers.application_stage_records
        WHERE application_id = v_application.id
          AND stage_id = v_stage_id) <> '면접 안내' THEN
    RAISE EXCEPTION 'transition send metadata was not recorded append-only';
  END IF;

  PERFORM careers.record_application_stage_message(
    v_application.id,
    v_stage_id,
    jsonb_build_object(
      'channels', jsonb_build_array('sms'),
      'auto', false,
      'body', '재발송 안내입니다.'
    ),
    v_actor_id
  );
  IF (SELECT count(*) FROM careers.message_history
      WHERE application_id = v_application.id
        AND delivery_mode = 'record_only') <> 2
    OR (SELECT send_meta ->> 'subject'
        FROM careers.application_stage_records
        WHERE application_id = v_application.id
          AND stage_id = v_stage_id) <> ''
    OR NOT EXISTS (
      SELECT 1
      FROM careers.message_history
      WHERE application_id = v_application.id
        AND channel = 'sms'
        AND subject = ''
        AND body = '재발송 안내입니다.'
    ) THEN
    RAISE EXCEPTION 'manual resend did not append history and replace send metadata';
  END IF;

  PERFORM careers.set_application_final_result(
    v_application.id,
    'hired',
    v_actor_id,
    '최종 합격'
  );
  PERFORM careers.clear_application_final_result(
    v_application.id,
    v_actor_id
  );
  IF EXISTS (
    SELECT 1
    FROM careers.application_final_results
    WHERE application_id = v_application.id
  )
    OR (SELECT status FROM careers.applications
        WHERE id = v_application.id) <> 'active' THEN
    RAISE EXCEPTION 'final result clear did not unlock the application';
  END IF;

  SELECT *
  INTO v_separation
  FROM careers.separate_application(
    v_application.id,
    v_actor_id,
    '최초 사유'
  );
  v_separated_at := v_separation.separated_at;
  SELECT *
  INTO v_separation
  FROM careers.update_application_separation_reason(
    v_application.id,
    '수정된 별도 관리 사유',
    v_actor_id
  );
  IF v_separation.reason <> '수정된 별도 관리 사유'
    OR v_separation.separated_at <> v_separated_at THEN
    RAISE EXCEPTION 'separation reason edit changed the separation timestamp';
  END IF;
  IF v_separation.snapshot #>> '{application,current_stage_id}'
      <> v_stage_id::text
    OR v_separation.snapshot #>> '{application,current_status_id}'
      <> v_later_status_id::text THEN
    RAISE EXCEPTION 'separation snapshot did not use the canonical pointer';
  END IF;

  PERFORM careers.set_application_final_result(
    v_application.id,
    'hired',
    v_actor_id,
    '별도 관리 중 합격'
  );
  PERFORM careers.set_application_final_result(
    v_application.id,
    'rejected',
    v_actor_id,
    '별도 관리 중 결과 수정'
  );
  IF (SELECT status FROM careers.applications
      WHERE id = v_application.id) <> 'separated'
    OR (SELECT result FROM careers.application_final_results
        WHERE application_id = v_application.id) <> 'rejected' THEN
    RAISE EXCEPTION 'final result update changed separated application status';
  END IF;

  SELECT *
  INTO v_shared_application
  FROM careers.create_application(
    jsonb_build_object('id', v_applicant_id),
    jsonb_build_object('jobPostingId', v_second_posting.id),
    v_actor_id
  );
  PERFORM careers.delete_application(
    v_shared_application.id,
    v_actor_id
  );
  IF (SELECT deleted_at FROM careers.applications
      WHERE id = v_shared_application.id) IS NULL
    OR (SELECT deleted_at FROM careers.applicants
        WHERE id = v_applicant_id) IS NOT NULL
    OR NOT EXISTS (
      SELECT 1
      FROM careers.audit_logs
      WHERE entity_id = v_shared_application.id
        AND entity_type = 'applications'
        AND after_data ->> 'deleted_at' IS NOT NULL
    ) THEN
    RAISE EXCEPTION 'single delete removed a shared applicant or missed audit';
  END IF;

  SELECT *
  INTO v_orphan_application
  FROM careers.create_application(
    jsonb_build_object(
      'name', '단일 지원자',
      'email', 'single-application@example.com'
    ),
    jsonb_build_object('jobPostingId', v_second_posting.id),
    v_actor_id
  );
  PERFORM careers.delete_application(
    v_orphan_application.id,
    v_actor_id
  );
  IF (SELECT deleted_at FROM careers.applications
      WHERE id = v_orphan_application.id) IS NULL
    OR (SELECT deleted_at FROM careers.applicants
        WHERE id = v_orphan_application.applicant_id) IS NULL THEN
    RAISE EXCEPTION 'single delete did not soft-delete an orphan applicant';
  END IF;

  PERFORM careers.update_job_posting_with_questions(
    v_posting.id,
    jsonb_build_object(
      'content', '수정된 공고 본문',
      'coverLetterQuestions', jsonb_build_array(
        jsonb_build_object('question', '새 자기소개서 문항')
      )
    ),
    v_actor_id
  );
  IF (SELECT content FROM careers.job_postings WHERE id = v_posting.id)
      <> '수정된 공고 본문'
    OR (SELECT count(*) FROM careers.cover_letter_questions
        WHERE job_posting_id = v_posting.id AND is_active) <> 1
    OR (SELECT question_snapshot
        FROM careers.application_cover_letter_answers
        WHERE application_id = v_application.id)
      <> '지원 동기를 작성해주세요.' THEN
    RAISE EXCEPTION 'posting question replacement lost a historical answer';
  END IF;

  SELECT deleted_at
  INTO v_deleted_at
  FROM careers.delete_job_posting_cascade(
    v_posting.id,
    v_actor_id
  );
  IF v_deleted_at IS NULL
    OR (SELECT deleted_at FROM careers.applications
        WHERE id = v_application.id) IS NULL
    OR (SELECT deleted_at FROM careers.applicants
        WHERE id = v_applicant_id) IS NULL THEN
    RAISE EXCEPTION 'posting cascade did not soft-delete owned records';
  END IF;

  IF (SELECT deleted_at
      FROM careers.delete_job_posting_cascade(
        v_posting.id,
        v_actor_id
      )) <> v_deleted_at THEN
    RAISE EXCEPTION 'posting cascade was not idempotent';
  END IF;

  PERFORM careers.delete_job_posting_cascade(
    v_second_posting.id,
    v_actor_id
  );
END;
$$;

ROLLBACK;
