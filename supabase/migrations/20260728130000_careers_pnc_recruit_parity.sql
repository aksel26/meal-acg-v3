ALTER TABLE careers.job_postings
  ADD COLUMN field text,
  ADD COLUMN career_type text,
  ADD COLUMN start_date date,
  ADD COLUMN end_date date,
  ADD COLUMN is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN content text NOT NULL DEFAULT '';

UPDATE careers.job_postings
SET field = coalesce(nullif(btrim(department), ''), title),
    career_type = '신입',
    start_date = coalesce(published_at::date, created_at::date),
    end_date = coalesce(closes_at::date, published_at::date, created_at::date),
    is_public = status = 'open',
    content = coalesce(description, '')
WHERE field IS NULL
   OR career_type IS NULL
   OR start_date IS NULL
   OR end_date IS NULL;

ALTER TABLE careers.job_postings
  ADD CONSTRAINT job_postings_field_not_blank
    CHECK (btrim(field) <> ''),
  ADD CONSTRAINT job_postings_career_type_check
    CHECK (career_type IN ('신입', '경력')),
  ADD CONSTRAINT job_postings_date_range_check
    CHECK (end_date >= start_date);

CREATE TABLE careers.cover_letter_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id uuid NOT NULL REFERENCES careers.job_postings(id),
  question text NOT NULL CHECK (btrim(question) <> ''),
  max_length integer CHECK (max_length IS NULL OR max_length > 0),
  display_order integer NOT NULL CHECK (display_order >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES public.members(id),
  updated_by uuid NOT NULL REFERENCES public.members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, job_posting_id)
);

CREATE UNIQUE INDEX cover_letter_questions_active_order_uidx
  ON careers.cover_letter_questions (job_posting_id, display_order)
  WHERE is_active;
CREATE INDEX cover_letter_questions_posting_idx
  ON careers.cover_letter_questions (job_posting_id);
CREATE INDEX cover_letter_questions_created_by_idx
  ON careers.cover_letter_questions (created_by);
CREATE INDEX cover_letter_questions_updated_by_idx
  ON careers.cover_letter_questions (updated_by);

ALTER TABLE careers.job_posting_stages
  ALTER COLUMN stage_type SET DEFAULT 'other',
  ALTER COLUMN show_on_calendar SET DEFAULT false,
  ADD COLUMN message_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN message_channels text[] NOT NULL DEFAULT ARRAY['email', 'sms']::text[],
  ADD COLUMN message_subject_template text NOT NULL DEFAULT '{{전형단계명}} 안내',
  ADD COLUMN message_body_template text NOT NULL DEFAULT '',
  ADD CONSTRAINT job_posting_stages_message_channels_check
    CHECK (message_channels <@ ARRAY['email', 'sms']::text[]),
  ADD CONSTRAINT job_posting_stages_message_subject_length_check
    CHECK (char_length(message_subject_template) <= 200),
  ADD CONSTRAINT job_posting_stages_message_body_length_check
    CHECK (char_length(message_body_template) <= 10000);

ALTER TABLE careers.stage_statuses
  ADD COLUMN color text NOT NULL DEFAULT 'gray',
  ADD COLUMN is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN is_completion boolean NOT NULL DEFAULT false,
  ADD COLUMN has_date_input boolean NOT NULL DEFAULT true,
  ADD CONSTRAINT stage_statuses_color_not_blank
    CHECK (btrim(color) <> '');

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY stage_id ORDER BY display_order, id
    ) AS row_number,
    count(*) OVER (PARTITION BY stage_id) AS row_count
  FROM careers.stage_statuses
  WHERE is_active
)
UPDATE careers.stage_statuses AS status
SET is_default = ranked.row_number = 1,
    is_completion = ranked.row_number = ranked.row_count,
    is_terminal = ranked.row_number = ranked.row_count,
    result_meaning = 'neutral'
FROM ranked
WHERE ranked.id = status.id;

CREATE UNIQUE INDEX stage_statuses_one_default_uidx
  ON careers.stage_statuses (stage_id)
  WHERE is_active AND is_default;
CREATE UNIQUE INDEX stage_statuses_one_completion_uidx
  ON careers.stage_statuses (stage_id)
  WHERE is_active AND is_completion;

ALTER TABLE careers.applicants
  ADD COLUMN platform text,
  ADD COLUMN gender text,
  ADD COLUMN birth_date date,
  ADD COLUMN region text,
  ADD COLUMN region_detail text,
  ADD COLUMN address text,
  ADD COLUMN educations jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN certificates jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN career_entries jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN activities jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN statistics_packages jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN thesis jsonb,
  ADD COLUMN submission_status text NOT NULL DEFAULT '미완료',
  ADD CONSTRAINT applicants_gender_check
    CHECK (gender IS NULL OR gender IN ('남성', '여성')),
  ADD CONSTRAINT applicants_submission_status_check
    CHECK (submission_status IN ('완료', '미완료')),
  ADD CONSTRAINT applicants_educations_array_check
    CHECK (jsonb_typeof(educations) = 'array'),
  ADD CONSTRAINT applicants_certificates_array_check
    CHECK (jsonb_typeof(certificates) = 'array'),
  ADD CONSTRAINT applicants_career_entries_array_check
    CHECK (jsonb_typeof(career_entries) = 'array'),
  ADD CONSTRAINT applicants_activities_array_check
    CHECK (jsonb_typeof(activities) = 'array'),
  ADD CONSTRAINT applicants_statistics_packages_array_check
    CHECK (jsonb_typeof(statistics_packages) = 'array'),
  ADD CONSTRAINT applicants_thesis_object_check
    CHECK (thesis IS NULL OR jsonb_typeof(thesis) = 'object');

ALTER TABLE careers.applications
  ADD COLUMN display_no bigint GENERATED BY DEFAULT AS IDENTITY,
  ADD COLUMN deleted_at timestamptz,
  ADD COLUMN deleted_by uuid REFERENCES public.members(id),
  ADD CONSTRAINT applications_soft_delete_check
    CHECK ((deleted_at IS NULL) = (deleted_by IS NULL));

CREATE UNIQUE INDEX applications_display_no_uidx
  ON careers.applications (display_no);
CREATE INDEX applications_deleted_by_idx
  ON careers.applications (deleted_by)
  WHERE deleted_by IS NOT NULL;
CREATE INDEX applications_active_posting_idx
  ON careers.applications (job_posting_id, applied_at DESC, id)
  WHERE deleted_at IS NULL;

CREATE TABLE careers.application_cover_letter_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES careers.applications(id),
  question_id uuid NOT NULL,
  question_snapshot text NOT NULL CHECK (btrim(question_snapshot) <> ''),
  answer text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.members(id),
  updated_by uuid NOT NULL REFERENCES public.members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, question_id)
);

CREATE INDEX application_cover_letter_answers_application_idx
  ON careers.application_cover_letter_answers (application_id);
CREATE INDEX application_cover_letter_answers_created_by_idx
  ON careers.application_cover_letter_answers (created_by);
CREATE INDEX application_cover_letter_answers_updated_by_idx
  ON careers.application_cover_letter_answers (updated_by);

CREATE TABLE careers.application_stage_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  application_id uuid NOT NULL REFERENCES careers.applications(id),
  stage_id uuid NOT NULL REFERENCES careers.job_posting_stages(id),
  status_id uuid NOT NULL,
  start_date date,
  end_date date,
  event_time time,
  note text,
  send_meta jsonb,
  created_by uuid NOT NULL REFERENCES public.members(id),
  updated_by uuid NOT NULL REFERENCES public.members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (application_id, stage_id),
  FOREIGN KEY (status_id, stage_id)
    REFERENCES careers.stage_statuses(id, stage_id),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CHECK (send_meta IS NULL OR jsonb_typeof(send_meta) = 'object')
);

CREATE INDEX application_stage_records_stage_status_idx
  ON careers.application_stage_records (stage_id, status_id);
CREATE INDEX application_stage_records_status_stage_idx
  ON careers.application_stage_records (status_id, stage_id);
CREATE INDEX application_stage_records_created_by_idx
  ON careers.application_stage_records (created_by);
CREATE INDEX application_stage_records_updated_by_idx
  ON careers.application_stage_records (updated_by);
CREATE INDEX application_stage_records_schedule_idx
  ON careers.application_stage_records (end_date, event_time, application_id)
  WHERE event_time IS NOT NULL;

ALTER TABLE careers.application_separations
  ADD COLUMN updated_by uuid REFERENCES public.members(id),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE careers.message_history
  DROP CONSTRAINT message_history_body_check,
  ADD CONSTRAINT message_history_template_content_check
    CHECK (
      nullif(btrim(coalesce(subject, '')), '') IS NOT NULL
      OR nullif(btrim(body), '') IS NOT NULL
    );

UPDATE careers.application_separations
SET updated_by = separated_by
WHERE updated_by IS NULL;

CREATE INDEX application_separations_updated_by_idx
  ON careers.application_separations (updated_by);

CREATE TABLE careers.process_presets (
  id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  stages jsonb NOT NULL CHECK (jsonb_typeof(stages) = 'array'),
  created_by uuid REFERENCES public.members(id),
  updated_by uuid REFERENCES public.members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX process_presets_created_by_idx
  ON careers.process_presets (created_by)
  WHERE created_by IS NOT NULL;
CREATE INDEX process_presets_updated_by_idx
  ON careers.process_presets (updated_by)
  WHERE updated_by IS NOT NULL;

INSERT INTO careers.process_presets (singleton, stages)
VALUES (
  true,
  '[
    {
      "name": "인성검사",
      "showOnCalendar": false,
      "autoSend": {
        "enabled": false,
        "channels": ["email", "sms"],
        "title": "[{{회사명}}] 인성검사 안내",
        "body": "안녕하세요, {{지원자명}}님.\n{{회사명}} {{포지션명}} 채용 인성검사 안내드립니다.\n아래 링크를 통해 진행해 주시기 바랍니다.\n\n{{링크}}"
      },
      "statuses": [
        {"name": "안내", "color": "gray", "hasDateInput": true},
        {"name": "공고등록", "color": "orange", "hasDateInput": true},
        {"name": "진행완료", "color": "purple", "hasDateInput": true}
      ]
    },
    {
      "name": "자사양식",
      "showOnCalendar": false,
      "autoSend": {
        "enabled": false,
        "channels": ["email", "sms"],
        "title": "[{{회사명}}] 자사양식 작성 안내",
        "body": "안녕하세요, {{지원자명}}님.\n{{회사명}} {{포지션명}} 채용 자사 지원서 작성을 안내드립니다.\n아래 링크에서 작성해 주시기 바랍니다.\n\n{{링크}}"
      },
      "statuses": [
        {"name": "안내", "color": "gray", "hasDateInput": true},
        {"name": "작성완료", "color": "green", "hasDateInput": true}
      ]
    },
    {
      "name": "면접",
      "showOnCalendar": true,
      "autoSend": {
        "enabled": false,
        "channels": ["email", "sms"],
        "title": "[{{회사명}}] 면접 안내",
        "body": "안녕하세요, {{지원자명}}님.\n{{회사명}} {{포지션명}} 면접 일정을 안내드립니다.\n일시: {{면접일시}}\n장소: {{면접장소}}"
      },
      "statuses": [
        {"name": "안내", "color": "gray", "hasDateInput": true},
        {"name": "진행완료", "color": "purple", "hasDateInput": true}
      ]
    },
    {
      "name": "최종",
      "showOnCalendar": false,
      "autoSend": {
        "enabled": false,
        "channels": ["email", "sms"],
        "title": "[{{회사명}}] 최종 전형 안내",
        "body": "안녕하세요, {{지원자명}}님.\n{{회사명}} {{포지션명}} 최종 전형 안내드립니다.\n\n{{링크}}"
      },
      "statuses": [
        {"name": "안내", "color": "gray", "hasDateInput": true},
        {"name": "전형완료", "color": "green", "hasDateInput": true}
      ]
    }
  ]'::jsonb
);

