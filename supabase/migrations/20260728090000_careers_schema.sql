CREATE SCHEMA IF NOT EXISTS careers;

REVOKE ALL ON SCHEMA careers FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION careers.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE careers.sso_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE CHECK (code_hash ~ '^[0-9a-f]{64}$'),
  admin_member_id uuid NOT NULL REFERENCES public.members(id),
  source_app text NOT NULL DEFAULT 'admin' CHECK (source_app = 'admin'),
  expires_at timestamptz NOT NULL CHECK (expires_at <= created_at + interval '60 seconds'),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at),
  CHECK (consumed_at IS NULL OR consumed_at >= created_at)
);

CREATE TABLE careers.job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (btrim(title) <> ''),
  organization text,
  department text,
  employment_type text NOT NULL CHECK (btrim(employment_type) <> ''),
  headcount integer NOT NULL DEFAULT 1 CHECK (headcount > 0),
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  published_at timestamptz,
  closes_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.members(id),
  updated_by uuid NOT NULL REFERENCES public.members(id),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, status),
  CHECK (closes_at IS NULL OR published_at IS NULL OR closes_at >= published_at),
  CHECK ((deleted_at IS NULL) = (deleted_by IS NULL))
);

CREATE TABLE careers.job_posting_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id uuid NOT NULL REFERENCES careers.job_postings(id),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  stage_type text NOT NULL CHECK (btrim(stage_type) <> ''),
  display_order integer NOT NULL CHECK (display_order >= 0),
  show_on_calendar boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES public.members(id),
  updated_by uuid NOT NULL REFERENCES public.members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, job_posting_id)
);

CREATE TABLE careers.stage_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES careers.job_posting_stages(id),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  display_order integer NOT NULL CHECK (display_order >= 0),
  result_meaning text NOT NULL DEFAULT 'neutral'
    CHECK (result_meaning IN ('neutral', 'pass', 'fail')),
  is_terminal boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES public.members(id),
  updated_by uuid NOT NULL REFERENCES public.members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, stage_id)
);

CREATE TABLE careers.stage_message_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES careers.job_posting_stages(id),
  status_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  subject_template text CHECK (
    subject_template IS NULL OR char_length(subject_template) <= 200
  ),
  body_template text NOT NULL CHECK (
    char_length(btrim(body_template)) BETWEEN 1 AND 10000
  ),
  created_by uuid NOT NULL REFERENCES public.members(id),
  updated_by uuid NOT NULL REFERENCES public.members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (status_id, stage_id)
    REFERENCES careers.stage_statuses(id, stage_id),
  UNIQUE (stage_id, status_id)
);

CREATE TABLE careers.applicants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (btrim(name) <> ''),
  email text,
  phone text,
  source text,
  notes text,
  created_by uuid NOT NULL REFERENCES public.members(id),
  updated_by uuid NOT NULL REFERENCES public.members(id),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (email IS NULL OR btrim(email) <> ''),
  CHECK (phone IS NULL OR btrim(phone) <> ''),
  CHECK ((deleted_at IS NULL) = (deleted_by IS NULL))
);

CREATE TABLE careers.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id uuid NOT NULL REFERENCES careers.applicants(id),
  job_posting_id uuid NOT NULL REFERENCES careers.job_postings(id),
  current_stage_id uuid,
  current_status_id uuid,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'separated', 'completed')),
  applied_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.members(id),
  updated_by uuid NOT NULL REFERENCES public.members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, applicant_id),
  UNIQUE (id, job_posting_id),
  FOREIGN KEY (current_stage_id, job_posting_id)
    REFERENCES careers.job_posting_stages(id, job_posting_id),
  FOREIGN KEY (current_status_id, current_stage_id)
    REFERENCES careers.stage_statuses(id, stage_id),
  CHECK (current_status_id IS NULL OR current_stage_id IS NOT NULL)
);

CREATE TABLE careers.application_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES careers.applications(id),
  from_stage_id uuid REFERENCES careers.job_posting_stages(id),
  from_status_id uuid,
  to_stage_id uuid NOT NULL REFERENCES careers.job_posting_stages(id),
  to_status_id uuid,
  changed_by uuid NOT NULL REFERENCES public.members(id),
  reason text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT application_stage_history_from_status_id_fkey
    FOREIGN KEY (from_status_id, from_stage_id)
    REFERENCES careers.stage_statuses(id, stage_id),
  CONSTRAINT application_stage_history_to_status_id_fkey
    FOREIGN KEY (to_status_id, to_stage_id)
    REFERENCES careers.stage_statuses(id, stage_id),
  CHECK (from_status_id IS NULL OR from_stage_id IS NOT NULL)
);