CREATE OR REPLACE FUNCTION careers.sync_application_current_pointer(
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
  v_stage_id uuid;
  v_status_id uuid;
BEGIN
  IF p_application_id IS NULL OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'CAREERS_CURRENT_POINTER_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_application
  FROM careers.applications
  WHERE id = p_application_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAREERS_APPLICATION_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT candidate.stage_id, candidate.status_id
  INTO v_stage_id, v_status_id
  FROM (
    SELECT
      stage.id AS stage_id,
      coalesce(record_status.id, default_status.id) AS status_id,
      record_status.id IS NOT NULL
        AND record_status.id <> default_status.id AS is_non_default,
      stage.display_order
    FROM careers.job_posting_stages AS stage
    CROSS JOIN LATERAL (
      SELECT status.id
      FROM careers.stage_statuses AS status
      WHERE status.stage_id = stage.id
        AND status.is_active
      ORDER BY status.is_default DESC, status.display_order, status.id
      LIMIT 1
    ) AS default_status
    LEFT JOIN careers.application_stage_records AS record
      ON record.application_id = p_application_id
     AND record.stage_id = stage.id
    LEFT JOIN careers.stage_statuses AS record_status
      ON record_status.id = record.status_id
     AND record_status.stage_id = stage.id
     AND record_status.is_active
    WHERE stage.job_posting_id = v_application.job_posting_id
      AND stage.is_active
  ) AS candidate
  ORDER BY
    candidate.is_non_default DESC,
    CASE
      WHEN candidate.is_non_default THEN candidate.display_order
    END DESC,
    CASE
      WHEN NOT candidate.is_non_default THEN candidate.display_order
    END,
    candidate.stage_id
  LIMIT 1;

  IF v_stage_id IS NULL OR v_status_id IS NULL THEN
    RAISE EXCEPTION 'CAREERS_ACTIVE_STAGE_REQUIRED'
      USING ERRCODE = '22023';
  END IF;

  IF v_application.current_stage_id IS DISTINCT FROM v_stage_id
    OR v_application.current_status_id IS DISTINCT FROM v_status_id THEN
    UPDATE careers.applications
    SET current_stage_id = v_stage_id,
        current_status_id = v_status_id,
        updated_by = p_actor_id
    WHERE id = p_application_id
    RETURNING * INTO v_application;
  END IF;

  RETURN v_application;
END;
$$;

CREATE OR REPLACE FUNCTION careers.sync_application_current_pointer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, careers
AS $$
DECLARE
  v_application_id uuid;
  v_actor_id uuid;
BEGIN
  IF TG_OP = 'UPDATE'
    AND OLD.status_id IS NOT DISTINCT FROM NEW.status_id THEN
    RETURN NEW;
  END IF;

  v_application_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.application_id
    ELSE NEW.application_id
  END;
  v_actor_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.updated_by
    ELSE NEW.updated_by
  END;

  PERFORM careers.sync_application_current_pointer(
    v_application_id,
    v_actor_id
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION careers.initialize_application_stage_records()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, careers
AS $$
BEGIN
  INSERT INTO careers.application_stage_records (
    application_id,
    stage_id,
    status_id,
    created_by,
    updated_by
  )
  SELECT
    NEW.id,
    stage.id,
    CASE
      WHEN stage.id = NEW.current_stage_id THEN NEW.current_status_id
      ELSE default_status.id
    END,
    NEW.created_by,
    NEW.updated_by
  FROM careers.job_posting_stages AS stage
  CROSS JOIN LATERAL (
    SELECT status.id
    FROM careers.stage_statuses AS status
    WHERE status.stage_id = stage.id
      AND status.is_active
    ORDER BY status.is_default DESC, status.display_order, status.id
    LIMIT 1
  ) AS default_status
  WHERE stage.job_posting_id = NEW.job_posting_id
    AND stage.is_active
  ON CONFLICT (application_id, stage_id) DO NOTHING;

  RETURN NEW;
END;
$$;

INSERT INTO careers.application_stage_records (
  application_id,
  stage_id,
  status_id,
  created_by,
  updated_by
)
SELECT
  application.id,
  stage.id,
  CASE
    WHEN stage.id = application.current_stage_id THEN application.current_status_id
    ELSE default_status.id
  END,
  application.created_by,
  application.updated_by
FROM careers.applications AS application
JOIN careers.job_posting_stages AS stage
  ON stage.job_posting_id = application.job_posting_id
 AND stage.is_active
CROSS JOIN LATERAL (
  SELECT status.id
  FROM careers.stage_statuses AS status
  WHERE status.stage_id = stage.id
    AND status.is_active
  ORDER BY status.is_default DESC, status.display_order, status.id
  LIMIT 1
) AS default_status
ON CONFLICT (application_id, stage_id) DO NOTHING;

CREATE TRIGGER initialize_application_stage_records
  AFTER INSERT ON careers.applications
  FOR EACH ROW EXECUTE FUNCTION careers.initialize_application_stage_records();

CREATE TRIGGER sync_application_current_pointer
  AFTER INSERT OR UPDATE OR DELETE ON careers.application_stage_records
  FOR EACH ROW EXECUTE FUNCTION careers.sync_application_current_pointer();

CREATE OR REPLACE FUNCTION careers.prevent_application_posting_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.job_posting_id <> OLD.job_posting_id
    AND current_setting(
      'careers.allow_application_posting_change',
      true
    ) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'CAREERS_APPLICATION_POSTING_CHANGE_FORBIDDEN'
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_cover_letter_questions_updated_at
  BEFORE UPDATE ON careers.cover_letter_questions
  FOR EACH ROW EXECUTE FUNCTION careers.set_updated_at();
CREATE TRIGGER set_application_cover_letter_answers_updated_at
  BEFORE UPDATE ON careers.application_cover_letter_answers
  FOR EACH ROW EXECUTE FUNCTION careers.set_updated_at();
CREATE TRIGGER set_application_stage_records_updated_at
  BEFORE UPDATE ON careers.application_stage_records
  FOR EACH ROW EXECUTE FUNCTION careers.set_updated_at();
CREATE TRIGGER set_application_separations_updated_at
  BEFORE UPDATE ON careers.application_separations
  FOR EACH ROW EXECUTE FUNCTION careers.set_updated_at();
CREATE TRIGGER set_process_presets_updated_at
  BEFORE UPDATE ON careers.process_presets
  FOR EACH ROW EXECUTE FUNCTION careers.set_updated_at();

CREATE TRIGGER audit_cover_letter_questions
  AFTER INSERT OR UPDATE OR DELETE ON careers.cover_letter_questions
  FOR EACH ROW EXECUTE FUNCTION careers.audit_domain_change();
CREATE TRIGGER audit_application_cover_letter_answers
  AFTER INSERT OR UPDATE OR DELETE ON careers.application_cover_letter_answers
  FOR EACH ROW EXECUTE FUNCTION careers.audit_domain_change();
CREATE TRIGGER audit_application_stage_records
  AFTER INSERT OR UPDATE OR DELETE ON careers.application_stage_records
  FOR EACH ROW EXECUTE FUNCTION careers.audit_domain_change();
CREATE TRIGGER audit_process_presets
  AFTER INSERT OR UPDATE OR DELETE ON careers.process_presets
  FOR EACH ROW EXECUTE FUNCTION careers.audit_domain_change();

CREATE OR REPLACE FUNCTION careers.save_process_preset(
  p_stages jsonb,
  p_actor_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, careers
AS $$
DECLARE
  v_stage jsonb;
  v_status jsonb;
BEGIN
  IF p_actor_admin_id IS NULL
    OR jsonb_typeof(p_stages) <> 'array'
    OR jsonb_array_length(p_stages) = 0
    OR jsonb_array_length(p_stages) > 20 THEN
    RAISE EXCEPTION 'CAREERS_PROCESS_PRESET_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;

  FOR v_stage IN SELECT value FROM jsonb_array_elements(p_stages)
  LOOP
    IF jsonb_typeof(v_stage) <> 'object'
      OR nullif(btrim(v_stage ->> 'name'), '') IS NULL
      OR char_length(btrim(v_stage ->> 'name')) > 100
      OR jsonb_typeof(v_stage -> 'statuses') <> 'array'
      OR jsonb_array_length(v_stage -> 'statuses') = 0
      OR jsonb_array_length(v_stage -> 'statuses') > 20
      OR (
        v_stage ? 'autoSend'
        AND jsonb_typeof(v_stage -> 'autoSend') <> 'object'
      ) THEN
      RAISE EXCEPTION 'CAREERS_PROCESS_PRESET_INVALID_STAGE'
        USING ERRCODE = '22023';
    END IF;

    FOR v_status IN SELECT value FROM jsonb_array_elements(v_stage -> 'statuses')
    LOOP
      IF jsonb_typeof(v_status) <> 'object'
        OR nullif(btrim(v_status ->> 'name'), '') IS NULL
        OR char_length(btrim(v_status ->> 'name')) > 100 THEN
        RAISE EXCEPTION 'CAREERS_PROCESS_PRESET_INVALID_STATUS'
          USING ERRCODE = '22023';
      END IF;
    END LOOP;
  END LOOP;

  INSERT INTO careers.process_presets (
    singleton, stages, created_by, updated_by
  ) VALUES (
    true, p_stages, p_actor_admin_id, p_actor_admin_id
  )
  ON CONFLICT (singleton) DO UPDATE
  SET stages = EXCLUDED.stages,
      created_by = coalesce(process_presets.created_by, EXCLUDED.created_by),
      updated_by = EXCLUDED.updated_by;

  RETURN p_stages;
END;
$$;

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
  v_auto_send jsonb;
  v_message_rule jsonb;
  v_stage_id uuid;
  v_status_id uuid;
  v_seen_stage_ids uuid[] := ARRAY[]::uuid[];
  v_seen_status_ids uuid[] := ARRAY[]::uuid[];
  v_all_seen_status_ids uuid[] := ARRAY[]::uuid[];
  v_status_count integer;
  v_application record;
  v_destination_stage_id uuid;
  v_destination_status_id uuid;
  v_old_stage_order integer;
BEGIN
  IF p_job_posting_id IS NULL
    OR p_actor_admin_id IS NULL
    OR jsonb_typeof(p_stages) <> 'array'
    OR jsonb_array_length(p_stages) = 0
    OR jsonb_array_length(p_stages) > 20 THEN
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
    SELECT
      to_jsonb(stage) || jsonb_build_object(
        'statuses',
        coalesce((
          SELECT jsonb_agg(to_jsonb(status) ORDER BY status.display_order)
          FROM careers.stage_statuses AS status
          WHERE status.stage_id = stage.id
            AND status.is_active
        ), '[]'::jsonb)
      ) AS stage_row,
      stage.display_order
    FROM careers.job_posting_stages AS stage
    WHERE stage.job_posting_id = p_job_posting_id
      AND stage.is_active
  ) AS snapshot;

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
      is_default = false,
      is_completion = false,
      is_terminal = false,
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
      OR jsonb_typeof(v_stage -> 'statuses') <> 'array'
      OR jsonb_array_length(v_stage -> 'statuses') = 0
      OR jsonb_array_length(v_stage -> 'statuses') > 20 THEN
      RAISE EXCEPTION 'CAREERS_POSTING_STAGE_INVALID'
        USING ERRCODE = '22023';
    END IF;

    v_stage_id := coalesce(nullif(v_stage ->> 'id', '')::uuid, gen_random_uuid());
    v_seen_stage_ids := array_append(v_seen_stage_ids, v_stage_id);
    v_auto_send := coalesce(v_stage -> 'autoSend', '{}'::jsonb);

    IF jsonb_typeof(v_auto_send) <> 'object'
      OR (
        v_auto_send ? 'channels'
        AND (
          jsonb_typeof(v_auto_send -> 'channels') <> 'array'
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(v_auto_send -> 'channels') AS channel(value)
            WHERE channel.value NOT IN ('email', 'sms')
          )
        )
      )
      OR char_length(coalesce(v_auto_send ->> 'title', '')) > 200
      OR char_length(coalesce(v_auto_send ->> 'body', '')) > 10000 THEN
      RAISE EXCEPTION 'CAREERS_POSTING_STAGE_INVALID'
        USING ERRCODE = '22023';
    END IF;

    INSERT INTO careers.job_posting_stages (
      id,
      job_posting_id,
      name,
      stage_type,
      display_order,
      show_on_calendar,
      is_active,
      message_enabled,
      message_channels,
      message_subject_template,
      message_body_template,
      created_by,
      updated_by
    ) VALUES (
      v_stage_id,
      p_job_posting_id,
      btrim(v_stage ->> 'name'),
      coalesce(nullif(btrim(v_stage ->> 'type'), ''), 'other'),
      coalesce(
        (v_stage ->> 'displayOrder')::integer,
        (v_stage ->> 'order')::integer,
        (v_stage ->> '_displayOrder')::integer
      ),
      coalesce((v_stage ->> 'showOnCalendar')::boolean, false),
      coalesce((v_stage ->> 'isActive')::boolean, true),
      coalesce((v_auto_send ->> 'enabled')::boolean, false),
      CASE
        WHEN v_auto_send ? 'channels' THEN ARRAY(
          SELECT jsonb_array_elements_text(v_auto_send -> 'channels')
        )
        ELSE ARRAY['email', 'sms']::text[]
      END,
      coalesce(v_auto_send ->> 'title', '{{전형단계명}} 안내'),
      coalesce(v_auto_send ->> 'body', ''),
      p_actor_admin_id,
      p_actor_admin_id
    )
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        stage_type = EXCLUDED.stage_type,
        display_order = EXCLUDED.display_order,
        show_on_calendar = EXCLUDED.show_on_calendar,
        is_active = EXCLUDED.is_active,
        message_enabled = EXCLUDED.message_enabled,
        message_channels = EXCLUDED.message_channels,
        message_subject_template = EXCLUDED.message_subject_template,
        message_body_template = EXCLUDED.message_body_template,
        updated_by = EXCLUDED.updated_by
    WHERE job_posting_stages.job_posting_id = p_job_posting_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'CAREERS_STAGE_POSTING_MISMATCH'
        USING ERRCODE = '23503';
    END IF;

    v_status_count := jsonb_array_length(v_stage -> 'statuses');
    v_seen_status_ids := ARRAY[]::uuid[];

    FOR v_status IN
      SELECT value || jsonb_build_object('_displayOrder', ordinality - 1)
      FROM jsonb_array_elements(v_stage -> 'statuses') WITH ORDINALITY
    LOOP
      IF v_status ? 'messageRules'
        AND (
          jsonb_typeof(v_status -> 'messageRules') <> 'array'
          OR jsonb_array_length(v_status -> 'messageRules') > 10
        ) THEN
        RAISE EXCEPTION 'CAREERS_STAGE_STATUS_INVALID'
          USING ERRCODE = '22023';
      END IF;
      IF jsonb_typeof(v_status) <> 'object'
        OR nullif(btrim(v_status ->> 'name'), '') IS NULL
        OR char_length(btrim(v_status ->> 'name')) > 100
        OR nullif(btrim(coalesce(v_status ->> 'color', 'gray')), '') IS NULL THEN
        RAISE EXCEPTION 'CAREERS_STAGE_STATUS_INVALID'
          USING ERRCODE = '22023';
      END IF;

      v_status_id := coalesce(nullif(v_status ->> 'id', '')::uuid, gen_random_uuid());
      v_seen_status_ids := array_append(v_seen_status_ids, v_status_id);
      v_all_seen_status_ids := array_append(v_all_seen_status_ids, v_status_id);

      INSERT INTO careers.stage_statuses (
        id,
        stage_id,
        name,
        display_order,
        result_meaning,
        is_terminal,
        is_active,
        color,
        is_default,
        is_completion,
        has_date_input,
        created_by,
        updated_by
      ) VALUES (
        v_status_id,
        v_stage_id,
        btrim(v_status ->> 'name'),
        coalesce(
          (v_status ->> 'displayOrder')::integer,
          (v_status ->> '_displayOrder')::integer
        ),
        'neutral',
        (v_status ->> '_displayOrder')::integer = v_status_count - 1,
        coalesce((v_status ->> 'isActive')::boolean, true),
        coalesce(v_status ->> 'color', 'gray'),
        (v_status ->> '_displayOrder')::integer = 0,
        (v_status ->> '_displayOrder')::integer = v_status_count - 1,
        coalesce((v_status ->> 'hasDateInput')::boolean, true),
        p_actor_admin_id,
        p_actor_admin_id
      )
      ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          display_order = EXCLUDED.display_order,
          result_meaning = 'neutral',
          is_terminal = EXCLUDED.is_terminal,
          is_active = EXCLUDED.is_active,
          color = EXCLUDED.color,
          is_default = EXCLUDED.is_default,
          is_completion = EXCLUDED.is_completion,
          has_date_input = EXCLUDED.has_date_input,
          updated_by = EXCLUDED.updated_by
      WHERE stage_statuses.stage_id = v_stage_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'CAREERS_STATUS_STAGE_MISMATCH'
          USING ERRCODE = '23503';
      END IF;

      v_message_rule := v_status -> 'messageRule';
      IF v_message_rule IS NOT NULL
        AND jsonb_typeof(v_message_rule) <> 'null' THEN
        IF jsonb_typeof(v_message_rule) <> 'object'
          OR nullif(btrim(v_message_rule ->> 'bodyTemplate'), '') IS NULL
          OR char_length(coalesce(v_message_rule ->> 'subjectTemplate', '')) > 200
          OR char_length(btrim(v_message_rule ->> 'bodyTemplate')) > 10000 THEN
          RAISE EXCEPTION 'CAREERS_MESSAGE_RULE_INVALID'
            USING ERRCODE = '22023';
        END IF;

        INSERT INTO careers.stage_message_rules (
          id,
          stage_id,
          status_id,
          is_active,
          subject_template,
          body_template,
          created_by,
          updated_by
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
      END IF;
    END LOOP;

    UPDATE careers.stage_statuses
    SET is_active = false,
        is_default = false,
        is_completion = false,
        is_terminal = false,
        updated_by = p_actor_admin_id
    WHERE stage_id = v_stage_id
      AND is_active
      AND NOT (id = ANY(v_seen_status_ids));
  END LOOP;

  FOR v_application IN
    SELECT
      application.id,
      application.current_stage_id,
      application.current_status_id
    FROM careers.applications AS application
    JOIN careers.job_posting_stages AS stage
      ON stage.id = application.current_stage_id
    WHERE application.job_posting_id = p_job_posting_id
      AND application.current_stage_id IS NOT NULL
      AND NOT (application.current_stage_id = ANY(v_seen_stage_ids))
    FOR UPDATE OF application
  LOOP
    SELECT display_order
    INTO v_old_stage_order
    FROM careers.job_posting_stages
    WHERE id = v_application.current_stage_id;

    SELECT stage.id
    INTO v_destination_stage_id
    FROM careers.job_posting_stages AS stage
    WHERE stage.job_posting_id = p_job_posting_id
      AND stage.is_active
      AND stage.display_order < v_old_stage_order
    ORDER BY stage.display_order DESC, stage.id
    LIMIT 1;

    IF v_destination_stage_id IS NULL THEN
      SELECT stage.id
      INTO v_destination_stage_id
      FROM careers.job_posting_stages AS stage
      WHERE stage.job_posting_id = p_job_posting_id
        AND stage.is_active
      ORDER BY stage.display_order, stage.id
      LIMIT 1;

      SELECT status.id
      INTO v_destination_status_id
      FROM careers.stage_statuses AS status
      WHERE status.stage_id = v_destination_stage_id
        AND status.is_active
      ORDER BY status.is_default DESC, status.display_order, status.id
      LIMIT 1;
    ELSE
      SELECT status.id
      INTO v_destination_status_id
      FROM careers.stage_statuses AS status
      WHERE status.stage_id = v_destination_stage_id
        AND status.is_active
      ORDER BY status.is_completion DESC, status.display_order DESC, status.id
      LIMIT 1;
    END IF;

    UPDATE careers.applications
    SET current_stage_id = v_destination_stage_id,
        current_status_id = v_destination_status_id,
        updated_by = p_actor_admin_id
    WHERE id = v_application.id;

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
      v_application.current_stage_id,
      v_application.current_status_id,
      v_destination_stage_id,
      v_destination_status_id,
      p_actor_admin_id,
      'process stage removed'
    );

    INSERT INTO careers.application_stage_records (
      application_id,
      stage_id,
      status_id,
      created_by,
      updated_by
    ) VALUES (
      v_application.id,
      v_destination_stage_id,
      v_destination_status_id,
      p_actor_admin_id,
      p_actor_admin_id
    )
    ON CONFLICT (application_id, stage_id) DO UPDATE
    SET status_id = EXCLUDED.status_id,
        updated_by = EXCLUDED.updated_by;
  END LOOP;

  DELETE FROM careers.application_stage_records AS record
  USING careers.applications AS application
  WHERE record.application_id = application.id
    AND application.job_posting_id = p_job_posting_id
    AND NOT (record.stage_id = ANY(v_seen_stage_ids));

  FOR v_application IN
    SELECT
      application.id,
      application.current_stage_id,
      application.current_status_id
    FROM careers.applications AS application
    JOIN careers.job_posting_stages AS stage
      ON stage.id = application.current_stage_id
     AND stage.is_active
    LEFT JOIN careers.stage_statuses AS status
      ON status.id = application.current_status_id
     AND status.stage_id = application.current_stage_id
     AND status.is_active
    WHERE application.job_posting_id = p_job_posting_id
      AND application.current_status_id IS NOT NULL
      AND status.id IS NULL
    FOR UPDATE OF application
  LOOP
    SELECT status.id
    INTO v_destination_status_id
    FROM careers.stage_statuses AS status
    WHERE status.stage_id = v_application.current_stage_id
      AND status.is_active
    ORDER BY status.is_default DESC, status.display_order, status.id
    LIMIT 1;

    UPDATE careers.applications
    SET current_status_id = v_destination_status_id,
        updated_by = p_actor_admin_id
    WHERE id = v_application.id;

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
      v_application.current_stage_id,
      v_application.current_status_id,
      v_application.current_stage_id,
      v_destination_status_id,
      p_actor_admin_id,
      'process status removed'
    );
  END LOOP;

  UPDATE careers.application_stage_records AS record
  SET status_id = (
        SELECT status.id
        FROM careers.stage_statuses AS status
        WHERE status.stage_id = record.stage_id
          AND status.is_active
        ORDER BY status.is_default DESC, status.display_order, status.id
        LIMIT 1
      ),
      updated_by = p_actor_admin_id
  FROM careers.applications AS application
  WHERE application.id = record.application_id
    AND application.job_posting_id = p_job_posting_id
    AND NOT EXISTS (
      SELECT 1
      FROM careers.stage_statuses AS current_status
      WHERE current_status.id = record.status_id
        AND current_status.stage_id = record.stage_id
        AND current_status.is_active
    );

  UPDATE careers.job_posting_stages
  SET is_active = false,
      updated_by = p_actor_admin_id
  WHERE job_posting_id = p_job_posting_id
    AND is_active
    AND NOT (id = ANY(v_seen_stage_ids));

  PERFORM careers.sync_application_current_pointer(
    application.id,
    p_actor_admin_id
  )
  FROM careers.applications AS application
  WHERE application.job_posting_id = p_job_posting_id
    AND application.deleted_at IS NULL;

  SELECT coalesce(jsonb_agg(stage_row ORDER BY display_order), '[]'::jsonb)
  INTO v_after
  FROM (
    SELECT
      to_jsonb(stage) || jsonb_build_object(
        'autoSend',
        jsonb_build_object(
          'enabled', stage.message_enabled,
          'channels', to_jsonb(stage.message_channels),
          'title', stage.message_subject_template,
          'body', stage.message_body_template
        ),
        'statuses',
        coalesce((
          SELECT jsonb_agg(to_jsonb(status) ORDER BY status.display_order)
          FROM careers.stage_statuses AS status
          WHERE status.stage_id = stage.id
            AND status.is_active
        ), '[]'::jsonb)
      ) AS stage_row,
      stage.display_order
    FROM careers.job_posting_stages AS stage
    WHERE stage.job_posting_id = p_job_posting_id
      AND stage.is_active
  ) AS snapshot;

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

CREATE OR REPLACE FUNCTION careers.clone_process_preset_to_posting(
  p_job_posting_id uuid,
  p_actor_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, careers
AS $$
DECLARE
  v_preset jsonb;
  v_cloned jsonb;
BEGIN
  SELECT stages
  INTO v_preset
  FROM careers.process_presets
  WHERE singleton;

  IF v_preset IS NULL THEN
    RAISE EXCEPTION 'CAREERS_PROCESS_PRESET_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT jsonb_agg(
    (stage.value - 'id' - 'order' - 'displayOrder')
    || jsonb_build_object(
      'statuses',
      (
        SELECT jsonb_agg(
          status.value - 'id' - 'isDefault' - 'isCompletion'
          ORDER BY status.ordinality
        )
        FROM jsonb_array_elements(stage.value -> 'statuses')
          WITH ORDINALITY AS status(value, ordinality)
      )
    )
    ORDER BY stage.ordinality
  )
  INTO v_cloned
  FROM jsonb_array_elements(v_preset)
    WITH ORDINALITY AS stage(value, ordinality);

  RETURN careers.save_job_posting_process(
    p_job_posting_id,
    v_cloned,
    p_actor_admin_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION careers.create_job_posting_with_preset(
  p_posting jsonb,
  p_actor_admin_id uuid
)
RETURNS careers.job_postings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, careers
AS $$
DECLARE
  v_posting careers.job_postings%ROWTYPE;
  v_question jsonb;
BEGIN
  IF p_actor_admin_id IS NULL
    OR jsonb_typeof(p_posting) <> 'object'
    OR nullif(btrim(p_posting ->> 'title'), '') IS NULL
    OR nullif(btrim(p_posting ->> 'field'), '') IS NULL
    OR coalesce(p_posting ->> 'careerType', '') NOT IN ('신입', '경력')
    OR nullif(p_posting ->> 'employmentType', '') IS NULL
    OR nullif(p_posting ->> 'startDate', '') IS NULL
    OR nullif(p_posting ->> 'endDate', '') IS NULL
    OR (
      p_posting ? 'coverLetterQuestions'
      AND jsonb_typeof(p_posting -> 'coverLetterQuestions') <> 'array'
    ) THEN
    RAISE EXCEPTION 'CAREERS_JOB_POSTING_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO careers.job_postings (
    title,
    organization,
    department,
    employment_type,
    headcount,
    description,
    status,
    published_at,
    closes_at,
    field,
    career_type,
    start_date,
    end_date,
    is_public,
    content,
    created_by,
    updated_by
  ) VALUES (
    btrim(p_posting ->> 'title'),
    nullif(btrim(p_posting ->> 'organization'), ''),
    btrim(p_posting ->> 'field'),
    p_posting ->> 'employmentType',
    coalesce((p_posting ->> 'headcount')::integer, 1),
    coalesce(p_posting ->> 'description', ''),
    CASE
      WHEN coalesce((p_posting ->> 'isPublic')::boolean, false) THEN 'open'
      ELSE 'draft'
    END,
    CASE
      WHEN coalesce((p_posting ->> 'isPublic')::boolean, false)
        THEN (p_posting ->> 'startDate')::date::timestamptz
      ELSE NULL
    END,
    ((p_posting ->> 'endDate')::date + time '23:59:59')::timestamptz,
    btrim(p_posting ->> 'field'),
    p_posting ->> 'careerType',
    (p_posting ->> 'startDate')::date,
    (p_posting ->> 'endDate')::date,
    coalesce((p_posting ->> 'isPublic')::boolean, false),
    coalesce(p_posting ->> 'content', ''),
    p_actor_admin_id,
    p_actor_admin_id
  )
  RETURNING * INTO v_posting;

  FOR v_question IN
    SELECT value || jsonb_build_object('_displayOrder', ordinality - 1)
    FROM jsonb_array_elements(
      coalesce(p_posting -> 'coverLetterQuestions', '[]'::jsonb)
    ) WITH ORDINALITY
  LOOP
    IF nullif(btrim(v_question ->> 'question'), '') IS NULL THEN
      RAISE EXCEPTION 'CAREERS_COVER_LETTER_QUESTION_INVALID'
        USING ERRCODE = '22023';
    END IF;

    INSERT INTO careers.cover_letter_questions (
      id,
      job_posting_id,
      question,
      max_length,
      display_order,
      created_by,
      updated_by
    ) VALUES (
      coalesce(nullif(v_question ->> 'id', '')::uuid, gen_random_uuid()),
      v_posting.id,
      btrim(v_question ->> 'question'),
      nullif(v_question ->> 'maxLength', '')::integer,
      (v_question ->> '_displayOrder')::integer,
      p_actor_admin_id,
      p_actor_admin_id
    );
  END LOOP;

  PERFORM careers.clone_process_preset_to_posting(
    v_posting.id,
    p_actor_admin_id
  );

  RETURN v_posting;