CREATE TABLE careers.application_final_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL UNIQUE REFERENCES careers.applications(id),
  result text NOT NULL CHECK (result IN ('hired', 'rejected', 'withdrawn')),
  decided_by uuid NOT NULL REFERENCES public.members(id),
  decided_at timestamptz NOT NULL DEFAULT now(),
  note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE careers.application_separations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES careers.applications(id),
  reason text NOT NULL CHECK (btrim(reason) <> ''),
  separated_by uuid NOT NULL REFERENCES public.members(id),
  separated_at timestamptz NOT NULL DEFAULT now(),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  restored_by uuid REFERENCES public.members(id),
  restored_at timestamptz,
  CHECK ((restored_at IS NULL) = (restored_by IS NULL))
);

CREATE UNIQUE INDEX application_separations_active_uidx
  ON careers.application_separations (application_id)
  WHERE restored_at IS NULL;

CREATE TABLE careers.message_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES careers.applications(id),
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'internal')),
  recipient text NOT NULL CHECK (btrim(recipient) <> ''),
  subject text,
  body text NOT NULL CHECK (btrim(body) <> ''),
  delivery_mode text NOT NULL DEFAULT 'record_only' CHECK (delivery_mode = 'record_only'),
  recorded_by uuid NOT NULL REFERENCES public.members(id),
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE careers.applicant_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id uuid NOT NULL REFERENCES careers.applicants(id),
  application_id uuid NOT NULL,
  bucket_id text NOT NULL DEFAULT 'careers-applicant-files'
    CHECK (bucket_id = 'careers-applicant-files'),
  object_path text NOT NULL UNIQUE
    CHECK (object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}$'),
  original_filename text NOT NULL CHECK (btrim(original_filename) <> ''),
  mime_type text NOT NULL CHECK (mime_type IN (
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  )),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 20971520),
  uploaded_by uuid NOT NULL REFERENCES public.members(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.members(id),
  FOREIGN KEY (application_id, applicant_id)
    REFERENCES careers.applications(id, applicant_id),
  CHECK ((deleted_at IS NULL) = (deleted_by IS NULL))
);

CREATE TABLE careers.schedule_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  job_posting_id uuid NOT NULL,
  stage_id uuid,
  title text NOT NULL CHECK (btrim(title) <> ''),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  location text,
  notes text,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_by uuid NOT NULL REFERENCES public.members(id),
  updated_by uuid NOT NULL REFERENCES public.members(id),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (application_id, job_posting_id)
    REFERENCES careers.applications(id, job_posting_id),
  FOREIGN KEY (stage_id, job_posting_id)
    REFERENCES careers.job_posting_stages(id, job_posting_id),
  CHECK (ends_at > starts_at),
  CHECK ((deleted_at IS NULL) = (deleted_by IS NULL))
);

CREATE TABLE careers.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_admin_id uuid NOT NULL REFERENCES public.members(id),
  action text NOT NULL CHECK (btrim(action) <> ''),
  entity_type text NOT NULL CHECK (btrim(entity_type) <> ''),
  entity_id uuid NOT NULL,
  before_data jsonb,
  after_data jsonb,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sso_handoffs_admin_member_idx
  ON careers.sso_handoffs (admin_member_id);
CREATE INDEX sso_handoffs_unconsumed_expiry_idx
  ON careers.sso_handoffs (expires_at)
  WHERE consumed_at IS NULL;
CREATE INDEX job_postings_created_by_idx
  ON careers.job_postings (created_by);
CREATE INDEX job_postings_updated_by_idx
  ON careers.job_postings (updated_by);
CREATE INDEX job_postings_deleted_by_idx
  ON careers.job_postings (deleted_by)
  WHERE deleted_by IS NOT NULL;