EXCEPTION
  WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'CAREERS_JOB_POSTING_INVALID_INPUT'
      USING ERRCODE = '22023';
END;
$$;

CREATE OR REPLACE FUNCTION careers.save_job_posting_cover_letter_questions(
  p_job_posting_id uuid,
  p_questions jsonb,
  p_actor_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, careers
AS $$
DECLARE
  v_question jsonb;
  v_question_id uuid;
  v_seen_ids uuid[] := ARRAY[]::uuid[];
  v_result jsonb;
BEGIN
  IF p_job_posting_id IS NULL
    OR p_actor_admin_id IS NULL
    OR jsonb_typeof(p_questions) <> 'array'
    OR jsonb_array_length(p_questions) > 20 THEN
    RAISE EXCEPTION 'CAREERS_COVER_LETTER_QUESTIONS_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('careers.posting:' || p_job_posting_id::text, 0)
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

  UPDATE careers.cover_letter_questions
  SET is_active = false,
      updated_by = p_actor_admin_id
  WHERE job_posting_id = p_job_posting_id
    AND is_active;

  FOR v_question IN
    SELECT value || jsonb_build_object('_displayOrder', ordinality - 1)
    FROM jsonb_array_elements(p_questions) WITH ORDINALITY
  LOOP
    IF nullif(btrim(v_question ->> 'question'), '') IS NULL
      OR (
        nullif(v_question ->> 'maxLength', '') IS NOT NULL
        AND (v_question ->> 'maxLength')::integer <= 0
      ) THEN
      RAISE EXCEPTION 'CAREERS_COVER_LETTER_QUESTION_INVALID'
        USING ERRCODE = '22023';
    END IF;

    v_question_id := coalesce(
      nullif(v_question ->> 'id', '')::uuid,
      gen_random_uuid()
    );
    v_seen_ids := array_append(v_seen_ids, v_question_id);

    INSERT INTO careers.cover_letter_questions (
      id,
      job_posting_id,
      question,
      max_length,
      display_order,
      is_active,
      created_by,
      updated_by
    ) VALUES (
      v_question_id,
      p_job_posting_id,
      btrim(v_question ->> 'question'),
      nullif(v_question ->> 'maxLength', '')::integer,
      (v_question ->> '_displayOrder')::integer,
      true,
      p_actor_admin_id,
      p_actor_admin_id
    )
    ON CONFLICT (id) DO UPDATE
    SET question = EXCLUDED.question,
        max_length = EXCLUDED.max_length,
        display_order = EXCLUDED.display_order,
        is_active = true,
        updated_by = EXCLUDED.updated_by
    WHERE cover_letter_questions.job_posting_id = p_job_posting_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'CAREERS_COVER_LETTER_QUESTION_POSTING_MISMATCH'
        USING ERRCODE = '23503';
    END IF;
  END LOOP;

  SELECT coalesce(
    jsonb_agg(to_jsonb(question) ORDER BY question.display_order),
    '[]'::jsonb
  )
  INTO v_result
  FROM careers.cover_letter_questions AS question
  WHERE question.job_posting_id = p_job_posting_id
    AND question.is_active;

  RETURN v_result;
EXCEPTION
  WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'CAREERS_COVER_LETTER_QUESTIONS_INVALID_INPUT'
      USING ERRCODE = '22023';
END;
$$;

CREATE OR REPLACE FUNCTION careers.update_job_posting_with_questions(
  p_job_posting_id uuid,
  p_posting jsonb,
  p_actor_admin_id uuid
)
RETURNS careers.job_postings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, careers
AS $$
DECLARE
  v_posting careers.job_postings%ROWTYPE;
BEGIN
  IF p_job_posting_id IS NULL
    OR p_actor_admin_id IS NULL
    OR jsonb_typeof(p_posting) <> 'object'
    OR (
      p_posting ? 'careerType'
      AND p_posting ->> 'careerType' NOT IN ('신입', '경력')
    )
    OR (
      p_posting ? 'coverLetterQuestions'
      AND jsonb_typeof(p_posting -> 'coverLetterQuestions') <> 'array'
    ) THEN
    RAISE EXCEPTION 'CAREERS_JOB_POSTING_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('careers.posting:' || p_job_posting_id::text, 0)
  );

  UPDATE careers.job_postings
  SET title = CASE
        WHEN p_posting ? 'title' THEN btrim(p_posting ->> 'title')
        ELSE title
      END,
      organization = CASE
        WHEN p_posting ? 'organization'
          THEN nullif(btrim(p_posting ->> 'organization'), '')
        ELSE organization
      END,
      department = CASE
        WHEN p_posting ? 'field' THEN btrim(p_posting ->> 'field')
        ELSE department
      END,
      field = CASE
        WHEN p_posting ? 'field' THEN btrim(p_posting ->> 'field')
        ELSE field
      END,
      career_type = CASE
        WHEN p_posting ? 'careerType' THEN p_posting ->> 'careerType'
        ELSE career_type
      END,
      employment_type = CASE
        WHEN p_posting ? 'employmentType' THEN p_posting ->> 'employmentType'
        ELSE employment_type
      END,
      headcount = CASE
        WHEN p_posting ? 'headcount' THEN (p_posting ->> 'headcount')::integer
        ELSE headcount
      END,
      description = CASE
        WHEN p_posting ? 'description' THEN p_posting ->> 'description'
        ELSE description
      END,
      content = CASE
        WHEN p_posting ? 'content' THEN p_posting ->> 'content'
        ELSE content
      END,
      start_date = CASE
        WHEN p_posting ? 'startDate' THEN (p_posting ->> 'startDate')::date
        ELSE start_date
      END,
      end_date = CASE
        WHEN p_posting ? 'endDate' THEN (p_posting ->> 'endDate')::date
        ELSE end_date
      END,
      is_public = CASE
        WHEN p_posting ? 'isPublic' THEN (p_posting ->> 'isPublic')::boolean
        ELSE is_public
      END,
      status = CASE
        WHEN p_posting ? 'isPublic' THEN
          CASE WHEN (p_posting ->> 'isPublic')::boolean THEN 'open' ELSE 'draft' END
        ELSE status
      END,
      published_at = CASE
        WHEN p_posting ? 'isPublic'
          AND (p_posting ->> 'isPublic')::boolean
          THEN coalesce(published_at, now())
        WHEN p_posting ? 'isPublic' THEN NULL
        ELSE published_at
      END,
      closes_at = CASE
        WHEN p_posting ? 'endDate'
          THEN ((p_posting ->> 'endDate')::date + time '23:59:59')::timestamptz
        ELSE closes_at
      END,
      updated_by = p_actor_admin_id
  WHERE id = p_job_posting_id
    AND deleted_at IS NULL
  RETURNING * INTO v_posting;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAREERS_JOB_POSTING_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  IF nullif(btrim(v_posting.title), '') IS NULL
    OR nullif(btrim(v_posting.field), '') IS NULL THEN
    RAISE EXCEPTION 'CAREERS_JOB_POSTING_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;

  IF p_posting ? 'coverLetterQuestions' THEN
    PERFORM careers.save_job_posting_cover_letter_questions(
      p_job_posting_id,
      p_posting -> 'coverLetterQuestions',
      p_actor_admin_id
    );
  END IF;

  RETURN v_posting;