CREATE INDEX job_postings_active_created_id_idx
  ON careers.job_postings (created_at DESC, id DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX job_postings_active_status_created_id_idx
  ON careers.job_postings (status, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX job_posting_stages_active_order_uidx
  ON careers.job_posting_stages (job_posting_id, display_order)
  WHERE is_active;
CREATE INDEX stage_statuses_stage_order_idx
  ON careers.stage_statuses (stage_id, display_order);
CREATE INDEX stage_message_rules_active_stage_idx
  ON careers.stage_message_rules (stage_id, status_id)
  WHERE is_active;
CREATE INDEX stage_message_rules_status_stage_idx
  ON careers.stage_message_rules (status_id, stage_id);
CREATE INDEX applicants_deleted_by_idx
  ON careers.applicants (deleted_by)
  WHERE deleted_by IS NOT NULL;
CREATE INDEX applicants_active_created_idx
  ON careers.applicants (created_at DESC, id)
  WHERE deleted_at IS NULL;
CREATE INDEX applications_applicant_idx
  ON careers.applications (applicant_id);
CREATE INDEX applications_posting_status_applied_idx
  ON careers.applications (job_posting_id, status, applied_at DESC);
CREATE INDEX applications_status_created_id_idx
  ON careers.applications (status, created_at DESC, id DESC);
CREATE INDEX applications_stage_status_idx
  ON careers.applications (current_stage_id, current_status_id);
CREATE INDEX applications_current_stage_posting_idx
  ON careers.applications (current_stage_id, job_posting_id)
  WHERE current_stage_id IS NOT NULL;
CREATE INDEX applications_current_status_stage_idx
  ON careers.applications (current_status_id, current_stage_id)
  WHERE current_status_id IS NOT NULL;
CREATE INDEX applications_active_posting_stage_idx
  ON careers.applications (job_posting_id, current_stage_id, applied_at DESC)
  WHERE status = 'active';
CREATE INDEX application_stage_history_application_changed_idx
  ON careers.application_stage_history (application_id, changed_at DESC);
CREATE INDEX application_stage_history_from_stage_idx
  ON careers.application_stage_history (from_stage_id)
  WHERE from_stage_id IS NOT NULL;
CREATE INDEX application_stage_history_from_status_stage_idx
  ON careers.application_stage_history (from_status_id, from_stage_id)
  WHERE from_status_id IS NOT NULL;
CREATE INDEX application_stage_history_to_stage_idx
  ON careers.application_stage_history (to_stage_id);
CREATE INDEX application_stage_history_to_status_stage_idx
  ON careers.application_stage_history (to_status_id, to_stage_id)
  WHERE to_status_id IS NOT NULL;
CREATE INDEX application_stage_history_changed_by_idx
  ON careers.application_stage_history (changed_by);
CREATE INDEX application_final_results_decided_by_idx
  ON careers.application_final_results (decided_by);
CREATE INDEX application_final_results_result_decided_idx
  ON careers.application_final_results (result, decided_at DESC);
CREATE INDEX application_separations_separated_by_idx
  ON careers.application_separations (separated_by);
CREATE INDEX application_separations_application_idx
  ON careers.application_separations (application_id);
CREATE INDEX application_separations_restored_by_idx
  ON careers.application_separations (restored_by)
  WHERE restored_by IS NOT NULL;
CREATE INDEX message_history_application_recorded_idx
  ON careers.message_history (application_id, recorded_at DESC);
CREATE INDEX message_history_recorded_by_idx
  ON careers.message_history (recorded_by);
CREATE INDEX applicant_files_applicant_idx
  ON careers.applicant_files (applicant_id);
CREATE INDEX applicant_files_application_applicant_idx
  ON careers.applicant_files (application_id, applicant_id);
CREATE INDEX applicant_files_application_uploaded_idx
  ON careers.applicant_files (application_id, uploaded_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX applicant_files_uploaded_by_idx
  ON careers.applicant_files (uploaded_by);
CREATE INDEX applicant_files_deleted_by_idx
  ON careers.applicant_files (deleted_by)
  WHERE deleted_by IS NOT NULL;
CREATE INDEX schedule_events_application_starts_idx
  ON careers.schedule_events (application_id, starts_at)
  WHERE deleted_at IS NULL;
CREATE INDEX schedule_events_application_posting_idx
  ON careers.schedule_events (application_id, job_posting_id);
CREATE INDEX schedule_events_posting_starts_idx
  ON careers.schedule_events (job_posting_id, starts_at)
  WHERE deleted_at IS NULL;
CREATE INDEX schedule_events_stage_idx
  ON careers.schedule_events (stage_id)
  WHERE stage_id IS NOT NULL;
CREATE INDEX schedule_events_stage_posting_idx
  ON careers.schedule_events (stage_id, job_posting_id)
  WHERE stage_id IS NOT NULL;
CREATE INDEX schedule_events_created_by_idx
  ON careers.schedule_events (created_by);
CREATE INDEX schedule_events_updated_by_idx
  ON careers.schedule_events (updated_by);
CREATE INDEX schedule_events_deleted_by_idx
  ON careers.schedule_events (deleted_by)
  WHERE deleted_by IS NOT NULL;
CREATE INDEX schedule_events_active_status_starts_idx
  ON careers.schedule_events (status, starts_at)
  WHERE deleted_at IS NULL;
CREATE INDEX schedule_events_active_starts_id_idx
  ON careers.schedule_events (starts_at ASC, id DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX job_posting_stages_created_by_idx
  ON careers.job_posting_stages (created_by);
CREATE INDEX job_posting_stages_updated_by_idx
  ON careers.job_posting_stages (updated_by);
CREATE UNIQUE INDEX stage_statuses_active_order_uidx
  ON careers.stage_statuses (stage_id, display_order)
  WHERE is_active;
CREATE INDEX stage_statuses_created_by_idx
  ON careers.stage_statuses (created_by);
CREATE INDEX stage_statuses_updated_by_idx
  ON careers.stage_statuses (updated_by);
CREATE INDEX stage_message_rules_created_by_idx
  ON careers.stage_message_rules (created_by);
CREATE INDEX stage_message_rules_updated_by_idx
  ON careers.stage_message_rules (updated_by);
CREATE INDEX applicants_created_by_idx
  ON careers.applicants (created_by);
CREATE INDEX applicants_updated_by_idx
  ON careers.applicants (updated_by);
CREATE INDEX applications_created_by_idx
  ON careers.applications (created_by);
CREATE INDEX applications_updated_by_idx
  ON careers.applications (updated_by);
CREATE INDEX audit_logs_actor_created_idx
  ON careers.audit_logs (actor_admin_id, created_at DESC);
CREATE INDEX audit_logs_entity_created_idx
  ON careers.audit_logs (entity_type, entity_id, created_at DESC);

CREATE TRIGGER set_job_postings_updated_at
  BEFORE UPDATE ON careers.job_postings
  FOR EACH ROW EXECUTE FUNCTION careers.set_updated_at();
CREATE TRIGGER set_job_posting_stages_updated_at
  BEFORE UPDATE ON careers.job_posting_stages
  FOR EACH ROW EXECUTE FUNCTION careers.set_updated_at();
CREATE TRIGGER set_stage_statuses_updated_at
  BEFORE UPDATE ON careers.stage_statuses
  FOR EACH ROW EXECUTE FUNCTION careers.set_updated_at();
CREATE TRIGGER set_stage_message_rules_updated_at
  BEFORE UPDATE ON careers.stage_message_rules
  FOR EACH ROW EXECUTE FUNCTION careers.set_updated_at();
CREATE TRIGGER set_applicants_updated_at
  BEFORE UPDATE ON careers.applicants
  FOR EACH ROW EXECUTE FUNCTION careers.set_updated_at();
CREATE TRIGGER set_applications_updated_at
  BEFORE UPDATE ON careers.applications
  FOR EACH ROW EXECUTE FUNCTION careers.set_updated_at();
CREATE TRIGGER set_application_final_results_updated_at
  BEFORE UPDATE ON careers.application_final_results
  FOR EACH ROW EXECUTE FUNCTION careers.set_updated_at();
CREATE TRIGGER set_schedule_events_updated_at
  BEFORE UPDATE ON careers.schedule_events
  FOR EACH ROW EXECUTE FUNCTION careers.set_updated_at();

CREATE OR REPLACE FUNCTION careers.prevent_application_posting_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.job_posting_id <> OLD.job_posting_id
    AND EXISTS (
      SELECT 1
      FROM careers.application_stage_history
      WHERE application_id = OLD.id
    ) THEN
    RAISE EXCEPTION 'CAREERS_APPLICATION_POSTING_CHANGE_FORBIDDEN'
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_application_posting_change
  BEFORE UPDATE OF job_posting_id ON careers.applications
  FOR EACH ROW EXECUTE FUNCTION careers.prevent_application_posting_change();

CREATE OR REPLACE FUNCTION careers.prevent_append_only_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'CAREERS_APPEND_ONLY'
    USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER application_stage_history_append_only
  BEFORE UPDATE OR DELETE ON careers.application_stage_history
  FOR EACH ROW EXECUTE FUNCTION careers.prevent_append_only_change();
CREATE TRIGGER message_history_append_only
  BEFORE UPDATE OR DELETE ON careers.message_history
  FOR EACH ROW EXECUTE FUNCTION careers.prevent_append_only_change();
CREATE TRIGGER audit_logs_append_only
  BEFORE UPDATE OR DELETE ON careers.audit_logs
  FOR EACH ROW EXECUTE FUNCTION careers.prevent_append_only_change();