EXCEPTION
  WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'CAREERS_JOB_POSTING_INVALID_INPUT'
      USING ERRCODE = '22023';
END;
$$;

CREATE OR REPLACE FUNCTION careers.save_application_cover_letter_answers(
  p_application_id uuid,
  p_answers jsonb,
  p_actor_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, careers
AS $$
DECLARE
  v_answer jsonb;
  v_result jsonb;
BEGIN
  IF p_application_id IS NULL
    OR p_actor_admin_id IS NULL
    OR jsonb_typeof(p_answers) <> 'array'
    OR jsonb_array_length(p_answers) > 50 THEN
    RAISE EXCEPTION 'CAREERS_COVER_LETTER_ANSWERS_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('careers.application:' || p_application_id::text, 0)
  );
  PERFORM 1
  FROM careers.applications
  WHERE id = p_application_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAREERS_APPLICATION_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM careers.application_cover_letter_answers
  WHERE application_id = p_application_id;

  FOR v_answer IN SELECT value FROM jsonb_array_elements(p_answers)
  LOOP
    IF nullif(v_answer ->> 'questionId', '') IS NULL
      OR nullif(btrim(v_answer ->> 'question'), '') IS NULL THEN
      RAISE EXCEPTION 'CAREERS_COVER_LETTER_ANSWER_INVALID'
        USING ERRCODE = '22023';
    END IF;

    INSERT INTO careers.application_cover_letter_answers (
      application_id,
      question_id,
      question_snapshot,
      answer,
      created_by,
      updated_by
    ) VALUES (
      p_application_id,
      (v_answer ->> 'questionId')::uuid,
      btrim(v_answer ->> 'question'),
      coalesce(v_answer ->> 'answer', ''),
      p_actor_admin_id,
      p_actor_admin_id
    );
  END LOOP;

  SELECT coalesce(
    jsonb_agg(to_jsonb(answer) ORDER BY answer.created_at, answer.id),
    '[]'::jsonb
  )
  INTO v_result
  FROM careers.application_cover_letter_answers AS answer
  WHERE answer.application_id = p_application_id;

  RETURN v_result;
EXCEPTION
  WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'CAREERS_COVER_LETTER_ANSWERS_INVALID_INPUT'
      USING ERRCODE = '22023';
END;
$$;

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
  v_cover_letter jsonb;
BEGIN
  IF jsonb_typeof(p_applicant) <> 'object'
    OR jsonb_typeof(p_application) <> 'object'
    OR p_actor_id IS NULL
    OR nullif(p_application ->> 'jobPostingId', '') IS NULL
    OR (
      p_applicant ? 'gender'
      AND p_applicant ->> 'gender' NOT IN ('남성', '여성')
    )
    OR (
      p_applicant ? 'submissionStatus'
      AND p_applicant ->> 'submissionStatus' NOT IN ('완료', '미완료')
    ) THEN
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
    ORDER BY is_default DESC, display_order, id
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
      name,
      email,
      phone,
      source,
      notes,
      platform,
      gender,
      birth_date,
      region,
      region_detail,
      address,
      educations,
      certificates,
      career_entries,
      activities,
      statistics_packages,
      thesis,
      submission_status,
      created_by,
      updated_by
    ) VALUES (
      btrim(p_applicant ->> 'name'),
      nullif(btrim(p_applicant ->> 'email'), ''),
      nullif(btrim(p_applicant ->> 'phone'), ''),
      nullif(btrim(p_applicant ->> 'source'), ''),
      nullif(btrim(coalesce(p_applicant ->> 'memo', p_applicant ->> 'notes')), ''),
      nullif(btrim(p_applicant ->> 'platform'), ''),
      nullif(p_applicant ->> 'gender', ''),
      nullif(p_applicant ->> 'birthDate', '')::date,
      nullif(btrim(p_applicant ->> 'region'), ''),
      nullif(btrim(p_applicant ->> 'regionDetail'), ''),
      nullif(btrim(p_applicant ->> 'address'), ''),
      coalesce(p_applicant -> 'educations', '[]'::jsonb),
      coalesce(p_applicant -> 'certificates', '[]'::jsonb),
      coalesce(p_applicant -> 'careerEntries', '[]'::jsonb),
      coalesce(p_applicant -> 'activities', '[]'::jsonb),
      coalesce(p_applicant -> 'statisticsPackages', '[]'::jsonb),
      nullif(p_applicant -> 'thesis', 'null'::jsonb),
      coalesce(nullif(p_applicant ->> 'submissionStatus', ''), '미완료'),
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
    coalesce(
      nullif(
        coalesce(
          p_application ->> 'applicationDate',
          p_application ->> 'appliedAt'
        ),
        ''
      )::timestamptz,
      now()
    ),
    p_actor_id,
    p_actor_id
  )
  RETURNING * INTO v_application;

  v_cover_letter := coalesce(
    p_application -> 'coverLetter',
    p_applicant -> 'coverLetter'
  );
  IF v_cover_letter IS NOT NULL THEN
    PERFORM careers.save_application_cover_letter_answers(
      v_application.id,
      v_cover_letter,
      p_actor_id
    );
  END IF;

  SELECT *
  INTO v_application
  FROM careers.sync_application_current_pointer(
    v_application.id,
    p_actor_id
  );

  RETURN v_application;
EXCEPTION
  WHEN invalid_text_representation OR invalid_datetime_format THEN
    RAISE EXCEPTION 'CAREERS_APPLICATION_INVALID_INPUT'
      USING ERRCODE = '22023';
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
  v_cover_letter jsonb;
  v_job_posting_id uuid;
  v_stage_id uuid;
  v_status_id uuid;
  v_posting_changed boolean;
  v_old_stage_id uuid;
  v_old_status_id uuid;
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
  v_old_stage_id := v_application.current_stage_id;
  v_old_status_id := v_application.current_status_id;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('careers.applicant:' || v_application.applicant_id::text, 0)
  );

  v_job_posting_id := CASE
    WHEN p_application ? 'jobPostingId'
      THEN (p_application ->> 'jobPostingId')::uuid
    ELSE v_application.job_posting_id
  END;
  v_posting_changed := v_job_posting_id <> v_application.job_posting_id;
  v_stage_id := CASE
    WHEN p_application ? 'currentStageId'
      THEN nullif(p_application ->> 'currentStageId', '')::uuid
    WHEN v_posting_changed THEN NULL
    ELSE v_application.current_stage_id
  END;
  IF v_stage_id IS NULL THEN
    SELECT id
    INTO v_stage_id
    FROM careers.job_posting_stages
    WHERE job_posting_id = v_job_posting_id
      AND is_active
    ORDER BY display_order, id
    LIMIT 1;
  END IF;
  IF v_stage_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM careers.job_posting_stages
    WHERE id = v_stage_id
      AND job_posting_id = v_job_posting_id
      AND is_active
  ) THEN
    RAISE EXCEPTION 'CAREERS_STAGE_POSTING_MISMATCH'
      USING ERRCODE = '23503';
  END IF;

  v_status_id := CASE
    WHEN p_application ? 'currentStatusId'
      THEN nullif(p_application ->> 'currentStatusId', '')::uuid
    WHEN v_posting_changed OR v_stage_id <> v_application.current_stage_id
      THEN NULL
    ELSE v_application.current_status_id
  END;
  IF v_status_id IS NULL THEN
    SELECT id
    INTO v_status_id
    FROM careers.stage_statuses
    WHERE stage_id = v_stage_id
      AND is_active
    ORDER BY is_default DESC, display_order, id
    LIMIT 1;
  END IF;
  IF v_status_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM careers.stage_statuses
    WHERE id = v_status_id
      AND stage_id = v_stage_id
      AND is_active
  ) THEN
    RAISE EXCEPTION 'CAREERS_STATUS_STAGE_MISMATCH'
      USING ERRCODE = '23503';
  END IF;

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
        WHEN p_applicant ? 'memo' THEN nullif(btrim(p_applicant ->> 'memo'), '')
        WHEN p_applicant ? 'notes' THEN nullif(btrim(p_applicant ->> 'notes'), '')
        ELSE notes
      END,
      platform = CASE
        WHEN p_applicant ? 'platform'
          THEN nullif(btrim(p_applicant ->> 'platform'), '')
        ELSE platform
      END,
      gender = CASE
        WHEN p_applicant ? 'gender' THEN nullif(p_applicant ->> 'gender', '')
        ELSE gender
      END,
      birth_date = CASE
        WHEN p_applicant ? 'birthDate'
          THEN nullif(p_applicant ->> 'birthDate', '')::date
        ELSE birth_date
      END,
      region = CASE
        WHEN p_applicant ? 'region' THEN nullif(btrim(p_applicant ->> 'region'), '')
        ELSE region
      END,
      region_detail = CASE
        WHEN p_applicant ? 'regionDetail'
          THEN nullif(btrim(p_applicant ->> 'regionDetail'), '')
        ELSE region_detail
      END,
      address = CASE
        WHEN p_applicant ? 'address' THEN nullif(btrim(p_applicant ->> 'address'), '')
        ELSE address
      END,
      educations = CASE
        WHEN p_applicant ? 'educations' THEN p_applicant -> 'educations'
        ELSE educations
      END,
      certificates = CASE
        WHEN p_applicant ? 'certificates' THEN p_applicant -> 'certificates'
        ELSE certificates
      END,
      career_entries = CASE
        WHEN p_applicant ? 'careerEntries' THEN p_applicant -> 'careerEntries'
        ELSE career_entries
      END,
      activities = CASE
        WHEN p_applicant ? 'activities' THEN p_applicant -> 'activities'
        ELSE activities
      END,
      statistics_packages = CASE
        WHEN p_applicant ? 'statisticsPackages'
          THEN p_applicant -> 'statisticsPackages'
        ELSE statistics_packages
      END,
      thesis = CASE
        WHEN p_applicant ? 'thesis'
          THEN nullif(p_applicant -> 'thesis', 'null'::jsonb)
        ELSE thesis
      END,
      submission_status = CASE
        WHEN p_applicant ? 'submissionStatus'
          THEN p_applicant ->> 'submissionStatus'
        ELSE submission_status
      END,
      updated_by = p_actor_id
  WHERE id = v_application.applicant_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAREERS_APPLICANT_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_posting_changed THEN
    DELETE FROM careers.application_stage_records
    WHERE application_id = p_application_id;
    PERFORM set_config(
      'careers.allow_application_posting_change',
      'on',
      true
    );
  END IF;

  UPDATE careers.applications
  SET job_posting_id = v_job_posting_id,
      current_stage_id = v_stage_id,
      current_status_id = v_status_id,
      status = CASE
        WHEN p_application ? 'status' THEN p_application ->> 'status'
        ELSE status
      END,
      applied_at = CASE
        WHEN p_application ? 'applicationDate'
          THEN (p_application ->> 'applicationDate')::timestamptz
        WHEN p_application ? 'appliedAt'
          THEN (p_application ->> 'appliedAt')::timestamptz
        ELSE applied_at
      END,
      updated_by = p_actor_id
  WHERE id = p_application_id
  RETURNING * INTO v_application;

  IF v_posting_changed THEN
    PERFORM set_config(
      'careers.allow_application_posting_change',
      'off',
      true
    );

    INSERT INTO careers.application_stage_records (
      application_id,
      stage_id,
      status_id,
      created_by,
      updated_by
    )
    SELECT
      v_application.id,
      stage.id,
      CASE
        WHEN stage.id = v_application.current_stage_id
          THEN v_application.current_status_id
        ELSE default_status.id
      END,
      p_actor_id,
      p_actor_id
    FROM careers.job_posting_stages AS stage
    CROSS JOIN LATERAL (
      SELECT status.id
      FROM careers.stage_statuses AS status
      WHERE status.stage_id = stage.id
        AND status.is_active
      ORDER BY status.is_default DESC, status.display_order, status.id
      LIMIT 1
    ) AS default_status
    WHERE stage.job_posting_id = v_application.job_posting_id
      AND stage.is_active;

    INSERT INTO careers.application_stage_history (
      application_id,
      from_stage_id,
      from_status_id,
      to_stage_id,
      to_status_id,
      changed_by,
      reason
    ) VALUES (
      p_application_id,
      v_old_stage_id,
      v_old_status_id,
      v_application.current_stage_id,
      v_application.current_status_id,
      p_actor_id,
      'job posting changed'
    );
  ELSE
    UPDATE careers.application_stage_records
    SET status_id = v_application.current_status_id,
        updated_by = p_actor_id
    WHERE application_id = p_application_id
      AND stage_id = v_application.current_stage_id;
  END IF;

  v_cover_letter := coalesce(
    p_application -> 'coverLetter',
    p_applicant -> 'coverLetter'
  );
  IF v_cover_letter IS NOT NULL THEN
    PERFORM careers.save_application_cover_letter_answers(
      p_application_id,
      v_cover_letter,
      p_actor_id
    );
  END IF;

  SELECT *
  INTO v_application
  FROM careers.sync_application_current_pointer(
    p_application_id,
    p_actor_id
  );

  RETURN v_application;
EXCEPTION
  WHEN invalid_text_representation OR invalid_datetime_format THEN
    RAISE EXCEPTION 'CAREERS_APPLICATION_INVALID_INPUT'
      USING ERRCODE = '22023';
END;
$$;

CREATE OR REPLACE FUNCTION careers.record_application_stage_message(
  p_application_id uuid,
  p_stage_id uuid,
  p_send jsonb,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, careers
AS $$
DECLARE
  v_channels text[];
  v_normalized jsonb;
  v_stage careers.job_posting_stages%ROWTYPE;
  v_application careers.applications%ROWTYPE;
  v_channel text;
  v_sent_at timestamptz;
BEGIN
  IF p_application_id IS NULL
    OR p_stage_id IS NULL
    OR p_actor_id IS NULL
    OR jsonb_typeof(p_send) <> 'object'
    OR jsonb_typeof(p_send -> 'channels') <> 'array'
    OR jsonb_array_length(p_send -> 'channels') = 0
    OR (
      nullif(btrim(p_send ->> 'subject'), '') IS NULL
      AND nullif(btrim(p_send ->> 'body'), '') IS NULL
    )
    OR char_length(p_send ->> 'subject') > 200
    OR char_length(p_send ->> 'body') > 10000 THEN
    RAISE EXCEPTION 'CAREERS_STAGE_MESSAGE_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.members AS member
    LEFT JOIN public.member_current_status AS member_status
      ON member_status.member_id = member.id
    WHERE member.id = p_actor_id
      AND member.role = 'admin'
      AND member_status.current_status IS DISTINCT FROM '퇴사'
  ) THEN
    RAISE EXCEPTION 'CAREERS_ADMIN_REQUIRED'
      USING ERRCODE = '42501';
  END IF;

  SELECT array_agg(channel.value ORDER BY channel.ordinality)
  INTO v_channels
  FROM jsonb_array_elements_text(p_send -> 'channels')
    WITH ORDINALITY AS channel(value, ordinality);

  IF EXISTS (
    SELECT 1
    FROM unnest(v_channels) AS channel(value)
    WHERE channel.value NOT IN ('email', 'sms')
  )
    OR cardinality(v_channels) <> (
      SELECT count(DISTINCT channel.value)
      FROM unnest(v_channels) AS channel(value)
    ) THEN
    RAISE EXCEPTION 'CAREERS_STAGE_MESSAGE_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('careers.application:' || p_application_id::text, 0)
  );

  SELECT application.*
  INTO v_application
  FROM careers.applications AS application
  WHERE application.id = p_application_id
    AND application.deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAREERS_APPLICATION_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT stage.*
  INTO v_stage
  FROM careers.job_posting_stages AS stage
  WHERE stage.id = p_stage_id
    AND stage.job_posting_id = v_application.job_posting_id
    AND stage.is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAREERS_STAGE_POSTING_MISMATCH'
      USING ERRCODE = '23503';
  END IF;
  IF NOT v_channels <@ v_stage.message_channels
    OR (
      coalesce((p_send ->> 'auto')::boolean, false)
      AND NOT v_stage.message_enabled
    ) THEN
    RAISE EXCEPTION 'CAREERS_STAGE_MESSAGE_CHANNEL_NOT_ALLOWED'
      USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM careers.application_stage_records
    WHERE application_id = p_application_id
      AND stage_id = p_stage_id
  ) THEN
    RAISE EXCEPTION 'CAREERS_STAGE_RECORD_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  v_sent_at := coalesce(
    nullif(p_send ->> 'sentAt', '')::timestamptz,
    clock_timestamp()
  );
  v_normalized := jsonb_build_object(
    'sentAt', v_sent_at,
    'channels', to_jsonb(v_channels),
    'auto', coalesce((p_send ->> 'auto')::boolean, false),
    'subject', btrim(coalesce(p_send ->> 'subject', '')),
    'body', coalesce(p_send ->> 'body', '')
  );

  UPDATE careers.application_stage_records
  SET send_meta = v_normalized,
      updated_by = p_actor_id
  WHERE application_id = p_application_id
    AND stage_id = p_stage_id;

  FOREACH v_channel IN ARRAY v_channels
  LOOP
    INSERT INTO careers.message_history (
      application_id,
      channel,
      recipient,
      subject,
      body,
      delivery_mode,
      recorded_by,
      recorded_at
    )
    SELECT
      p_application_id,
      v_channel,
      CASE
        WHEN v_channel = 'email' THEN coalesce(
          nullif(btrim(applicant.email), ''),
          nullif(btrim(applicant.phone), ''),
          applicant.name
        )
        ELSE coalesce(
          nullif(btrim(applicant.phone), ''),
          nullif(btrim(applicant.email), ''),
          applicant.name
        )
      END,
      v_normalized ->> 'subject',
      v_normalized ->> 'body',
      'record_only',
      p_actor_id,
      v_sent_at
    FROM careers.applicants AS applicant
    WHERE applicant.id = v_application.applicant_id;
  END LOOP;

  RETURN v_normalized;
EXCEPTION
  WHEN invalid_text_representation OR invalid_datetime_format THEN
    RAISE EXCEPTION 'CAREERS_STAGE_MESSAGE_INVALID_INPUT'
      USING ERRCODE = '22023';
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
  v_before careers.applications%ROWTYPE;
  v_record_status_id uuid;
BEGIN
  IF p_application_id IS NULL
    OR p_stage_id IS NULL
    OR p_status_id IS NULL
    OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'CAREERS_STAGE_TRANSITION_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('careers.application:' || p_application_id::text, 0)
  );

  SELECT *
  INTO v_application
  FROM careers.applications
  WHERE id = p_application_id
    AND deleted_at IS NULL
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
  IF NOT EXISTS (
    SELECT 1
    FROM careers.stage_statuses
    WHERE id = p_status_id
      AND stage_id = p_stage_id
      AND is_active
  ) THEN
    RAISE EXCEPTION 'CAREERS_STATUS_STAGE_MISMATCH'
      USING ERRCODE = '23503';
  END IF;

  SELECT *
  INTO v_before
  FROM careers.sync_application_current_pointer(
    p_application_id,
    p_actor_id
  );

  SELECT status_id
  INTO v_record_status_id
  FROM careers.application_stage_records
  WHERE application_id = p_application_id
    AND stage_id = p_stage_id;

  IF v_record_status_id IS NOT DISTINCT FROM p_status_id THEN
    RETURN v_before;
  END IF;

  INSERT INTO careers.application_stage_records (
    application_id,
    stage_id,
    status_id,
    created_by,
    updated_by
  ) VALUES (
    p_application_id,
    p_stage_id,
    p_status_id,
    p_actor_id,
    p_actor_id
  )
  ON CONFLICT (application_id, stage_id) DO UPDATE
  SET status_id = EXCLUDED.status_id,
      updated_by = EXCLUDED.updated_by;

  SELECT *
  INTO v_application
  FROM careers.sync_application_current_pointer(
    p_application_id,
    p_actor_id
  );

  INSERT INTO careers.application_stage_history (
    application_id,
    from_stage_id,
    from_status_id,
    to_stage_id,
    to_status_id,
    changed_by,
    reason
  ) VALUES (
    p_application_id,
    v_before.current_stage_id,
    v_before.current_status_id,
    p_stage_id,
    p_status_id,
    p_actor_id,
    nullif(btrim(p_reason), '')
  );

  RETURN v_application;
END;
$$;

CREATE OR REPLACE FUNCTION careers.transition_application_stage(
  p_application_id uuid,
  p_stage_id uuid,
  p_status_id uuid,
  p_actor_id uuid,
  p_reason text,
  p_meta jsonb
)
RETURNS careers.applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, careers
AS $$
DECLARE
  v_application careers.applications%ROWTYPE;
BEGIN
  IF p_meta IS NOT NULL AND jsonb_typeof(p_meta) <> 'object' THEN
    RAISE EXCEPTION 'CAREERS_STAGE_RECORD_META_INVALID'
      USING ERRCODE = '22023';
  END IF;
  IF p_meta ? 'send'
    AND jsonb_typeof(p_meta -> 'send') NOT IN ('object', 'null') THEN
    RAISE EXCEPTION 'CAREERS_STAGE_RECORD_META_INVALID'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_application
  FROM careers.transition_application_stage(
    p_application_id,
    p_stage_id,
    p_status_id,
    p_actor_id,
    p_reason
  );

  INSERT INTO careers.application_stage_records (
    application_id,
    stage_id,
    status_id,
    start_date,
    end_date,
    event_time,
    note,
    send_meta,
    created_by,
    updated_by
  ) VALUES (
    p_application_id,
    p_stage_id,
    p_status_id,
    nullif(p_meta ->> 'startDate', '')::date,
    nullif(p_meta ->> 'endDate', '')::date,
    nullif(p_meta ->> 'time', '')::time,
    nullif(btrim(p_meta ->> 'note'), ''),
    nullif(p_meta -> 'send', 'null'::jsonb),
    p_actor_id,
    p_actor_id
  )
  ON CONFLICT (application_id, stage_id) DO UPDATE
  SET status_id = EXCLUDED.status_id,
      start_date = CASE
        WHEN p_meta ? 'startDate' THEN EXCLUDED.start_date
        ELSE application_stage_records.start_date
      END,
      end_date = CASE
        WHEN p_meta ? 'endDate' THEN EXCLUDED.end_date
        ELSE application_stage_records.end_date
      END,
      event_time = CASE
        WHEN p_meta ? 'time' THEN EXCLUDED.event_time
        ELSE application_stage_records.event_time
      END,
      note = CASE
        WHEN p_meta ? 'note' THEN EXCLUDED.note
        ELSE application_stage_records.note
      END,
      send_meta = CASE
        WHEN p_meta ? 'send' THEN EXCLUDED.send_meta
        ELSE application_stage_records.send_meta
      END,
      updated_by = EXCLUDED.updated_by;

  IF p_meta ? 'send'
    AND jsonb_typeof(p_meta -> 'send') = 'object' THEN
    PERFORM careers.record_application_stage_message(
      p_application_id,
      p_stage_id,
      p_meta -> 'send',
      p_actor_id
    );
  END IF;

  RETURN v_application;
EXCEPTION
  WHEN invalid_datetime_format THEN
    RAISE EXCEPTION 'CAREERS_STAGE_RECORD_META_INVALID'
      USING ERRCODE = '22023';
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
  IF p_application_id IS NULL
    OR p_result NOT IN ('hired', 'rejected', 'withdrawn')
    OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'CAREERS_FINAL_RESULT_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('careers.application:' || p_application_id::text, 0)
  );

  SELECT *
  INTO v_application
  FROM careers.applications
  WHERE id = p_application_id
    AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAREERS_APPLICATION_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT *
  INTO v_before
  FROM careers.application_final_results
  WHERE application_id = p_application_id
  FOR UPDATE;

  IF FOUND
    AND v_before.result = p_result
    AND v_before.note IS NOT DISTINCT FROM nullif(btrim(p_note), '') THEN
    RETURN v_before;
  END IF;

  INSERT INTO careers.application_final_results (
    application_id,
    result,
    decided_by,
    decided_at,
    note
  ) VALUES (
    p_application_id,
    p_result,
    p_actor_id,
    clock_timestamp(),
    nullif(btrim(p_note), '')
  )
  ON CONFLICT (application_id) DO UPDATE
  SET result = EXCLUDED.result,
      decided_by = EXCLUDED.decided_by,
      decided_at = EXCLUDED.decided_at,
      note = EXCLUDED.note
  RETURNING * INTO v_result;

  UPDATE careers.applications
  SET status = CASE
        WHEN status = 'separated' THEN 'separated'
        ELSE 'completed'
      END,
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
  IF p_application_id IS NULL
    OR p_actor_id IS NULL
    OR nullif(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'CAREERS_SEPARATION_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('careers.application:' || p_application_id::text, 0)
  );

  SELECT *
  INTO v_application
  FROM careers.applications
  WHERE id = p_application_id
    AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAREERS_APPLICATION_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT *
  INTO v_separation
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

  SELECT *
  INTO v_application
  FROM careers.sync_application_current_pointer(
    p_application_id,
    p_actor_id
  );

  SELECT jsonb_build_object(
    'application', to_jsonb(v_application),
    'applicant', to_jsonb(applicant),
    'jobPosting', to_jsonb(posting),
    'stage', to_jsonb(stage),
    'stageStatus', to_jsonb(stage_status)
  )
  INTO v_snapshot
  FROM careers.applicants AS applicant
  JOIN careers.job_postings AS posting
    ON posting.id = v_application.job_posting_id
  JOIN careers.job_posting_stages AS stage
    ON stage.id = v_application.current_stage_id
  JOIN careers.stage_statuses AS stage_status
    ON stage_status.id = v_application.current_status_id
   AND stage_status.stage_id = stage.id
  WHERE applicant.id = v_application.applicant_id;

  INSERT INTO careers.application_separations (
    application_id,
    reason,
    separated_by,
    snapshot,
    updated_by
  ) VALUES (
    p_application_id,
    btrim(p_reason),
    p_actor_id,
    v_snapshot,
    p_actor_id
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
  IF p_application_id IS NULL OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'CAREERS_RESTORE_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('careers.application:' || p_application_id::text, 0)
  );

  SELECT *
  INTO v_application
  FROM careers.applications
  WHERE id = p_application_id
    AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAREERS_APPLICATION_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT *
  INTO v_separation
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

  v_restored_status := CASE
    WHEN EXISTS (
      SELECT 1
      FROM careers.application_final_results
      WHERE application_id = p_application_id
    ) THEN 'completed'
    ELSE v_separation.snapshot #>> '{application,status}'
  END;
  IF v_restored_status NOT IN ('active', 'completed') THEN
    RAISE EXCEPTION 'CAREERS_SEPARATION_SNAPSHOT_INVALID'
      USING ERRCODE = '22023';
  END IF;

  UPDATE careers.application_separations
  SET restored_by = p_actor_id,
      restored_at = clock_timestamp(),
      updated_by = p_actor_id
  WHERE id = v_separation.id;

  UPDATE careers.applications
  SET status = v_restored_status,
      updated_by = p_actor_id
  WHERE id = p_application_id;

  SELECT *
  INTO v_application
  FROM careers.sync_application_current_pointer(
    p_application_id,
    p_actor_id
  );

  RETURN v_application;
END;
$$;

CREATE OR REPLACE FUNCTION careers.clear_application_final_result(
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
  v_before jsonb;
BEGIN
  IF p_application_id IS NULL OR p_actor_id IS NULL THEN
    RAISE EXCEPTION 'CAREERS_FINAL_RESULT_INVALID_INPUT'
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

  SELECT to_jsonb(result)
  INTO v_before
  FROM careers.application_final_results AS result
  WHERE result.application_id = p_application_id;

  IF v_before IS NULL THEN
    RETURN v_application;
  END IF;

  PERFORM set_config('careers.skip_domain_audit', 'on', true);
  DELETE FROM careers.application_final_results
  WHERE application_id = p_application_id;
  PERFORM set_config('careers.skip_domain_audit', 'off', true);

  UPDATE careers.applications
  SET status = CASE
        WHEN EXISTS (
          SELECT 1
          FROM careers.application_separations
          WHERE application_id = p_application_id
            AND restored_at IS NULL
        ) THEN 'separated'
        ELSE 'active'
      END,
      updated_by = p_actor_id
  WHERE id = p_application_id
  RETURNING * INTO v_application;

  INSERT INTO careers.audit_logs (
    actor_admin_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data
  ) VALUES (
    p_actor_id,
    'application.final_result_cleared',
    'application_final_results',
    p_application_id,
    v_before,
    NULL
  );

  RETURN v_application;
END;
$$;

CREATE OR REPLACE FUNCTION careers.update_application_separation_reason(
  p_application_id uuid,
  p_reason text,
  p_actor_id uuid
)
RETURNS careers.application_separations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, careers
AS $$
DECLARE
  v_separation careers.application_separations%ROWTYPE;
BEGIN
  IF p_application_id IS NULL
    OR p_actor_id IS NULL
    OR nullif(btrim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'CAREERS_SEPARATION_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('careers.application:' || p_application_id::text, 0)
  );

  UPDATE careers.application_separations
  SET reason = btrim(p_reason),
      updated_by = p_actor_id
  WHERE application_id = p_application_id
    AND restored_at IS NULL
  RETURNING * INTO v_separation;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAREERS_ACTIVE_SEPARATION_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN v_separation;
END;
$$;

CREATE OR REPLACE FUNCTION careers.delete_application(
  p_application_id uuid,
  p_actor_admin_id uuid
)
RETURNS careers.applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, careers
AS $$
DECLARE
  v_application careers.applications%ROWTYPE;
  v_deleted_at timestamptz;
BEGIN
  IF p_application_id IS NULL OR p_actor_admin_id IS NULL THEN
    RAISE EXCEPTION 'CAREERS_APPLICATION_DELETE_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.members AS member
    LEFT JOIN public.member_current_status AS member_status
      ON member_status.member_id = member.id
    WHERE member.id = p_actor_admin_id
      AND member.role = 'admin'
      AND member_status.current_status IS DISTINCT FROM '퇴사'
  ) THEN
    RAISE EXCEPTION 'CAREERS_ADMIN_REQUIRED'
      USING ERRCODE = '42501';
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
  IF v_application.deleted_at IS NOT NULL THEN
    RETURN v_application;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'careers.applicant:' || v_application.applicant_id::text,
      0
    )
  );
  v_deleted_at := clock_timestamp();

  UPDATE careers.applications
  SET deleted_at = v_deleted_at,
      deleted_by = p_actor_admin_id,
      updated_by = p_actor_admin_id
  WHERE id = p_application_id
  RETURNING * INTO v_application;

  UPDATE careers.applicants AS applicant
  SET deleted_at = v_deleted_at,
      deleted_by = p_actor_admin_id,
      updated_by = p_actor_admin_id
  WHERE applicant.id = v_application.applicant_id
    AND applicant.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM careers.applications AS other_application
      WHERE other_application.applicant_id = applicant.id
        AND other_application.deleted_at IS NULL
    );

  RETURN v_application;
END;
$$;

CREATE OR REPLACE FUNCTION careers.delete_job_posting_cascade(
  p_job_posting_id uuid,
  p_actor_admin_id uuid
)
RETURNS careers.job_postings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, careers
AS $$
DECLARE
  v_posting careers.job_postings%ROWTYPE;
BEGIN
  IF p_job_posting_id IS NULL OR p_actor_admin_id IS NULL THEN
    RAISE EXCEPTION 'CAREERS_JOB_POSTING_DELETE_INVALID_INPUT'
      USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.members AS member
    LEFT JOIN public.member_current_status AS member_status
      ON member_status.member_id = member.id
    WHERE member.id = p_actor_admin_id
      AND member.role = 'admin'
      AND member_status.current_status IS DISTINCT FROM '퇴사'
  ) THEN
    RAISE EXCEPTION 'CAREERS_ADMIN_REQUIRED'
      USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('careers.posting:' || p_job_posting_id::text, 0)
  );

  SELECT *
  INTO v_posting
  FROM careers.job_postings
  WHERE id = p_job_posting_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CAREERS_JOB_POSTING_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;
  IF v_posting.deleted_at IS NOT NULL THEN
    RETURN v_posting;
  END IF;

  UPDATE careers.applications
  SET deleted_at = clock_timestamp(),
      deleted_by = p_actor_admin_id,
      updated_by = p_actor_admin_id
  WHERE job_posting_id = p_job_posting_id
    AND deleted_at IS NULL;

  UPDATE careers.applicants AS applicant
  SET deleted_at = clock_timestamp(),
      deleted_by = p_actor_admin_id,
      updated_by = p_actor_admin_id
  WHERE applicant.deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM careers.applications AS application
      WHERE application.applicant_id = applicant.id
        AND application.job_posting_id = p_job_posting_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM careers.applications AS other_application
      WHERE other_application.applicant_id = applicant.id
        AND other_application.job_posting_id <> p_job_posting_id
        AND other_application.deleted_at IS NULL
    );

  UPDATE careers.job_postings
  SET deleted_at = clock_timestamp(),
      deleted_by = p_actor_admin_id,
      updated_by = p_actor_admin_id
  WHERE id = p_job_posting_id
  RETURNING * INTO v_posting;

  RETURN v_posting;
END;
$$;

CREATE VIEW careers.derived_schedule_events
WITH (security_invoker = true)
AS
SELECT
  record.application_id,
  application.job_posting_id,
  record.stage_id,
  stage.name AS stage_name,
  coalesce(record.end_date, record.start_date) AS schedule_date,
  record.event_time AS schedule_time,
  record.note,
  CASE
    WHEN final_result.id IS NOT NULL THEN 'completed'
    WHEN coalesce(record.end_date, record.start_date) < current_date THEN 'overdue'
    ELSE 'upcoming'
  END AS bucket
FROM careers.application_stage_records AS record
JOIN careers.applications AS application
  ON application.id = record.application_id
JOIN careers.job_posting_stages AS stage
  ON stage.id = record.stage_id
 AND stage.show_on_calendar
LEFT JOIN careers.application_final_results AS final_result
  ON final_result.application_id = record.application_id
WHERE record.event_time IS NOT NULL
  AND coalesce(record.end_date, record.start_date) IS NOT NULL;

ALTER TABLE careers.cover_letter_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE careers.application_cover_letter_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE careers.application_stage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE careers.process_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_all ON careers.cover_letter_questions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON careers.application_cover_letter_answers
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON careers.application_stage_records
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all ON careers.process_presets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON careers.cover_letter_questions
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON careers.application_cover_letter_answers
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON careers.application_stage_records
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON careers.process_presets
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON careers.derived_schedule_events
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON careers.cover_letter_questions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON careers.application_cover_letter_answers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON careers.application_stage_records TO service_role;
GRANT SELECT, INSERT, UPDATE
  ON careers.process_presets TO service_role;
GRANT SELECT ON careers.derived_schedule_events TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA careers TO service_role;
REVOKE DELETE ON careers.applications FROM service_role;

REVOKE ALL ON FUNCTION careers.sync_application_current_pointer(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION careers.sync_application_current_pointer()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION careers.initialize_application_stage_records()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION careers.save_process_preset(jsonb, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION careers.save_job_posting_process(uuid, jsonb, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION careers.clone_process_preset_to_posting(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION careers.create_job_posting_with_preset(jsonb, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION careers.save_job_posting_cover_letter_questions(
  uuid, jsonb, uuid
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION careers.update_job_posting_with_questions(
  uuid, jsonb, uuid
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION careers.save_application_cover_letter_answers(
  uuid, jsonb, uuid
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION careers.create_application(jsonb, jsonb, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION careers.update_application(uuid, jsonb, jsonb, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION careers.record_application_stage_message(
  uuid, uuid, jsonb, uuid
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION careers.transition_application_stage(
  uuid, uuid, uuid, uuid, text, jsonb
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION careers.clear_application_final_result(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION careers.update_application_separation_reason(
  uuid, text, uuid
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION careers.delete_application(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION careers.delete_job_posting_cascade(uuid, uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION careers.save_process_preset(jsonb, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION careers.save_job_posting_process(uuid, jsonb, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION careers.clone_process_preset_to_posting(uuid, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION careers.create_job_posting_with_preset(jsonb, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION careers.save_job_posting_cover_letter_questions(
  uuid, jsonb, uuid
) TO service_role;
GRANT EXECUTE ON FUNCTION careers.update_job_posting_with_questions(
  uuid, jsonb, uuid
) TO service_role;
GRANT EXECUTE ON FUNCTION careers.save_application_cover_letter_answers(
  uuid, jsonb, uuid
) TO service_role;
GRANT EXECUTE ON FUNCTION careers.create_application(jsonb, jsonb, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION careers.update_application(uuid, jsonb, jsonb, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION careers.record_application_stage_message(
  uuid, uuid, jsonb, uuid
) TO service_role;
GRANT EXECUTE ON FUNCTION careers.transition_application_stage(
  uuid, uuid, uuid, uuid, text, jsonb
) TO service_role;
GRANT EXECUTE ON FUNCTION careers.clear_application_final_result(uuid, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION careers.update_application_separation_reason(
  uuid, text, uuid
) TO service_role;
GRANT EXECUTE ON FUNCTION careers.delete_application(uuid, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION careers.delete_job_posting_cascade(uuid, uuid)
  TO service_role;
